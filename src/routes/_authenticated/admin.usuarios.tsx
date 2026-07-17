import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, ShieldOff, Trash2, Search, Loader2, UserPlus, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  listUsers, setUserAdmin, deleteUser, inviteUser, type AdminUserRow,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsersAdminPage,
});

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function UsersAdminPage() {
  const router = useRouter();
  const fetchUsers = useServerFn(listUsers);
  const toggleAdmin = useServerFn(setUserAdmin);
  const removeUser = useServerFn(deleteUser);
  const invite = useServerFn(inviteUser);

  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
  });

  const users = (data ?? []).filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q)
    );
  });

  const adminCount = (data ?? []).filter((u) => u.is_admin).length;

  async function handleToggle(u: AdminUserRow) {
    setPendingId(u.id);
    try {
      await toggleAdmin({ data: { userId: u.id, makeAdmin: !u.is_admin } });
      toast.success(u.is_admin ? "Permissão removida" : "Usuário promovido a admin");
      await refetch();
      router.invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar permissão");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setPendingId(confirmDelete.id);
    try {
      await removeUser({ data: { userId: confirmDelete.id } });
      toast.success("Usuário excluído");
      setConfirmDelete(null);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao excluir");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie contas e permissões administrativas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{data?.length ?? 0} usuários</Badge>
          <Badge variant="secondary">{adminCount} admins</Badge>
        </div>
      </header>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por e-mail ou nome"
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = currentUserId === u.id;
                const busy = pendingId === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
                    <TableCell>
                      {u.is_admin ? (
                        <Badge className="bg-gold/15 text-gold hover:bg-gold/20">Admin</Badge>
                      ) : (
                        <Badge variant="outline">Usuário</Badge>
                      )}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || (isSelf && u.is_admin)}
                          onClick={() => handleToggle(u)}
                        >
                          {u.is_admin ? (
                            <><ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Remover admin</>
                          ) : (
                            <><Shield className="mr-1.5 h-3.5 w-3.5" /> Tornar admin</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busy || isSelf}
                          onClick={() => setConfirmDelete(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {isFetching && !isLoading && (
        <p className="text-xs text-muted-foreground">Atualizando…</p>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O usuário <strong>{confirmDelete?.email}</strong> perderá
              acesso e seus dados vinculados serão removidos conforme as regras do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
