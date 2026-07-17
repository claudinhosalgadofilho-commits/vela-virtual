import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createOrderAndPayment, getOrderStatus } from "@/lib/payments.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { CandleFlame } from "@/components/CandleFlame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

type PaymentSession =
  | { order_id: string; method: "pix"; pix_qr_code: string | null; pix_qr_base64: string | null }
  | { order_id: string; method: "card"; init_point: string; sandbox_init_point: string };

const searchSchema = z.object({
  pay: fallback(z.string(), "pix").default("pix"),
});

export const Route = createFileRoute("/velas/$slug")({
  validateSearch: zodValidator(searchSchema),
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

type FormValues = z.infer<typeof schema>;

function Page() {
  const { slug } = Route.useParams();
  const { pay } = Route.useSearch();
  const preselectedMethod: "pix" | "card" = pay === "card" ? "card" : "pix";
  const navigate = useNavigate();
  const [pending, setPending] = useState<FormValues | null>(null);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState<PaymentSession | null>(null);

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!candle) return;

    const formData = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: String(formData.get("customer_name") ?? ""),
      customer_email: String(formData.get("customer_email") ?? ""),
      customer_phone: String(formData.get("customer_phone") ?? ""),
      tribute_name: String(formData.get("tribute_name") ?? ""),
      tribute_message: String(formData.get("tribute_message") ?? ""),
      payment_method: String(formData.get("payment_method") ?? "pix") as "pix" | "card",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Preencha os campos corretamente.");
      return;
    }
    setPending(parsed.data);
  }

  async function confirmPayment() {
    if (!candle || !pending) return;
    setProcessing(true);
    try {
      const result = (await createOrderAndPayment({
        data: { ...pending, candle_id: candle.id },
      })) as PaymentSession;
      setSession(result);
      if (result.method === "card") {
        // Redirect to Mercado Pago Checkout Pro
        window.location.href = result.init_point || result.sandbox_init_point;
        return;
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o pagamento.");
    } finally {
      setProcessing(false);
    }
  }

  // Poll order status while a PIX session is open
  useEffect(() => {
    if (!session || session.method !== "pix") return;
    let cancelled = false;
    const orderId = session.order_id;
    const interval = window.setInterval(async () => {
      try {
        const res = await getOrderStatus({ data: { order_id: orderId } });
        if (cancelled) return;
        if (res.status === "paid" && res.tribute_id) {
          window.clearInterval(interval);
          toast.success("Pagamento confirmado 🕯️");
          navigate({ to: "/homenagem/$id", params: { id: res.tribute_id } });
        } else if (res.status === "cancelled") {
          window.clearInterval(interval);
          toast.error("Pagamento recusado. Tente novamente.");
          setSession(null);
          setPending(null);
        }
      } catch (e) {
        console.error(e);
      }
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session, navigate]);


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
          {/* Formulário */}
          <form
            onSubmit={handleSubmit}
            className="order-2 rounded-2xl border border-border/60 bg-card p-6 md:order-1 md:p-8 shadow-soft"
          >
            <h2 className="font-serif text-2xl text-foreground">Dados da homenagem</h2>
            <p className="mt-1 text-sm text-muted-foreground">Preencha com carinho.</p>

            <fieldset className="mt-6 space-y-4">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
                Seus dados
              </legend>
              <div>
                <Label htmlFor="customer_name">
                  Seu nome <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  required
                  autoComplete="name"
                  aria-required="true"
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customer_email">
                    Seu email <span className="text-destructive" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="customer_email"
                    name="customer_email"
                    type="email"
                    required
                    autoComplete="email"
                    aria-required="true"
                    aria-describedby="customer_email_hint"
                    inputMode="email"
                  />
                  <p id="customer_email_hint" className="mt-1 text-xs text-muted-foreground">
                    Enviaremos o link da homenagem para este email.
                  </p>
                </div>
                <div>
                  <Label htmlFor="customer_phone">Telefone (opcional)</Label>
                  <Input
                    id="customer_phone"
                    name="customer_phone"
                    autoComplete="tel"
                    inputMode="tel"
                    type="tel"
                  />
                </div>
              </div>
            </fieldset>

            <Separator className="my-6" />

            <fieldset className="space-y-4">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
                Homenageado
              </legend>
              <div>
                <Label htmlFor="tribute_name">
                  Nome da pessoa homenageada <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="tribute_name"
                  name="tribute_name"
                  required
                  aria-required="true"
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="tribute_message">Mensagem (opcional)</Label>
                <Textarea
                  id="tribute_message"
                  name="tribute_message"
                  rows={4}
                  placeholder="Uma palavra, uma oração, uma lembrança..."
                  maxLength={500}
                  aria-describedby="tribute_message_hint"
                />
                <p id="tribute_message_hint" className="mt-1 text-xs text-muted-foreground">
                  Até 500 caracteres.
                </p>
              </div>
            </fieldset>

            <Separator className="my-6" />

            <fieldset>
              <legend className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
                Forma de pagamento
              </legend>
              <RadioGroup
                name="payment_method"
                defaultValue="pix"
                className="grid grid-cols-2 gap-3"
                aria-label="Escolha a forma de pagamento"
              >
                <label
                  htmlFor="pay-pix"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/40"
                >
                  <RadioGroupItem value="pix" id="pay-pix" />
                  <QrCode className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-medium">PIX</span>
                </label>
                <label
                  htmlFor="pay-card"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/40"
                >
                  <RadioGroupItem value="card" id="pay-card" />
                  <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-medium">Cartão</span>
                </label>
              </RadioGroup>
            </fieldset>

            <div className="mt-6 flex items-start gap-2 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Pagamento processado com segurança pelo <strong>Mercado Pago</strong>.
                PIX ou cartão de crédito.
              </span>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full rounded-full bg-primary text-base hover:bg-primary/90"
            >
              Continuar para pagamento <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Resumo do pedido */}
          <aside className="order-1 md:order-2">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft md:p-8">
                <div className="flex justify-center rounded-xl bg-secondary/40 py-8">
                  <CandleFlame size="sm" />
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.24em] text-gold">Resumo</p>
                <h1 className="mt-1 font-serif text-3xl text-foreground">{candle.name}</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {candle.description}
                </p>

                <Separator className="my-5" />

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <dt className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Tempo acesa
                    </dt>
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
                  <span className="font-serif text-3xl text-primary">
                    {formatBRL(candle.price_cents)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <PaymentDialog
        open={!!pending}
        onOpenChange={(o) => {
          if (processing) return;
          if (!o) {
            setPending(null);
            setSession(null);
          }
        }}
        session={session}
        method={pending?.payment_method ?? "pix"}
        amountCents={candle.price_cents}
        processing={processing}
        onConfirm={confirmPayment}
      />
    </SiteShell>
  );
}

