import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getOrderStatus } from "@/lib/payments.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const search = z.object({
  order: z.string().uuid().optional(),
  payment_id: z.coerce.string().optional(),
  collection_id: z.coerce.string().optional(),
  merchant_order_id: z.coerce.string().optional(),
});

export const Route = createFileRoute("/pedido/pendente")({
  validateSearch: (raw) => search.parse(raw),
  component: PendingPage,
});

function PendingPage() {
  const { order } = Route.useSearch();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "paid" | "failed" | "waiting">("loading");

  useEffect(() => {
    if (!order) {
      setState("failed");
      return;
    }
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const res = await getOrderStatus({ data: { order_id: order!, ...searchParams } });
        if (cancelled) return;
        if (res.status === "paid" && res.tribute_id) {
          setState("paid");
          setTimeout(() => {
            navigate({ to: "/homenagem/$id", params: { id: res.tribute_id! } });
          }, 800);
          return;
        }
        if (res.status === "cancelled" || res.status === "refunded") {
          setState("failed");
          return;
        }
        attempts += 1;
        setState(attempts > 5 ? "waiting" : "loading");
      } catch {
        // keep polling — transient errors shouldn't stop us
      }
    }

    poll();
    const id = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [order, navigate]);

  return (
    <SiteShell>
      <main
        className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center"
        aria-live="polite"
        aria-busy={state === "loading" || state === "waiting"}
      >
        {state === "paid" ? (
          <>
            <CheckCircle2 className="h-14 w-14 text-primary" aria-hidden="true" />
            <h1 className="mt-6 font-serif text-3xl text-foreground">Pagamento confirmado</h1>
            <p className="mt-2 text-muted-foreground">Acendendo a vela da sua homenagem…</p>
          </>
        ) : state === "failed" ? (
          <>
            <XCircle className="h-14 w-14 text-destructive" aria-hidden="true" />
            <h1 className="mt-6 font-serif text-3xl text-foreground">Pagamento não concluído</h1>
            <p className="mt-2 text-muted-foreground">
              Se o valor foi cobrado, a vela será acesa automaticamente assim que o Mercado Pago confirmar.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/velas">Tentar novamente</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-6 font-serif text-3xl text-foreground">
              {state === "waiting" ? "Aguardando confirmação" : "Processando pagamento"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Não feche esta página. Assim que o Mercado Pago confirmar, você será direcionado para a homenagem.
            </p>
          </>
        )}
      </main>
    </SiteShell>
  );
}
