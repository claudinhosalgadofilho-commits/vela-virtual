import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CondolenceLikeButtonProps {
  condolenceId: string;
  initialCount: number;
  className?: string;
}

const storageKey = (id: string) => `condolence-liked:${id}`;

export function CondolenceLikeButton({
  condolenceId,
  initialCount,
  className,
}: CondolenceLikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => setCount(initialCount), [initialCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLiked(window.localStorage.getItem(storageKey(condolenceId)) === "1");
  }, [condolenceId]);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) setBurst(true);

    const rpc = next ? "increment_condolence_like" : "decrement_condolence_like";
    const { data, error } = await supabase.rpc(rpc, { _condolence_id: condolenceId });

    if (error) {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } else {
      if (typeof data === "number") setCount(data);
      if (typeof window !== "undefined") {
        if (next) window.localStorage.setItem(storageKey(condolenceId), "1");
        else window.localStorage.removeItem(storageKey(condolenceId));
      }
    }
    setPending(false);
    if (next) setTimeout(() => setBurst(false), 600);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Remover curtida da mensagem" : "Curtir esta mensagem"}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-xs transition-all hover:border-gold/50 disabled:opacity-70",
        liked && "border-gold/60 bg-gold/10",
        className,
      )}
    >
      <Heart
        className={cn(
          "h-3.5 w-3.5 transition-transform",
          liked ? "fill-gold text-gold scale-110" : "text-muted-foreground group-hover:text-gold",
          burst && "animate-ping-once",
        )}
        aria-hidden
      />
      <span className={cn("tabular-nums font-medium", liked ? "text-gold" : "text-foreground/80")}>
        {count}
      </span>
    </button>
  );
}
