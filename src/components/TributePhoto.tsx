import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TributePhotoProps {
  photoPath: string | null | undefined;
  name?: string | null;
  className?: string;
}

/**
 * Foto do homenageado emoldurada em quadro dourado.
 * Suporta URL completa ou caminho no bucket `tribute-photos` (gera signed URL).
 */
export function TributePhoto({ photoPath, name, className = "" }: TributePhotoProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!photoPath) { setUrl(null); return; }
    if (photoPath.startsWith("http")) { setUrl(photoPath); return; }
    supabase.storage
      .from("tribute-photos")
      .createSignedUrl(photoPath, 60 * 60)
      .then(({ data }) => { if (!cancelled) setUrl(data?.signedUrl ?? null); });
    return () => { cancelled = true; };
  }, [photoPath]);

  if (!photoPath) return null;

  return (
    <figure className={`mx-auto w-full max-w-[280px] ${className}`}>
      <div
        className="relative rounded-md p-3 shadow-soft"
        style={{
          background:
            "linear-gradient(145deg, hsl(45 65% 60%) 0%, hsl(38 70% 40%) 50%, hsl(42 65% 55%) 100%)",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,220,150,0.5), inset 0 0 0 6px rgba(80,50,10,0.6)",
        }}
      >
        <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-secondary/40">
          {url ? (
            <img
              src={url}
              alt={name ? `Foto de ${name}` : "Foto do homenageado"}
              className="h-full w-full object-cover sepia-[0.15]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-muted/40" />
          )}
        </div>
      </div>
      {name && (
        <figcaption className="mt-3 text-center font-serif italic text-sm text-muted-foreground">
          {name}
        </figcaption>
      )}
    </figure>
  );
}
