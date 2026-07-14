import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, Heart, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vela Virtual Santa Luzia — Acenda uma luz, eternize uma memória" },
      { name: "description", content: "Preste sua homenagem acendendo uma vela virtual e deixe uma mensagem de conforto à família. Uma chama que permanece acesa por 9 dias." },
      { property: "og:title", content: "Vela Virtual Santa Luzia" },
      { property: "og:description", content: "Acenda uma luz. Eternize uma memória." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: candles } = useQuery({
    queryKey: ["candles", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candles")
        .select("*")
        .eq("active", true)
        .order("display_order")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(201,169,97,0.10),transparent_60%)]" />

        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:gap-16 md:px-8 md:py-24">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-gold">
              Vela Virtual Santa Luzia
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] text-foreground md:text-6xl lg:text-7xl">
              Acenda uma luz.<br />
              <span className="italic text-primary">Eternize</span> uma memória.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Preste sua homenagem acendendo uma vela virtual e deixe uma
              mensagem de conforto à família. Uma chama que permanece acesa
              por 9 dias, acessível de qualquer lugar.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-primary px-7 hover:bg-primary/90">
                <Link to="/velas">
                  Acender uma vela
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="rounded-full">
                <Link to="/como-funciona">Como funciona</Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center py-12 md:py-0">
            <CandleFlame />
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-4xl text-foreground md:text-5xl">
            Um gesto simples, uma memória eterna.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Uma homenagem digital feita com respeito e cuidado.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            { icon: Heart, title: "Respeito e cuidado", text: "Cada homenagem é tratada com a serenidade que o momento pede." },
            { icon: Sparkles, title: "Elegância atemporal", text: "Uma experiência visual serena, sem excessos, feita para durar." },
            { icon: Shield, title: "Sempre acessível", text: "Um link único que pode ser compartilhado com toda a família, em qualquer dispositivo." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/8 ring-1 ring-primary/15">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 font-serif text-2xl text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VELAS DISPONÍVEIS */}
      <section className="border-y border-border/60 bg-secondary/30 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gold">Nossas velas</p>
              <h2 className="mt-2 font-serif text-4xl text-foreground">Escolha sua homenagem</h2>
            </div>
            <Link to="/velas" className="hidden text-sm font-medium text-primary hover:underline md:inline-flex">
              Ver todas →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {candles?.map((c) => (
              <Link
                key={c.id}
                to="/velas/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col rounded-2xl border border-border/60 bg-card p-8 transition-all hover:border-gold/50 hover:shadow-glow"
              >
                <div className="flex h-40 items-center justify-center">
                  <CandleFlame size="sm" />
                </div>
                <h3 className="mt-6 font-serif text-2xl text-foreground">{c.name}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="font-serif text-2xl text-primary">{formatBRL(c.price_cents)}</span>
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-gold group-hover:gap-2 transition-all">
                    Acender <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <h2 className="text-center font-serif text-4xl text-foreground">Palavras de quem passou por aqui</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { name: "Maria S.", text: "Uma forma linda de manter presente a memória do meu pai. Pude compartilhar com toda a família." },
            { name: "João P.", text: "Foi simples, respeitoso e emocionante. A chama parece viva." },
            { name: "Clara M.", text: "Chorei ao ver a vela acesa com o nome da minha avó. Recomendo de coração." },
          ].map((t) => (
            <figure key={t.name} className="rounded-2xl bg-card p-8 shadow-soft border border-border/60">
              <Flame className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <blockquote className="mt-4 font-serif text-lg leading-relaxed text-foreground italic">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">— {t.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <h2 className="text-center font-serif text-4xl text-foreground">Perguntas frequentes</h2>
          <dl className="mt-12 space-y-6">
            {[
              { q: "Por quanto tempo a vela fica acesa?", a: "A vela permanece acesa por 9 dias. Durante este período, a homenagem fica acessível a qualquer momento; após esse tempo, a chama se apaga simbolicamente." },
              { q: "Quanto custa acender uma vela?", a: "Uma única vela por apenas R$ 1,99 — um gesto simples e acessível para eternizar uma memória." },
              { q: "Como funciona o pagamento?", a: "Aceitamos PIX e cartão de crédito. Assim que o pagamento é aprovado, a homenagem é criada automaticamente." },
              { q: "Posso compartilhar a homenagem?", a: "Sim. Cada homenagem possui um link único que pode ser compartilhado por WhatsApp com toda a família." },
              { q: "O que acontece quando a vela apaga?", a: "Após os 9 dias, a chama se apaga simbolicamente, encerrando o ciclo da homenagem." },
            ].map((it) => (
              <div key={it.q} className="rounded-xl bg-card p-6 border border-border/60">
                <dt className="font-serif text-lg text-foreground">{it.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center md:px-8">
        <h2 className="font-serif text-4xl text-foreground md:text-5xl">
          Uma luz para quem você ama.
        </h2>
        <p className="mt-4 text-muted-foreground">Comece agora sua homenagem.</p>
        <Button asChild size="lg" className="mt-8 rounded-full bg-primary px-8 hover:bg-primary/90">
          <Link to="/velas">
            Acender uma vela <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </SiteShell>
  );
}
