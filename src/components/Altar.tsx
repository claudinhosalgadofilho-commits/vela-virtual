import { CandleFlame } from "@/components/CandleFlame";

interface AltarProps {
  name?: string | null;
  extinguished?: boolean;
  videoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Altar reutilizável: oratório com vela sobre uma pequena mesa de madeira,
 * com o nome do homenageado gravado em letras douradas logo abaixo.
 *
 * Totalmente responsivo — usa clamp/vw para escalar de mobile a desktop
 * sem quebrar o layout.
 */
export function Altar({
  name,
  extinguished = false,
  videoUrl = null,
  size = "md",
  className = "",
}: AltarProps) {
  const maxW = size === "sm" ? 320 : 440;

  return (
    <div className={`altar mx-auto w-full ${className}`}>
      <div
        className="altar-table"
        style={{ maxWidth: `min(${maxW}px, 92vw)` }}
      >
        <div className="altar-stage justify-center">
          <div className="altar-candle">
            <div className="oratorio" style={{ width: `min(${maxW - 60}px, 78vw)` }}>
              <div className="oratorio-roof" />
              <div className="oratorio-cross" aria-hidden="true">✝</div>
              <div className="oratorio-body">
                <div className="oratorio-niche">
                  <div className="oratorio-glow" />
                  <CandleFlame extinguished={extinguished} videoUrl={videoUrl} />
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

      {name && (
        <p
          className="mx-auto mt-8 text-center font-serif italic leading-tight"
          style={{
            fontSize: "clamp(1.5rem, 4.5vw, 2.5rem)",
            maxWidth: "min(560px, 92vw)",
            background:
              "linear-gradient(180deg, hsl(45 65% 78%) 0%, hsl(42 70% 55%) 45%, hsl(38 75% 42%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 2px 6px rgba(201,169,97,0.35))",
          }}
        >
          {name}
        </p>
      )}
    </div>
  );
}
