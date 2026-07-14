import { cn } from "@/lib/utils";

interface CandleFlameProps {
  extinguished?: boolean;
  videoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Vela virtual com chama animada procedural (CSS+SVG).
 * Se `videoUrl` for fornecido, usa <video> em loop realista.
 * Nunca usa GIF; loop imperceptível.
 */
export function CandleFlame({
  extinguished = false,
  videoUrl,
  className,
  size = "lg",
}: CandleFlameProps) {
  const scale = size === "sm" ? 0.55 : size === "md" ? 0.8 : 1;

  if (videoUrl && !extinguished) {
    return (
      <div className={cn("candle-scene relative", className)} style={{ transform: `scale(${scale})` }}>
        <div className="candle-halo" />
        <video
          className="relative z-10 rounded-lg"
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{ width: 160, height: 360, objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("candle-scene", extinguished && "extinguished", className)}
      style={{ transform: `scale(${scale})` }}
      aria-label={extinguished ? "Vela apagada" : "Vela acesa"}
    >
      {!extinguished && <div className="candle-halo" />}
      <div className="flame" />
      <div className="wick" />
      <div className="candle-body" />
    </div>
  );
}
