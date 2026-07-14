import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      GET: async () => new Response("ok"),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const bodyText = await request.text();
        let body: Record<string, unknown> = {};
        try {
          body = bodyText ? JSON.parse(bodyText) : {};
        } catch {
          // MP sometimes sends form-encoded fallback — ignore body errors
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg } = await supabaseAdmin
          .from("admin_settings" as never)
          .select("mp_access_token, mp_webhook_secret")
          .eq("id", 1)
          .maybeSingle<{ mp_access_token: string | null; mp_webhook_secret: string | null }>();

        const accessToken = cfg?.mp_access_token?.trim();
        if (!accessToken) return new Response("no_credentials", { status: 503 });

        // Optional signature verification (MP sends x-signature: ts=..,v1=..)
        const secret = cfg?.mp_webhook_secret?.trim();
        if (secret) {
          const xSig = request.headers.get("x-signature") ?? "";
          const xReqId = request.headers.get("x-request-id") ?? "";
          const parts = Object.fromEntries(
            xSig.split(",").map((p) => p.trim().split("=") as [string, string]),
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          const dataId =
            (body as { data?: { id?: string | number } })?.data?.id ??
            url.searchParams.get("data.id") ??
            url.searchParams.get("id") ??
            "";
          if (ts && v1 && dataId) {
            const manifest = `id:${dataId};request-id:${xReqId};ts:${ts};`;
            const expected = createHmac("sha256", secret).update(manifest).digest("hex");
            const a = Buffer.from(expected);
            const b = Buffer.from(v1);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return new Response("invalid_signature", { status: 401 });
            }
          }
        }

        const type =
          (body as { type?: string; topic?: string }).type ??
          (body as { topic?: string }).topic ??
          url.searchParams.get("type") ??
          url.searchParams.get("topic");
        const paymentId =
          (body as { data?: { id?: string | number } }).data?.id ??
          url.searchParams.get("data.id") ??
          url.searchParams.get("id");

        if (type !== "payment" || !paymentId) return new Response("ignored");

        // Fetch full payment from MP
        const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mpResp.ok) {
          console.error("[MP webhook] fetch payment failed", await mpResp.text());
          return new Response("mp_error", { status: 502 });
        }
        const payment = (await mpResp.json()) as {
          id: number;
          status: string;
          external_reference?: string;
        };
        const orderId = payment.external_reference;
        if (!orderId) return new Response("no_reference");

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, status, candle_id, tribute_name, tribute_message")
          .eq("id", orderId)
          .maybeSingle();
        if (!order) return new Response("order_not_found", { status: 404 });

        // Idempotent status transition
        const nextStatus =
          payment.status === "approved"
            ? "paid"
            : payment.status === "rejected" || payment.status === "cancelled"
              ? "failed"
              : "pending";

        if (order.status === nextStatus) return new Response("noop");

        const updatePatch: Record<string, unknown> = {
          status: nextStatus,
          mp_payment_id: String(payment.id),
        };
        if (nextStatus === "paid") updatePatch.paid_at = new Date().toISOString();

        await supabaseAdmin.from("orders").update(updatePatch as never).eq("id", order.id);

        // Create tribute once, only on paid
        if (nextStatus === "paid") {
          const { data: existing } = await supabaseAdmin
            .from("tributes")
            .select("id")
            .eq("order_id", order.id)
            .maybeSingle();
          if (!existing) {
            const { data: candle } = await supabaseAdmin
              .from("candles")
              .select("duration_hours")
              .eq("id", order.candle_id)
              .maybeSingle();
            const hours = candle?.duration_hours ?? 24 * 7;
            const ends = new Date(Date.now() + hours * 3600_000).toISOString();
            await supabaseAdmin.from("tributes").insert({
              order_id: order.id,
              candle_id: order.candle_id,
              tribute_name: order.tribute_name,
              tribute_message: order.tribute_message,
              ends_at: ends,
            } as never);
          }
        }

        return new Response("ok");
      },
    },
  },
});
