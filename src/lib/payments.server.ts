import type { CreateOrderInput, CreateRenewalInput, OrderStatusInput, UploadPhotoInput } from "./payments.schemas";

type OrderStatus = "paid" | "cancelled" | "refunded" | "pending";

type OrderRow = {
  id: string;
  status: OrderStatus;
  candle_id: string;
  tribute_name: string;
  tribute_message: string | null;
  tribute_photo_url?: string | null;
  tribute_birth_date?: string | null;
  tribute_death_date?: string | null;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  paid_at?: string | null;
  renewal_tribute_id?: string | null;
};

type MercadoPagoPayment = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  preference_id?: string | null;
};

type MercadoPagoMerchantOrder = {
  id: number | string;
  external_reference?: string | null;
  preference_id?: string | null;
  payments?: Array<{
    id?: number | string | null;
    status?: string | null;
  }>;
};

type SyncResult = {
  changed: boolean;
  result:
    | "ok"
    | "noop"
    | "no_credentials"
    | "no_payment"
    | "unknown_payment"
    | "no_reference"
    | "order_not_found"
    | "payment_mismatch"
    | "terminal_state"
    | "unmapped_status"
    | "race_noop"
    | "update_failed"
    | "tribute_failed"
    | "mp_error";
  order_id?: string | null;
  payment_id?: string | null;
  mp_status?: string | null;
  tribute_id?: string | null;
  error?: string | null;
};

const TERMINAL_STATUSES = new Set<OrderStatus>(["paid", "cancelled", "refunded"]);

export async function storeTributePhoto(data: UploadPhotoInput) {
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

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from("tribute-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr || !signed) throw new Error("Falha ao gerar URL da foto.");
  return { url: signed.signedUrl };
}

export async function createOrderPayment(data: CreateOrderInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const accessToken = await loadMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("Mercado Pago não configurado. Configure o Access Token em Admin → Configurações.");
  }

  const { data: candle, error: candleErr } = await supabaseAdmin
    .from("candles")
    .select("id, name, price_cents, duration_hours, active")
    .eq("id", data.candle_id)
    .maybeSingle();
  if (candleErr || !candle || !candle.active) throw new Error("Vela indisponível");

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
      payment_method: "checkout",
      status: "pending",
    } as never)
    .select("id")
    .single();
  if (orderErr || !order) throw new Error("Falha ao criar pedido");

  const amountBRL = Number((candle.price_cents / 100).toFixed(2));
  const pendingReturnUrl = `${getSiteUrl()}/pedido/pendente?order=${order.id}`;

  const preferencePayload = {
    items: [
      {
        id: candle.id,
        title: `Vela ${candle.name}`,
        description: `Homenagem a ${data.tribute_name}`,
        category_id: "services",
        quantity: 1,
        currency_id: "BRL",
        unit_price: amountBRL,
      },
    ],
    payer: { email: data.customer_email, name: data.customer_name },
    external_reference: order.id,
    notification_url: buildNotificationUrl(),
    statement_descriptor: "VELA VIRTUAL",
    binary_mode: false,
    payment_methods: {
      // Habilita PIX + cartão de crédito + cartão de débito.
      // Exclui apenas boleto (ticket) e pagamento em lotérica/ATM.
      excluded_payment_types: [{ id: "atm" }, { id: "ticket" }],
      excluded_payment_methods: [{ id: "bolbradesco" }, { id: "pec" }],
      installments: 12,
      default_installments: 1,
    },
    back_urls: {
      success: pendingReturnUrl,
      failure: pendingReturnUrl,
      pending: pendingReturnUrl,
    },
    auto_return: "approved",
  };

  const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": `order-${order.id}`,
    },
    body: JSON.stringify(preferencePayload),
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
    method: "checkout" as const,
    init_point: payload.init_point as string,
    sandbox_init_point: payload.sandbox_init_point as string,
  };
}

export async function fetchOrderStatus(data: OrderStatusInput) {
  const order = await syncAndLoadOrder(data);
  if (!order) return { status: "not_found" as const, tribute_id: null };
  const tribute_id =
    order.status === "paid"
      ? order.renewal_tribute_id ?? (await findTributeId(order.id))
      : null;
  return { status: order.status, tribute_id };
}

