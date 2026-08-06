import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listCampaigns, upsertCampaign, deleteCampaign, addCampaignContacts, startCampaign, pauseCampaign } from "@/lib/campaigns.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Megaphone, Plus, Play, Pause, Trash2, X, Loader2, Upload, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/campanhas")({
  head: () => ({ meta: [{ title: `${brand.name} — Campanhas` }] }),
  component: CampanhasPage,
});

type Campaign = {
  id: string; nome: string; mensagem: string; status: string;
  total: number; enviados: number; erros: number; agendado_em: string | null; created_at: string;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  rascunho:   { label: "Rascunho",  cls: "text-muted-foreground bg-muted/40 border-muted" },
  agendada:   { label: "Agendada",  cls: "text-[color:var(--infoBlue)] bg-[color:var(--infoBg)] border-[color:var(--infoBorder)]" },
  enviando:   { label: "Enviando",  cls: "text-[color:var(--warnAmber)] bg-[color:var(--warnBg)] border-[color:var(--warnBorder)]" },
  pausada:    { label: "Pausada",   cls: "text-[color:var(--warnAmber)] bg-[color:var(--warnBg)] border-[color:var(--warnBorder)]" },
  concluida:  { label: "Concluída", cls: "text-[color:var(--neonGreen)] bg-[color:var(--brand-soft)] border-[color:var(--brand-soft-strong)]" },
  erro:       { label: "Erro",      cls: "text-[color:var(--errorRed)] bg-[color:var(--errorBg)] border-[color:var(--errorBorder)]" },
};

