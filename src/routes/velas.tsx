import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { ArrowRight, Check, Clock, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/velas")({
  head: () => ({
    meta: [
      { title: "Planos de Homenagem — Vela Virtual" },
      {
        name: "description",
        content:
          "Escolha o tempo da sua homenagem: 10, 20 ou 30 dias de vela acesa, livro de condolências e página exclusiva para compartilhar.",
      },
      { property: "og:title", content: "Planos de Homenagem — Vela Virtual" },
      {
        property: "og:description",
        content: "Acenda uma luz. Eternize uma memória. A partir de R$ 14,90.",
      },
    ],
    links: [{ rel: "canonical", href: "/velas" }],
  }),
  component: Page,
});

const FEATURES_BASE = [
  "Vela virtual acesa 24h por dia",
  "Página exclusiva de homenagem",
  "Livro de condolências digital",
  "Compartilhamento por link e redes sociais",
  "Foto e biografia do homenageado",
];

const FEATURES_EXTRA: Record<string, string[]> = {
  "vela-20-dias": ["Contador regressivo em tempo real", "Suporte prioritário"],
  "vela-30-dias": [
    "Contador regressivo em tempo real",
    "Suporte prioritário",
    "Maior tempo de memória ativa",
  ],
};

const POPULAR_SLUG = "vela-20-dias";

function pricePerDay(cents: number, hours: number) {
  const days = Math.max(1, Math.round(hours / 24));
  return cents / days / 100;
}

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
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">
          Planos de homenagem
        </p>
        <h1 className="mt-3 font-serif text-5xl text-foreground md:text-6xl">
          Acenda uma luz que dura
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Escolha por quantos dias sua vela permanecerá acesa. Cada plano inclui
          uma página única de homenagem, livro de condolências e a possibilidade
          de reunir quem ama em um mesmo lugar de memória.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[560px] rounded-2xl" />
            ))}
          {data?.map((c) => {
            const isPopular = c.slug === POPULAR_SLUG;
            const perDay = pricePerDay(c.price_cents, c.duration_hours);
            const features = [
              ...FEATURES_BASE,
              ...(FEATURES_EXTRA[c.slug] ?? []),
            ];
            return (
              <div
                key={c.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-8 transition-all",
                  isPopular
                    ? "border-gold/70 shadow-glow md:-translate-y-3 md:scale-[1.03]"
                    : "border-border/60 hover:border-gold/40",
                )}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-background">
                    <Sparkles className="h-3 w-3" /> Mais escolhido
                  </span>
                )}

                <div className="flex h-40 items-center justify-center">
                  <CandleFlame size="sm" />
                </div>

                <h3 className="mt-4 font-serif text-2xl text-foreground text-center">
                  {c.name}
                </h3>
                <div className="mt-1 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {Math.round(c.duration_hours / 24)} dias acesa
                </div>

                <div className="mt-6 text-center">
                  <div className="font-serif text-4xl text-primary">
                    {formatBRL(c.price_cents)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    equivalente a R${" "}
                    {perDay.toFixed(2).replace(".", ",")} por dia · pagamento
                    único
                  </div>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/velas/$slug"
                  params={{ slug: c.slug }}
                  className={cn(
                    "mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all",
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

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Pagamento único e seguro via Pix ou cartão. Sem mensalidades, sem
          renovação automática.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 md:px-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">
            Perguntas frequentes
          </p>
          <h2 className="mt-3 font-serif text-3xl text-foreground md:text-4xl">
            Dúvidas comuns sobre a homenagem
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-8">
          <AccordionItem value="q1">
            <AccordionTrigger>Como funciona a duração da vela?</AccordionTrigger>
            <AccordionContent>
              Assim que o pagamento é confirmado, sua vela é acesa e um contador
              regressivo começa a correr pelo período contratado (10, 20 ou 30
              dias). Durante todo esse tempo, a página de homenagem fica
              disponível para visitas e mensagens.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>
              Qual a diferença entre os planos?
            </AccordionTrigger>
            <AccordionContent>
              A principal diferença é o tempo em que a vela permanece acesa e a
              página fica ativa. Todos os planos incluem os mesmos recursos
              essenciais: página exclusiva, livro de condolências, foto,
              biografia e compartilhamento.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q3">
            <AccordionTrigger>Posso estender a homenagem depois?</AccordionTrigger>
            <AccordionContent>
              Sim. Ao final do período, você pode acender uma nova vela para o
              mesmo homenageado quando desejar, mantendo viva a memória.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q4">
            <AccordionTrigger>Quais formas de pagamento aceitam?</AccordionTrigger>
            <AccordionContent>
              Aceitamos Pix (aprovação imediata) e cartão de crédito, ambos
              processados com segurança pelo Mercado Pago. O pagamento é único —
              não há cobranças recorrentes.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q5">
            <AccordionTrigger>Como compartilho a homenagem?</AccordionTrigger>
            <AccordionContent>
              Após a confirmação, você recebe um link único da homenagem que
              pode ser enviado por WhatsApp, e-mail ou publicado nas redes
              sociais. Qualquer pessoa com o link pode visitar e deixar uma
              mensagem no livro de condolências.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </SiteShell>
  );
}
