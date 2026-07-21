import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, RefreshCw, Webhook as WebhookIcon, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/webhooks")({
  component: WebhooksPage,
});

type WebhookEvent = {
  id: string;
  provider: string;
  event_type: string | null;
  payment_id: string | null;
  order_id: string | null;
  status_code: number;
  result: string;
  mp_status: string | null;
  signature_ok: boolean | null;
  raw_body: unknown;
  headers: unknown;
  error: string | null;
  created_at: string;
};

function WebhooksPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/webhooks/mercadopago`
      : "/api/public/webhooks/mercadopago";

  const { data: events, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["webhook_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_events" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as WebhookEvent[];
    },
  });

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada");
  }

  function statusColor(code: number) {
    if (code >= 200 && code < 300) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (code === 401 || code === 409) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  }

  const successCount = events?.filter((e) => e.status_code >= 200 && e.status_code < 300).length ?? 0;
  const errorCount = events?.filter((e) => e.status_code >= 400).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Notificações recebidas do Mercado Pago em tempo real.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* URL do webhook */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <WebhookIcon className="h-4 w-4 text-gold" />
          <h2 className="font-serif text-lg text-foreground">URL de notificação</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure esta URL no painel do Mercado Pago em <strong>Suas integrações → Webhooks → Notificações de pagamentos</strong>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 truncate rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-foreground">
            {webhookUrl}
          </code>
          <Button size="sm" variant="secondary" onClick={copyUrl}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Copiar
          </Button>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="uppercase tracking-widest text-[10px]">Evento</p>
            <p className="mt-1 text-sm text-foreground">Pagamentos (payment)</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="uppercase tracking-widest text-[10px]">Método</p>
            <p className="mt-1 text-sm text-foreground">POST</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="uppercase tracking-widest text-[10px]">Assinatura</p>
            <p className="mt-1 text-sm text-foreground">HMAC SHA-256 (x-signature)</p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total (últimos 100)" value={events?.length ?? 0} icon={<WebhookIcon className="h-4 w-4" />} />
        <StatCard label="Sucesso" value={successCount} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
        <StatCard label="Erros / rejeições" value={errorCount} icon={<XCircle className="h-4 w-4 text-destructive" />} />
      </div>

      {/* Eventos */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-soft">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-serif text-lg text-foreground">Eventos recentes</h2>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-serif text-lg text-foreground">Nenhum evento ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assim que o Mercado Pago enviar a primeira notificação, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((ev) => {
              const isOpen = expanded === ev.id;
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : ev.id)}
                    className="flex w-full flex-wrap items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-secondary/30"
                  >
                    <Badge variant="outline" className={statusColor(ev.status_code)}>
                      {ev.status_code}
                    </Badge>
                    <span className="font-mono text-xs text-foreground">{ev.result}</span>
                    {ev.mp_status && (
                      <span className="text-xs text-muted-foreground">
                        MP: <strong className="text-foreground">{ev.mp_status}</strong>
                      </span>
                    )}
                    {ev.payment_id && (
                      <span className="text-xs text-muted-foreground">
                        pay <code className="rounded bg-secondary/60 px-1">{ev.payment_id}</code>
                      </span>
                    )}
                    {ev.signature_ok === true && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        assinado ✓
                      </Badge>
                    )}
                    {ev.signature_ok === false && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        sem assinatura
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 border-t border-border bg-secondary/20 px-6 py-4">
                      {ev.order_id && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">order_id: </span>
                          <code className="rounded bg-secondary/60 px-1 text-foreground">{ev.order_id}</code>
                        </div>
                      )}
                      {ev.error && (
                        <div className="text-xs text-destructive">Erro: {ev.error}</div>
                      )}
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                          Corpo da notificação
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-foreground">
                          {JSON.stringify(ev.raw_body ?? {}, null, 2)}
                        </pre>
                      </details>
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                          Headers
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-foreground">
                          {JSON.stringify(ev.headers ?? {}, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-serif text-3xl text-foreground">{value}</p>
    </div>
  );
}
