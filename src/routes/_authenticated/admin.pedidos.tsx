import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
  CheckCircle2, Clock, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
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
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [filter, debouncedSearch, pageSize]);

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

  const kpis = useMemo(() => {
    const list = data ?? [];
    const paid = list.filter((o) => o.status === "paid");
    const pending = list.filter((o) => o.status === "pending");
    const revenue = paid.reduce((sum, o) => sum + o.amount_cents, 0);
    return {
      total: list.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      revenue,
    };
  }, [data]);

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

  function exportCsv() {
    if (!filtered.length) return toast.error("Nada para exportar");
    const header = [
      "Data", "Cliente", "Email", "Telefone", "Homenageado",
      "Vela", "Valor (BRL)", "Pagamento", "Status", "ID Externo", "ID",
    ];
    const rows = filtered.map((o) => [
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
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} pedido(s) exportado(s)`);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Histórico completo de compras e homenagens.</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={ShoppingCart} label="Total de pedidos" value={String(kpis.total)} />
        <KpiCard icon={DollarSign} label="Receita (pagos)" value={formatBRL(kpis.revenue)} accent />
        <KpiCard icon={CheckCircle2} label="Pagos" value={String(kpis.paidCount)} />
        <KpiCard icon={Clock} label="Pendentes" value={String(kpis.pendingCount)} />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, e-mail, homenageado ou vela..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
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
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {search ? "Nenhum pedido encontrado para a busca." : "Nenhum pedido."}
                </td></tr>
              )}
              {filtered.map((o) => (
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-2 font-serif text-2xl ${accent ? "text-primary" : "text-foreground"}`}>
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
