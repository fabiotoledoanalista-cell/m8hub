import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listApiKeys, createApiKey, revokeApiKey, deleteApiKey, listWebhooks, upsertWebhook, deleteWebhook } from "@/lib/api-keys.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Plus, Trash2, X, Loader2, Webhook, Copy, Eye, EyeOff, CheckCircle2, Globe } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/integracao")({
  head: () => ({ meta: [{ title: `${brand.name} — Integrações` }] }),
  component: IntegracaoPage,
});

const EVENTOS = ["mensagem.recebida","mensagem.enviada","contato.criado","lead.movido","campanha.concluida"];

type ApiKey = { id: string; nome: string; key_preview: string; ativo: boolean; last_used_at: string | null; created_at: string };
type WebhookRow = { id: string; nome: string; url: string; eventos: string[]; ativo: boolean; created_at: string };

function IntegracaoPage() {
  const getKeys = useServerFn(listApiKeys);
  const newKey = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const delKey = useServerFn(deleteApiKey);
  const getWebhooks = useServerFn(listWebhooks);
  const saveWebhook = useServerFn(upsertWebhook);
  const delWebhook = useServerFn(deleteWebhook);

  const [tab, setTab] = useState<"api" | "webhooks">("api");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [webhookModal, setWebhookModal] = useState<Partial<WebhookRow> | null>(null);
  const [keyName, setKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [k, w] = await Promise.all([getKeys(), getWebhooks()]);
      setKeys(k); setWebhooks(w);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function handleCreateKey() {
    if (!keyName.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      const res = await newKey({ data: { nome: keyName } });
      setRevealedKey(res.key);
      setNewKeyModal(false);
      setKeyName("");
      toast.success("Chave criada! Copie agora — ela não será exibida novamente.");
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revogar esta chave? Integrações que a usam pararão de funcionar.")) return;
    try { await revoke({ data: { id } }); toast.success("Chave revogada"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("Remover esta chave?")) return;
    try { await delKey({ data: { id } }); toast.success("Chave removida"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  async function handleSaveWebhook() {
    if (!webhookModal?.nome || !webhookModal?.url) return toast.error("Nome e URL obrigatórios");
    if (!webhookModal?.eventos?.length) return toast.error("Selecione pelo menos 1 evento");
    setSaving(true);
    try {
      await saveWebhook({ data: { id: webhookModal.id, nome: webhookModal.nome, url: webhookModal.url, eventos: webhookModal.eventos, ativo: webhookModal.ativo ?? true } });
      toast.success(webhookModal.id ? "Webhook atualizado!" : "Webhook criado!");
      setWebhookModal(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm("Remover este webhook?")) return;
    try { await delWebhook({ data: { id } }); toast.success("Webhook removido"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  function copyKey() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const toggleEvento = (ev: string) => {
    setWebhookModal(m => {
      const evs = m?.eventos ?? [];
      return { ...m!, eventos: evs.includes(ev) ? evs.filter(e => e !== ev) : [...evs, ev] };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Integrações & API</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Conecte o {brand.name} com seus outros sistemas</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-[color:var(--panel-2)] w-fit">
        {(["api", "webhooks"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-[color:var(--panel)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "api" ? "Chaves de API" : "Webhooks"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : tab === "api" ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Use as chaves para autenticar requisições à API do {brand.name}</p>
            <Button onClick={() => setNewKeyModal(true)} className="bg-gradient-brand text-primary-foreground">
              <Plus className="size-4 mr-2" /> Nova chave
            </Button>
          </div>

          {revealedKey && (
            <div className="panel p-4 border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)]">
              <p className="text-sm font-semibold text-[color:var(--neonGreen)] mb-2">✓ Chave criada! Copie agora — não será exibida novamente.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[color:var(--panel)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-xs font-mono break-all">{revealedKey}</code>
                <button onClick={copyKey} className="size-9 grid place-items-center rounded-lg bg-[color:var(--panel)] border border-[color:var(--hairline)] text-muted-foreground hover:text-foreground shrink-0">
                  {copied ? <CheckCircle2 className="size-4 text-[color:var(--neonGreen)]" /> : <Copy className="size-4" />}
                </button>
              </div>
              <button onClick={() => setRevealedKey(null)} className="text-xs text-muted-foreground mt-2 hover:text-foreground">Fechar</button>
            </div>
          )}

          {keys.length === 0 ? (
            <div className="panel p-10 text-center">
              <Key className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">Nenhuma chave de API</p>
              <p className="text-sm text-muted-foreground mt-1">Crie uma chave para integrar com outros sistemas</p>
            </div>
          ) : (
            <div className="panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--hairline)] text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Chave</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Último uso</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--hairline)]">
                  {keys.map(k => (
                    <tr key={k.id} className="hover:bg-[color:var(--panel-2)]/50">
                      <td className="px-4 py-3 font-medium">{k.nome}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_preview}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${k.ativo ? "text-[color:var(--neonGreen)] bg-[color:var(--brand-soft)] border-[color:var(--brand-soft-strong)]" : "text-muted-foreground bg-muted/40 border-muted"}`}>
                          {k.ativo ? "Ativa" : "Revogada"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString("pt-BR") : "Nunca"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {k.ativo && <button onClick={() => handleRevoke(k.id)} className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-[color:var(--warnAmber)] hover:bg-[color:var(--warnBg)]">Revogar</button>}
                          <button onClick={() => handleDeleteKey(k.id)} className="size-7 grid place-items-center rounded text-muted-foreground hover:text-[color:var(--errorRed)]"><Trash2 className="size-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Receba eventos em tempo real no seu sistema</p>
            <Button onClick={() => setWebhookModal({ eventos: ["mensagem.recebida"], ativo: true })} className="bg-gradient-brand text-primary-foreground">
              <Plus className="size-4 mr-2" /> Novo webhook
            </Button>
          </div>
          {webhooks.length === 0 ? (
            <div className="panel p-10 text-center">
              <Globe className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">Nenhum webhook configurado</p>
              <p className="text-sm text-muted-foreground mt-1">Configure webhooks para receber notificações de eventos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map(w => (
                <div key={w.id} className="panel p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{w.nome}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${w.ativo ? "text-[color:var(--neonGreen)] bg-[color:var(--brand-soft)] border-[color:var(--brand-soft-strong)]" : "text-muted-foreground bg-muted/40 border-muted"}`}>
                        {w.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{w.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.eventos.map(e => <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--panel-2)] text-muted-foreground border border-[color:var(--hairline)]">{e}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setWebhookModal(w)} className="size-8 grid place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]">
                      <Key className="size-3.5" />
                    </button>
                    <button onClick={() => handleDeleteWebhook(w.id)} className="size-8 grid place-items-center rounded text-muted-foreground hover:text-[color:var(--errorRed)]">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {newKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Nova chave de API</h2>
              <button onClick={() => setNewKeyModal(false)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="space-y-1.5">
              <Label>Nome da chave</Label>
              <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Ex: Integração Loja Virtual" className="h-10" autoFocus />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNewKeyModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleCreateKey} disabled={saving} className="flex-1 bg-gradient-brand text-primary-foreground">
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Key className="size-4 mr-2" />} Criar
              </Button>
            </div>
          </div>
        </div>
      )}

      {webhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">{webhookModal.id ? "Editar webhook" : "Novo webhook"}</h2>
              <button onClick={() => setWebhookModal(null)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={webhookModal.nome ?? ""} onChange={e => setWebhookModal(m => ({ ...m!, nome: e.target.value }))} placeholder="Meu sistema" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>URL do endpoint</Label>
              <Input value={webhookModal.url ?? ""} onChange={e => setWebhookModal(m => ({ ...m!, url: e.target.value }))} placeholder="https://meusite.com/webhook" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label>Eventos</Label>
              <div className="space-y-1">
                {EVENTOS.map(ev => (
                  <label key={ev} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={webhookModal.eventos?.includes(ev) ?? false} onChange={() => toggleEvento(ev)} className="size-4" />
                    <span className="text-sm font-mono text-muted-foreground">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setWebhookModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSaveWebhook} disabled={saving} className="flex-1 bg-gradient-brand text-primary-foreground">
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null} Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
