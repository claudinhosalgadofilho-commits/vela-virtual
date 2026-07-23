import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink, ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

function TributePhotoCell({
  tributeId,
  photoPath,
  onChanged,
}: {
  tributeId: string;
  photoPath: string | null;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!photoPath) { setPreview(null); return; }
    if (photoPath.startsWith("http")) { setPreview(photoPath); return; }
    supabase.storage.from("tribute-photos").createSignedUrl(photoPath, 3600).then(({ data }) => {
      if (!cancelled) setPreview(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [photoPath]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    setBusy(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${tributeId}/photo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("tribute-photos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { error: dbErr } = await supabase
      .from("tributes")
      .update({ tribute_photo_url: path })
      .eq("id", tributeId);
    if (dbErr) { toast.error(dbErr.message); setBusy(false); return; }
    toast.success("Foto atualizada");
    setBusy(false);
    onChanged();
  }

  async function handleRemove() {
    if (!photoPath) return;
    setBusy(true);
    if (!photoPath.startsWith("http")) {
      await supabase.storage.from("tribute-photos").remove([photoPath]);
    }
    const { error } = await supabase.from("tributes").update({ tribute_photo_url: null }).eq("id", tributeId);
    if (error) toast.error(error.message);
    else { toast.success("Foto removida"); onChanged(); }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {preview ? (
        <img src={preview} alt="" className="h-10 w-10 rounded object-cover border border-border" />
      ) : (
        <div className="h-10 w-10 rounded bg-secondary/50 border border-border" />
      )}
      <Button variant="ghost" size="icon" disabled={busy} onClick={() => inputRef.current?.click()} title="Enviar foto">
        <ImagePlus className="h-4 w-4" />
      </Button>
      {photoPath && (
        <Button variant="ghost" size="icon" disabled={busy} onClick={handleRemove} title="Remover foto">
          <X className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin/homenagens")({
  component: Page,
});

const ALERT_THRESHOLD_MIN = 10;

function Countdown({ endsAt, litAt }: { endsAt: string; litAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!litAt) return <span className="text-muted-foreground">Não acesa</span>;

  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return <span className="text-muted-foreground">Encerrada</span>;

  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  const ending = diff <= ALERT_THRESHOLD_MIN * 60 * 1000;
  return (
    <span
      className={
        "font-mono tabular-nums inline-flex items-center gap-1.5 " +
        (ending ? "text-destructive font-semibold animate-pulse" : "text-primary")
      }
    >
      {ending && <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

type TributeRow = {
  id: string;
  tribute_name: string;
  ends_at: string;
  lit_at: string | null;
  active: boolean;
};

function useEndingAlerts(tributes: TributeRow[] | undefined) {
  const notifiedRef = useRef<Map<string, "warn" | "ended">>(new Map());
  useEffect(() => {
    if (!tributes) return;
    const check = () => {
      const now = Date.now();
      for (const t of tributes) {
        if (!t.lit_at || !t.active) continue;
        const diff = new Date(t.ends_at).getTime() - now;
        const state = notifiedRef.current.get(t.id);
        if (diff <= 0 && state !== "ended") {
          notifiedRef.current.set(t.id, "ended");
          toast.error(`Homenagem encerrada: ${t.tribute_name}`);
        } else if (diff > 0 && diff <= ALERT_THRESHOLD_MIN * 60 * 1000 && !state) {
          notifiedRef.current.set(t.id, "warn");
          toast.warning(`${t.tribute_name} termina em menos de ${ALERT_THRESHOLD_MIN} min`, {
            icon: "⚠️",
          });
        }
      }
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [tributes]);
}

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tributes")
        .select("*, candle:candles(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEndingAlerts(data as TributeRow[] | undefined);


  async function remove(id: string) {
    if (!confirm("Excluir esta homenagem?")) return;
    const { error } = await supabase.from("tributes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["admin", "tributes"] }); }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Homenagens</h1>
        <p className="text-sm text-muted-foreground">Todas as velas criadas na plataforma.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-x-auto">
        {isLoading && <div className="p-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>}
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Homenageado</th>
              <th className="p-4 text-left">Foto</th>
              <th className="p-4 text-left">Vela</th>
              <th className="p-4 text-left">Início</th>
              <th className="p-4 text-left">Encerra</th>
              <th className="p-4 text-left">Tempo restante</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma homenagem ainda.</td></tr>}
            {data?.map((t) => {
              const ended = new Date(t.ends_at).getTime() <= Date.now();
              return (
                <tr key={t.id}>
                  <td className="p-4 font-medium">{t.tribute_name}</td>
                  <td className="p-4">
                    <TributePhotoCell
                      tributeId={t.id}
                      photoPath={t.tribute_photo_url ?? null}
                      onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "tributes"] })}
                    />
                  </td>
                  <td className="p-4">{t.candle?.name}</td>
            {data?.map((t) => {
              const ended = new Date(t.ends_at).getTime() <= Date.now();
              return (
                <tr key={t.id}>
                  <td className="p-4 font-medium">{t.tribute_name}</td>
                  <td className="p-4">{t.candle?.name}</td>
                  <td className="p-4 text-muted-foreground">{new Date(t.starts_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4 text-muted-foreground">{new Date(t.ends_at).toLocaleString("pt-BR")}</td>
                  <td className="p-4">
                    <Countdown endsAt={t.ends_at} litAt={t.lit_at} />
                  </td>
                  <td className="p-4">
                    <Badge className={ended ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}>
                      {ended ? "Encerrada" : "Ativa"}
                    </Badge>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to="/homenagem/$id" params={{ id: t.id }} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
