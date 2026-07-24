import { cn } from "@/lib/utils";

interface CandleFlameProps {
  extinguished?: boolean;
  videoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** 1 = vela nova (cheia); 0 = totalmente consumida. */
  burnProgress?: number;
}

/**
 * Vela virtual com chama animada procedural (CSS+SVG).
 * Se `videoUrl` for fornecido, usa <video> em loop realista.
 * `burnProgress` encolhe a vela conforme o tempo passa.
 */
export function CandleFlame({
  extinguished = false,
  videoUrl,
  className,
  size = "lg",
  burnProgress = 1,
}: CandleFlameProps) {
  const scale = size === "sm" ? 0.55 : size === "md" ? 0.8 : 1;
  const p = Math.max(0, Math.min(1, burnProgress));
  // Dimensões nominais (não escaladas) do conjunto vela + chama + pavio
  const nominalH = 90 + 14 + 260; // flame + wick + body
  const nominalW = 90;
  // Reserva o espaço real ocupado após o transform:scale para não invadir textos ao redor
  const wrapperStyle: React.CSSProperties = {
    width: nominalW * scale,
    height: nominalH * scale,
    display: "block",
    position: "relative",
    verticalAlign: "bottom",
    lineHeight: 0,
  };


  if (videoUrl && !extinguished) {
    const baseH = 360;
    const baseW = 160;
    const h = Math.max(70, Math.round(baseH * (0.2 + 0.8 * p)));
    const w = Math.max(60, Math.round(baseW * (0.6 + 0.4 * p)));
    return (
      <div className={cn("inline-block relative", className)} style={{ width: baseW * scale, height: baseH * scale }}>
        <div
          className="candle-scene absolute left-1/2 bottom-0 -translate-x-1/2"
          style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: "bottom center" }}
        >
          <div className="candle-halo" style={{ opacity: 0.4 + 0.6 * p }} />
          <video
            className="relative z-10 rounded-lg transition-all duration-1000 ease-linear"
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{ width: w, height: h, objectFit: "cover" }}
          />
        </div>
      </div>
    );
  }

  const bodyBaseH = 260;
  const bodyH = Math.max(28, Math.round(bodyBaseH * (0.12 + 0.88 * p)));
  const flameScale = 0.7 + 0.3 * p;

  return (
    <div className={cn("inline-block relative", className)} style={wrapperStyle}>
      <div
        className={cn("candle-scene absolute left-1/2 bottom-0", extinguished && "extinguished")}
        style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: "bottom center" }}
        aria-label={extinguished ? "Vela apagada" : "Vela acesa"}
      >
        <div className="candle-halo" style={{ opacity: extinguished ? 0 : 0.4 + 0.6 * p }} />
        <div
          className="flame transition-transform duration-1000 ease-linear"
          style={extinguished ? undefined : { transform: `scale(${flameScale})`, transformOrigin: "50% 100%" }}
        />
        <div className="wick" />
        <div
          className="candle-body transition-[height] duration-1000 ease-linear"
          style={{ height: bodyH }}
        />
      </div>
    </div>
  );
}

