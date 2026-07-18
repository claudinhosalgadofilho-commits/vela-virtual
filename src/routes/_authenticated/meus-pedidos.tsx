import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { listMyOrders } from "@/lib/my-orders.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Flame,
  Receipt,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

const searchSchema = z.object({
  status: fallback(z.string(), "all").default("all"),
  q: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/meus-pedidos")({
  validateSearch: zodValidator(searchSchema),
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

const PAGE_SIZE = 10;

function MyOrdersPage() {
  const { status, q, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/meus-pedidos" });
  const safePage = Math.max(1, page);
  const safeStatus = status in STATUS_META || status === "all" ? status : "all";

  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) {
        navigate({ search: (prev: { status: string; q: string; page: number }) => ({ ...prev, q: qInput, page: 1 }) });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [qInput, q, navigate]);

  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["my-orders", safeStatus, q, safePage],
    queryFn: () =>
      fetchOrders({
        data: {
          status: safeStatus === "all" ? undefined : safeStatus,
          q: q || undefined,
          page: safePage,
          pageSize: PAGE_SIZE,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setStatus = (s: string) =>
    navigate({ search: (prev: { status: string; q: string; page: number }) => ({ ...prev, status: s, page: 1 }) });
  const setPage = (p: number) =>
    navigate({ search: (prev: { status: string; q: string; page: number }) => ({ ...prev, page: Math.min(totalPages, Math.max(1, p)) }) });

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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por nome do homenageado…"
              className="pl-9"
              aria-label="Buscar pedidos"
            />
          </div>
          <Select value={safeStatus} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-56" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Aguardando pagamento</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
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
                <h2 className="mt-3 font-serif text-xl">
                  {q || safeStatus !== "all" ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {q || safeStatus !== "all"
                    ? "Ajuste os filtros ou limpe a busca."
                    : "Acenda uma vela para começar uma homenagem."}
                </p>
                {q || safeStatus !== "all" ? (
                  <Button
                    variant="outline"
                    className="mt-4 rounded-full"
                    onClick={() =>
                      navigate({ search: () => ({ status: "all", q: "", page: 1 }) })
                    }
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  <Button asChild className="mt-4 rounded-full">
                    <Link to="/velas">Ver planos</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
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

              <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Mostrando {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, total)} de {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 rounded-full"
                    disabled={safePage <= 1 || isFetching}
                    onClick={() => setPage(safePage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {safePage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 rounded-full"
                    disabled={safePage >= totalPages || isFetching}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
          {isFetching && !isLoading && (
            <p className="mt-3 text-center text-xs text-muted-foreground">Atualizando…</p>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
