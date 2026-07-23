import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homenagens")({
  component: Page,
});

function Countdown({ endsAt, litAt }: { endsAt: string; litAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!litAt) return <span className="text-muted-foreground">Não acesa</span>;

  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return <span className="text-muted-foreground">Encerrada</span>;

  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return <span className="font-mono tabular-nums text-primary">{label}</span>;
}

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tributes")
        .select("*, candle:candles(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    if (!confirm("Excluir esta homenagem?")) return;
    const { error } = await supabase.from("tributes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["admin", "tributes"] }); }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Homenagens</h1>
        <p className="text-sm text-muted-foreground">Todas as velas criadas na plataforma.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-x-auto">
        {isLoading && <div className="p-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>}
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Homenageado</th>
              <th className="p-4 text-left">Vela</th>
              <th className="p-4 text-left">Início</th>
              <th className="p-4 text-left">Encerra</th>
              <th className="p-4 text-left">Tempo restante</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma homenagem ainda.</td></tr>}
            {data?.map((t) => {
              const ended = new Date(t.ends_at).getTime() <= Date.now();
              return (
                <tr key={t.id}>
                  <td className="p-4 font-medium">{t.tribute_name}</td>
                  <td className="p-4">{t.candle?.name}</td>
                  <td className="p-4 text-muted-foreground">{new Date(t.starts_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4 text-muted-foreground">{new Date(t.ends_at).toLocaleString("pt-BR")}</td>
                  <td className="p-4">
                    <Countdown endsAt={t.ends_at} litAt={t.lit_at} />
                  </td>
                  <td className="p-4">
                    <Badge className={ended ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}>
                      {ended ? "Encerrada" : "Ativa"}
                    </Badge>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to="/homenagem/$id" params={{ id: t.id }} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
