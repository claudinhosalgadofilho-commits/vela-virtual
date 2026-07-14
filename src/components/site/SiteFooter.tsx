import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Flame className="h-4 w-4 text-gold" strokeWidth={1.8} />
            </span>
            <span className="font-serif text-xl text-foreground">Velas de Luz</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Uma plataforma dedicada às homenagens digitais. Acenda uma vela virtual
            e mantenha viva a memória de quem você ama.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Plataforma</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/como-funciona" className="hover:text-foreground">Como funciona</Link></li>
            <li><Link to="/velas" className="hover:text-foreground">Acender vela</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Área administrativa</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Institucional</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Termos de uso</a></li>
            <li><a href="#" className="hover:text-foreground">Política de privacidade</a></li>
            <li><a href="#" className="hover:text-foreground">Contato</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:px-8">
          <p>© {year} Velas de Luz. Todos os direitos reservados.</p>
          <p className="italic">Feito com respeito e cuidado.</p>
        </div>
      </div>
    </footer>
  );
}