export async function fetchOrderDetails(data: OrderStatusInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const order = await syncAndLoadOrder(data);
  if (!order) return { found: false as const };

  const { data: fullOrder } = await supabaseAdmin
    .from("orders")
    .select(
      "id, status, amount_cents, payment_method, tribute_name, customer_name, customer_email, pix_qr_code, pix_qr_base64, mp_payment_id, created_at, paid_at, candle_id, renewal_tribute_id",
    )
    .eq("id", order.id)
    .maybeSingle<{ id: string; status: OrderStatus; renewal_tribute_id: string | null; candle_id: string }>();
  if (!fullOrder) return { found: false as const };

  const tribute_id =
    fullOrder.status === "paid"
      ? fullOrder.renewal_tribute_id ?? (await findTributeId(fullOrder.id))
      : null;
  const { data: candle } = await supabaseAdmin
    .from("candles")
    .select("name, slug")
    .eq("id", fullOrder.candle_id)
    .maybeSingle();

  return { found: true as const, order: fullOrder, tribute_id, candle };
}

export async function syncMercadoPagoPayment(paymentId: string): Promise<SyncResult> {
  const accessToken = await loadMercadoPagoAccessToken();
  if (!accessToken) return { changed: false, result: "no_credentials", payment_id: paymentId };

  const payment = await fetchMercadoPagoPayment(accessToken, paymentId);
  if (!payment) return { changed: false, result: "unknown_payment", payment_id: paymentId };
  if (!payment.external_reference) {
    return {
      changed: false,
      result: "no_reference",
      payment_id: String(payment.id),
      mp_status: payment.status,
    };
  }
  return applyMercadoPagoPayment(payment.external_reference, payment);
}

export async function syncMercadoPagoMerchantOrder(merchantOrderId: string): Promise<SyncResult> {
  const accessToken = await loadMercadoPagoAccessToken();
  if (!accessToken) return { changed: false, result: "no_credentials", payment_id: merchantOrderId };

  const merchantOrder = await fetchMercadoPagoMerchantOrder(accessToken, merchantOrderId);
  if (!merchantOrder) return { changed: false, result: "unknown_payment", payment_id: merchantOrderId };

  const orderId =
    merchantOrder.external_reference ||
    (merchantOrder.preference_id ? await findOrderIdByPreferenceId(merchantOrder.preference_id) : null);

  if (!orderId) {
    return {
      changed: false,
      result: "no_reference",
      payment_id: merchantOrderId,
    };
  }

  const paymentFromOrder = selectMerchantOrderPayment(merchantOrder);
  if (!paymentFromOrder?.id) return { changed: false, result: "no_payment", order_id: orderId };

  const fullPayment = await fetchMercadoPagoPayment(accessToken, String(paymentFromOrder.id));
  const payment: MercadoPagoPayment = {
    ...(fullPayment ?? {
      id: paymentFromOrder.id,
      status: paymentFromOrder.status ?? "pending",
    }),
    external_reference: fullPayment?.external_reference || orderId,
    preference_id: fullPayment?.preference_id || merchantOrder.preference_id || null,
  };

  return applyMercadoPagoPayment(orderId, payment);
}

export async function syncOrderWithMercadoPago(orderId: string): Promise<SyncResult> {
  const accessToken = await loadMercadoPagoAccessToken();
  if (!accessToken) return { changed: false, result: "no_credentials", order_id: orderId };

  const order = await loadOrder(orderId);
  if (!order) return { changed: false, result: "order_not_found", order_id: orderId };

  if (order.status === "paid") {
    const tributeId = await ensureTributeForOrder(order);
    return { changed: false, result: "noop", order_id: order.id, tribute_id: tributeId };
  }
  if (order.status !== "pending") return { changed: false, result: "terminal_state", order_id: order.id };

  const payment = await findMercadoPagoPaymentForOrder(accessToken, order);
  if (!payment) return { changed: false, result: "no_payment", order_id: order.id };
  return applyMercadoPagoPayment(order.id, payment, order);
}

async function syncAndLoadOrder(input: OrderStatusInput): Promise<OrderRow | null> {
  const order = await loadOrder(input.order_id);
  if (!order) return null;

  if (order.status === "pending" || order.status === "paid") {
    try {
      if (input.payment_id || input.collection_id) {
        await syncMercadoPagoPayment(String(input.payment_id || input.collection_id));
      }
      if (input.merchant_order_id) {
        await syncMercadoPagoMerchantOrder(String(input.merchant_order_id));
      }

      const current = await loadOrder(order.id);
      if (current?.status === "paid") {
        // Garante que o tribute exista mesmo quando o pedido já foi marcado
        // como pago pelo webhook (ou por sync anterior) sem criar a homenagem.
        await ensureTributeForOrder(current);
      } else {
        // Ainda pendente: tenta buscar proativamente no Mercado Pago.
        await syncOrderWithMercadoPago(order.id);
      }
    } catch (error) {
      console.error("[MP sync] fallback failed", error);
    }
  }
  return loadOrder(input.order_id);
}

