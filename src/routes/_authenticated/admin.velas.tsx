import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatBRL, slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/velas")({
  component: Page,
});

type Candle = {
  id: string; slug: string; name: string; description: string | null;
  price_cents: number; duration_hours: number; duration_minutes: number; image_url: string | null;
  video_url: string | null; active: boolean; display_order: number;
};


function Page() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Candle | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "candles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("candles").select("*").order("display_order");
      if (error) throw error;
      return data as Candle[];
    },
  });

  async function toggleActive(c: Candle) {
    const { error } = await supabase.from("candles").update({ active: !c.active }).eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin", "candles"] }); }
  }

  async function remove(c: Candle) {
    if (!confirm(`Excluir "${c.name}"?`)) return;
    const { error } = await supabase.from("candles").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["admin", "candles"] }); }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const payload = {
      name,
      slug: editing?.slug || slugify(name),
      description: String(fd.get("description") ?? "") || null,
      price_cents: Math.round(parseFloat(String(fd.get("price") ?? "0")) * 100),
      duration_hours: parseInt(String(fd.get("duration_hours") ?? "168"), 10),
      video_url: String(fd.get("video_url") ?? "") || null,
      display_order: parseInt(String(fd.get("display_order") ?? "0"), 10),
    };
    const res = editing
      ? await supabase.from("candles").update(payload).eq("id", editing.id)
      : await supabase.from("candles").insert({ ...payload, active: true });
    if (res.error) return toast.error(res.error.message);
    toast.success("Salvo");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "candles"] });
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Velas</h1>
          <p className="text-sm text-muted-foreground">Gerencie o catálogo de velas virtuais.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="mr-2 h-4 w-4" />Nova vela</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar vela" : "Nova vela"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nome</Label><Input name="name" defaultValue={editing?.name} required /></div>
              <div><Label>Descrição</Label><Textarea name="description" defaultValue={editing?.description ?? ""} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço (R$)</Label><Input name="price" type="number" step="0.01" defaultValue={editing ? (editing.price_cents / 100).toFixed(2) : ""} required /></div>
                <div><Label>Duração (horas)</Label><Input name="duration_hours" type="number" defaultValue={editing?.duration_hours ?? 168} required /></div>
              </div>
              <div><Label>URL do vídeo da chama (opcional)</Label><Input name="video_url" type="url" defaultValue={editing?.video_url ?? ""} placeholder="https://.../chama.mp4" /></div>
              <div><Label>Ordem de exibição</Label><Input name="display_order" type="number" defaultValue={editing?.display_order ?? 0} /></div>
              <Button type="submit" className="w-full rounded-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {isLoading && <div className="p-6 space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-14"/>)}</div>}
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Nome</th>
              <th className="p-4 text-left">Preço</th>
              <th className="p-4 text-left">Duração</th>
              <th className="p-4 text-left">Ativa</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((c) => (
              <tr key={c.id}>
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 text-primary font-serif">{formatBRL(c.price_cents)}</td>
                <td className="p-4">{Math.round(c.duration_hours / 24)} dias</td>
                <td className="p-4"><Switch checked={c.active} onCheckedChange={() => toggleActive(c)} /></td>
                <td className="p-4 text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
