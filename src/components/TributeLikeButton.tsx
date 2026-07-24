import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TributeLikeButtonProps {
  tributeId: string;
  initialCount: number;
  className?: string;
}

const storageKey = (id: string) => `tribute-liked:${id}`;

export function TributeLikeButton({ tributeId, initialCount, className }: TributeLikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => setCount(initialCount), [initialCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLiked(window.localStorage.getItem(storageKey(tributeId)) === "1");
  }, [tributeId]);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) setBurst(true);

    const rpc = next ? "increment_tribute_like" : "decrement_tribute_like";
    const { data, error } = await supabase.rpc(rpc, { _tribute_id: tributeId });

    if (error) {
      // revert on failure
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } else {
      if (typeof data === "number") setCount(data);
      if (typeof window !== "undefined") {
        if (next) window.localStorage.setItem(storageKey(tributeId), "1");
        else window.localStorage.removeItem(storageKey(tributeId));
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
      aria-label={liked ? "Remover curtida" : "Curtir esta homenagem"}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 backdrop-blur px-4 py-2 text-sm shadow-soft transition-all hover:border-gold/50 hover:shadow-glow disabled:opacity-70",
        liked && "border-gold/60 bg-gold/10 text-foreground",
        className,
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-transform",
          liked ? "fill-gold text-gold scale-110" : "text-muted-foreground group-hover:text-gold",
          burst && "animate-ping-once",
        )}
        aria-hidden
      />
      <span className={cn("tabular-nums font-medium", liked ? "text-gold" : "text-foreground")}>
        {count}
      </span>
      <span className="text-xs text-muted-foreground">
        {count === 1 ? "curtida" : "curtidas"}
      </span>
    </button>
  );
}
