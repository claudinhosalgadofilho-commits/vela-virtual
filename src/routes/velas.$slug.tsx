import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createOrderAndPayment } from "@/lib/payments.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatBRL } from "@/lib/format";
import { ArrowLeft, ArrowRight, Clock, Loader2, ShieldCheck, ExternalLink } from "lucide-react";

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
  tribute_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional().or(z.literal("")),
  tribute_death_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional().or(z.literal("")),
});

function Page() {
  const { slug } = Route.useParams();
  const [processing, setProcessing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setPhotoFile(null); setPhotoPreview(null); return; }
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande (máx 5MB).");
      e.target.value = "";
      return;
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  const { data: candle, isLoading } = useQuery({
    queryKey: ["candle", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candles")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!candle || processing) return;

    const formData = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: String(formData.get("customer_name") ?? ""),
      customer_email: String(formData.get("customer_email") ?? ""),
      customer_phone: String(formData.get("customer_phone") ?? ""),
      tribute_name: String(formData.get("tribute_name") ?? ""),
      tribute_message: String(formData.get("tribute_message") ?? ""),
      tribute_birth_date: String(formData.get("tribute_birth_date") ?? ""),
      tribute_death_date: String(formData.get("tribute_death_date") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Preencha os campos corretamente.");
      return;
    }
    if (parsed.data.tribute_birth_date && parsed.data.tribute_death_date &&
        parsed.data.tribute_death_date < parsed.data.tribute_birth_date) {
      toast.error("Data de falecimento não pode ser anterior à de nascimento.");
      return;
    }

    setProcessing(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const data_base64 = await fileToBase64(photoFile);
        const up = await uploadTributePhoto({
          data: { filename: photoFile.name, content_type: photoFile.type, data_base64 },
        });
        photoUrl = up.url;
      }
      const result = await createOrderAndPayment({
        data: {
          ...parsed.data,
          candle_id: candle.id,
          tribute_photo_url: photoUrl,
          tribute_birth_date: parsed.data.tribute_birth_date || null,
          tribute_death_date: parsed.data.tribute_death_date || null,
        },
      });
      const url = result.init_point || result.sandbox_init_point;
      if (!url) throw new Error("Não foi possível obter o link de pagamento.");
      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o pagamento.");
      setProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-4xl px-4 py-16">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </SiteShell>
    );
  }
  if (!candle) return null;

  const days = Math.round(candle.duration_hours / 24);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        <Link to="/velas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar às velas
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-12">
          <form
            onSubmit={handleSubmit}
            className="order-2 rounded-2xl border border-border/60 bg-card p-6 md:order-1 md:p-8 shadow-soft"
          >
            <h2 className="font-serif text-2xl text-foreground">Dados da homenagem</h2>
            <p className="mt-1 text-sm text-muted-foreground">Preencha com carinho.</p>

            <fieldset className="mt-6 space-y-4">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Seus dados</legend>
              <div>
                <Label htmlFor="customer_name">Seu nome <span className="text-destructive" aria-hidden="true">*</span></Label>
                <Input id="customer_name" name="customer_name" required autoComplete="name" minLength={2} maxLength={100} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customer_email">Seu email <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <Input id="customer_email" name="customer_email" type="email" required autoComplete="email" inputMode="email" />
                  <p className="mt-1 text-xs text-muted-foreground">Enviaremos o link da homenagem para este email.</p>
                </div>
                <div>
                  <Label htmlFor="customer_phone">Telefone (opcional)</Label>
                  <Input id="customer_phone" name="customer_phone" autoComplete="tel" inputMode="tel" type="tel" />
                </div>
              </div>
            </fieldset>

            <Separator className="my-6" />

            <fieldset className="space-y-4">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Homenageado</legend>
              <div>
                <Label htmlFor="tribute_name">Nome da pessoa homenageada <span className="text-destructive" aria-hidden="true">*</span></Label>
                <Input id="tribute_name" name="tribute_name" required minLength={2} maxLength={100} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tribute_birth_date">Data de nascimento</Label>
                  <Input id="tribute_birth_date" name="tribute_birth_date" type="date" max={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <Label htmlFor="tribute_death_date">Data de falecimento</Label>
                  <Input id="tribute_death_date" name="tribute_death_date" type="date" max={new Date().toISOString().slice(0, 10)} />
                </div>
              </div>
              <div>
                <Label htmlFor="tribute_photo">Foto do homenageado (opcional)</Label>
                <div className="mt-1 flex items-center gap-4">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Prévia da foto" className="h-20 w-20 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground">sem foto</div>
                  )}
                  <Input id="tribute_photo" name="tribute_photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="cursor-pointer" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WEBP. Máx 5MB.</p>
              </div>
              <div>
                <Label htmlFor="tribute_message">Mensagem (opcional)</Label>
                <Textarea id="tribute_message" name="tribute_message" rows={4} placeholder="Uma palavra, uma oração, uma lembrança..." maxLength={500} />
                <p className="mt-1 text-xs text-muted-foreground">Até 500 caracteres.</p>
              </div>
            </fieldset>

            <Separator className="my-6" />

            <div className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Pagamento seguro pelo <strong>Checkout do Mercado Pago</strong>.
                Na próxima tela você escolhe entre <strong>PIX, cartão de crédito, boleto</strong> ou saldo em conta.
              </span>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={processing}
              className="mt-6 w-full rounded-full bg-primary text-base hover:bg-primary/90"
            >
              {processing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...</>
              ) : (
                <>Ir para o Mercado Pago <ExternalLink className="ml-2 h-4 w-4" /></>
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Você será levado ao ambiente oficial do Mercado Pago. <ArrowRight className="inline h-3 w-3 -mt-0.5" />
            </p>
          </form>

          <aside className="order-1 md:order-2">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft md:p-8">
                <div className="flex justify-center rounded-xl bg-secondary/40 py-8">
                  <CandleFlame size="sm" />
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.24em] text-gold">Resumo</p>
                <h1 className="mt-1 font-serif text-3xl text-foreground">{candle.name}</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{candle.description}</p>

                <Separator className="my-5" />

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <dt className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> Tempo acesa</dt>
                    <dd>{days} dias</dd>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd>{formatBRL(candle.price_cents)}</dd>
                  </div>
                </dl>

                <Separator className="my-5" />

                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-serif text-3xl text-primary">{formatBRL(candle.price_cents)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
