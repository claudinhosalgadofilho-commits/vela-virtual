import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyOrders } from "@/lib/my-orders.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, Loader2, Flame, Receipt, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Vela Virtual" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyOrdersPage,
});

const STATUS_META: Record<
  string,
  { label: string; tone: "default" | "secondary" | "destructive"; icon: typeof Clock }
> = {
  paid: { label: "Pago", tone: "default", icon: CheckCircle2 },
  pending: { label: "Aguardando pagamento", tone: "secondary", icon: Clock },
  cancelled: { label: "Cancelado", tone: "destructive", icon: XCircle },
  refunded: { label: "Reembolsado", tone: "secondary", icon: XCircle },
};

function MyOrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
  });

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Receipt className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm">Histórico</span>
            </div>
            <h1 className="mt-1 font-serif text-3xl text-foreground">Meus pedidos</h1>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/velas">Acender nova vela</Link>
          </Button>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Não foi possível carregar seus pedidos.</p>
                <Button onClick={() => refetch()} variant="outline" className="mt-4 rounded-full">
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : !data || data.orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flame className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <h2 className="mt-3 font-serif text-xl">Nenhum pedido ainda</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acenda uma vela para começar uma homenagem.
                </p>
                <Button asChild className="mt-4 rounded-full">
                  <Link to="/velas">Ver planos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {data.orders.map((o) => {
                const meta = STATUS_META[o.status] ?? STATUS_META.pending;
                const Icon = meta.icon;
                const amount = (o.amount_cents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                });
                return (
                  <li key={o.id}>
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                        <div className="min-w-0">
                          <CardTitle className="truncate font-serif text-lg">
                            {o.candle_name}
                          </CardTitle>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            Homenagem a {o.tribute_name}
                          </p>
                        </div>
                        <Badge variant={meta.tone} className="gap-1 shrink-0">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {meta.label}
                        </Badge>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0 text-sm">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                          <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                          <span className="font-medium text-foreground">{amount}</span>
                          {o.payment_method && (
                            <span className="uppercase">{o.payment_method}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="outline" className="rounded-full">
                            <Link to="/pedido/$id" params={{ id: o.id }}>
                              Detalhes
                            </Link>
                          </Button>
                          {o.status === "paid" && o.tribute_id && (
                            <Button asChild size="sm" className="gap-1 rounded-full">
                              <Link to="/homenagem/$id" params={{ id: o.tribute_id }}>
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                Homenagem
                              </Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
          {isFetching && !isLoading && (
            <p className="mt-3 text-center text-xs text-muted-foreground">Atualizando…</p>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
