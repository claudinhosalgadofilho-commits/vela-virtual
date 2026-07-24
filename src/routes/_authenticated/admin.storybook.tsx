import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CandleFlame } from "@/components/CandleFlame";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/storybook")({
  component: Page,
});

type Size = "sm" | "md" | "lg";
const SIZES: Size[] = ["sm", "md", "lg"];
const BURN_STAGES: Array<{ label: string; value: number }> = [
  { label: "Nova (100%)", value: 1 },
  { label: "3/4 (75%)", value: 0.75 },
  { label: "Metade (50%)", value: 0.5 },
  { label: "1/4 (25%)", value: 0.25 },
  { label: "Fim (10%)", value: 0.1 },
  { label: "Consumida (0%)", value: 0 },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <header className="mb-6">
        <h2 className="font-serif text-2xl text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-4">
      <div className="flex min-h-[280px] w-full items-end justify-center">
        {children}
      </div>
      <span className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Page() {
  const [burn, setBurn] = useState(1);
  const [extinguished, setExtinguished] = useState(false);
  const [size, setSize] = useState<Size>("lg");
  const [videoUrl, setVideoUrl] = useState("");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold">
          Storybook interno
        </p>
        <h1 className="mt-2 font-serif text-3xl text-foreground">
          Velas — Showcase visual
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Referência de QA para todas as variações do componente{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
            CandleFlame
          </code>
          : tamanhos, estados (acesa/apagada), progresso de consumo e uso com
          vídeo.
        </p>
      </div>

      <Section
        title="Playground interativo"
        description="Ajuste as props em tempo real e valide o comportamento visual."
      >
        <div className="grid gap-8 md:grid-cols-[1fr,320px]">
          <div className="flex min-h-[380px] items-end justify-center rounded-xl border border-border/60 bg-background/40 p-8">
            <CandleFlame
              size={size}
              burnProgress={burn}
              extinguished={extinguished}
              videoUrl={videoUrl.trim() ? videoUrl.trim() : null}
            />
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Tamanho
              </Label>
              <div className="mt-2 flex gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`flex-1 rounded-full border px-3 py-2 text-sm transition-colors ${
                      size === s
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted-foreground hover:border-gold/40"
                    }`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Burn progress
                </Label>
                <span className="font-mono text-xs text-foreground">
                  {(burn * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                className="mt-3"
                value={[burn]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(v) => setBurn(v[0] ?? 0)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
              <Label htmlFor="ext" className="text-sm">
                Apagada
              </Label>
              <Switch
                id="ext"
                checked={extinguished}
                onCheckedChange={setExtinguished}
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                URL de vídeo (opcional)
              </Label>
              <Input
                className="mt-2"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://.../chama.mp4"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Tamanhos disponíveis"
        description="Comparativo lado a lado das três variantes de tamanho."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {SIZES.map((s) => (
            <Cell key={s} label={`size="${s}"`}>
              <CandleFlame size={s} />
            </Cell>
          ))}
        </div>
      </Section>

      <Section
        title="Estados de consumo"
        description="Progressão visual conforme a vela é consumida (prop burnProgress)."
      >
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {BURN_STAGES.map((stage) => (
            <Cell key={stage.value} label={stage.label}>
              <CandleFlame size="md" burnProgress={stage.value} />
            </Cell>
          ))}
        </div>
      </Section>

      <Section
        title="Aceso vs. apagado"
        description="Estado final quando o tempo da homenagem se encerra."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Cell label="Acesa (burn=1)">
            <CandleFlame size="lg" burnProgress={1} />
          </Cell>
          <Cell label="Apagada (extinguished)">
            <CandleFlame size="lg" burnProgress={0} extinguished />
          </Cell>
        </div>
      </Section>
    </div>
  );
}
