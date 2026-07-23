import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrderDetails } from "@/lib/payments.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Copy,
  Flame,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Status do pedido — Vela Virtual" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderStatusPage,
});

const STATUS_MAP: Record<
  string,
  { label: string; tone: "success" | "warning" | "destructive" | "muted"; icon: typeof Clock }
> = {
  paid: { label: "Pago", tone: "success", icon: CheckCircle2 },
  pending: { label: "Aguardando pagamento", tone: "warning", icon: Clock },
  cancelled: { label: "Cancelado", tone: "destructive", icon: XCircle },
  refunded: { label: "Reembolsado", tone: "muted", icon: XCircle },
};

function OrderStatusPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetails = useServerFn(getOrderDetails);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["order-details", id],
    queryFn: () => fetchDetails({ data: { order_id: id } }),
    refetchInterval: (q) => {
      const status = (q.state.data as { order?: { status?: string } } | undefined)?.order?.status;
      return status === "pending" ? 5000 : false;
    },
  });

  const tributeId = data?.found ? data.tribute_id : null;
  const status = data?.found ? data.order.status : null;
  useEffect(() => {
    if (status === "paid" && tributeId) {
      const t = setTimeout(() => {
        navigate({ to: "/homenagem/$id", params: { id: tributeId } });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [status, tributeId, navigate]);


  if (isLoading) {
    return (
      <SiteShell>
        <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-4 text-muted-foreground">Carregando status do pedido…</p>
        </main>
      </SiteShell>
    );
  }

  if (!data?.found) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl">Pedido não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique se o link está correto ou faça um novo pedido.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/velas">Ver velas</Link>
          </Button>
        </main>
      </SiteShell>
    );
  }

  const { order, tribute_id, candle } = data;
  const meta = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
  const Icon = meta.icon;
  const amount = (order.amount_cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const copyPix = async () => {
    if (!order.pix_qr_code) return;
    await navigator.clipboard.writeText(order.pix_qr_code);
    toast.success("Código PIX copiado");
  };

  return (
    <SiteShell>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Pedido <span className="font-mono">{order.id.slice(0, 8)}</span>
          </p>
        </div>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-serif text-2xl">Status do pedido</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Criado em {new Date(order.created_at).toLocaleString("pt-BR")}
              </p>
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
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {meta.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Homenageado(a)</dt>
                <dd className="font-medium">{order.tribute_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vela</dt>
                <dd className="font-medium">{candle?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Comprador</dt>
                <dd className="font-medium">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-medium">{amount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Método</dt>
                <dd className="font-medium uppercase">{order.payment_method ?? "—"}</dd>
              </div>
              {order.paid_at && (
                <div>
                  <dt className="text-muted-foreground">Pago em</dt>
                  <dd className="font-medium">
                    {new Date(order.paid_at).toLocaleString("pt-BR")}
                  </dd>
                </div>
              )}
            </dl>

            {order.status === "pending" && order.payment_method === "pix" && order.pix_qr_code && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h2 className="font-serif text-lg">Pague com PIX</h2>
                  {order.pix_qr_base64 && (
                    <img
                      src={`data:image/png;base64,${order.pix_qr_base64}`}
                      alt="QR Code PIX"
                      className="mx-auto h-48 w-48 rounded-md border bg-white p-2"
                    />
                  )}
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      PIX copia e cola
                    </p>
                    <p className="break-all font-mono text-xs">{order.pix_qr_code}</p>
                  </div>
                  <Button onClick={copyPix} variant="outline" className="w-full gap-2">
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copiar código PIX
                  </Button>
                  <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                    {isFetching
                      ? "Verificando pagamento…"
                      : "Esta página atualiza automaticamente."}
                  </p>
                </div>
              </>
            )}

            {order.status === "paid" && tribute_id && (
              <>
                <Separator />
                <p className="text-center text-sm text-muted-foreground" aria-live="polite">
                  Pagamento confirmado. Redirecionando para a homenagem…
                </p>
                <Button asChild className="w-full gap-2 rounded-full">
                  <Link to="/homenagem/$id" params={{ id: tribute_id }}>
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    Ver homenagem agora
                  </Link>
                </Button>
              </>
            )}


            {(order.status === "cancelled" || order.status === "refunded") && (
              <>
                <Separator />
                <Button asChild className="w-full rounded-full">
                  <Link to="/velas">Fazer novo pedido</Link>
                </Button>
              </>
            )}

            <div className="flex flex-wrap justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => refetch()}
                className="underline-offset-2 hover:underline"
              >
                Atualizar agora
              </button>
              {order.mp_payment_id && <span>MP #{order.mp_payment_id}</span>}
            </div>
          </CardContent>
        </Card>
      </main>
    </SiteShell>
  );
}