async function applyMercadoPagoPayment(
  orderId: string,
  payment: MercadoPagoPayment,
  existingOrder?: OrderRow,
): Promise<SyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const order = existingOrder ?? (await loadOrder(orderId));
  if (!order) {
    return {
      changed: false,
      result: "order_not_found",
      order_id: orderId,
      payment_id: String(payment.id),
      mp_status: payment.status,
    };
  }

  if (order.mp_payment_id && order.mp_payment_id !== String(payment.id)) {
    return {
      changed: false,
      result: "payment_mismatch",
      order_id: order.id,
      payment_id: String(payment.id),
      mp_status: payment.status,
    };
  }

  const nextStatus = mapMercadoPagoStatus(payment.status);
  if (!nextStatus) {
    return {
      changed: false,
      result: "unmapped_status",
      order_id: order.id,
      payment_id: String(payment.id),
      mp_status: payment.status,
    };
  }

  if (order.status === nextStatus) {
    const tributeId = nextStatus === "paid" ? await ensureTributeForOrder(order) : null;
    if (!order.mp_payment_id) {
      await supabaseAdmin
        .from("orders")
        .update({ mp_payment_id: String(payment.id) } as never)
        .eq("id", order.id);
    }
    return {
      changed: false,
      result: "noop",
      order_id: order.id,
      payment_id: String(payment.id),
      mp_status: payment.status,
      tribute_id: tributeId,
    };
  }

  if (TERMINAL_STATUSES.has(order.status) && !(order.status === "paid" && nextStatus === "refunded")) {
    return {
      changed: false,
      result: "terminal_state",
      order_id: order.id,
      payment_id: String(payment.id),
      mp_status: payment.status,
    };
  }

  const patch: Record<string, unknown> = {
    status: nextStatus,
    mp_payment_id: String(payment.id),
  };
  if (nextStatus === "paid") patch.paid_at = new Date().toISOString();

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("orders")
    .update(patch as never)
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id")
    .maybeSingle();
  if (updErr) {
    return {
      changed: false,
      result: "update_failed",
      order_id: order.id,
      payment_id: String(payment.id),
      mp_status: payment.status,
      error: updErr.message,
    };
  }
  if (!updated) {
    return {
      changed: false,
      result: "race_noop",
      order_id: order.id,
      payment_id: String(payment.id),
      mp_status: payment.status,
    };
  }

  const freshOrder = (await loadOrder(order.id)) ?? order;
  const tributeId = nextStatus === "paid" ? await ensureTributeForOrder(freshOrder) : null;
  return {
    changed: true,
    result: "ok",
    order_id: order.id,
    payment_id: String(payment.id),
    mp_status: payment.status,
    tribute_id: tributeId,
  };
}

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select(
      "id, status, candle_id, tribute_name, tribute_message, tribute_photo_url, tribute_birth_date, tribute_death_date, mp_payment_id, mp_preference_id, paid_at, renewal_tribute_id",
    )
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  return data ?? null;
}

