import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LayoutDashboard, Flame, ShoppingCart, HeartHandshake,
  Settings, LogOut, Menu, X, Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const nav: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/velas", label: "Velas", icon: Flame },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/admin/homenagens", label: "Homenagens", icon: HeartHandshake },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setDisplayName(user.email ?? "");
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth" });
  }

  if (isAdmin === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">
            Sua conta ainda não possui permissão administrativa.
          </p>
          <Button onClick={signOut} variant="outline" className="mt-6 rounded-full">Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/20">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-sidebar transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center gap-2.5 border-b border-border px-6">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Flame className="h-4 w-4 text-gold" />
          </span>
          <span className="font-serif text-lg">Velas de Luz</span>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: n.exact }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground font-medium" }}
            >
              <n.icon className="h-4 w-4" strokeWidth={1.7} />
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
          <p className="mb-2 truncate text-xs text-muted-foreground">{displayName}</p>
          <Button variant="outline" size="sm" onClick={signOut} className="w-full">
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <button onClick={() => setOpen((v) => !v)} className="rounded-md p-2">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-serif text-lg">Admin</span>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
