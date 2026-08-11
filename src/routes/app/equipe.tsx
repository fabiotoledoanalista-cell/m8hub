import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, Copy, Trash2, Pencil } from "lucide-react";
import { brand } from "@/config/brand";
import { listTeam, inviteMember, setMemberActive, setMemberRole, removeMember, updateMember } from "@/lib/team.functions";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { PlanUsageBadge } from "@/components/plan-usage-badge";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  supervisor: "Gestor",
  atendente: "Colaborador",
};

export const Route = createFileRoute("/app/equipe")({
  head: () => ({ meta: [{ title: `${brand.name} — Equipe` }] }),
  beforeLoad: ({ context }: any) => {
    const r = context?.membership?.role;
    if (r === "atendente") throw redirect({ to: "/app/dashboard" });
  },
  component: EquipePage,
});

function EquipePage() {
  const ctx = Route.useRouteContext();
  const myRole = ctx.membership?.role;
  const isSuperAdmin = !!ctx.isSuperAdmin;
  const isOwner = myRole === "owner" || isSuperAdmin;
  const canManage = myRole === "owner" || myRole === "admin" || isSuperAdmin;
  const companyId = ctx.company?.id ?? null;
  const list = useServerFn(listTeam);
  const invite = useServerFn(inviteMember);
  const toggleActive = useServerFn(setMemberActive);
  const changeRole = useServerFn(setMemberRole);
  const remove = useServerFn(removeMember);
  const update = useServerFn(updateMember);
  const plan = usePlanFeatures();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "supervisor" | "atendente">("atendente");
  const [busy, setBusy] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", cargo: "", telefone: "", role: "atendente" as "admin" | "supervisor" | "atendente" });
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(m: any) {
    setEditing(m);
    setEditForm({
      nome: m.nome || "",
      cargo: m.cargo || "",
      telefone: m.telefone || "",
      role: (m.role === "owner" ? "admin" : m.role) as any,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await update({
        data: {
          memberId: editing.id,
          nome: editForm.nome.trim() || null,
          cargo: editForm.cargo.trim() || null,
          telefone: editForm.telefone.trim() || null,
          role: editing.role === "owner" ? undefined : editForm.role,
          companyId,
        },
      });
      toast.success("Membro atualizado");
      setEditing(null);
      await reload();
    } catch (e: any) { toast.error(e?.message); }
    finally { setSavingEdit(false); }
  }

  async function reload() {
    setLoading(true);
    try { const r = await list({ data: { companyId } }); setMembers(r.members); }
    catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  async function doInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setTempPwd(null);
    try {
      const r = await invite({ data: { email, role, companyId } });
      setEmail("");
      toast.success("Membro adicionado");
      if (r.tempPassword) {
        setTempPwd(r.tempPassword);
      }
      await Promise.all([reload(), plan.refresh()]);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  }

  async function doRemove(memberId: string) {
    if (!window.confirm("Remover este membro da equipe? Essa ação não pode ser desfeita.")) return;
    try {
      await remove({ data: { memberId, companyId } });
      toast.success("Membro removido");
      await Promise.all([reload(), plan.refresh()]);
    } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground">Gerencie quem tem acesso a esta empresa.</p>
        </div>
        {!plan.loading && (
          <PlanUsageBadge label="usuários" used={plan.usage.usuarios} limit={plan.limites.usuarios} />
        )}
      </div>

      {canManage && <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="size-4" /> Convidar membro</h2>
        <form onSubmit={doInvite} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
          </div>
          <div className="w-44">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="atendente">Colaborador</SelectItem>
                <SelectItem value="supervisor">Gestor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <UserPlus className="size-4 mr-1.5" />}
            Adicionar
          </Button>
        </form>
        {tempPwd && (
          <div className="mt-4 rounded-md border bg-amber-500/10 p-3 text-sm">
            <div className="font-medium mb-1">Senha temporária gerada</div>
            <div className="text-xs text-muted-foreground mb-2">Envie ao membro. No primeiro acesso ele será obrigado a trocar.</div>
            <div className="flex items-center gap-2">
              <code className="bg-background px-2 py-1 rounded text-xs flex-1 break-all">{tempPwd}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(tempPwd); toast.success("Copiado"); }}>
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground bg-muted/50 px-4 py-2">
          <div className="col-span-5">Membro</div>
          <div className="col-span-3">Papel</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {loading ? (
          <div className="p-6 grid place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Sem membros.</div>
        ) : (
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm">
                <div className="col-span-5 min-w-0">
                  <div className="font-medium truncate">{m.nome || m.email || m.user_id}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
                <div className="col-span-3">
                  {isOwner && m.role !== "owner" ? (
                    <Select value={m.role} onValueChange={(v) =>
                      changeRole({ data: { memberId: m.id, role: v as any, companyId } }).then(reload).catch((e) => toast.error(e?.message))
                    }>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="supervisor">Gestor</SelectItem>
                        <SelectItem value="atendente">Colaborador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  )}
                </div>
                <div className="col-span-2">
                  <Badge variant={m.ativo ? "default" : "secondary"} className={m.ativo ? "bg-primary" : ""}>
                    {m.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  {canManage && m.role !== "owner" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() =>
                        toggleActive({ data: { memberId: m.id, ativo: !m.ativo, companyId } }).then(reload).catch((e) => toast.error(e?.message))
                      }>
                        {m.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => doRemove(m.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o && !savingEdit) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar membro</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={editing.email || ""} disabled />
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cargo</Label>
                  <Input value={editForm.cargo} onChange={(e) => setEditForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Vendedor" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={editForm.telefone} onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                </div>
              </div>
              {editing.role !== "owner" && (
                <div>
                  <Label>Papel</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atendente">Colaborador</SelectItem>
                      <SelectItem value="supervisor">Gestor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