async function findTributeId(orderId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tributes")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

async function findOrderIdByPreferenceId(preferenceId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("mp_preference_id", preferenceId)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

async function ensureTributeForOrder(order: OrderRow): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Renovação: em vez de criar nova homenagem, estende a existente.
  if (order.renewal_tribute_id) {
    const { data: existing } = await supabaseAdmin
      .from("tributes")
      .select("id, ends_at, lit_at")
      .eq("id", order.renewal_tribute_id)
      .maybeSingle<{ id: string; ends_at: string; lit_at: string | null }>();
    if (!existing) return null;

    const { data: candle } = await supabaseAdmin
      .from("candles")
      .select("duration_hours, duration_minutes")
      .eq("id", order.candle_id)
      .maybeSingle<{ duration_hours: number; duration_minutes: number | null }>();
    const minutes = candle?.duration_minutes ?? (candle?.duration_hours ?? 24 * 7) * 60;
    const base = Math.max(Date.now(), new Date(existing.ends_at).getTime());
    const newEnds = new Date(base + minutes * 60_000).toISOString();

    const patch: Record<string, unknown> = { ends_at: newEnds, active: true };
    // Se estava apagada/expirada, reacende agora para o novo período.
    if (!existing.lit_at || new Date(existing.ends_at).getTime() <= Date.now()) {
      patch.lit_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("tributes")
      .update(patch as never)
      .eq("id", existing.id);
    if (error) {
      console.error("[MP sync] tribute renewal failed", error);
      return existing.id;
    }
    return existing.id;
  }

  const existing = await findTributeId(order.id);
  if (existing) return existing;

  const { data: candle } = await supabaseAdmin
    .from("candles")
    .select("duration_hours, duration_minutes")
    .eq("id", order.candle_id)
    .maybeSingle<{ duration_hours: number; duration_minutes: number | null }>();
  const minutes = candle?.duration_minutes ?? (candle?.duration_hours ?? 24 * 7) * 60;
  const ends = new Date(Date.now() + minutes * 60_000).toISOString();


  const { data: tribute, error } = await supabaseAdmin
    .from("tributes")
    .insert({
      order_id: order.id,
      candle_id: order.candle_id,
      tribute_name: order.tribute_name,
      tribute_message: order.tribute_message,
      tribute_photo_url: order.tribute_photo_url ?? null,
      tribute_birth_date: order.tribute_birth_date ?? null,
      tribute_death_date: order.tribute_death_date ?? null,
      ends_at: ends,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if ((error as { code?: string }).code === "23505") return findTributeId(order.id);
    console.error("[MP sync] tribute insert failed", error);
    return null;
  }
  return tribute?.id ?? null;
}

export async function createRenewalPayment(data: CreateRenewalInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const accessToken = await loadMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("Mercado Pago não configurado. Configure o Access Token em Admin → Configurações.");
  }

  const { data: tribute } = await supabaseAdmin
    .from("tributes")
    .select("id, tribute_name, tribute_message, order_id, active")
    .eq("id", data.tribute_id)
    .maybeSingle<{
      id: string;
      tribute_name: string;
      tribute_message: string | null;
      order_id: string | null;
      active: boolean;
    }>();
  if (!tribute || !tribute.active) throw new Error("Homenagem indisponível para prorrogação");

  const { data: candle } = await supabaseAdmin
    .from("candles")
    .select("id, name, price_cents, active")
    .eq("id", data.candle_id)
    .maybeSingle();
  if (!candle || !candle.active) throw new Error("Plano indisponível");

  // Recupera dados do cliente do pedido original quando o front não enviar.
  let customerName = data.customer_name?.trim() || "";
  let customerEmail = data.customer_email?.trim() || "";
  if ((!customerName || !customerEmail) && tribute.order_id) {
    const { data: original } = await supabaseAdmin
      .from("orders")
      .select("customer_name, customer_email")
      .eq("id", tribute.order_id)
      .maybeSingle<{ customer_name: string; customer_email: string }>();
    customerName = customerName || original?.customer_name || "Homenagem";
    customerEmail = customerEmail || original?.customer_email || "";
  }
  if (!customerEmail) throw new Error("Informe o email para receber a confirmação.");
  if (!customerName) customerName = "Homenagem";

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      candle_id: candle.id,
      customer_name: customerName,
      customer_email: customerEmail,
      tribute_name: tribute.tribute_name,
      tribute_message: tribute.tribute_message,
      amount_cents: candle.price_cents,
      payment_method: "checkout",
      status: "pending",
      renewal_tribute_id: tribute.id,
    } as never)
    .select("id")
    .single();
  if (orderErr || !order) throw new Error("Falha ao criar pedido de prorrogação");

  const amountBRL = Number((candle.price_cents / 100).toFixed(2));
  // Retorno vai direto para a página da homenagem que já está sendo prorrogada.
  const pendingReturnUrl = `${getSiteUrl()}/homenagem/${tribute.id}?order=${order.id}`;

  const preferencePayload = {
    items: [
      {
        id: candle.id,
        title: `Prorrogação — Vela ${candle.name}`,
        description: `Prorrogação da homenagem a ${tribute.tribute_name}`,
        category_id: "services",
        quantity: 1,
        currency_id: "BRL",
        unit_price: amountBRL,
      },
    ],
    payer: { email: customerEmail, name: customerName },
    external_reference: order.id,
    notification_url: buildNotificationUrl(),
    statement_descriptor: "VELA VIRTUAL",
    binary_mode: false,
    payment_methods: {
      excluded_payment_types: [{ id: "atm" }, { id: "ticket" }],
      excluded_payment_methods: [{ id: "bolbradesco" }, { id: "pec" }],
      installments: 12,
      default_installments: 1,
    },
    back_urls: {
      success: pendingReturnUrl,
      failure: pendingReturnUrl,
      pending: pendingReturnUrl,
    },
    auto_return: "approved",
  };

  const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": `order-${order.id}`,
    },
    body: JSON.stringify(preferencePayload),
  });
  const payload = await resp.json();
  if (!resp.ok) {
    console.error("[MP preference renewal]", payload);
    throw new Error(payload?.message ?? "Falha ao criar preferência de pagamento");
  }

  await supabaseAdmin
    .from("orders")
    .update({ mp_preference_id: String(payload.id) } as never)
    .eq("id", order.id);

  return {
    order_id: order.id,
    tribute_id: tribute.id,
    method: "checkout" as const,
    init_point: payload.init_point as string,
    sandbox_init_point: payload.sandbox_init_point as string,
  };
}

