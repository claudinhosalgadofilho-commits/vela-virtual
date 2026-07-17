import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ShareButtons } from "@/components/ShareButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Music2, VolumeX, Flame } from "lucide-react";
import { CondolencesBook } from "@/components/CondolencesBook";

export const Route = createFileRoute("/homenagem/$id")({
  component: Page,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-serif text-4xl text-foreground">Homenagem não encontrada</h1>
        <p className="mt-3 text-muted-foreground">Este link pode ter expirado.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Ir para o início</Link></Button>
      </div>
    </SiteShell>
  ),
});

function Page() {
  const { id } = Route.useParams();
  const [expired, setExpired] = useState(false);
  const [lit, setLit] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tribute", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tributes")
        .select("*, candle:candles(name, video_url, duration_hours)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    if (data) {
      const ended = new Date(data.ends_at).getTime() <= Date.now();
      setExpired(ended);
      // Restore lit state per tribute from local storage
      if (!ended && typeof window !== "undefined") {
        const key = `tribute-lit-${data.id}`;
        if (localStorage.getItem(key) === "1") setLit(true);
      }
    }
  }, [data]);

  function handleLight() {
    setLit(true);
    if (data && typeof window !== "undefined") {
      localStorage.setItem(`tribute-lit-${data.id}`, "1");
    }
  }

  if (isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      </SiteShell>
    );
  }

  if (!data) return null;

  const dateStr = new Date(data.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const showFlame = lit && !expired;

  return (
    <SiteShell>
      <div className="relative min-h-[80vh]">
        {/* Ambient altar background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-secondary/60" />
        <div
          className={`absolute inset-x-0 top-0 -z-10 h-[900px] transition-opacity duration-1000 ${showFlame ? "opacity-100" : "opacity-40"}`}
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(201,169,97,0.22), transparent 65%)" }}
        />

        <article className="mx-auto max-w-5xl px-4 py-14 md:py-20 md:px-8">
          <header className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Em memória de</p>
            <h1 className="mt-3 font-serif text-5xl leading-tight text-foreground md:text-6xl">
              {data.tribute_name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Homenagem acesa em {dateStr}</p>
          </header>

          {/* ALTAR */}
          <div className="altar mt-12 md:mt-16">
            <div className="altar-stage">
              {/* Quadro com foto */}
              <figure className="altar-frame">
                {data.tribute_photo_url ? (
                  <img
                    src={data.tribute_photo_url}
                    alt={data.tribute_name}
                    className="altar-photo"
                    loading="lazy"
                  />
                ) : (
                  <div className="altar-photo flex items-center justify-center bg-secondary/60 font-serif text-4xl text-muted-foreground">
                    {data.tribute_name.charAt(0)}
                  </div>
                )}
                <figcaption className="altar-plaque font-serif">
                  {data.tribute_name}
                </figcaption>
              </figure>

              {/* Vela sobre o altar */}
              <div className="altar-candle">
                <CandleFlame
                  extinguished={!showFlame}
                  videoUrl={showFlame ? data.candle?.video_url : null}
                />
                <div className="altar-base" aria-hidden="true" />
              </div>
            </div>

            {/* Ação: acender */}
            {!expired && !lit && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={handleLight}
                  className="rounded-full bg-gold text-gold-foreground hover:bg-gold/90 shadow-glow px-8"
                >
                  <Flame className="mr-2 h-5 w-5" />
                  Acender a vela
                </Button>
                <p className="text-xs text-muted-foreground">
                  Faça um momento de silêncio e clique para acender.
                </p>
              </div>
            )}
          </div>

          {/* Estado / contador */}
          <div className="mt-12 text-center">
            {expired ? (
              <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
                <p className="font-serif text-2xl text-foreground italic">
                  Esta homenagem foi encerrada.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Que a memória permaneça acesa em nossos corações.
                </p>
              </div>
            ) : lit ? (
              <>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Tempo restante</p>
                <CountdownTimer endsAt={data.ends_at} onExpire={() => setExpired(true)} />
              </>
            ) : null}
          </div>

          {data.tribute_message && (
            <blockquote className="mx-auto mt-12 max-w-xl rounded-2xl bg-card/70 backdrop-blur p-8 border border-border/50 shadow-soft text-center">
              <p className="font-serif text-xl leading-relaxed italic text-foreground">
                &ldquo;{data.tribute_message}&rdquo;
              </p>
            </blockquote>
          )}

          {/* Ações */}
          <div className="mt-14 flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Compartilhar homenagem</p>
              <ShareButtons url={shareUrl} title={`Homenagem em memória de ${data.tribute_name}`} />
            </div>

            <button
              onClick={() => setMusicOn((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {musicOn ? <VolumeX className="h-3.5 w-3.5" /> : <Music2 className="h-3.5 w-3.5" />}
              Música ambiente {musicOn ? "ligada" : "desligada"}
            </button>

            {musicOn && (
              <audio autoPlay loop src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8e5c3f56f.mp3" className="hidden" />
            )}
          </div>

          <CondolencesBook tributeId={data.id} disabled={expired} />

          <div className="mt-16 text-center">
            <Link to="/velas" className="text-sm text-primary hover:underline">
              Acender outra vela
            </Link>
          </div>
        </article>
      </div>
    </SiteShell>
  );
}
