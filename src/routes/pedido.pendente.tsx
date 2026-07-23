import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getOrderDetails } from "@/lib/payments.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, XCircle, Clock, Receipt, Flame } from "lucide-react";

const search = z.object({
  order: z.string().uuid().optional(),
  payment_id: z.coerce.string().optional(),
  collection_id: z.coerce.string().optional(),
  merchant_order_id: z.coerce.string().optional(),
});

export const Route = createFileRoute("/pedido/pendente")({
  validateSearch: (raw) => search.parse(raw),
  head: () => ({
    meta: [
      { title: "Status do pagamento — Vela Virtual" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PendingPage,
});

type DetailsResult = Awaited<ReturnType<typeof getOrderDetails>>;

const STATUS_MAP: Record<
  string,
  { label: string; tone: "success" | "warning" | "destructive" | "muted"; icon: typeof Clock; message: string }
> = {
  paid: {
    label: "Pago",
    tone: "success",
    icon: CheckCircle2,
    message: "Pagamento confirmado! Acendendo sua vela…",
  },
  pending: {
    label: "Aguardando confirmação",
    tone: "warning",
    icon: Clock,
    message: "Assim que o Mercado Pago confirmar, você será direcionado.",
  },
  cancelled: {
    label: "Cancelado",
    tone: "destructive",
    icon: XCircle,
    message: "O pagamento foi cancelado. Você pode tentar novamente.",
  },
  refunded: {
    label: "Reembolsado",
    tone: "muted",
    icon: XCircle,
    message: "Este pedido foi reembolsado.",
  },
};

function PendingPage() {
  const { order, payment_id, collection_id, merchant_order_id } = Route.useSearch();
  const navigate = useNavigate();
  const fetchDetails = useServerFn(getOrderDetails);
  const [details, setDetails] = useState<DetailsResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!order) return;
    const orderId = order;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetchDetails({
          data: { order_id: orderId, payment_id, collection_id, merchant_order_id },
        });
        if (cancelled) return;
        setLastError(null);
        setDetails(res);
        if (res.found && res.order.status === "paid" && res.tribute_id) {
          let isPrimary = true;
          try {
            const primary = sessionStorage.getItem("vv:primary_order");
            isPrimary = primary === orderId;
          } catch {}
          if (!isPrimary) {
            // Esta é a aba do checkout do Mercado Pago — fecha automaticamente.
            try {
              window.close();
            } catch {}
            // Fallback: se o navegador não permitir fechar, redireciona.
            setTimeout(() => {
              navigate({ to: "/homenagem/$id", params: { id: res.tribute_id! }, replace: true });
            }, 300);
            return;
          }
          navigate({ to: "/homenagem/$id", params: { id: res.tribute_id }, replace: true });
          return;
        }
        setAttempts((a) => a + 1);
      } catch (error) {
        console.error("[Pedido pendente] falha ao consultar status", error);
        if (!cancelled) {
          setLastError("Não foi possível consultar o status agora. Tentando novamente…");
          setAttempts((a) => a + 1);
        }
        // keep polling
      }
    }

    poll();
    const id = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [order, payment_id, collection_id, merchant_order_id, navigate, fetchDetails]);

  if (!order) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl">Pedido não informado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Retorne à página das velas para iniciar um novo pedido.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/velas">Ver velas</Link>
          </Button>
        </main>
      </SiteShell>
    );
  }

  if (!details) {
    return (
      <SiteShell>
        <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-4 text-muted-foreground">Verificando status do pagamento…</p>
          {lastError && <p className="mt-2 text-center text-xs text-muted-foreground">{lastError}</p>}
        </main>
      </SiteShell>
    );
  }

  if (!details.found) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl">Pedido não encontrado</h1>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/velas">Ver velas</Link>
          </Button>
        </main>
      </SiteShell>
    );
  }

  const { order: ord, candle, tribute_id } = details;
  const meta = STATUS_MAP[ord.status] ?? STATUS_MAP.pending;
  const Icon = meta.icon;
  const amount = (ord.amount_cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <SiteShell>
      <main
        className="mx-auto max-w-2xl px-4 py-10"
        aria-live="polite"
        aria-busy={ord.status === "pending"}
      >
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Pedido <span className="font-mono">{ord.id.slice(0, 8)}</span>
          </p>
        </div>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-serif text-2xl">Status do pagamento</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{meta.message}</p>
            </div>
            <Badge
              variant={
                meta.tone === "success"
                  ? "default"
                  : meta.tone === "destructive"
                    ? "destructive"
                    : "secondary"
              }
              className="gap-1"
            >
              <Icon
                className={`h-3.5 w-3.5 ${ord.status === "pending" ? "animate-pulse" : ""}`}
                aria-hidden="true"
              />
              {meta.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Homenageado(a)</dt>
                <dd className="font-medium">{ord.tribute_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vela</dt>
                <dd className="font-medium">{candle?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-medium">{amount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Método</dt>
                <dd className="font-medium uppercase">{ord.payment_method ?? "—"}</dd>
              </div>
            </dl>

            {ord.status === "pending" && (
              <>
                <Separator />
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {attempts > 5
                    ? "Ainda aguardando confirmação do Mercado Pago…"
                    : "Verificando pagamento automaticamente…"}
                </div>
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link to="/pedido/$id" params={{ id: ord.id }}>
                    Ver detalhes do pedido
                  </Link>
                </Button>
              </>
            )}

            {ord.status === "paid" && tribute_id && (
              <>
                <Separator />
                <Button asChild className="w-full gap-2 rounded-full">
                  <Link to="/homenagem/$id" params={{ id: tribute_id }}>
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    Ver homenagem agora
                  </Link>
                </Button>
              </>
            )}

            {(ord.status === "cancelled" || ord.status === "refunded") && (
              <>
                <Separator />
                <Button asChild className="w-full rounded-full">
                  <Link to="/velas">Fazer novo pedido</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </SiteShell>
  );
}
