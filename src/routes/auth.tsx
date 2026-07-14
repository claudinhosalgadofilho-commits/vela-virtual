import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Flame } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Área administrativa — Velas de Luz" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo(a)");
    navigate({ to: "/admin" });
  }

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const full_name = String(fd.get("full_name"));
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        data: { full_name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro realizado. Verifique seu email se a confirmação estiver ativa.");
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-16 md:py-24">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Flame className="h-5 w-5 text-gold" />
          </div>
          <h1 className="mt-4 font-serif text-3xl text-foreground">Área administrativa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse para gerenciar velas, pedidos e homenagens.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" asChild>
              <form onSubmit={onLogin} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="login-pass">Senha</Label>
                  <Input id="login-pass" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" asChild>
              <form onSubmit={onSignup} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="su-name">Nome completo</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="su-pass">Senha</Label>
                  <Input id="su-pass" name="password" type="password" required minLength={6} />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar conta
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O primeiro cadastro é promovido a administrador automaticamente.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteShell>
  );
}