/* --------------------------- Diálogo de pagamento --------------------------- */

function PaymentDialog({
  open,
  onOpenChange,
  session,
  method,
  amountCents,
  processing,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: PaymentSession | null;
  method: "pix" | "card";
  amountCents: number;
  processing: boolean;
  onConfirm: () => void;
}) {
  const isPix = method === "pix";
  const hasPix = session?.method === "pix";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isPix ? "Pague com PIX" : "Pagamento com cartão"}
          </DialogTitle>
          <DialogDescription>
            {hasPix
              ? "Escaneie o QR Code ou copie o código PIX. A vela acende automaticamente após a confirmação."
              : isPix
                ? "Vamos gerar o QR Code PIX para você."
                : "Você será redirecionado para o Mercado Pago para concluir o pagamento."}
          </DialogDescription>
        </DialogHeader>

        {hasPix ? (
          <PixPanel
            code={session.pix_qr_code ?? ""}
            qrBase64={session.pix_qr_base64}
            amountCents={amountCents}
          />
        ) : (
          <div className="rounded-lg border border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
            {processing
              ? "Preparando pagamento seguro..."
              : "Clique em confirmar para continuar."}
          </div>
        )}

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            {hasPix ? "Fechar" : "Voltar"}
          </Button>
          {!hasPix && (
            <Button
              onClick={onConfirm}
              disabled={processing}
              className="w-full rounded-full bg-primary hover:bg-primary/90 sm:w-auto"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando cobrança...
                </>
              ) : isPix ? (
                <>Gerar PIX ({formatBRL(amountCents)})</>
              ) : (
                <>
                  Ir para Mercado Pago <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PixPanel({
  code,
  qrBase64,
  amountCents,
}: {
  code: string;
  qrBase64: string | null;
  amountCents: number;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código PIX copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }
  return (
    <div className="space-y-4">
      <div className="mx-auto grid h-48 w-48 place-items-center overflow-hidden rounded-xl border border-border bg-white">
        {qrBase64 ? (
          <img
            src={`data:image/png;base64,${qrBase64}`}
            alt="QR Code PIX Mercado Pago"
            className="h-full w-full object-contain"
          />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="rounded-lg border border-border bg-secondary/40 p-3">
        <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
          PIX copia e cola
        </p>
        <p className="break-all font-mono text-[11px] leading-relaxed text-foreground/80">
          {code || "Gerando..."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          disabled={!code}
          className="mt-3 w-full"
        >
          <Copy className="mr-2 h-3.5 w-3.5" /> Copiar código
        </Button>
      </div>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Aguardando pagamento — <strong className="text-foreground">{formatBRL(amountCents)}</strong>
      </p>
    </div>
  );
}

