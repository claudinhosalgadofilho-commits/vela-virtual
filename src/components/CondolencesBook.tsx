import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Heart, Link2 } from "lucide-react";
import { CondolenceLikeButton } from "./CondolenceLikeButton";

/**
 * Livro de condolências público.
 * Qualquer visitante pode ler mensagens aprovadas e deixar a sua.
 * A RLS da tabela `condolences` garante a segurança no servidor;
 * este componente apenas valida o formato antes do envio.
 */
export interface CondolencesBookProps {
  tributeId: string;
  disabled?: boolean;
}

const schema = z.object({
  author_name: z.string().trim().min(1, "Informe seu nome").max(80, "Máximo 80 caracteres"),
  message: z.string().trim().min(1, "Deixe uma mensagem").max(1000, "Máximo 1000 caracteres"),
});

type Condolence = {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
  like_count: number;
};

export function CondolencesBook({ tributeId, disabled = false }: CondolencesBookProps) {
  const qc = useQueryClient();
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ author_name?: string; message?: string }>({});
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());


  const { data: condolences, isLoading } = useQuery({
    queryKey: ["condolences", tributeId],
    queryFn: async (): Promise<Condolence[]> => {
      const { data, error } = await supabase
        .from("condolences")
        .select("id, author_name, message, created_at, like_count")
        .eq("tribute_id", tributeId)
        .eq("approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Rola até (e destaca) a mensagem indicada por #condolencia-<id> na URL.
  useEffect(() => {
    if (!condolences?.length) return;
    const hash = window.location.hash;
    const match = hash.match(/^#condolencia-(.+)$/);
    if (!match) return;
    const id = match[1];
    if (!condolences.some((c) => c.id === id)) return;
    const el = document.getElementById(`condolencia-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const t = setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 4000);
    return () => clearTimeout(t);
  }, [condolences]);

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#condolencia-${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link da mensagem copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };


  // Realtime: novas mensagens aprovadas aparecem sem refresh.
  // A RLS já garante que só recebemos linhas visíveis para este visitante.
  useEffect(() => {
    const channel = supabase
      .channel(`condolences:${tributeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "condolences",
          filter: `tribute_id=eq.${tributeId}`,
        },
        (payload) => {
          const newId = (payload.new as { id?: string })?.id;
          if (newId) {
            setHighlightedIds((prev) => {
              const next = new Set(prev);
              next.add(newId);
              return next;
            });
            setTimeout(() => {
              setHighlightedIds((prev) => {
                const next = new Set(prev);
                next.delete(newId);
                return next;
              });
            }, 4000);
          }
          qc.invalidateQueries({ queryKey: ["condolences", tributeId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "condolences",
          filter: `tribute_id=eq.${tributeId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; like_count: number };
          qc.setQueryData<Condolence[]>(["condolences", tributeId], (prev) =>
            prev?.map((c) =>
              c.id === updated.id ? { ...c, like_count: updated.like_count } : c,
            ),
          );
        },
      )
      .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, [tributeId, qc]);

  const mutation = useMutation({
    mutationFn: async (payload: z.infer<typeof schema>) => {
      const { error } = await supabase.from("condolences").insert({
        tribute_id: tributeId,
        author_name: payload.author_name,
        message: payload.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem enviada. Obrigado por sua homenagem.");
      setAuthorName("");
      setMessage("");
      setErrors({});
      qc.invalidateQueries({ queryKey: ["condolences", tributeId] });
    },
    onError: () => {
      toast.error("Não foi possível enviar sua mensagem. Tente novamente.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ author_name: authorName, message });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <section
      aria-labelledby="condolences-heading"
      className="mx-auto mt-16 max-w-2xl rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-6 md:p-8 shadow-soft text-left"
    >
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-gold" aria-hidden />
        <h2 id="condolences-heading" className="font-serif text-2xl text-foreground">
          Livro de condolências
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Deixe uma palavra de carinho para a família.
      </p>

      {!disabled && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
          <div>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Seu nome"
              maxLength={80}
              aria-invalid={!!errors.author_name}
              aria-label="Seu nome"
              disabled={mutation.isPending}
            />
            {errors.author_name && (
              <p className="mt-1 text-xs text-destructive">{errors.author_name}</p>
            )}
          </div>
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sua mensagem de condolências…"
              maxLength={1000}
              rows={4}
              aria-invalid={!!errors.message}
              aria-label="Sua mensagem"
              disabled={mutation.isPending}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-destructive">{errors.message}</p>
            )}
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {message.length}/1000
            </p>
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-full"
          >
            {mutation.isPending ? "Enviando…" : "Deixar mensagem"}
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : condolences && condolences.length > 0 ? (
          condolences.map((c) => {
            const isNew = highlightedIds.has(c.id);
            return (
            <article
              key={c.id}
              id={`condolencia-${c.id}`}
              className={`group scroll-mt-24 rounded-xl border p-4 animate-fade-in transition-all duration-1000 ${
                isNew
                  ? "border-gold/70 bg-gold/10 ring-2 ring-gold/40 shadow-soft"
                  : "border-border/50 bg-background/60"
              }`}
            >
              <p className="font-serif text-base italic text-foreground">
                &ldquo;{c.message}&rdquo;
              </p>
              <footer className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">— {c.author_name}</span>
                <div className="flex items-center gap-2">
                  <time dateTime={c.created_at}>
                    {new Date(c.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(c.id)}
                    aria-label="Copiar link desta mensagem"
                    title="Copiar link"
                    className="opacity-60 hover:opacity-100 focus-visible:opacity-100 hover:text-gold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded"
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </footer>
            </article>

            );
          })

        ) : (
          <p className="text-center text-sm text-muted-foreground italic">
            Seja o primeiro a deixar uma mensagem.
          </p>
        )}
      </div>
    </section>
  );
}
