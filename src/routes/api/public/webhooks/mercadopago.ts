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

type LogInput = {
  event_type?: string | null;
  payment_id?: string | null;
  order_id?: string | null;
  status_code: number;
  result: string;
  mp_status?: string | null;
  signature_ok?: boolean | null;
  raw_body?: unknown;
  headers?: Record<string, string>;
  error?: string | null;
};

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      GET: async () => new Response("ok"),
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const log = async (entry: LogInput) => {
          try {
            await supabaseAdmin.from("webhook_events" as never).insert({
              provider: "mercadopago",
              event_type: entry.event_type ?? null,
              payment_id: entry.payment_id ?? null,
              order_id: entry.order_id ?? null,
              status_code: entry.status_code,
              result: entry.result,
              mp_status: entry.mp_status ?? null,
              signature_ok: entry.signature_ok ?? null,
              raw_body: entry.raw_body ?? null,
              headers: entry.headers ?? null,
              error: entry.error ?? null,
            } as never);
          } catch (e) {
            console.error("[MP webhook] log failed", e);
          }
        };

        const url = new URL(request.url);
        const bodyText = await request.text();
        const headerObj: Record<string, string> = {};
        request.headers.forEach((v, k) => { headerObj[k] = v; });

        let body: Record<string, unknown> = {};
        try {
          body = bodyText ? JSON.parse(bodyText) : {};
        } catch {
          // MP occasionally posts form-encoded — safe to ignore
        }

        const { data: cfg } = await supabaseAdmin
          .from("admin_settings" as never)
          .select("mp_access_token, mp_webhook_secret")
          .eq("id", 1)
          .maybeSingle<{ mp_access_token: string | null; mp_webhook_secret: string | null }>();

        const accessToken = cfg?.mp_access_token?.trim();
        if (!accessToken) {
          await log({ status_code: 503, result: "no_credentials", raw_body: body, headers: headerObj });
          return new Response("no_credentials", { status: 503 });
        }

        const secret = cfg?.mp_webhook_secret?.trim();
        const dataId =
          (body as { data?: { id?: string | number } })?.data?.id ??
          url.searchParams.get("data.id") ??
          url.searchParams.get("id") ??
          "";

        let signatureOk: boolean | null = null;
        if (secret) {
          const xSig = request.headers.get("x-signature") ?? "";
          const xReqId = request.headers.get("x-request-id") ?? "";
          const parts = Object.fromEntries(
            xSig.split(",").map((p) => p.trim().split("=")).filter((kv): kv is [string, string] => kv.length === 2),
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (!ts || !v1 || !dataId) {
            signatureOk = false;
            await log({ status_code: 401, result: "missing_signature", signature_ok: false, raw_body: body, headers: headerObj, payment_id: String(dataId || "") });
            return new Response("missing_signature", { status: 401 });
          }
          const tsRaw = Number(ts);
          // MP sends ts in milliseconds; accept seconds too just in case.
          const tsMs = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
          if (!Number.isFinite(tsRaw) || Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) {
            await log({ status_code: 401, result: "stale_signature", signature_ok: false, raw_body: body, headers: headerObj });
            return new Response("stale_signature", { status: 401 });
          }
          const manifest = `id:${String(dataId).toLowerCase()};request-id:${xReqId};ts:${ts};`;
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          const a = Buffer.from(expected);
          const b = Buffer.from(v1);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            await log({ status_code: 401, result: "invalid_signature", signature_ok: false, raw_body: body, headers: headerObj });
            return new Response("invalid_signature", { status: 401 });
          }
          signatureOk = true;
        }

        const type =
          (body as { type?: string; topic?: string }).type ??
          (body as { topic?: string }).topic ??
          url.searchParams.get("type") ??
          url.searchParams.get("topic");
        const paymentId = String(dataId || "");

        if (type !== "payment" || !paymentId) {
          await log({ status_code: 200, result: "ignored", event_type: type ?? null, payment_id: paymentId || null, raw_body: body, signature_ok: signatureOk });
          return new Response("ignored");
        }

        const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mpResp.ok) {
          const errText = await mpResp.text();
          console.error("[MP webhook] fetch payment failed", mpResp.status, errText);
          if (mpResp.status === 404) {
            await log({ status_code: 200, result: "unknown_payment", event_type: type, payment_id: paymentId, raw_body: body, signature_ok: signatureOk, error: errText });
            return new Response("unknown_payment");
          }
          await log({ status_code: 502, result: "mp_error", event_type: type, payment_id: paymentId, raw_body: body, signature_ok: signatureOk, error: errText });
          return new Response("mp_error", { status: 502 });
        }
        const payment = (await mpResp.json()) as { id: number; status: string; external_reference?: string };
        const orderId = payment.external_reference;
        if (!orderId) {
          await log({ status_code: 200, result: "no_reference", event_type: type, payment_id: paymentId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
          return new Response("no_reference");
        }

        const nextStatus = mapMpStatus(payment.status);
        if (!nextStatus) {
          await log({ status_code: 200, result: "unmapped_status", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
          return new Response("unmapped_status");
        }

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, status, candle_id, tribute_name, tribute_message, tribute_photo_url, tribute_birth_date, tribute_death_date, mp_payment_id")
          .eq("id", orderId)
          .maybeSingle();
        if (!order) {
          await log({ status_code: 404, result: "order_not_found", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
          return new Response("order_not_found", { status: 404 });
        }

        if (order.mp_payment_id && order.mp_payment_id !== String(payment.id)) {
          console.warn("[MP webhook] payment mismatch", { orderId, existing: order.mp_payment_id, incoming: payment.id });
          await log({ status_code: 409, result: "payment_mismatch", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
          return new Response("payment_mismatch", { status: 409 });
        }

        if (order.status === nextStatus) {
          await log({ status_code: 200, result: "noop", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
          return new Response("noop");
        }

        if (TERMINAL.has(order.status) && !(order.status === "paid" && nextStatus === "refunded")) {
          await log({ status_code: 200, result: "terminal_state", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
          return new Response("terminal_state");
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
          console.error("[MP webhook] update failed", updErr);
          await log({ status_code: 500, result: "update_failed", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk, error: updErr.message });
          return new Response("update_failed", { status: 500 });
        }
        if (!updated) {
          await log({ status_code: 200, result: "race_noop", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
          return new Response("race_noop");
        }

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
            tribute_photo_url: (order as { tribute_photo_url?: string | null }).tribute_photo_url ?? null,
            tribute_birth_date: (order as { tribute_birth_date?: string | null }).tribute_birth_date ?? null,
            tribute_death_date: (order as { tribute_death_date?: string | null }).tribute_death_date ?? null,
            ends_at: ends,
          } as never);
          if (insErr && (insErr as { code?: string }).code !== "23505") {
            console.error("[MP webhook] tribute insert failed", insErr);
            await log({ status_code: 500, result: "tribute_failed", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk, error: insErr.message });
            return new Response("tribute_failed", { status: 500 });
          }
        }

        await log({ status_code: 200, result: "ok", event_type: type, payment_id: paymentId, order_id: orderId, mp_status: payment.status, raw_body: body, signature_ok: signatureOk });
        return new Response("ok");
      },
    },
  },
});
