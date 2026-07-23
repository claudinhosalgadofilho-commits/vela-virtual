import { CandleFlame } from "@/components/CandleFlame";

interface AltarProps {
  name?: string | null;
  extinguished?: boolean;
  videoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
  burnProgress?: number;
}

/**
 * Altar reutilizável: oratório com vela centralizado sobre uma mesa de
 * madeira. Nome do homenageado em letras douradas logo abaixo.
 *
 * Uma única largura base controla toda a composição — a mesa é sempre
 * ~20% mais larga que o oratório para enquadrá-lo simetricamente em
 * qualquer breakpoint.
 */
export function Altar({
  name,
  extinguished = false,
  videoUrl = null,
  size = "md",
  className = "",
}: AltarProps) {
  // Largura do oratório (peça central)
  const oratorioW = size === "sm" ? "min(260px, 72vw)" : "min(320px, 78vw)";
  // A mesa envolve o oratório com folga uniforme dos dois lados
  const tableW = size === "sm" ? "min(340px, 88vw)" : "min(420px, 92vw)";

  return (
    <div className={`altar mx-auto flex w-full flex-col items-center ${className}`}>
      <div
        className="altar-table"
        style={{ width: tableW, maxWidth: "100%" }}
      >
        <div className="altar-stage">
          <div className="altar-candle">
            <div className="oratorio" style={{ width: oratorioW }}>
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
          className="mt-8 text-center font-serif italic leading-tight"
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
