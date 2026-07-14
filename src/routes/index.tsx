import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Heart, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
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

// Design tokens (Midnight Indigo, scoped à home)
const BG = "#0a0a1a";
const SURFACE = "#141432";
const DEEP = "#1e1e5a";
const ACCENT = "#4f46e5";

const serif = { fontFamily: '"Libre Baskerville", ui-serif, Georgia, serif' } as const;
const sans = { fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif' } as const;

function HomePage() {
  const { data: candles } = useQuery({
    queryKey: ["candles", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candles")
        .select("*")
        .eq("active", true)
        .order("display_order")
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  return (
    <SiteShell>
      <div style={{ backgroundColor: BG, ...sans }} className="text-white/90 -mt-px">
        {/* HERO SPLIT */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 top-1/2 -z-0 h-[720px] w-[720px] -translate-y-1/2 rounded-full blur-[140px] opacity-70 animate-pulse"
            style={{ background: `radial-gradient(circle, ${ACCENT}55 0%, transparent 60%)`, animationDuration: "6s" }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-10 md:py-32">
            <div className="animate-fade-in">
              <p className="mb-6 text-[11px] uppercase tracking-[0.32em]" style={{ color: `${ACCENT}` }}>
                Vela Virtual Santa Luzia
              </p>
              <h1
                style={serif}
                className="text-5xl leading-[1.05] text-white md:text-6xl lg:text-7xl"
              >
                A luz que <br />
                <span className="italic" style={{ color: ACCENT }}>permanece</span> acesa.
              </h1>
              <p className="mt-8 max-w-lg text-lg leading-relaxed text-white/60">
                Preste sua homenagem acendendo uma vela virtual e deixe uma
                mensagem de conforto à família. Uma chama que brilha por 9 dias,
                acessível de qualquer lugar.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  to="/velas"
                  className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: ACCENT, boxShadow: `0 20px 60px -20px ${ACCENT}` }}
                >
                  Acender uma vela
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/como-funciona"
                  className="inline-flex items-center gap-2 border border-white/15 px-8 py-4 text-sm font-medium uppercase tracking-widest text-white/80 transition-colors hover:bg-white/5"
                >
                  Como funciona
                </Link>
              </div>
            </div>

            <div className="relative flex justify-center py-8 md:py-0">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${ACCENT}30 0%, transparent 60%)` }}
              />
              <div className="scale-125 md:scale-150">
                <CandleFlame />
              </div>
            </div>
          </div>
        </section>

        {/* PILARES */}
        <section className="border-y border-white/5" style={{ backgroundColor: SURFACE }}>
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 md:grid-cols-3 md:gap-8 md:px-10">
            {[
              { icon: Heart, title: "Respeito", text: "Um ambiente sereno e dedicado à memória do seu ente querido." },
              { icon: Sparkles, title: "Elegância", text: "Estética minimalista e contemplativa que honra o momento." },
              { icon: Shield, title: "Acessível", text: "Um link único para compartilhar em qualquer lugar do mundo." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="group border-l-2 pl-6 transition-colors" style={{ borderColor: `${ACCENT}80` }}>
                <div
                  className="mb-6 grid h-11 w-11 place-items-center rounded-sm"
                  style={{ backgroundColor: `${ACCENT}18`, border: `1px solid ${ACCENT}40` }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: ACCENT }} />
                </div>
                <h3 style={serif} className="mb-3 text-2xl text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* VELAS DISPONÍVEIS */}
        <section className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.32em]" style={{ color: ACCENT }}>
                Escolha sua homenagem
              </p>
              <h2 style={serif} className="text-4xl text-white md:text-5xl">
                Uma chama para <span className="italic">cada memória</span>.
              </h2>
            </div>
            <Link to="/velas" className="inline-flex items-center gap-2 text-sm uppercase tracking-widest transition-colors" style={{ color: ACCENT }}>
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {candles?.map((c) => (
              <Link
                key={c.id}
                to="/velas/$slug"
                params={{ slug: c.slug }}
                className="group relative flex flex-col p-8 transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: SURFACE, border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ boxShadow: `inset 0 0 0 1px ${ACCENT}60, 0 20px 60px -20px ${ACCENT}80` }}
                />
                <div className="relative flex h-44 items-end justify-center">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-40"
                    style={{ background: `radial-gradient(ellipse at center, ${ACCENT}40 0%, transparent 65%)` }}
                  />
                  <div className="relative">
                    <CandleFlame size="sm" />
                  </div>
                </div>
                <h3 style={serif} className="relative mt-6 text-xl text-white">{c.name}</h3>
                <p className="relative mt-2 flex-1 text-sm leading-relaxed text-white/50">{c.description}</p>
                <div className="relative mt-6 flex items-center justify-between border-t border-white/5 pt-5">
                  <span style={serif} className="text-2xl" >{formatBRL(c.price_cents)}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/60 transition-all group-hover:gap-2" style={{ color: ACCENT }}>
                    Acender <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* DEPOIMENTOS */}
        <section className="border-t border-white/5" style={{ backgroundColor: SURFACE }}>
          <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
            <h2 style={serif} className="mx-auto max-w-2xl text-center text-4xl text-white md:text-5xl">
              Palavras de quem <span className="italic" style={{ color: ACCENT }}>passou por aqui</span>.
            </h2>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                { name: "Maria S.", text: "Uma forma linda de manter presente a memória do meu pai. Pude compartilhar com toda a família." },
                { name: "João P.", text: "Foi simples, respeitoso e emocionante. A chama parece viva." },
                { name: "Clara M.", text: "Chorei ao ver a vela acesa com o nome da minha avó. Recomendo de coração." },
              ].map((t) => (
                <figure key={t.name} className="p-8" style={{ backgroundColor: BG, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="mb-4 h-px w-10" style={{ backgroundColor: ACCENT }} />
                  <blockquote style={serif} className="text-lg italic leading-relaxed text-white/85">
                    &ldquo;{t.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 text-xs uppercase tracking-widest text-white/50">— {t.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-24 md:px-10">
          <h2 style={serif} className="text-center text-4xl text-white md:text-5xl">
            Perguntas frequentes
          </h2>
          <dl className="mt-14 space-y-3">
            {[
              { q: "Por quanto tempo a vela fica acesa?", a: "A vela permanece acesa por 9 dias. Durante este período, a homenagem fica acessível a qualquer momento; após esse tempo, a chama se apaga simbolicamente." },
              { q: "Quanto custa acender uma vela?", a: "Uma única vela por apenas R$ 1,99 — um gesto simples e acessível para eternizar uma memória." },
              { q: "Como funciona o pagamento?", a: "Aceitamos PIX e cartão de crédito. Assim que o pagamento é aprovado, a homenagem é criada automaticamente." },
              { q: "Posso compartilhar a homenagem?", a: "Sim. Cada homenagem possui um link único que pode ser compartilhado por WhatsApp com toda a família." },
              { q: "O que acontece quando a vela apaga?", a: "Após os 9 dias, a chama se apaga simbolicamente, encerrando o ciclo da homenagem." },
            ].map((it) => (
              <div key={it.q} className="p-6 transition-colors hover:bg-white/[0.02]" style={{ backgroundColor: SURFACE, border: "1px solid rgba(255,255,255,0.05)" }}>
                <dt style={serif} className="text-lg text-white">{it.q}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-white/55">{it.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* CTA FINAL */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(180deg, ${BG} 0%, ${DEEP} 100%)` }}
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${ACCENT}40 0%, transparent 60%)` }}
          />
          <div className="relative mx-auto max-w-3xl px-6 py-32 text-center md:px-10">
            <h2 style={serif} className="text-4xl leading-tight text-white md:text-6xl">
              A luz que brilha em nosso coração <span className="italic" style={{ color: `${ACCENT}` }}>nunca se apaga</span>.
            </h2>
            <p className="mx-auto mt-6 max-w-md text-white/60">
              Transforme sua saudade em uma prece luminosa. Pagamento seguro em segundos.
            </p>
            <Link
              to="/velas"
              className="mt-12 inline-flex items-center gap-2 bg-white px-10 py-5 text-sm font-bold uppercase tracking-widest text-[#0a0a1a] transition-all hover:-translate-y-0.5 hover:bg-white/90"
              style={{ boxShadow: `0 30px 80px -20px ${ACCENT}` }}
            >
              Acender minha vela <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
