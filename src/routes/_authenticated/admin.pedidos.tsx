import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import {
  Trash2, Search, Download, ShoppingCart, DollarSign,
  CheckCircle2, Clock, ExternalLink, X, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";

const PAGE_SIZE_STORAGE_KEY = "admin.pedidos.pageSize";
const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

function getStoredPageSize(): number {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
  const n = raw ? Number(raw) : NaN;
  return ALLOWED_PAGE_SIZES.includes(n) ? n : DEFAULT_PAGE_SIZE;
}

const searchSchema = z.object({
  status: fallback(z.string(), "all").default("all"),
  q: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 0).default(0),
  pageSize: fallback(z.number().int(), DEFAULT_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  validateSearch: zodValidator(searchSchema),
  component: Page,
});

type Status = "pending" | "paid" | "cancelled";

const statusColor: Record<Status, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  paid: "bg-primary/15 text-primary",
  cancelled: "bg-destructive/15 text-destructive",
};

const statusLabel: Record<Status, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
};

type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  tribute_name: string;
  tribute_message: string | null;
  amount_cents: number;
  status: Status;
  payment_method: string;
  external_payment_id: string | null;
  candle_id: string;
  candle: { name: string; slug: string } | null;
};

function Page() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { status: filter, q: urlQ, page, pageSize } = Route.useSearch();
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [search, setSearch] = useState(urlQ);
  const [debouncedSearch, setDebouncedSearch] = useState(urlQ);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  type SP = z.infer<typeof searchSchema>;

  useEffect(() => {
    if (debouncedSearch !== urlQ) {
      navigate({ search: (p: SP) => ({ ...p, q: debouncedSearch, page: 0 }), replace: true });
    }
  }, [debouncedSearch, urlQ, navigate]);

  // Ao montar, se a URL não trouxer pageSize explícito, aplica o valor persistido.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("pageSize")) return;
    const stored = getStoredPageSize();
    if (stored !== pageSize) {
      navigate({ search: (p: SP) => ({ ...p, pageSize: stored, page: 0 }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFilter = (v: string) =>
    navigate({ search: (p: SP) => ({ ...p, status: v, page: 0 }) });
  const setPage = (n: number) =>
    navigate({ search: (p: SP) => ({ ...p, page: n }) });
  const setPageSize = (n: number) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(n));
    }
    navigate({ search: (p: SP) => ({ ...p, pageSize: n, page: 0 }) });
  };
  const hasFilters = filter !== "all" || debouncedSearch !== "" || search !== "";
  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    navigate({ search: () => ({ status: "all", q: "", page: 0, pageSize }) });
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "orders", filter, debouncedSearch, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from("orders")
        .select("*, candle:candles(name, slug)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (filter !== "all") q = q.eq("status", filter);
      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%,()]/g, "");
        q = q.or(
          `customer_name.ilike.%${s}%,customer_email.ilike.%${s}%,tribute_name.ilike.%${s}%`
        );
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as OrderRow[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const { data: kpis } = useQuery({
    queryKey: ["admin", "orders", "kpis"],
    queryFn: async () => {
      const [total, paid, pending, revenue] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("amount_cents").eq("status", "paid"),
      ]);
      return {
        total: total.count ?? 0,
        paidCount: paid.count ?? 0,
        pendingCount: pending.count ?? 0,
        revenue: (revenue.data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0),
      };
    },
  });

  const { data: revenueSeries } = useQuery({
    queryKey: ["admin", "orders", "revenue-30d"],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - 29);
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, amount_cents")
        .eq("status", "paid")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;

      const buckets = new Map<string, { revenue: number; count: number }>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        buckets.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
      }
      for (const row of data ?? []) {
        const key = new Date(row.created_at).toISOString().slice(0, 10);
        const b = buckets.get(key);
        if (b) { b.revenue += (row.amount_cents ?? 0) / 100; b.count += 1; }
      }
      return Array.from(buckets, ([date, v]) => ({
        date,
        label: new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        revenue: Number(v.revenue.toFixed(2)),
        count: v.count,
      }));
    },
  });



  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  }

  async function remove(id: string) {
    if (!confirm("Excluir pedido?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    setSelected(null);
  }

  async function exportCsv() {
    // Exporta TODOS os registros que batem com filtro/busca, não só a página atual
    let q = supabase
      .from("orders")
      .select("*, candle:candles(name, slug)")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (filter !== "all") q = q.eq("status", filter);
    if (debouncedSearch) {
      const s = debouncedSearch.replace(/[%,()]/g, "");
      q = q.or(
        `customer_name.ilike.%${s}%,customer_email.ilike.%${s}%,tribute_name.ilike.%${s}%`
      );
    }
    const { data: all, error } = await q;
    if (error) return toast.error(error.message);
    const list = (all ?? []) as unknown as OrderRow[];
    if (!list.length) return toast.error("Nada para exportar");
    const header = [
      "Data", "Cliente", "Email", "Telefone", "Homenageado",
      "Vela", "Valor (BRL)", "Pagamento", "Status", "ID Externo", "ID",
    ];
    const csvRows = list.map((o) => [
      new Date(o.created_at).toLocaleString("pt-BR"),
      o.customer_name,
      o.customer_email,
      o.customer_phone ?? "",
      o.tribute_name,
      o.candle?.name ?? "",
      (o.amount_cents / 100).toFixed(2).replace(".", ","),
      o.payment_method,
      statusLabel[o.status],
      o.external_payment_id ?? "",
      o.id,
    ]);
    const csv = [header, ...csvRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${list.length} pedido(s) exportado(s)`);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Histórico completo de compras e homenagens.</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={ShoppingCart} label="Total de pedidos" value={String(kpis?.total ?? 0)} />
        <KpiCard icon={DollarSign} label="Receita (pagos)" value={formatBRL(kpis?.revenue ?? 0)} accent />
        <KpiCard icon={CheckCircle2} label="Pagos" value={String(kpis?.paidCount ?? 0)} />
        <KpiCard icon={Clock} label="Pendentes" value={String(kpis?.pendingCount ?? 0)} />
      </div>

      {/* Gráfico de receita — últimos 30 dias */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Receita — últimos 30 dias
            </div>
            <div className="mt-1 font-serif text-xl text-primary sm:text-2xl">
              {formatBRL(Math.round((revenueSeries ?? []).reduce((s, d) => s + d.revenue, 0) * 100))}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="font-serif text-lg text-foreground">
              {(revenueSeries ?? []).reduce((s, d) => s + d.count, 0)}
            </div>
            pedidos pagos
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueSeries ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toFixed(0)}`
                }
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeOpacity: 0.2 }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(value: number, name) =>
                  name === "revenue"
                    ? [formatBRL(Math.round(value * 100)), "Receita"]
                    : [value, "Pedidos"]
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#revenueFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>




      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full flex-1 sm:min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, e-mail, homenageado ou vela..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" onClick={resetFilters} className="gap-2">
              <X className="h-4 w-4" /> Limpar
            </Button>
          )}
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>


      {/* Tabela */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-x-auto">
        {isLoading && (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        )}
        {!isLoading && (
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 text-left">Data</th>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Homenageado</th>
                <th className="p-4 text-left">Vela</th>
                <th className="p-4 text-left">Valor</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {search ? "Nenhum pedido encontrado para a busca." : "Nenhum pedido."}
                </td></tr>
              )}
              {rows.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer transition-colors hover:bg-secondary/30"
                >
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-4">
                    {o.customer_name}<br />
                    <span className="text-xs text-muted-foreground">{o.customer_email}</span>
                  </td>
                  <td className="p-4">{o.tribute_name}</td>
                  <td className="p-4">{o.candle?.name}</td>
                  <td className="p-4 text-primary font-serif">{formatBRL(o.amount_cents)}</td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as Status)}>
                      <SelectTrigger className="w-32 border-none bg-transparent p-0 h-auto">
                        <Badge className={statusColor[o.status] + " capitalize"}>
                          {statusLabel[o.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          {totalCount === 0
            ? "0 resultados"
            : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalCount)} de ${totalCount}`}
          {isFetching && <span className="ml-2 opacity-60">carregando…</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Por página</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>«</Button>
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>‹</Button>
          <span className="px-2 tabular-nums">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>›</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>»</Button>
        </div>
      </div>

      {/* Drawer detalhes */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl">Pedido</SheetTitle>
                <SheetDescription className="font-mono text-xs">{selected.id}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <Badge className={statusColor[selected.status] + " capitalize text-sm px-3 py-1"}>
                    {statusLabel[selected.status]}
                  </Badge>
                  <span className="font-serif text-2xl text-primary">
                    {formatBRL(selected.amount_cents)}
                  </span>
                </div>

                <Section title="Cliente">
                  <Field label="Nome" value={selected.customer_name} />
                  <Field label="E-mail" value={selected.customer_email} />
                  {selected.customer_phone && <Field label="Telefone" value={selected.customer_phone} />}
                </Section>

                <Section title="Homenagem">
                  <Field label="Homenageado" value={selected.tribute_name} />
                  <Field label="Vela" value={selected.candle?.name ?? "—"} />
                  {selected.tribute_message && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Mensagem</div>
                      <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm italic">
                        "{selected.tribute_message}"
                      </p>
                    </div>
                  )}
                </Section>

                <Section title="Pagamento">
                  <Field label="Método" value={selected.payment_method.toUpperCase()} />
                  <Field label="Data" value={new Date(selected.created_at).toLocaleString("pt-BR")} />
                  {selected.external_payment_id && (
                    <Field label="ID externo" value={selected.external_payment_id} />
                  )}
                </Section>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                  {selected.candle?.slug && (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link to="/velas/$slug" params={{ slug: selected.candle.slug }}>
                        <ExternalLink className="h-3.5 w-3.5" /> Ver vela
                      </Link>
                    </Button>
                  )}
                  {selected.status !== "paid" && (
                    <Button size="sm" onClick={() => updateStatus(selected.id, "paid")}>
                      Marcar como pago
                    </Button>
                  )}
                  {selected.status !== "cancelled" && (
                    <Button variant="outline" size="sm" onClick={() => updateStatus(selected.id, "cancelled")}>
                      Cancelar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(selected.id)} className="ml-auto text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, accent,
}: { icon: typeof ShoppingCart; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
        <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{label}</span>
      </div>
      <div className={`mt-2 font-serif text-xl sm:text-2xl ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right break-all">{value}</span>
    </div>
  );
}