async function loadMercadoPagoAccessToken(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfg } = await supabaseAdmin
    .from("admin_settings" as never)
    .select("mp_access_token")
    .eq("id", 1)
    .maybeSingle<{ mp_access_token: string | null }>();
  return cfg?.mp_access_token?.trim() || null;
}

async function fetchMercadoPagoPayment(
  accessToken: string,
  paymentId: string,
): Promise<MercadoPagoPayment | null> {
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Mercado Pago retornou ${resp.status}: ${text}`);
  }
  return (await resp.json()) as MercadoPagoPayment;
}

async function fetchMercadoPagoMerchantOrder(
  accessToken: string,
  merchantOrderId: string,
): Promise<MercadoPagoMerchantOrder | null> {
  const resp = await fetch(`https://api.mercadopago.com/merchant_orders/${encodeURIComponent(merchantOrderId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Mercado Pago merchant order retornou ${resp.status}: ${text}`);
  }
  return (await resp.json()) as MercadoPagoMerchantOrder;
}

async function findMercadoPagoPaymentViaMerchantOrder(
  accessToken: string,
  order: OrderRow,
): Promise<MercadoPagoPayment | null> {
  const searches = [
    new URLSearchParams({ external_reference: order.id }),
  ];
  if (order.mp_preference_id) searches.push(new URLSearchParams({ preference_id: order.mp_preference_id }));

  for (const params of searches) {
    const resp = await fetch(`https://api.mercadopago.com/merchant_orders/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Mercado Pago merchant order search retornou ${resp.status}: ${text}`);
    }

    const payload = (await resp.json()) as { elements?: MercadoPagoMerchantOrder[] };
    const merchantOrders = payload.elements ?? [];
    for (const merchantOrder of merchantOrders) {
      const payment = selectMerchantOrderPayment(merchantOrder);
      if (!payment?.id) continue;

      const fullPayment = await fetchMercadoPagoPayment(accessToken, String(payment.id));
      return {
        ...(fullPayment ?? { id: payment.id, status: payment.status ?? "pending" }),
        external_reference: fullPayment?.external_reference || merchantOrder.external_reference || order.id,
        preference_id: fullPayment?.preference_id || merchantOrder.preference_id || order.mp_preference_id,
      };
    }
  }

  return null;
}

async function findMercadoPagoPaymentForOrder(
  accessToken: string,
  order: OrderRow,
): Promise<MercadoPagoPayment | null> {
  const searches = [
    new URLSearchParams({ external_reference: order.id, sort: "date_created", criteria: "desc" }),
  ];
  if (order.mp_preference_id) {
    searches.push(new URLSearchParams({ preference_id: order.mp_preference_id, sort: "date_created", criteria: "desc" }));
  }

  for (const params of searches) {
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Mercado Pago search retornou ${resp.status}: ${text}`);
    }
    const payload = (await resp.json()) as { results?: MercadoPagoPayment[] };
    const results = payload.results ?? [];
    const candidates = results.filter(
      (payment) =>
        payment.external_reference === order.id ||
        (!!order.mp_preference_id && payment.preference_id === order.mp_preference_id),
    );
    const selected = candidates.find((payment) => payment.status === "approved") ?? candidates[0];
    if (selected) return selected;
  }
  return findMercadoPagoPaymentViaMerchantOrder(accessToken, order);
}

function selectMerchantOrderPayment(merchantOrder: MercadoPagoMerchantOrder) {
  const payments = (merchantOrder.payments ?? []).filter((payment) => payment.id);
  return (
    payments.find((payment) => payment.status === "approved") ??
    payments.find((payment) => payment.status === "in_process" || payment.status === "pending") ??
    payments[0] ??
    null
  );
}

function mapMercadoPagoStatus(status: string): OrderStatus | null {
  switch (status) {
    case "approved":
      return "paid";
    case "rejected":
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "pending";
    default:
      return null;
  }
}

function getSiteUrl(): string {
  const url =
    process.env.SITE_URL ||
    process.env.PUBLIC_URL ||
    process.env.VITE_SITE_URL ||
    process.env.VITE_PUBLIC_URL ||
    process.env.APP_URL;
  if (url) return url.replace(/\/$/, "");

  return "https://velavirtual.lovable.app";
}

function buildNotificationUrl(): string {
  return `${getSiteUrl()}/api/public/webhooks/mercadopago`;
}