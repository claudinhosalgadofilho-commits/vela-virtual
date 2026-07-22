import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const POPULAR_SLUG = "vela-20-dias";

interface LightCandleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal que apresenta os 3 planos de vela para o visitante escolher
 * e ir direto ao checkout. Usado ao clicar em "Acender a vela".
 */
export function LightCandleDialog({ open, onOpenChange }: LightCandleDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">
            Escolha um plano
          </p>
          <DialogTitle className="font-serif text-3xl text-foreground">
            Acenda uma nova vela
          </DialogTitle>
          <DialogDescription>
            Selecione por quantos dias a vela permanecerá acesa. Pagamento único
            e seguro.
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

                <h3 className="font-serif text-xl text-foreground text-center">
                  {c.name}
                </h3>
                <div className="mt-1 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {days} dias
                </div>

                <div className="mt-4 text-center">
                  <div className="font-serif text-3xl text-primary">
                    {formatBRL(c.price_cents)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    pagamento único
                  </div>
                </div>

                <Link
                  to="/velas/$slug"
                  params={{ slug: c.slug }}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "mt-6 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
                    isPopular
                      ? "bg-gold text-background hover:opacity-90"
                      : "border border-border/60 text-foreground hover:border-gold/60 hover:text-gold",
                  )}
                >
                  Acender esta vela <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Pix, cartão ou boleto — via Mercado Pago. Sem mensalidades.
        </p>
      </DialogContent>
    </Dialog>
  );
}