function CampanhasPage() {
  const getCampaigns = useServerFn(listCampaigns);
  const saveCampaign = useServerFn(upsertCampaign);
  const removeCampaign = useServerFn(deleteCampaign);
  const addContacts = useServerFn(addCampaignContacts);
  const start = useServerFn(startCampaign);
  const pause = useServerFn(pauseCampaign);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"list" | "form" | "contacts">("list");
  const [form, setForm] = useState({ id: "", nome: "", mensagem: "", intervalo_ms: 3000 });
  const [currentId, setCurrentId] = useState("");
  const [contacts, setContacts] = useState<{ telefone: string; nome?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try { setCampaigns(await getCampaigns()); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function handleSaveForm() {
    if (!form.nome || !form.mensagem) return toast.error("Nome e mensagem são obrigatórios");
    setSaving(true);
    try {
      const res = await saveCampaign({ data: { id: form.id || undefined, nome: form.nome, mensagem: form.mensagem, intervalo_ms: form.intervalo_ms } });
      setCurrentId(res.id ?? form.id);
      toast.success("Campanha salva!");
      setStep("contacts");
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleSaveContacts() {
    if (contacts.length === 0) return toast.error("Adicione pelo menos 1 contato");
    setSaving(true);
    try {
      await addContacts({ data: { campaign_id: currentId, contacts } });
      toast.success(`${contacts.length} contatos adicionados!`);
      setStep("list");
      setContacts([]);
      setForm({ id: "", nome: "", mensagem: "", intervalo_ms: 3000 });
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const parsed: { telefone: string; nome?: string }[] = [];
      for (const line of lines.slice(1)) {
        const cols = line.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ""));
        const telefone = cols.find(c => /^\+?[\d\s]{8,}$/.test(c.replace(/\s/g, "")))?.replace(/\D/g, "");
        const nome = cols.find(c => c && !/^\d+$/.test(c) && c.length > 2);
        if (telefone) parsed.push({ telefone, nome });
      }
      setContacts(parsed);
      toast.success(`${parsed.length} contatos carregados do CSV`);
    };
    reader.readAsText(file);
  }

  function addManualContact() { setContacts(c => [...c, { telefone: "", nome: "" }]); }

  async function handleStart(id: string) {
    setRunning(id);
    try {
      const res = await start({ data: { id } });
      toast.success(`Campanha concluída: ${res.enviados} enviados, ${res.erros} erros`);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setRunning(null); }
  }

  async function handlePause(id: string) {
    try { await pause({ data: { id } }); toast.success("Campanha pausada"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta campanha?")) return;
    try { await removeCampaign({ data: { id } }); toast.success("Campanha removida"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  if (step === "form") return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep("list")} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        <h1 className="font-display text-2xl font-bold">{form.id ? "Editar campanha" : "Nova campanha"}</h1>
      </div>
      <div className="panel p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Nome da campanha <span className="text-[color:var(--errorRed)]">*</span></Label>
          <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Promoção Julho" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label>Mensagem <span className="text-[color:var(--errorRed)]">*</span></Label>
          <textarea
            value={form.mensagem}
            onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
            placeholder="Olá! Temos uma oferta especial para você..."
            rows={5}
            className="w-full rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel-2)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]"
          />
          <p className="text-xs text-muted-foreground">{form.mensagem.length} caracteres</p>
        </div>
        <div className="space-y-1.5">
          <Label>Intervalo entre envios (ms)</Label>
          <Input type="number" min={1000} max={60000} value={form.intervalo_ms} onChange={e => setForm(f => ({ ...f, intervalo_ms: Number(e.target.value) }))} className="h-10" />
          <p className="text-xs text-muted-foreground">Mínimo 1000ms (1s). Recomendado: 3000ms para evitar bloqueio</p>
        </div>
        <Button onClick={handleSaveForm} disabled={saving} className="w-full bg-gradient-brand text-primary-foreground">
          {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null} Próximo: Adicionar contatos
        </Button>
      </div>
    </div>
  );

  if (step === "contacts") return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep("form")} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        <h1 className="font-display text-2xl font-bold">Adicionar contatos</h1>
      </div>
      <div className="panel p-6 space-y-4">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
            <Upload className="size-4 mr-2" /> Importar CSV
          </Button>
          <Button variant="outline" onClick={addManualContact} className="flex-1">
            <Plus className="size-4 mr-2" /> Adicionar manual
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </div>
        {contacts.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-xs text-muted-foreground">{contacts.length} contato(s)</p>
            {contacts.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={c.telefone} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, telefone: e.target.value } : x))} placeholder="Telefone" className="h-9 flex-1" />
                <Input value={c.nome ?? ""} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} placeholder="Nome (opcional)" className="h-9 flex-1" />
                <button onClick={() => setContacts(cs => cs.filter((_, j) => j !== i))} className="size-8 grid place-items-center text-muted-foreground hover:text-[color:var(--errorRed)]"><X className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleSaveContacts} disabled={saving || contacts.length === 0} className="w-full bg-gradient-brand text-primary-foreground">
          {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Users className="size-4 mr-2" />}
          Salvar {contacts.length} contatos
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Disparo em massa via WhatsApp</p>
        </div>
        <Button onClick={() => { setForm({ id: "", nome: "", mensagem: "", intervalo_ms: 3000 }); setStep("form"); }} className="bg-gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-2" /> Nova campanha
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : campaigns.length === 0 ? (
        <div className="panel p-12 text-center">
          <Megaphone className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhuma campanha criada</p>
          <p className="text-sm text-muted-foreground mt-1">Crie campanhas para disparar mensagens em massa</p>
          <Button onClick={() => setStep("form")} className="mt-4 bg-gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-2" /> Criar primeira campanha
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.rascunho;
            const pct = c.total > 0 ? Math.round((c.enviados / c.total) * 100) : 0;
            return (
              <div key={c.id} className="panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[15px]">{c.nome}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{c.mensagem}</p>
                    {c.total > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-[color:var(--neonGreen)]" />{c.enviados} enviados</span>
                          {c.erros > 0 && <span className="flex items-center gap-1"><AlertCircle className="size-3 text-[color:var(--errorRed)]" />{c.erros} erros</span>}
                          <span>{pct}% de {c.total}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[color:var(--panel-2)] overflow-hidden">
                          <div className="h-full rounded-full bg-[color:var(--neonGreen)] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(c.status === "rascunho" || c.status === "pausada") && (
                      <Button size="sm" onClick={() => handleStart(c.id)} disabled={running === c.id} className="bg-gradient-brand text-primary-foreground h-8 px-3">
                        {running === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                      </Button>
                    )}
                    {c.status === "enviando" && (
                      <Button size="sm" variant="outline" onClick={() => handlePause(c.id)} className="h-8 px-3">
                        <Pause className="size-3.5" />
                      </Button>
                    )}
                    <button onClick={() => handleDelete(c.id)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-[color:var(--errorRed)] hover:bg-[color:var(--errorBg)]">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
