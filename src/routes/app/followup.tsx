import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listSequences, upsertSequence, deleteSequence } from "@/lib/followup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Repeat2, X, Loader2, Clock } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/followup")({
  head: () => ({ meta: [{ title: `${brand.name} — Cadências de Follow-up` }] }),
  beforeLoad: ({ context }: any) => {
    if (!context?.isSuperAdmin) throw redirect({ to: "/app/dashboard" });
  },
  component: FollowupPage,
});

type Step = { ordem: number; dias_silencio: number; mensagem: string };
type Sequence = { id: string; nome: string; descricao: string | null; ativo: boolean; followup_steps: Step[] };

function emptyStep(ordem: number): Step {
  return { ordem, dias_silencio: 3, mensagem: "" };
}

function FollowupPage() {
  const getSequences = useServerFn(listSequences);
  const saveSequence = useServerFn(upsertSequence);
  const removeSequence = useServerFn(deleteSequence);

  const [items, setItems] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Sequence> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setItems((await getSequences()) as Sequence[]); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function openModal(s: Partial<Sequence> | null) {
    setModal(s ?? { ativo: true, followup_steps: [emptyStep(1)] });
  }

  function updateStep(index: number, patch: Partial<Step>) {
    setModal((m) => {
      if (!m) return m;
      const steps = [...(m.followup_steps ?? [])];
      steps[index] = { ...steps[index], ...patch };
      return { ...m, followup_steps: steps };
    });
  }

  function addStep() {
    setModal((m) => {
      if (!m) return m;
      const steps = [...(m.followup_steps ?? [])];
      steps.push(emptyStep(steps.length + 1));
      return { ...m, followup_steps: steps };
    });
  }

  function removeStep(index: number) {
    setModal((m) => {
      if (!m) return m;
      const steps = (m.followup_steps ?? []).filter((_, i) => i !== index).map((s, i) => ({ ...s, ordem: i + 1 }));
      return { ...m, followup_steps: steps };
    });
  }

  async function handleSave() {
    if (!modal?.nome?.trim()) return toast.error("Nome obrigatório");
    const steps = modal.followup_steps ?? [];
    if (steps.length === 0) return toast.error("Adicione pelo menos uma etapa");
    if (steps.some((s) => !s.mensagem.trim())) return toast.error("Preencha a mensagem de todas as etapas");
    setSaving(true);
    try {
      await saveSequence({
        data: {
          id: modal.id,
          nome: modal.nome,
          descricao: modal.descricao ?? "",
          ativo: modal.ativo ?? true,
          steps: steps.map((s) => ({ ordem: s.ordem, dias_silencio: s.dias_silencio, mensagem: s.mensagem })),
        },
      });
      toast.success(modal.id ? "Cadência atualizada!" : "Cadência criada!");
      setModal(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta cadência? Contatos atualmente inscritos vão parar de receber follow-ups.")) return;
    try { await removeSequence({ data: { id } }); toast.success("Cadência removida"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Cadências de Follow-up</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Reengaje leads em silêncio automaticamente, sem depender de nenhum sistema externo</p>
        </div>
        <Button onClick={() => openModal(null)} className="bg-gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-2" /> Nova cadência
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="panel p-12 text-center">
          <Repeat2 className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhuma cadência criada</p>
          <p className="text-sm text-muted-foreground mt-1">Crie uma sequência de mensagens pra reengajar leads que pararam de responder</p>
          <Button onClick={() => openModal(null)} className="mt-4 bg-gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-2" /> Criar primeira cadência
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className="panel p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] truncate">{s.nome}</span>
                  {!s.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inativa</span>}
                </div>
                {s.descricao && <p className="text-sm text-muted-foreground mt-0.5 truncate">{s.descricao}</p>}
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Clock className="size-3" /> {s.followup_steps.length} etapa(s)
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openModal(s)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-[color:var(--errorRed)] hover:bg-[color:var(--errorBg)]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="panel p-6 w-full max-w-2xl space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">{modal.id ? "Editar cadência" : "Nova cadência"}</h2>
              <button onClick={() => setModal(null)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={modal.nome ?? ""} onChange={e => setModal(m => ({ ...m!, nome: e.target.value }))} placeholder="Ex: Reengajamento padrão" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição (opcional)</Label>
                <Input value={modal.descricao ?? ""} onChange={e => setModal(m => ({ ...m!, descricao: e.target.value }))} placeholder="Breve descrição" className="h-10" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={modal.ativo ?? true} onChange={e => setModal(m => ({ ...m!, ativo: e.target.checked }))} className="size-4" />
              <Label htmlFor="ativo">Cadência ativa</Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Etapas</h3>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="size-3.5 mr-1.5" /> Adicionar etapa
                </Button>
              </div>
              {(modal.followup_steps ?? []).map((step, i) => (
                <div key={i} className="rounded-xl border border-[color:var(--hairline)] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">Etapa {step.ordem}</span>
                    {(modal.followup_steps ?? []).length > 1 && (
                      <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-[color:var(--errorRed)]">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dias de silêncio pra disparar</Label>
                    <Input
                      type="number" min={1} value={step.dias_silencio}
                      onChange={(e) => updateStep(i, { dias_silencio: Number(e.target.value) || 1 })}
                      className="h-9 w-28"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mensagem</Label>
                    <Textarea
                      value={step.mensagem} onChange={(e) => updateStep(i, { mensagem: e.target.value })}
                      rows={3} placeholder="Texto que será enviado automaticamente"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-brand text-primary-foreground">
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />} Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
