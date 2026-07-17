import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Terminal states cannot regress; only paid->refunded is allowed downstream.
const TERMINAL = new Set(["paid", "cancelled", "refunded"]);

function mapMpStatus(s: string): "paid" | "cancelled" | "refunded" | "pending" | null {
  switch (s) {
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
          // MP occasionally posts form-encoded — safe to ignore
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg } = await supabaseAdmin
          .from("admin_settings" as never)
          .select("mp_access_token, mp_webhook_secret")
          .eq("id", 1)
          .maybeSingle<{ mp_access_token: string | null; mp_webhook_secret: string | null }>();

        const accessToken = cfg?.mp_access_token?.trim();
        if (!accessToken) return new Response("no_credentials", { status: 503 });

        // Signature verification — enforced when a secret is configured
        const secret = cfg?.mp_webhook_secret?.trim();
        const dataId =
          (body as { data?: { id?: string | number } })?.data?.id ??
          url.searchParams.get("data.id") ??
          url.searchParams.get("id") ??
          "";

        if (secret) {
          const xSig = request.headers.get("x-signature") ?? "";
          const xReqId = request.headers.get("x-request-id") ?? "";
          const parts = Object.fromEntries(
            xSig
              .split(",")
              .map((p) => p.trim().split("="))
              .filter((kv): kv is [string, string] => kv.length === 2),
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (!ts || !v1 || !dataId) {
            return new Response("missing_signature", { status: 401 });
          }
          // Reject stale timestamps (>5min) to block replay
          const tsNum = Number(ts);
          if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
            return new Response("stale_signature", { status: 401 });
          }
          const manifest = `id:${dataId};request-id:${xReqId};ts:${ts};`;
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          const a = Buffer.from(expected);
          const b = Buffer.from(v1);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("invalid_signature", { status: 401 });
          }
        }

        const type =
          (body as { type?: string; topic?: string }).type ??
          (body as { topic?: string }).topic ??
          url.searchParams.get("type") ??
          url.searchParams.get("topic");
        const paymentId = dataId;

        if (type !== "payment" || !paymentId) return new Response("ignored");

        // Fetch canonical payment state from MP (never trust webhook body)
        const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mpResp.ok) {
          console.error("[MP webhook] fetch payment failed", mpResp.status, await mpResp.text());
          // 5xx so MP retries; 404 = ignore
          if (mpResp.status === 404) return new Response("unknown_payment");
          return new Response("mp_error", { status: 502 });
        }
        const payment = (await mpResp.json()) as {
          id: number;
          status: string;
          external_reference?: string;
        };
        const orderId = payment.external_reference;
        if (!orderId) return new Response("no_reference");

        const nextStatus = mapMpStatus(payment.status);
        if (!nextStatus) return new Response("unmapped_status");

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, status, candle_id, tribute_name, tribute_message, tribute_photo_url, tribute_birth_date, tribute_death_date, mp_payment_id")
          .eq("id", orderId)
          .maybeSingle();
        if (!order) return new Response("order_not_found", { status: 404 });

        // Reject cross-referenced payments (another payment already bound to this order)
        if (order.mp_payment_id && order.mp_payment_id !== String(payment.id)) {
          console.warn("[MP webhook] payment mismatch", {
            orderId,
            existing: order.mp_payment_id,
            incoming: payment.id,
          });
          return new Response("payment_mismatch", { status: 409 });
        }

        // Idempotent no-op
        if (order.status === nextStatus) return new Response("noop");

        // Enforce forward-only transitions in application layer (DB trigger is the hard guard)
        if (TERMINAL.has(order.status) && !(order.status === "paid" && nextStatus === "refunded")) {
          return new Response("terminal_state");
        }

        const patch: Record<string, unknown> = {
          status: nextStatus,
          mp_payment_id: String(payment.id),
        };
        if (nextStatus === "paid") patch.paid_at = new Date().toISOString();

        // Optimistic concurrency: only transition from the status we just read
        const { data: updated, error: updErr } = await supabaseAdmin
          .from("orders")
          .update(patch as never)
          .eq("id", order.id)
          .eq("status", order.status)
          .select("id")
          .maybeSingle();
        if (updErr) {
          console.error("[MP webhook] update failed", updErr);
          return new Response("update_failed", { status: 500 });
        }
        if (!updated) {
          // Another concurrent webhook already advanced this order
          return new Response("race_noop");
        }

        // Create tribute exactly once. tributes.order_id has a UNIQUE index —
        // concurrent inserts collide safely with 23505.
        if (nextStatus === "paid") {
          const { data: candle } = await supabaseAdmin
            .from("candles")
            .select("duration_hours")
            .eq("id", order.candle_id)
            .maybeSingle();
          const hours = candle?.duration_hours ?? 24 * 7;
          const ends = new Date(Date.now() + hours * 3600_000).toISOString();
          const { error: insErr } = await supabaseAdmin.from("tributes").insert({
            order_id: order.id,
            candle_id: order.candle_id,
            tribute_name: order.tribute_name,
            tribute_message: order.tribute_message,
            ends_at: ends,
          } as never);
          if (insErr && (insErr as { code?: string }).code !== "23505") {
            console.error("[MP webhook] tribute insert failed", insErr);
            return new Response("tribute_failed", { status: 500 });
          }
        }

        return new Response("ok");
      },
    },
  },
});
