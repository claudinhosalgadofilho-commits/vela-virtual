import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: adminCfg, isLoading: loadingAdmin } = useQuery({
    queryKey: ["admin", "admin_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as { mp_access_token: string | null; mp_webhook_secret: string | null; mp_public_key: string | null } | null;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [mpForm, setMpForm] = useState<{ mp_access_token: string; mp_webhook_secret: string; mp_public_key: string }>({
    mp_access_token: "",
    mp_webhook_secret: "",
    mp_public_key: "",
  });

  useEffect(() => { if (data) setForm({
    company_name: data.company_name ?? "",
    phone: data.phone ?? "", whatsapp: data.whatsapp ?? "", email: data.email ?? "",
    address: data.address ?? "", instagram: data.instagram ?? "", facebook: data.facebook ?? "", youtube: data.youtube ?? "",
    seo_title: data.seo_title ?? "", seo_description: data.seo_description ?? "",
    google_analytics_id: data.google_analytics_id ?? "", meta_pixel_id: data.meta_pixel_id ?? "",
  }); }, [data]);

  useEffect(() => {
    if (adminCfg) setMpForm({
      mp_access_token: adminCfg.mp_access_token ?? "",
      mp_webhook_secret: adminCfg.mp_webhook_secret ?? "",
      mp_public_key: adminCfg.mp_public_key ?? "",
    });
  }, [adminCfg]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, string | null> = {};
    Object.entries(form).forEach(([k, v]) => { payload[k] = v || null; });
    const { error } = await (supabase.from("settings") as any).update(payload).eq("id", 1);
    if (error) toast.error(error.message);
    else { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); }
  }

  async function saveMp(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      mp_access_token: mpForm.mp_access_token.trim() || null,
      mp_webhook_secret: mpForm.mp_webhook_secret.trim() || null,
      mp_public_key: mpForm.mp_public_key.trim() || null,
    };
    const { error } = await (supabase as any).from("admin_settings").update(payload).eq("id", 1);
    if (error) toast.error(error.message);
    else { toast.success("Credenciais Mercado Pago salvas"); qc.invalidateQueries({ queryKey: ["admin", "admin_settings"] }); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMp = (k: keyof typeof mpForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMpForm((f) => ({ ...f, [k]: e.target.value }));

  if (isLoading || loadingAdmin) return <Skeleton className="h-96 rounded-2xl" />;

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/public/webhooks/mercadopago`
    : "/api/public/webhooks/mercadopago";

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados institucionais, contato, redes e SEO.</p>
      </div>

      <form onSubmit={save} className="space-y-8">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h2 className="font-serif text-xl">Empresa</h2>
          <div><Label>Nome</Label><Input value={form.company_name ?? ""} onChange={set("company_name")} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={set("email")} /></div>
            <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={set("phone")} /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={set("whatsapp")} /></div>
            <div><Label>Endereço</Label><Input value={form.address ?? ""} onChange={set("address")} /></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h2 className="font-serif text-xl">Redes sociais</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Instagram</Label><Input value={form.instagram ?? ""} onChange={set("instagram")} /></div>
            <div><Label>Facebook</Label><Input value={form.facebook ?? ""} onChange={set("facebook")} /></div>
            <div><Label>YouTube</Label><Input value={form.youtube ?? ""} onChange={set("youtube")} /></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h2 className="font-serif text-xl">SEO & Analytics</h2>
          <div><Label>Título SEO</Label><Input value={form.seo_title ?? ""} onChange={set("seo_title")} /></div>
          <div><Label>Descrição SEO</Label><Textarea value={form.seo_description ?? ""} onChange={set("seo_description")} rows={2} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Google Analytics ID</Label><Input value={form.google_analytics_id ?? ""} onChange={set("google_analytics_id")} placeholder="G-XXXXXXX" /></div>
            <div><Label>Meta Pixel ID</Label><Input value={form.meta_pixel_id ?? ""} onChange={set("meta_pixel_id")} /></div>
          </div>
        </section>

        <Button type="submit" size="lg" className="rounded-full">Salvar alterações</Button>
      </form>
    </div>
  );
}
