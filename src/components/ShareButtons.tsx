import { Copy, Facebook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} — ${url}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        asChild
        className="rounded-full"
      >
        <a
          href={`https://wa.me/?text=${encodedText}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4 fill-current" aria-hidden>
            <path d="M20.5 3.5A11.9 11.9 0 0 0 12.05 0C5.4 0 .05 5.4.05 12a12 12 0 0 0 1.6 6L0 24l6.2-1.6a11.94 11.94 0 0 0 5.8 1.5h.05c6.6 0 11.95-5.4 11.95-12a11.9 11.9 0 0 0-3.5-8.4Zm-8.45 18.4h-.04a9.9 9.9 0 0 1-5.05-1.4l-.36-.22-3.68.96.98-3.6-.24-.37A9.9 9.9 0 0 1 2.1 12c0-5.5 4.47-9.95 9.95-9.95a9.88 9.88 0 0 1 7.03 2.92 9.87 9.87 0 0 1 2.9 7.03c0 5.5-4.47 9.95-9.93 9.95Zm5.45-7.45c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.36.22-.66.07a8.16 8.16 0 0 1-2.4-1.48 9 9 0 0 1-1.66-2.07c-.17-.3-.02-.46.13-.61.14-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.68-1.63-.93-2.24-.24-.58-.5-.5-.68-.51h-.58c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.48.71.3 1.26.48 1.69.62.71.22 1.35.19 1.86.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.07-.13-.27-.2-.57-.35Z" />
          </svg>
          WhatsApp
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild className="rounded-full">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Facebook className="mr-2 h-4 w-4" />
          Facebook
        </a>
      </Button>
      <Button variant="outline" size="sm" onClick={copy} className="rounded-full">
        <Copy className="mr-2 h-4 w-4" />
        Copiar link
      </Button>
    </div>
  );
}
