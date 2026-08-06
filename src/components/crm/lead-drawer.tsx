import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Send, Star, Repeat2, X as XIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listSequences, enrollInSequence, cancelEnrollment, getEnrollmentForContact } from "@/lib/followup.functions";
import { listFieldDefs, listFieldValues, saveFieldValues } from "@/lib/custom-fields.functions";

export interface LeadCard {
  id: string; numero: string; nome: string | null;
  status: string; stage_id: string | null;
  ultima_mensagem: string | null; ultima_em: string;
  observacao: string | null; valor: number | null;
  origem: string | null; owner_id: string | null;
  tags: string[]; proxima_acao: string | null; follow_up: string | null;
  queue_id?: string | null;
}
export interface Stage { id: string; nome: string; cor: string; }
export interface Member { user_id: string; email?: string | null; nome?: string | null; }

export function LeadDrawer({
  card, stages, members, companyId, onClose, onChanged,
}: {
  card: LeadCard | null; stages: Stage[]; members: Member[];
  companyId: string; onClose: () => void; onChanged: () => void;
}) {
  const [local, setLocal] = useState<LeadCard | null>(card);
  const [tab, setTab] = useState("dados");
  const [queues, setQueues] = useState<{ id: string; nome: string; cor: string }[]>([]);
  useEffect(() => { setLocal(card); setTab("dados"); }, [card?.id]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("queues").select("id,nome,cor").eq("company_id", companyId).eq("ativo", true).order("posicao");
      setQueues(data ?? []);
    })();
  }, [companyId]);

  if (!card || !local) return null;

  function set<K extends keyof LeadCard>(k: K, v: LeadCard[K]) {
    setLocal((p) => (p ? { ...p, [k]: v } : p));
  }

  async function save() {
    if (!local || !card) return;
    const stage = stages.find((s) => s.id === local.stage_id);
    const { error } = await supabase.from("crm_cards").update({
      nome: local.nome, valor: local.valor ?? 0, stage_id: local.stage_id,
      status: stage?.nome ?? local.status, origem: local.origem, owner_id: local.owner_id,
      tags: local.tags, proxima_acao: local.proxima_acao, follow_up: local.follow_up,
      observacao: local.observacao, queue_id: local.queue_id ?? null,
    }).eq("id", local.id);
    if (error) return toast.error(error.message);
    if (local.owner_id !== card.owner_id) {
      const nomeAntes = members.find((m) => m.user_id === card.owner_id)?.nome
        ?? members.find((m) => m.user_id === card.owner_id)?.email ?? "Ninguém";
      const nomeDepois = members.find((m) => m.user_id === local.owner_id)?.nome
        ?? members.find((m) => m.user_id === local.owner_id)?.email ?? "Ninguém";
      await supabase.from("lead_evento").insert({
        company_id: companyId, card_id: local.id, tipo: "transferencia",
        descricao: `Atendimento transferido de ${nomeAntes} para ${nomeDepois}`,
      });
    }
    await supabase.from("lead_evento").insert({
      company_id: companyId, card_id: local.id, tipo: "atualizacao", descricao: "Dados atualizados",
    });
    toast.success("Lead atualizado");
    onChanged();
  }

  return (
    <Sheet open={!!card} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-[var(--panel)] border-l border-[var(--border)]">
        <SheetHeader className="pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={local.nome || local.numero} size={48} />
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">{local.nome || local.numero}</SheetTitle>
              <div className="text-xs text-muted-foreground font-mono">{local.numero}</div>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
            <TabsTrigger value="conversa">Conversa</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="hist">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-3 mt-4">
            <Field label="Nome" value={local.nome ?? ""} onChange={(v) => set("nome", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)" type="number" value={String(local.valor ?? 0)} onChange={(v) => set("valor", Number(v) || 0)} />
              <Field label="Origem" value={local.origem ?? ""} onChange={(v) => set("origem", v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={local.stage_id ?? ""} onValueChange={(v) => set("stage_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.cor }} />{s.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dono</Label>
              <Select value={local.owner_id ?? "_none"} onValueChange={(v) => set("owner_id", v === "_none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Sem dono" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem dono</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.nome || m.email || m.user_id.slice(0,8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fila</Label>
              <Select value={local.queue_id ?? "_none"} onValueChange={(v) => set("queue_id", v === "_none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Sem fila" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem fila</SelectItem>
                  {queues.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: q.cor }} />{q.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FollowupWidget numero={local.numero} cardId={local.id} />
            <Field label="Tags (separadas por vírgula)" value={(local.tags ?? []).join(", ")}
              onChange={(v) => set("tags", v.split(",").map(s => s.trim()).filter(Boolean))} />
            <Field label="Próxima ação" value={local.proxima_acao ?? ""} onChange={(v) => set("proxima_acao", v)} />
            <Field label="Follow-up (data/hora ISO)" value={local.follow_up ?? ""} onChange={(v) => set("follow_up", v || null as any)} />
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea value={local.observacao ?? ""} onChange={(e) => set("observacao", e.target.value)} rows={3} />
            </div>
            <Button onClick={save} className="w-full"><Save className="size-4 mr-2" />Salvar</Button>
          </TabsContent>

          <TabsContent value="extras" className="mt-4">
            <ExtrasTab cardId={local.id} companyId={companyId} />
          </TabsContent>

          <TabsContent value="conversa" className="mt-4">
            <ConversaTab numero={local.numero} companyId={companyId} />
          </TabsContent>

          <TabsContent value="notas" className="mt-4">
            <NotasTab cardId={local.id} companyId={companyId} />
          </TabsContent>

          <TabsContent value="hist" className="mt-4">
            <HistTab cardId={local.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function ExtrasTab({ cardId, companyId }: { cardId: string; companyId: string }) {
  const listDefsFn = useServerFn(listFieldDefs);
  const listValsFn = useServerFn(listFieldValues);
  const saveFn = useServerFn(saveFieldValues);
  const [defs, setDefs] = useState<any[]>([]);
  const [vals, setVals] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [d, v] = await Promise.all([listDefsFn(), listValsFn({ data: { card_id: cardId } })]);
      setDefs(d as any[]);
      setVals(v as Record<string, string | null>);
    })();
  }, [cardId, companyId]);

  if (defs.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-6">
      Nenhum campo personalizado configurado.<br />
      <span className="text-[11.5px]">Acesse Configurações → Campos Personalizados para criar.</span>
    </p>
  );

  async function handleSave() {
    setSaving(true);
    try {
      await saveFn({ data: { card_id: cardId, values: vals } });
      toast.success("Campos salvos");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {defs.map((def: any) => {
        const val = vals[def.id] ?? "";
        const set = (v: string | null) => setVals((p) => ({ ...p, [def.id]: v }));

        if (def.tipo === "booleano") return (
          <div key={def.id} className="flex items-center justify-between">
            <Label>{def.nome}</Label>
            <Switch checked={val === "true"} onCheckedChange={(c) => set(c ? "true" : "false")} />
          </div>
        );
        if (def.tipo === "selecao") return (
          <div key={def.id} className="space-y-1.5">
            <Label>{def.nome}</Label>
            <Select value={val || "_none"} onValueChange={(v) => set(v === "_none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Nenhum —</SelectItem>
                {(def.opcoes ?? []).map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
        return (
          <div key={def.id} className="space-y-1.5">
            <Label>{def.nome}</Label>
            <Input
              type={def.tipo === "numero" ? "number" : def.tipo === "data" ? "date" : "text"}
              value={val}
              onChange={(e) => set(e.target.value || null)}
            />
          </div>
        );
      })}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="size-4 mr-2" />{saving ? "Salvando…" : "Salvar campos"}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FollowupWidget({ numero, cardId }: { numero: string; cardId: string }) {
  const getSequences = useServerFn(listSequences);
  const getEnrollment = useServerFn(getEnrollmentForContact);
  const enroll = useServerFn(enrollInSequence);
  const cancel = useServerFn(cancelEnrollment);

  const [sequences, setSequences] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      const [seqs, enr] = await Promise.all([
        getSequences(),
        getEnrollment({ data: { numero } }),
      ]);
      setSequences((seqs as any[]).filter((s) => s.ativo));
      setEnrollment(enr);
    } catch {
      // silencioso — widget é acessório
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void reload(); }, [numero]);

  async function handleStart() {
    if (!selected) return toast.error("Selecione uma cadência");
    setBusy(true);
    try {
      await enroll({ data: { numero, card_id: cardId, sequence_id: selected } });
      toast.success("Cadência iniciada");
      await reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function handleCancel() {
    if (!enrollment) return;
    setBusy(true);
    try {
      await cancel({ data: { id: enrollment.id } });
      toast.success("Cadência cancelada");
      await reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  if (loading) return null;

  return (
    <div className="space-y-1.5">
      <Label>Cadência de follow-up</Label>
      {enrollment ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3 flex items-center justify-between gap-2">
          <div className="text-[13px]">
            <div className="font-medium flex items-center gap-1.5"><Repeat2 className="size-3.5 text-[color:var(--brand-text)]" /> {enrollment.followup_sequences?.nome ?? "Cadência"}</div>
            <div className="text-muted-foreground text-[12px] mt-0.5">
              Etapa {enrollment.current_step} de {enrollment.followup_sequences?.followup_steps?.length ?? "?"}
            </div>
          </div>
          <Button size="sm" variant="outline" disabled={busy} onClick={handleCancel}>
            <XIcon className="size-3.5 mr-1" /> Cancelar
          </Button>
        </div>
      ) : sequences.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma cadência ativa cadastrada. Crie uma em "Cadências" no menu.</p>
      ) : (
        <div className="flex gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Escolher cadência" /></SelectTrigger>
            <SelectContent>
              {sequences.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy || !selected} onClick={handleStart} className="shrink-0">Iniciar</Button>
        </div>
      )}
    </div>
  );
}

function ConversaTab({ numero, companyId }: { numero: string; companyId: string }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mensagens").select("*")
        .eq("company_id", companyId).eq("numero", numero)
        .order("created_at", { ascending: true }).limit(200);
      setMsgs(data ?? []);
    })();
  }, [numero, companyId]);
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto p-2">
      {msgs.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Sem mensagens.</div>}
      {msgs.map((m) => (
        <div key={m.id} className={`flex ${m.direcao === "saida" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.direcao === "saida" ? "bg-[var(--brand)]/15 text-foreground" : "bg-[var(--panel-2)]"}`}>
            <div className="text-[10px] uppercase opacity-60 mb-0.5">{m.autor}</div>
            {m.texto}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotasTab({ cardId, companyId }: { cardId: string; companyId: string }) {
  const [notas, setNotas] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  async function reload() {
    const { data } = await supabase.from("lead_nota").select("*").eq("card_id", cardId).order("created_at", { ascending: false });
    setNotas(data ?? []);
  }
  useEffect(() => { void reload(); }, [cardId]);
  async function add() {
    if (!texto.trim()) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("lead_nota").insert({
      company_id: companyId, card_id: cardId, autor_id: u.user?.id ?? null, texto: texto.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setTexto(""); reload();
  }
  async function del(id: string) {
    await supabase.from("lead_nota").delete().eq("id", id);
    reload();
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="Adicionar nota interna…" />
        <Button onClick={add} disabled={busy}><Send className="size-4" /></Button>
      </div>
      <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
        {notas.map((n) => (
          <li key={n.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span>{new Date(n.created_at).toLocaleString("pt-BR")}</span>
              <button onClick={() => del(n.id)} className="hover:text-destructive"><Trash2 className="size-3.5" /></button>
            </div>
            <div className="whitespace-pre-wrap">{n.texto}</div>
          </li>
        ))}
        {notas.length === 0 && <li className="text-sm text-muted-foreground text-center py-4">Sem notas.</li>}
      </ul>
    </div>
  );
}

type HistItem =
  | { kind: "evento"; id: string; created_at: string; tipo: string; descricao: string }
  | { kind: "avaliacao"; id: string; created_at: string; nota: number; comentario: string | null };

function HistTab({ cardId }: { cardId: string }) {
  const [items, setItems] = useState<HistItem[]>([]);
  useEffect(() => {
    (async () => {
      const [{ data: evs }, { data: avals }] = await Promise.all([
        supabase.from("lead_evento").select("*").eq("card_id", cardId),
        supabase.from("atendimento_avaliacoes").select("*").eq("card_id", cardId),
      ]);
      const combined: HistItem[] = [
        ...(evs ?? []).map((e: any) => ({ kind: "evento" as const, id: e.id, created_at: e.created_at, tipo: e.tipo, descricao: e.descricao })),
        ...(avals ?? []).map((a: any) => ({ kind: "avaliacao" as const, id: a.id, created_at: a.created_at, nota: a.nota, comentario: a.comentario })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setItems(combined);
    })();
  }, [cardId]);
  return (
    <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
      {items.length === 0 && <li className="text-sm text-muted-foreground text-center py-6">Sem eventos.</li>}
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm">
          <div className="text-[11px] text-muted-foreground mb-1">{new Date(item.created_at).toLocaleString("pt-BR")}</div>
          {item.kind === "evento" ? (
            <div><b className="text-[var(--brand-text)]">{item.tipo}</b> — {item.descricao}</div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5">
                <b className="text-[var(--brand-text)]">avaliacao</b> —
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`size-3.5 ${n <= item.nota ? "fill-[color:var(--brand)] text-[color:var(--brand)]" : "text-muted-foreground"}`} />
                  ))}
                </span>
              </div>
              {item.comentario && <div className="mt-1 text-foreground/85">{item.comentario}</div>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
