import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { ArrowRight, Clock } from "lucide-react";

export const Route = createFileRoute("/velas")({
  head: () => ({
    meta: [
      { title: "Acender uma Vela — Velas de Luz" },
      { name: "description", content: "Escolha entre nossos modelos de velas virtuais e crie uma homenagem digital." },
      { property: "og:title", content: "Acender uma Vela" },
      { property: "og:description", content: "Escolha o modelo ideal para sua homenagem." },
    ],
    links: [{ rel: "canonical", href: "/velas" }],
  }),
  component: Page,
});

function Page() {
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
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Acender uma vela</p>
        <h1 className="mt-3 font-serif text-5xl text-foreground md:text-6xl">
          Escolha sua homenagem
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Cada vela oferece uma duração distinta. Escolha aquela que melhor
          representa o seu gesto.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          {data?.map((c) => (
            <Link
              key={c.id}
              to="/velas/$slug"
              params={{ slug: c.slug }}
              className="group flex flex-col rounded-2xl border border-border/60 bg-card p-8 transition-all hover:border-gold/50 hover:shadow-glow"
            >
              <div className="flex h-48 items-center justify-center">
                <CandleFlame size="sm" />
              </div>
              <h3 className="mt-6 font-serif text-2xl text-foreground">{c.name}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.description}</p>
              <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {Math.round(c.duration_hours / 24)} dias
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-5">
                <span className="font-serif text-2xl text-primary">
                  {formatBRL(c.price_cents)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-gold group-hover:gap-2 transition-all">
                  Acender <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
