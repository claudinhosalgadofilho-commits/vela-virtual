import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";

interface LatestCondolencePopupProps {
  tributeId: string;
}

type Latest = {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
};

/**
 * Popup que mostra a última mensagem deixada no livro de condolências.
 * Atualiza em tempo real via Supabase Realtime.
 */
export function LatestCondolencePopup({ tributeId }: LatestCondolencePopupProps) {
  const { data, refetch } = useQuery({
    queryKey: ["condolences", "latest", tributeId],
    queryFn: async (): Promise<Latest | null> => {
      const { data, error } = await supabase
        .from("condolences")
        .select("id, author_name, message, created_at")
        .eq("tribute_id", tributeId)
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`latest-condolence:${tributeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "condolences", filter: `tribute_id=eq.${tributeId}` },
        () => {
          refetch();
          setFlash(true);
          setTimeout(() => setFlash(false), 3500);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tributeId, refetch]);

  return (
    <div
      className={`relative w-full rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-soft transition-all duration-500 ${
        flash ? "border-gold ring-2 ring-gold/40 scale-[1.02]" : "border-border/60"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
        <Heart className="h-3.5 w-3.5" aria-hidden />
        Última homenagem
      </div>
      {data ? (
        <>
          <p className="mt-3 font-serif text-sm italic text-foreground line-clamp-4">
            &ldquo;{data.message}&rdquo;
          </p>
          <p className="mt-2 text-xs text-muted-foreground">— {data.author_name}</p>
        </>
      ) : (
        <p className="mt-3 text-xs italic text-muted-foreground">
          Nenhuma mensagem ainda. Seja o primeiro a deixar uma palavra de carinho.
        </p>
      )}
    </div>
  );
}
