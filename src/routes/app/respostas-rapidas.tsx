import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listQuickReplies, upsertQuickReply, deleteQuickReply } from "@/lib/quick-replies.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MessageSquareText, X, Loader2 } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/respostas-rapidas")({
  head: () => ({ meta: [{ title: `${brand.name} — Respostas rápidas` }] }),
  beforeLoad: ({ context }: any) => {
    if (context?.membership?.role === "atendente") throw redirect({ to: "/app/dashboard" });
  },
  component: RespostasRapidasPage,
});

type QuickReply = { id: string; titulo: string; mensagem: string; atalho: string | null; posicao: number };

function RespostasRapidasPage() {
  const getQuickReplies = useServerFn(listQuickReplies);
  const saveQuickReply = useServerFn(upsertQuickReply);
  const removeQuickReply = useServerFn(deleteQuickReply);

  const [items, setItems] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<QuickReply> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setItems((await getQuickReplies()) as QuickReply[]); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function handleSave() {
    if (!modal?.titulo?.trim()) return toast.error("Título obrigatório");
    if (!modal?.mensagem?.trim()) return toast.error("Mensagem obrigatória");
    setSaving(true);
    try {
      await saveQuickReply({
        data: {
          id: modal.id,
          titulo: modal.titulo,
          mensagem: modal.mensagem,
          atalho: modal.atalho?.trim() || undefined,
          posicao: modal.posicao ?? items.length,
        },
      });
      toast.success(modal.id ? "Resposta atualizada!" : "Resposta criada!");
      setModal(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta resposta rápida?")) return;
    try { await removeQuickReply({ data: { id } }); toast.success("Resposta removida"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Respostas Rápidas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mensagens prontas para agilizar o atendimento no WhatsApp</p>
        </div>
        <Button onClick={() => setModal({})} className="bg-gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-2" /> Nova resposta
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="panel p-12 text-center">
          <MessageSquareText className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhuma resposta rápida criada</p>
          <p className="text-sm text-muted-foreground mt-1">Crie respostas prontas para usar direto na tela de Conversas</p>
          <Button onClick={() => setModal({})} className="mt-4 bg-gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-2" /> Criar primeira resposta
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(q => (
            <div key={q.id} className="panel p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] truncate">{q.titulo}</span>
                  {q.atalho && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--panel-2)] text-muted-foreground font-mono">/{q.atalho}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{q.mensagem}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setModal(q)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => handleDelete(q.id)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-[color:var(--errorRed)] hover:bg-[color:var(--errorBg)]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">{modal.id ? "Editar resposta" : "Nova resposta"}</h2>
              <button onClick={() => setModal(null)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={modal.titulo ?? ""} onChange={e => setModal(m => ({ ...m!, titulo: e.target.value }))} placeholder="Ex: Saudação inicial" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Atalho (opcional)</Label>
              <Input value={modal.atalho ?? ""} onChange={e => setModal(m => ({ ...m!, atalho: e.target.value.replace(/\s/g, "") }))} placeholder="Ex: ola" className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem</Label>
              <Textarea value={modal.mensagem ?? ""} onChange={e => setModal(m => ({ ...m!, mensagem: e.target.value }))} placeholder="Texto que será enviado" rows={4} />
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
