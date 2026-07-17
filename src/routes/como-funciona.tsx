import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { ArrowRight, Clock, CreditCard, Flame, MessageCircleHeart, Share2, ShoppingBag, Sparkles } from "lucide-react";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como Funciona — Velas de Luz" },
      { name: "description", content: "Em quatro passos simples você acende uma vela virtual e cria uma homenagem digital." },
      { property: "og:title", content: "Como Funciona — Velas de Luz" },
      { property: "og:description", content: "Escolha, pague, escreva sua mensagem e compartilhe." },
    ],
    links: [{ rel: "canonical", href: "/como-funciona" }],
  }),
  component: Page,
});

const steps = [
  { icon: ShoppingBag, title: "Escolha da vela", text: "Selecione o modelo que melhor representa sua homenagem — cada um com uma duração diferente." },
  { icon: CreditCard, title: "Pagamento seguro", text: "Realize o pagamento via PIX ou cartão de crédito em poucos cliques, com total segurança." },
  { icon: MessageCircleHeart, title: "Mensagem", text: "Escreva uma dedicatória, adicione o nome da pessoa homenageada e, se quiser, uma foto." },
  { icon: Flame, title: "Acendimento", text: "Após a confirmação do pagamento a vela é acesa automaticamente em uma página exclusiva." },
  { icon: Share2, title: "Compartilhamento", text: "Envie o link único para família e amigos por WhatsApp, redes sociais ou email." },
];

function Page() {
  const { data: candles } = useQuery({
    queryKey: ["candles", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candles")
        .select("*")
        .eq("active", true)
        .order("display_order")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-4 py-20 md:px-8 md:py-28 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.28em] text-gold">Como Funciona</p>
        <h1 className="font-serif text-5xl leading-tight text-foreground md:text-6xl">
          Um processo simples,<br />uma homenagem que dura.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Em poucos minutos você cria uma homenagem elegante e discreta para
          compartilhar com quem você ama.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 md:px-8">
        <ol className="space-y-6">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-6 rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-soft">
              <div className="flex flex-col items-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
                  <s.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <span className="mt-3 font-serif text-sm text-gold">0{i + 1}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-2xl text-foreground">{s.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 text-center">
          <Button asChild size="lg" className="rounded-full bg-primary px-8">
            <Link to="/velas">
              Começar minha homenagem <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
