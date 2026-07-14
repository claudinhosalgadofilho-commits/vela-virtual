import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: Page,
});

type Status = "pending" | "paid" | "cancelled";

const statusColor: Record<Status, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  paid: "bg-primary/15 text-primary",
  cancelled: "bg-destructive/15 text-destructive",
};

function Page() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", filter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, candle:candles(name)").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir pedido?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de compras.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-x-auto">
        {isLoading && <div className="p-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>}
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
            {data?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum pedido.</td></tr>}
            {data?.map((o) => (
              <tr key={o.id}>
                <td className="p-4 text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-4">{o.customer_name}<br /><span className="text-xs text-muted-foreground">{o.customer_email}</span></td>
                <td className="p-4">{o.tribute_name}</td>
                <td className="p-4">{o.candle?.name}</td>
                <td className="p-4 text-primary font-serif">{formatBRL(o.amount_cents)}</td>
                <td className="p-4">
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as Status)}>
                    <SelectTrigger className="w-32 border-none bg-transparent p-0 h-auto">
                      <Badge className={statusColor[o.status as Status] + " capitalize"}>{o.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
