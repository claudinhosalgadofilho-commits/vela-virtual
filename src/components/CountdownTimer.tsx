import { useEffect, useState } from "react";

interface Props {
  endsAt: string | Date;
  onExpire?: () => void;
}

function parts(ms: number) {
  const clamp = Math.max(0, ms);
  const s = Math.floor(clamp / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function CountdownTimer({ endsAt, onExpire }: Props) {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = end.getTime() - now;
  const p = parts(remaining);
  const expired = remaining <= 0;

  useEffect(() => {
    if (expired) onExpire?.();
  }, [expired, onExpire]);

  const cell = (n: number, l: string) => (
    <div className="flex flex-col items-center rounded-lg bg-background/60 px-4 py-3 backdrop-blur ring-1 ring-border/60 min-w-16">
      <span className="font-serif text-3xl leading-none tabular-nums text-foreground">
        {n.toString().padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{l}</span>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-2">
      {cell(p.days, "dias")}
      {cell(p.hours, "horas")}
      {cell(p.minutes, "min")}
      {cell(p.seconds, "seg")}
    </div>
  );
}
