import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listScheduledMessages, createScheduledMessage, cancelScheduledMessage, deleteScheduledMessage } from "@/lib/scheduled-messages.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, Plus, Trash2, X, Loader2, Send, Ban, Calendar } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/agendadas")({
  head: () => ({ meta: [{ title: `${brand.name} — Mensagens Agendadas` }] }),
  beforeLoad: ({ context }: any) => {
    if (context?.membership?.role === "atendente") throw redirect({ to: "/app/dashboard" });
  },
  component: AgendadasPage,
});

type Msg = { id: string; telefone: string; nome_contato: string | null; mensagem: string; agendado_em: string; status: string; enviado_em: string | null };

const STATUS_COLOR: Record<string, string> = {
  pendente: "text-[color:var(--warnAmber)] bg-[color:var(--warnBg)] border-[color:var(--warnBorder)]",
  enviado: "text-[color:var(--neonGreen)] bg-[color:var(--brand-soft)] border-[color:var(--brand-soft-strong)]",
  erro: "text-[color:var(--errorRed)] bg-[color:var(--errorBg)] border-[color:var(--errorBorder)]",
  cancelado: "text-muted-foreground bg-muted/30 border-muted",
};

function AgendadasPage() {
  const getMsgs = useServerFn(listScheduledMessages);
  const newMsg = useServerFn(createScheduledMessage);
  const cancelMsg = useServerFn(cancelScheduledMessage);
  const delMsg = useServerFn(deleteScheduledMessage);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ telefone: "", nome_contato: "", mensagem: "", agendado_em: "" });

  async function load() {
    try { setMsgs(await getMsgs()); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function handleSave() {
    if (!form.telefone || !form.mensagem || !form.agendado_em) return toast.error("Preencha todos os campos obrigatórios");
    if (new Date(form.agendado_em) <= new Date()) return toast.error("A data deve ser no futuro");
    setSaving(true);
    try {
      await newMsg({ data: { ...form, nome_contato: form.nome_contato || undefined } });
      toast.success("Mensagem agendada!");
      setModal(false);
      setForm({ telefone: "", nome_contato: "", mensagem: "", agendado_em: "" });
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleCancel(id: string) {
    try { await cancelMsg({ data: { id } }); toast.success("Mensagem cancelada"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta mensagem?")) return;
    try { await delMsg({ data: { id } }); toast.success("Removida"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Mensagens Agendadas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Programe mensagens para envio automático no WhatsApp</p>
        </div>
        <Button onClick={() => setModal(true)} className="bg-gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-2" /> Agendar mensagem
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : msgs.length === 0 ? (
        <div className="panel p-12 text-center">
          <Calendar className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhuma mensagem agendada</p>
          <p className="text-sm text-muted-foreground mt-1">Agende mensagens para serem enviadas automaticamente</p>
          <Button onClick={() => setModal(true)} className="mt-4 bg-gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-2" /> Agendar primeira mensagem
          </Button>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Contato</th>
                <th className="text-left px-4 py-3">Mensagem</th>
                <th className="text-left px-4 py-3">Agendado para</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--hairline)]">
              {msgs.map(m => (
                <tr key={m.id} className="hover:bg-[color:var(--panel-2)]/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.nome_contato || m.telefone}</div>
                    {m.nome_contato && <div className="text-xs text-muted-foreground">{m.telefone}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-muted-foreground">{m.mensagem}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5" />
                      {new Date(m.agendado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[m.status] ?? STATUS_COLOR.cancelado}`}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {m.status === "pendente" && (
                        <button onClick={() => handleCancel(m.id)} title="Cancelar" className="size-7 grid place-items-center rounded text-muted-foreground hover:text-[color:var(--warnAmber)]">
                          <Ban className="size-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(m.id)} title="Remover" className="size-7 grid place-items-center rounded text-muted-foreground hover:text-[color:var(--errorRed)]">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Agendar mensagem</h2>
              <button onClick={() => setModal(false)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone <span className="text-[color:var(--errorRed)]">*</span></Label>
              <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="5511999990000" className="h-10" />
              <p className="text-xs text-muted-foreground">Formato: código do país + DDD + número</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do contato</Label>
              <Input value={form.nome_contato} onChange={e => setForm(f => ({ ...f, nome_contato: e.target.value }))} placeholder="João Silva" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem <span className="text-[color:var(--errorRed)]">*</span></Label>
              <textarea
                value={form.mensagem}
                onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                placeholder="Olá! Passando para lembrar..."
                rows={3}
                className="w-full rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel-2)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data e hora do envio <span className="text-[color:var(--errorRed)]">*</span></Label>
              <Input type="datetime-local" min={minDateTime} value={form.agendado_em} onChange={e => setForm(f => ({ ...f, agendado_em: e.target.value }))} className="h-10" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-brand text-primary-foreground">
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />} Agendar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
