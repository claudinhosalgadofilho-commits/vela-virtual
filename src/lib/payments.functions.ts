import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createOrderInput = z.object({
  candle_id: z.string().uuid(),
  customer_name: z.string().trim().min(2).max(100),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().max(30).optional().nullable(),
  tribute_name: z.string().trim().min(2).max(100),
  tribute_message: z.string().trim().max(500).optional().nullable(),
  tribute_photo_url: z.string().url().max(2000).optional().nullable(),
  tribute_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  tribute_death_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  payment_method: z.enum(["pix", "card"]),
});

const uploadPhotoInput = z.object({
  filename: z.string().trim().min(1).max(120),
  content_type: z.string().trim().regex(/^image\/(jpeg|jpg|png|webp)$/i),
  data_base64: z.string().min(10).max(8_000_000), // ~6MB decoded
});

export const uploadTributePhoto = createServerFn({ method: "POST" })
  .inputValidator((raw) => uploadPhotoInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = (data.filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${safeExt}`;
    const buf = Buffer.from(data.data_base64, "base64");
    if (buf.length > 5 * 1024 * 1024) throw new Error("Foto muito grande (máx 5MB).");
    const { error: upErr } = await supabaseAdmin.storage
      .from("tribute-photos")
      .upload(path, buf, { contentType: data.content_type, upsert: false });
    if (upErr) throw new Error("Falha ao enviar foto: " + upErr.message);
    // Signed URL válido por 10 anos (bucket privado).
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("tribute-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signErr || !signed) throw new Error("Falha ao gerar URL da foto.");
    return { url: signed.signedUrl };
  });

export const createOrderAndPayment = createServerFn({ method: "POST" })
  .inputValidator((raw) => createOrderInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load MP credentials
    const { data: adminCfg, error: cfgErr } = await supabaseAdmin
      .from("admin_settings" as never)
      .select("mp_access_token")
      .eq("id", 1)
      .maybeSingle<{ mp_access_token: string | null }>();
    if (cfgErr) throw new Error("Falha ao carregar configuração de pagamento");
    const accessToken = adminCfg?.mp_access_token?.trim();
    if (!accessToken) throw new Error("Mercado Pago não configurado. Configure o Access Token em Admin → Configurações.");

    // Load candle
    const { data: candle, error: candleErr } = await supabaseAdmin
      .from("candles")
      .select("id, name, price_cents, duration_hours, active")
      .eq("id", data.candle_id)
      .maybeSingle();
    if (candleErr || !candle || !candle.active) throw new Error("Vela indisponível");

    // Create order (pending)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        candle_id: candle.id,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        tribute_name: data.tribute_name,
        tribute_message: data.tribute_message || null,
        tribute_photo_url: data.tribute_photo_url || null,
        tribute_birth_date: data.tribute_birth_date || null,
        tribute_death_date: data.tribute_death_date || null,
        amount_cents: candle.price_cents,
        payment_method: data.payment_method,
        status: "pending",
      } as never)
      .select("id")
      .single();
    if (orderErr || !order) throw new Error("Falha ao criar pedido");

    const amountBRL = Number((candle.price_cents / 100).toFixed(2));
    const idempotencyKey = `order-${order.id}`;

    if (data.payment_method === "pix") {
      const [firstName, ...rest] = data.customer_name.trim().split(/\s+/);
      const lastName = rest.join(" ") || firstName;
      const resp = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          transaction_amount: amountBRL,
          description: `Vela ${candle.name} — homenagem a ${data.tribute_name}`,
          payment_method_id: "pix",
          payer: { email: data.customer_email, first_name: firstName, last_name: lastName },
          external_reference: order.id,
          notification_url: buildNotificationUrl(),
        }),
      });
      const payload = await resp.json();
      if (!resp.ok) {
        console.error("[MP pix]", payload);
        throw new Error(payload?.message ?? "Falha ao gerar cobrança PIX");
      }
      const qr = payload?.point_of_interaction?.transaction_data;
      await supabaseAdmin
        .from("orders")
        .update({
          mp_payment_id: String(payload.id),
          pix_qr_code: qr?.qr_code ?? null,
          pix_qr_base64: qr?.qr_code_base64 ?? null,
        } as never)
        .eq("id", order.id);
      return {
        order_id: order.id,
        method: "pix" as const,
        pix_qr_code: qr?.qr_code ?? null,
        pix_qr_base64: qr?.qr_code_base64 ?? null,
      };
    }

    // Card: create Checkout Pro preference
    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        items: [
          {
            id: candle.id,
            title: `Vela ${candle.name}`,
            description: `Homenagem a ${data.tribute_name}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: amountBRL,
          },
        ],
        payer: { email: data.customer_email, name: data.customer_name },
        external_reference: order.id,
        notification_url: buildNotificationUrl(),
        payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
        back_urls: {
          success: `${getSiteUrl()}/pedido/pendente?order=${order.id}`,
          failure: `${getSiteUrl()}/pedido/pendente?order=${order.id}`,
          pending: `${getSiteUrl()}/pedido/pendente?order=${order.id}`,
        },
        auto_return: "approved",
      }),
    });
    const payload = await resp.json();
    if (!resp.ok) {
      console.error("[MP preference]", payload);
      throw new Error(payload?.message ?? "Falha ao criar preferência de pagamento");
    }
    await supabaseAdmin
      .from("orders")
      .update({ mp_preference_id: String(payload.id) } as never)
      .eq("id", order.id);
    return {
      order_id: order.id,
      method: "card" as const,
      init_point: payload.init_point as string,
      sandbox_init_point: payload.sandbox_init_point as string,
    };
  });

const orderStatusInput = z.object({ order_id: z.string().uuid() });

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((raw) => orderStatusInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) return { status: "not_found" as const, tribute_id: null };
    let tribute_id: string | null = null;
    if (order.status === "paid") {
      const { data: t } = await supabaseAdmin
        .from("tributes")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();
      tribute_id = t?.id ?? null;
    }
    return { status: order.status, tribute_id };
  });

export const getOrderDetails = createServerFn({ method: "GET" })
  .inputValidator((raw) => orderStatusInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, status, amount_cents, payment_method, tribute_name, customer_name, customer_email, pix_qr_code, pix_qr_base64, mp_payment_id, created_at, paid_at, candle_id",
      )
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) return { found: false as const };
    let tribute_id: string | null = null;
    if (order.status === "paid") {
      const { data: t } = await supabaseAdmin
        .from("tributes")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();
      tribute_id = t?.id ?? null;
    }
    const { data: candle } = await supabaseAdmin
      .from("candles")
      .select("name, slug")
      .eq("id", order.candle_id)
      .maybeSingle();
    return { found: true as const, order, tribute_id, candle };
  });

function getSiteUrl(): string {
  const url = process.env.SITE_URL || process.env.PUBLIC_URL;
  if (url) return url.replace(/\/$/, "");
  const projectId = process.env.SUPABASE_PROJECT_ID;
  if (projectId) return `https://project--${projectId}.lovable.app`;
  return "http://localhost:8080";
}

function buildNotificationUrl(): string {
  return `${getSiteUrl()}/api/public/webhooks/mercadopago`;
}
