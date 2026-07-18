import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_STATUS = ["paid", "pending", "cancelled", "refunded"] as const;

const inputSchema = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data ?? {}))
  .handler(async ({ context, data }) => {
    const email = (context.claims as { email?: string }).email?.toLowerCase().trim();
    if (!email) return { orders: [] as MyOrder[], total: 0, page: data.page, pageSize: data.pageSize };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = supabaseAdmin
      .from("orders")
      .select(
        "id, status, amount_cents, payment_method, tribute_name, candle_id, created_at, paid_at",
        { count: "exact" },
      )
      .ilike("customer_email", email);

    if (data.status && (ALLOWED_STATUS as readonly string[]).includes(data.status)) {
      query = query.eq("status", data.status as (typeof ALLOWED_STATUS)[number]);
    }
    const term = data.q?.trim();
    if (term) {
      query = query.ilike("tribute_name", `%${term}%`);
    }

    const { data: orders, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error("Falha ao carregar pedidos");
    const list = orders ?? [];
    const candleIds = Array.from(new Set(list.map((o) => o.candle_id)));
    const candleMap: Record<string, { name: string; slug: string }> = {};
    if (candleIds.length) {
      const { data: candles } = await supabaseAdmin
        .from("candles")
        .select("id, name, slug")
        .in("id", candleIds);
      for (const c of candles ?? []) candleMap[c.id] = { name: c.name, slug: c.slug };
    }
    const orderIds = list.filter((o) => o.status === "paid").map((o) => o.id);
    const tributeMap: Record<string, string> = {};
    if (orderIds.length) {
      const { data: tributes } = await supabaseAdmin
        .from("tributes")
        .select("id, order_id")
        .in("order_id", orderIds);
      for (const t of tributes ?? []) if (t.order_id) tributeMap[t.order_id] = t.id;
    }
    return {
      orders: list.map((o) => ({
        id: o.id,
        status: o.status,
        amount_cents: o.amount_cents,
        payment_method: o.payment_method,
        tribute_name: o.tribute_name,
        candle_name: candleMap[o.candle_id]?.name ?? "—",
        created_at: o.created_at,
        paid_at: o.paid_at,
        tribute_id: tributeMap[o.id] ?? null,
      })) satisfies MyOrder[],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export type MyOrder = {
  id: string;
  status: string;
  amount_cents: number;
  payment_method: string | null;
  tribute_name: string;
  candle_name: string;
  created_at: string;
  paid_at: string | null;
  tribute_id: string | null;
};
