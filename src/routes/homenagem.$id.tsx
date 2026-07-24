import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Altar } from "@/components/Altar";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ShareButtons } from "@/components/ShareButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Music2, VolumeX, Flame } from "lucide-react";
import { CondolencesBook } from "@/components/CondolencesBook";
import { LightCandleDialog } from "@/components/LightCandleDialog";
import { RenewTributeDialog } from "@/components/RenewTributeDialog";
import { TributePhoto } from "@/components/TributePhoto";
import { LatestCondolencePopup } from "@/components/LatestCondolencePopup";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/homenagem/$id")({
  component: Page,
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("tributes")
      .select("tribute_name, tribute_message")
      .eq("id", params.id)
      .maybeSingle();
    return { name: data?.tribute_name ?? null, message: data?.tribute_message ?? null };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.name ?? "Homenagem";
    const title = `Em memória de ${name} — Vela Virtual`;
    const description = loaderData?.message
      ? `${loaderData.message.slice(0, 150)}`
      : `Acenda uma vela virtual em memória de ${name}. Uma homenagem eterna, iluminada com amor.`;
    const url = `https://velavirtual.lovable.app/homenagem/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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
  const [musicOn, setMusicOn] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [lighting, setLighting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tribute", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tributes")
        .select("*, candle:candles(name, video_url, duration_hours, duration_minutes)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const lit = Boolean((data as any)?.lit_at);
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/homenagem/${id}`);
    }
  }, [id]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (data) {
      const ended = new Date(data.ends_at).getTime() <= Date.now();
      setExpired(ended);
    }
  }, [data]);

  const burnProgress = (() => {
    if (!data || !(data as any).lit_at) return 1;
    const start = new Date((data as any).lit_at).getTime();
    const end = new Date(data.ends_at).getTime();
    if (!(end > start)) return 0;
    const remaining = (end - now) / (end - start);
    return Math.max(0, Math.min(1, remaining));
  })();

  // Realtime: sincroniza estado da vela entre todos os visitantes
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`tribute-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tributes", filter: `id=eq.${id}` },
        () => { refetch(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetch]);

  const handleLight = async () => {
    if (!data || lighting) return;
    setLighting(true);
    const { error } = await supabase.rpc("light_tribute", { _tribute_id: data.id });
    if (!error) await refetch();
    setLighting(false);
  };


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

        <article className="mx-auto max-w-6xl px-4 py-10 sm:py-14 md:py-20 md:px-8">
          <header className="text-center">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold sm:text-xs">Em memória de</p>
            <p className="mt-2 text-sm text-muted-foreground">Homenagem acesa em {dateStr}</p>
          </header>

          {/* ALTAR – oratório com vela ao centro, foto à esquerda, popup + QR à direita */}
          <div className="mt-10 md:mt-14 grid gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] lg:items-center">
            {/* Coluna esquerda: foto emoldurada + idade */}
            <div className="order-1 lg:order-none">
              <TributePhoto photoPath={(data as any).tribute_photo_url} name={data.tribute_name} />
              {(data as any).tribute_age != null && (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{(data as any).tribute_age}</span> anos
                </p>
              )}
            </div>

            {/* Coluna central: altar e vela */}
            <div className="order-2 lg:order-none">
              <Altar
                name={data.tribute_name}
                extinguished={!showFlame}
                videoUrl={showFlame ? data.candle?.video_url : null}
                burnProgress={burnProgress}
              />

              {!expired && !lit && (
                <div className="mt-10 flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    onClick={handleLight}
                    disabled={lighting}
                    className="rounded-full bg-gold text-gold-foreground hover:bg-gold/90 shadow-glow px-8"
                  >
                    <Flame className="mr-2 h-5 w-5" />
                    {lighting ? "Acendendo..." : "Acender a vela"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Ao acender, a vela permanecerá acesa por {(() => {
                      const m = (data.candle as any)?.duration_minutes ?? ((data.candle?.duration_hours ?? 24) * 60);
                      if (m >= 1440) return `${Math.round(m / 1440)} dias`;
                      if (m >= 60) return `${Math.round(m / 60)} horas`;
                      return `${m} minutos`;
                    })()}.
                  </p>
                </div>
              )}
            </div>

            {/* Coluna direita: última homenagem (popup em tempo real) + QR code */}
            <div className="order-3 lg:order-none flex flex-col gap-5 mx-auto w-full max-w-md lg:max-w-none">
              <LatestCondolencePopup tributeId={data.id} />
              <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-5 shadow-soft text-center">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-gold">
                  <QrCode className="h-3.5 w-3.5" aria-hidden />
                  Compartilhar homenagem
                </div>
                <div className="mt-3 flex justify-center rounded-lg bg-white p-3">
                  {shareUrl ? (
                    <QRCodeSVG value={shareUrl} size={160} level="M" includeMargin={false} />
                  ) : (
                    <div className="h-40 w-40 animate-pulse rounded bg-muted" />
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Aponte a câmera para abrir esta página no celular.
                </p>
              </div>
            </div>
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
      <LightCandleDialog open={plansOpen} onOpenChange={setPlansOpen} />
    </SiteShell>
  );
}
