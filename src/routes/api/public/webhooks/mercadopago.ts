import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { syncMercadoPagoMerchantOrder, syncMercadoPagoPayment } from "@/lib/payments.server";

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
        const resource = String((body as { resource?: string })?.resource ?? "");
        const resourceId = resource ? resource.split("/").filter(Boolean).pop() : null;
        const dataId =
          (body as { data?: { id?: string | number } })?.data?.id ??
          resourceId ??
          url.searchParams.get("data.id") ??
          url.searchParams.get("resource")?.split("/").filter(Boolean).pop() ??
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
          url.searchParams.get("topic") ??
          (resource.includes("merchant_orders") ? "merchant_order" : null) ??
          (resource.includes("payments") ? "payment" : null);
        const paymentId = String(dataId || "");

        if (type !== "payment" && type !== "merchant_order") {
          await log({ status_code: 200, result: "ignored", event_type: type ?? null, payment_id: paymentId || null, raw_body: body, signature_ok: signatureOk });
          return new Response("ignored");
        }

        if (!paymentId) {
          await log({ status_code: 200, result: "ignored", event_type: type ?? null, raw_body: body, signature_ok: signatureOk });
          return new Response("ignored");
        }

        try {
          const sync = type === "merchant_order"
            ? await syncMercadoPagoMerchantOrder(paymentId)
            : await syncMercadoPagoPayment(paymentId);
          const statusCode =
            sync.result === "order_not_found" ? 404 :
              sync.result === "payment_mismatch" ? 409 :
                sync.result === "update_failed" || sync.result === "tribute_failed" || sync.result === "mp_error" ? 500 :
                  200;

          await log({
            status_code: statusCode,
            result: sync.result,
            event_type: type,
            payment_id: sync.payment_id ?? paymentId,
            order_id: sync.order_id ?? null,
            mp_status: sync.mp_status ?? null,
            raw_body: body,
            signature_ok: signatureOk,
            error: sync.error ?? null,
          });
          return new Response(sync.result, { status: statusCode });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao processar pagamento";
          console.error("[MP webhook] sync failed", error);
          await log({ status_code: 502, result: "mp_error", event_type: type, payment_id: paymentId, raw_body: body, signature_ok: signatureOk, error: message });
          return new Response("mp_error", { status: 502 });
        }
      },
    },
  },
});
