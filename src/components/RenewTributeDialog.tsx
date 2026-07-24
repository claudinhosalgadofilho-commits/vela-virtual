import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRenewalOrder } from "@/lib/payments.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { ArrowRight, Clock, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const POPULAR_SLUG = "vela-20-dias";

interface RenewTributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tributeId: string;
  tributeName: string;
}

/**
 * Modal para prorrogar uma homenagem existente. Diferente do LightCandleDialog,
 * este cria um pedido de renovação vinculado à homenagem atual — não gera uma nova.
 */
export function RenewTributeDialog({
  open,
  onOpenChange,
  tributeId,
  tributeName,
}: RenewTributeDialogProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["candles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candles")
        .select("*")
        .eq("active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  async function handleRenew(candleId: string) {
    if (processingId) return;
    setProcessingId(candleId);
    const mpTab = window.open("about:blank", "_blank");
    try {
      const result = await createRenewalOrder({
        data: { tribute_id: tributeId, candle_id: candleId },
      });
      const url = result.init_point || result.sandbox_init_point;
      if (!url) throw new Error("Não foi possível obter o link de pagamento.");
      if (mpTab) {
        mpTab.location.href = url;
      } else {
        window.location.href = url;
        return;
      }
      try {
        sessionStorage.setItem("vv:primary_order", result.order_id);
      } catch {}
      onOpenChange(false);
      toast.success("Pagamento aberto em nova aba. Sua homenagem será prorrogada após a confirmação.");
    } catch (err) {
      if (mpTab) mpTab.close();
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o pagamento.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Prorrogar homenagem</p>
          <DialogTitle className="font-serif text-3xl text-foreground">
            Estenda o tempo da vela de {tributeName}
          </DialogTitle>
          <DialogDescription>
            Escolha por quantos dias a mesma homenagem continuará acesa. Nenhuma
            nova homenagem é criada — apenas o período é renovado.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          {data?.map((c) => {
            const isPopular = c.slug === POPULAR_SLUG;
            const days = Math.round(c.duration_hours / 24);
            const isProcessing = processingId === c.id;
            return (
              <div
                key={c.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6 transition-all",
                  isPopular
                    ? "border-gold/70 shadow-glow"
                    : "border-border/60 hover:border-gold/40",
                )}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-background whitespace-nowrap">
                    <Sparkles className="h-3 w-3" /> Mais escolhido
                  </span>
                )}

                <h3 className="font-serif text-xl text-foreground text-center">{c.name}</h3>
                <div className="mt-1 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {days} dias
                </div>

                <div className="mt-4 text-center">
                  <div className="font-serif text-3xl text-primary">
                    {formatBRL(c.price_cents)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">pagamento único</div>
                </div>

                <button
                  onClick={() => handleRenew(c.id)}
                  disabled={!!processingId}
                  className={cn(
                    "mt-6 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-60",
                    isPopular
                      ? "bg-gold text-background hover:opacity-90"
                      : "border border-border/60 text-foreground hover:border-gold/60 hover:text-gold",
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Abrindo...
                    </>
                  ) : (
                    <>
                      Prorrogar por {days} dias <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Pix ou cartão via Mercado Pago. A homenagem continua com o mesmo link.
        </p>
      </DialogContent>
    </Dialog>
  );
}
