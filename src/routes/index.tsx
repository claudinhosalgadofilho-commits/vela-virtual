import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CreditCard, Flame, Heart, QrCode, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Velas de Luz — Homenagens Digitais Eternas" },
      { name: "description", content: "Acenda uma vela virtual para homenagear quem você ama. Uma chama de memória, esperança e paz que atravessa distâncias." },
      { property: "og:title", content: "Velas de Luz — Acenda uma vela virtual" },
      { property: "og:description", content: "Uma chama de memória e paz para quem você ama." },
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

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-16 md:grid-cols-2 md:items-center md:gap-16 md:px-8 md:py-24">
          <div className="text-center md:text-left">
            <p className="mb-4 text-[11px] uppercase tracking-[0.28em] text-gold sm:text-xs">
              Homenagem digital
            </p>
            <h1 className="font-serif text-4xl leading-[1.1] text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Uma chama<br />
              <span className="italic text-primary">eterna</span> de memória.
            </h1>

            <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg md:mx-0">
              Acenda uma vela virtual e mantenha viva a lembrança de quem partiu.
              Uma homenagem discreta, respeitosa e para sempre acessível — em
              qualquer lugar do mundo.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Button asChild size="lg" className="rounded-full bg-primary px-7 hover:bg-primary/90">
                <Link to="/velas">
                  Acender uma vela
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="rounded-full">
                <Link to="/como-funciona">Conheça a plataforma</Link>
              </Button>
            </div>
          </div>


          <div className="flex justify-center py-12 md:py-0">
            <CandleFlame />
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl md:text-5xl">
            Um gesto simples, uma memória eterna.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Três razões para escolher a Velas de Luz.
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
      <section className="border-y border-border/60 bg-secondary/30 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gold">Nossas velas</p>
              <h2 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">Escolha sua homenagem</h2>
            </div>
            <Link to="/velas" className="text-sm font-medium text-primary hover:underline">
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

      {/* EXEMPLO DE HOMENAGEM */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Exemplo de homenagem</p>
          <h2 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl md:text-5xl">
            Veja como sua homenagem ficará
          </h2>
          <p className="mt-4 text-muted-foreground">
            Um pequeno altar digital, sereno e respeitoso, com o retrato de quem você ama ao lado de uma chama viva.
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-border/60 bg-gradient-to-b from-secondary/40 to-background p-4 shadow-soft sm:p-6 md:p-12">
          <div className="altar">
            <div className="altar-table">
              <div className="altar-stage">
                {/* Quadro / retrato */}
                <figure className="altar-frame">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80"
                    alt="Retrato de exemplo"
                    className="altar-photo"
                    loading="lazy"
                  />
                  <figcaption className="altar-plaque font-serif">
                    Maria Aparecida · 1942–2024
                  </figcaption>
                </figure>

                {/* Oratório (casinha) com a vela dentro */}
                <div className="altar-candle">
                  <div className="oratorio">
                    <div className="oratorio-roof" />
                    <div className="oratorio-cross" aria-hidden="true">✝</div>
                    <div className="oratorio-body">
                      <div className="oratorio-niche">
                        <div className="oratorio-glow" />
                        <CandleFlame size="sm" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="altar-tabletop" aria-hidden="true" />
              <div className="altar-table-legs" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center">
              <p className="max-w-xs text-center text-sm italic text-muted-foreground">
                &ldquo;Que sua luz continue a nos guiar. Com amor eterno da família.&rdquo;
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold">
                Vela acesa há 2 dias · 7 dias restantes
              </p>
            </div>
          </div>


          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="rounded-full bg-primary px-7 hover:bg-primary/90">
              <Link to="/velas">
                Criar minha homenagem
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="text-center font-serif text-3xl text-foreground sm:text-4xl">Palavras de quem passou por aqui</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:mt-14 md:grid-cols-3">
          {[
            { name: "Maria S.", text: "Uma forma linda de manter presente a memória do meu pai. Pude compartilhar com toda a família." },
            { name: "João P.", text: "Foi simples, respeitoso e emocionante. A chama parece viva." },
            { name: "Clara M.", text: "Chorei ao ver a vela acesa com o nome da minha avó. Recomendo de coração." },
          ].map((t) => (
            <figure key={t.name} className="rounded-2xl bg-card p-6 shadow-soft border border-border/60 sm:p-8">
              <Flame className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <blockquote className="mt-4 font-serif text-base leading-relaxed text-foreground italic sm:text-lg">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">— {t.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-secondary/30 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <h2 className="text-center font-serif text-3xl text-foreground sm:text-4xl">Perguntas frequentes</h2>

          <dl className="mt-12 space-y-6">
            {[
              { q: "Por quanto tempo a vela fica acesa?", a: "Depende do modelo escolhido: 7, 15 ou 30 dias. O tempo restante é exibido na página da homenagem." },
              { q: "Como funciona o pagamento?", a: "Aceitamos PIX e cartão de crédito. Assim que o pagamento é aprovado, a homenagem é criada automaticamente." },
              { q: "Posso compartilhar a homenagem?", a: "Sim. Cada homenagem possui um link único que pode ser enviado por WhatsApp, redes sociais ou email." },
              { q: "O que acontece quando a vela apaga?", a: "A página permanece disponível para memória, mas a chama deixa de arder simbolicamente." },
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
      <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8 md:py-24">
        <h2 className="font-serif text-3xl text-foreground sm:text-4xl md:text-5xl">
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
