import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/vela-virtual-logo.jpeg.asset.json";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Vela Virtual Santa Luzia"
              className="h-10 w-10 rounded-full object-cover ring-1 ring-gold/30"
            />
            <span className="font-serif text-lg text-foreground">
              Vela Virtual <span className="text-gold">Santa Luzia</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground italic">
            Acenda uma luz. Eternize uma memória.
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Preste sua homenagem acendendo uma vela virtual e deixe uma mensagem
            de conforto à família.
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
          <p>© {year} Vela Virtual Santa Luzia. Todos os direitos reservados.</p>
          <p className="italic">Feito com respeito e cuidado.</p>
        </div>
      </div>
    </footer>
  );
}
