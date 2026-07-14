import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { ArrowLeft, Clock, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/velas/$slug")({
  component: Page,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-serif text-4xl text-foreground">Vela não encontrada</h1>
        <p className="mt-3 text-muted-foreground">Este modelo não está mais disponível.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/velas">Voltar às velas</Link></Button>
      </div>
    </SiteShell>
  ),
});

const schema = z.object({
  customer_name: z.string().trim().min(2, "Informe seu nome").max(100),
  customer_email: z.string().trim().email("Email inválido").max(255),
  customer_phone: z.string().trim().max(30).optional().or(z.literal("")),
  tribute_name: z.string().trim().min(2, "Nome da pessoa homenageada").max(100),
  tribute_message: z.string().trim().max(500).optional().or(z.literal("")),
  payment_method: z.enum(["pix", "card"]),
});

function Page() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { data: candle, isLoading } = useQuery({
    queryKey: ["candle", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("candles").select("*").eq("slug", slug).eq("active", true).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!candle) return;

    const formData = new FormData(e.currentTarget);
    const raw = {
      customer_name: String(formData.get("customer_name") ?? ""),
      customer_email: String(formData.get("customer_email") ?? ""),
      customer_phone: String(formData.get("customer_phone") ?? ""),
      tribute_name: String(formData.get("tribute_name") ?? ""),
      tribute_message: String(formData.get("tribute_message") ?? ""),
      payment_method: String(formData.get("payment_method") ?? "pix") as "pix" | "card",
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Preencha os campos corretamente.");
      return;
    }

    setSubmitting(true);
    try {
      // Cria o pedido (status pending)
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          candle_id: candle.id,
          customer_name: parsed.data.customer_name,
          customer_email: parsed.data.customer_email,
          customer_phone: parsed.data.customer_phone || null,
          tribute_name: parsed.data.tribute_name,
          tribute_message: parsed.data.tribute_message || null,
          amount_cents: candle.price_cents,
          payment_method: parsed.data.payment_method,
          status: "paid", // MOCK: simular aprovação instantânea. Integrar Mercado Pago aqui depois.
        })
        .select()
        .single();

      if (orderErr || !order) throw orderErr ?? new Error("Falha ao criar pedido");

      // Cria a homenagem
      const ends = new Date(Date.now() + candle.duration_hours * 3600_000).toISOString();
      const { data: tribute, error: tErr } = await supabase
        .from("tributes")
        .insert({
          order_id: order.id,
          candle_id: candle.id,
          tribute_name: parsed.data.tribute_name,
          tribute_message: parsed.data.tribute_message || null,
          ends_at: ends,
        })
        .select()
        .single();

      if (tErr || !tribute) throw tErr ?? new Error("Falha ao criar homenagem");

      toast.success("Vela acesa com sucesso 🕯️");
      navigate({ to: "/homenagem/$id", params: { id: tribute.id } });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível concluir. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <SiteShell><div className="mx-auto max-w-4xl px-4 py-16"><Skeleton className="h-96 rounded-2xl" /></div></SiteShell>;
  }
  if (!candle) return null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        <Link to="/velas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar às velas
        </Link>

        <div className="mt-8 grid gap-12 md:grid-cols-2 md:gap-16">
          {/* Vela + info */}
          <div>
            <div className="flex justify-center rounded-2xl bg-secondary/40 py-16">
              <CandleFlame />
            </div>
            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.24em] text-gold">Modelo</p>
              <h1 className="mt-2 font-serif text-4xl text-foreground">{candle.name}</h1>
              <p className="mt-4 text-muted-foreground leading-relaxed">{candle.description}</p>
              <div className="mt-6 flex items-center gap-6 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" /> {Math.round(candle.duration_hours / 24)} dias acesa
                </span>
                <span className="font-serif text-3xl text-primary">{formatBRL(candle.price_cents)}</span>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-soft">
            <h2 className="font-serif text-2xl text-foreground">Dados da homenagem</h2>
            <p className="mt-1 text-sm text-muted-foreground">Preencha com carinho.</p>

            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="customer_name">Seu nome</Label>
                <Input id="customer_name" name="customer_name" required autoComplete="name" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customer_email">Seu email</Label>
                  <Input id="customer_email" name="customer_email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Telefone (opcional)</Label>
                  <Input id="customer_phone" name="customer_phone" autoComplete="tel" />
                </div>
              </div>

              <div className="pt-2">
                <Label htmlFor="tribute_name">Nome da pessoa homenageada</Label>
                <Input id="tribute_name" name="tribute_name" required />
              </div>
              <div>
                <Label htmlFor="tribute_message">Mensagem (opcional)</Label>
                <Textarea id="tribute_message" name="tribute_message" rows={4} placeholder="Uma palavra, uma oração, uma lembrança..." maxLength={500} />
              </div>

              <div className="pt-4">
                <Label>Forma de pagamento</Label>
                <RadioGroup name="payment_method" defaultValue="pix" className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="pix" id="pix" />
                    <span className="font-medium">PIX</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="card" id="card" />
                    <span className="font-medium">Cartão</span>
                  </label>
                </RadioGroup>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong>Modo demonstração:</strong> o pagamento é simulado. A integração
                com Mercado Pago (PIX real e cartão) é habilitada quando você fornecer as
                credenciais.
              </span>
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="mt-6 w-full rounded-full bg-primary text-base hover:bg-primary/90">
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>) : (<>Pagar {formatBRL(candle.price_cents)} e acender</>)}
            </Button>
          </form>
        </div>
      </div>
    </SiteShell>
  );
}
