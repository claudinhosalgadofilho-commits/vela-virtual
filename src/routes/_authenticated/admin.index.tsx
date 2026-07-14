import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Package, TrendingUp, DollarSign } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [ordersRes, tributesRes] = await Promise.all([
        supabase.from("orders").select("id, amount_cents, status, created_at, tribute_name, candle:candles(name)").order("created_at", { ascending: false }),
        supabase.from("tributes").select("id, ends_at, active"),
      ]);
      const orders = ordersRes.data ?? [];
      const tributes = tributesRes.data ?? [];
      const now = Date.now();

      const paid = orders.filter((o) => o.status === "paid");
      const revenue = paid.reduce((sum, o) => sum + o.amount_cents, 0);
      const activeTributes = tributes.filter((t) => t.active && new Date(t.ends_at).getTime() > now).length;
      const endedTributes = tributes.length - activeTributes;

      return {
        totalOrders: orders.length,
        paidOrders: paid.length,
        revenue,
        activeTributes,
        endedTributes,
        recent: orders.slice(0, 5),
      };
    },
  });

  const cards = [
    { label: "Receita total", value: data ? formatBRL(data.revenue) : "—", icon: DollarSign },
    { label: "Vendas pagas", value: data?.paidOrders ?? "—", icon: TrendingUp },
    { label: "Velas ativas", value: data?.activeTributes ?? "—", icon: Flame },
    { label: "Velas encerradas", value: data?.endedTributes ?? "—", icon: Package },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <c.icon className="h-4 w-4 text-gold" strokeWidth={1.7} />
            </div>
            <p className="mt-3 font-serif text-3xl text-foreground">
              {isLoading ? <Skeleton className="h-8 w-24" /> : c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-serif text-xl text-foreground">Últimas homenagens</h2>
        <div className="mt-4 divide-y divide-border">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-3 h-12" />)}
          {data?.recent.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">Nenhum pedido ainda.</p>
          )}
          {data?.recent.map((o) => (
            <div key={o.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-foreground">{o.tribute_name}</p>
                <p className="text-xs text-muted-foreground">
                  {o.candle?.name} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-lg text-primary">{formatBRL(o.amount_cents)}</p>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{o.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <Link to="/admin/pedidos" className="text-sm text-primary hover:underline">Ver todos →</Link>
        </div>
      </div>
    </div>
  );
}
