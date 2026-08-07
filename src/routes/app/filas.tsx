import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listQueues, upsertQueue, deleteQueue, setQueueMembers } from "@/lib/queues.functions";
import { getBusinessHoursForQueue, saveBusinessHoursForQueue } from "@/lib/business-hours.functions";
import { fetchCompanyMembers } from "@/lib/company-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, X, Loader2, Clock } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/filas")({
  head: () => ({ meta: [{ title: `${brand.name} — Filas` }] }),
  component: FilasPage,
});

const CORES = ["#67308E","#60A5FA","#FBBF24","#F87171","#A78BFA","#F472B6","#2DD4BF","#FB923C"];
const DIAS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const FUSOS = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Boa_Vista",
  "America/Noronha",
];

type HorarioSlot = { dia: number; inicio: string; fim: string };
type BhState = { ativo: boolean; fuso_horario: string; mensagem_fora_horario: string; horarios: HorarioSlot[] };
type QueueMember = { user_id: string; profiles?: { nome: string | null; email: string | null } | null };
type Queue = { id: string; nome: string; descricao: string | null; cor: string; ativo: boolean; auto_distribuir?: boolean; queue_members?: QueueMember[] };
type CompanyMember = { user_id: string; nome: string | null; email: string | null };
type ModalTab = "geral" | "membros" | "horario";

const DEFAULT_BH: BhState = { ativo: false, fuso_horario: "America/Sao_Paulo", mensagem_fora_horario: "", horarios: [] };

function FilasPage() {
  const ctx = Route.useRouteContext();
  const companyId = (ctx as any)?.company?.id;
  const getQueues = useServerFn(listQueues);
  const saveQueue = useServerFn(upsertQueue);
  const removeQueue = useServerFn(deleteQueue);
  const saveMembers = useServerFn(setQueueMembers);
  const getBH = useServerFn(getBusinessHoursForQueue);
  const saveBH = useServerFn(saveBusinessHoursForQueue);

  const [queues, setQueues] = useState<Queue[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Queue> | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("geral");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bh, setBh] = useState<BhState>(DEFAULT_BH);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setQueues(await getQueues()); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!companyId) return;
    fetchCompanyMembers(companyId).then(setCompanyMembers).catch((e) => toast.error(e.message));
  }, [companyId]);

  async function openModal(q: Partial<Queue> | null) {
    setModal(q ?? { cor: "#67308E", ativo: true });
    setSelectedMembers(new Set((q?.queue_members ?? []).map((m) => m.user_id)));
    setActiveTab("geral");
    // Carrega horário de funcionamento se for edição de fila existente
    if (q?.id) {
      try {
        const row = await getBH({ data: { queue_id: q.id } });
        if (row) {
          setBh({
            ativo: (row as any).ativo ?? false,
            fuso_horario: (row as any).fuso_horario ?? "America/Sao_Paulo",
            mensagem_fora_horario: (row as any).mensagem_fora_horario ?? "",
            horarios: (row as any).horarios ?? [],
          });
        } else {
          setBh(DEFAULT_BH);
        }
      } catch { setBh(DEFAULT_BH); }
    } else {
      setBh(DEFAULT_BH);
    }
  }

  function toggleMember(userId: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  }

  function toggleDia(dia: number) {
    setBh((prev) => {
      const hasDay = prev.horarios.some((s) => s.dia === dia);
      if (hasDay) {
        return { ...prev, horarios: prev.horarios.filter((s) => s.dia !== dia) };
      }
      return { ...prev, horarios: [...prev.horarios, { dia, inicio: "09:00", fim: "18:00" }].sort((a, b) => a.dia - b.dia) };
    });
  }

  function updateSlot(dia: number, field: "inicio" | "fim", value: string) {
    setBh((prev) => ({
      ...prev,
      horarios: prev.horarios.map((s) => s.dia === dia ? { ...s, [field]: value } : s),
    }));
  }

  async function handleSave() {
    if (!modal?.nome?.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      const res = await saveQueue({ data: { id: modal.id, nome: modal.nome, descricao: modal.descricao ?? "", cor: modal.cor ?? "#67308E", ativo: modal.ativo ?? true, auto_distribuir: modal.auto_distribuir ?? false } });
      const queueId = modal.id ?? (res as any).id;
      await saveMembers({ data: { queue_id: queueId, user_ids: Array.from(selectedMembers) } });
      await saveBH({ data: {
        queue_id: queueId,
        ativo: bh.ativo,
        fuso_horario: bh.fuso_horario,
        mensagem_fora_horario: bh.mensagem_fora_horario || undefined,
        horarios: bh.horarios,
      }});
      toast.success(modal.id ? "Fila atualizada!" : "Fila criada!");
      setModal(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta fila?")) return;
    try { await removeQueue({ data: { id } }); toast.success("Fila removida"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Filas de Atendimento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize seu time em filas para roteamento de conversas</p>
        </div>
        <Button onClick={() => openModal(null)} className="bg-gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-2" /> Nova fila
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : queues.length === 0 ? (
        <div className="panel p-12 text-center">
          <Users className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhuma fila criada</p>
          <p className="text-sm text-muted-foreground mt-1">Crie filas para organizar o atendimento por setor</p>
          <Button onClick={() => openModal(null)} className="mt-4 bg-gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-2" /> Criar primeira fila
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map(q => (
            <div key={q.id} className="panel p-5 flex items-start gap-4">
              <div className="size-10 rounded-xl shrink-0" style={{ background: q.cor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] truncate">{q.nome}</span>
                  {!q.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inativa</span>}
                </div>
                {q.descricao && <p className="text-sm text-muted-foreground mt-0.5 truncate">{q.descricao}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  <Users className="size-3 inline mr-1" />{q.queue_members?.length ?? 0} membro(s)
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openModal(q)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]">
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
          <div className="panel w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[color:var(--hairline)] shrink-0">
              <h2 className="font-display font-bold text-lg">{modal.id ? "Editar fila" : "Nova fila"}</h2>
              <button onClick={() => setModal(null)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[color:var(--hairline)] shrink-0">
              {(["geral", "membros", "horario"] as ModalTab[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === tab
                      ? "text-[color:var(--brand-text)] border-b-2 border-[color:var(--brand)] -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab === "geral" && "Geral"}
                  {tab === "membros" && <><Users className="size-3.5" />Membros</>}
                  {tab === "horario" && <><Clock className="size-3.5" />Horário</>}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* ── ABA GERAL ── */}
              {activeTab === "geral" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Nome da fila</Label>
                    <Input value={modal.nome ?? ""} onChange={e => setModal(m => ({ ...m!, nome: e.target.value }))} placeholder="Ex: Suporte, Vendas, Financeiro" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição (opcional)</Label>
                    <Input value={modal.descricao ?? ""} onChange={e => setModal(m => ({ ...m!, descricao: e.target.value }))} placeholder="Breve descrição" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor</Label>
                    <div className="flex gap-2 flex-wrap">
                      {CORES.map(c => (
                        <button key={c} onClick={() => setModal(m => ({ ...m!, cor: c }))}
                          className="size-8 rounded-lg transition-all"
                          style={{ background: c, outline: modal.cor === c ? `2px solid ${c}` : "2px solid transparent", outlineOffset: "2px" }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="ativo" checked={modal.ativo ?? true} onChange={e => setModal(m => ({ ...m!, ativo: e.target.checked }))} className="size-4" />
                    <Label htmlFor="ativo">Fila ativa</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--hairline)]">
                    <Switch
                      checked={modal.auto_distribuir ?? false}
                      onCheckedChange={(c) => setModal(m => ({ ...m!, auto_distribuir: c }))}
                    />
                    <div>
                      <Label className="text-[13px]">Distribuição automática (round-robin)</Label>
                      <p className="text-[11.5px] text-muted-foreground">Atribui novas conversas automaticamente ao membro com menor carga.</p>
                    </div>
                  </div>
                </>
              )}

              {/* ── ABA MEMBROS ── */}
              {activeTab === "membros" && (
                <div className="space-y-1.5">
                  <Label>Membros da fila</Label>
                  {companyMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum membro ativo na equipe.</p>
                  ) : (
                    <div className="rounded-lg border border-[color:var(--hairline)] divide-y divide-[color:var(--hairline)]">
                      {companyMembers.map((m) => (
                        <label key={m.user_id} className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-[color:var(--panel-2)]">
                          <input type="checkbox" checked={selectedMembers.has(m.user_id)} onChange={() => toggleMember(m.user_id)} className="size-4" />
                          {m.nome || m.email || m.user_id.slice(0, 8)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ABA HORÁRIO ── */}
              {activeTab === "horario" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Ativar horário de funcionamento</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Fora do horário, a IA não responde e é enviada a mensagem automática.</p>
                    </div>
                    <Switch checked={bh.ativo} onCheckedChange={(v) => setBh((b) => ({ ...b, ativo: v }))} />
                  </div>

                  {bh.ativo && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Fuso horário</Label>
                        <select
                          value={bh.fuso_horario}
                          onChange={(e) => setBh((b) => ({ ...b, fuso_horario: e.target.value }))}
                          className="w-full h-10 bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-3 text-sm outline-none focus:border-[color:var(--brand)]/60"
                        >
                          {FUSOS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Dias e horários</Label>
                        <div className="space-y-2">
                          {DIAS.map((nome, dia) => {
                            const slot = bh.horarios.find((s) => s.dia === dia);
                            const ativo = !!slot;
                            return (
                              <div key={dia} className="flex items-center gap-3">
                                <label className="flex items-center gap-2 w-14 cursor-pointer">
                                  <input type="checkbox" checked={ativo} onChange={() => toggleDia(dia)} className="size-4" />
                                  <span className="text-[13px] font-medium">{nome}</span>
                                </label>
                                {ativo ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="time" value={slot.inicio}
                                      onChange={(e) => updateSlot(dia, "inicio", e.target.value)}
                                      className="flex-1 h-8 bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-2 text-sm outline-none focus:border-[color:var(--brand)]/60"
                                    />
                                    <span className="text-muted-foreground text-xs">até</span>
                                    <input
                                      type="time" value={slot.fim}
                                      onChange={(e) => updateSlot(dia, "fim", e.target.value)}
                                      className="flex-1 h-8 bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-2 text-sm outline-none focus:border-[color:var(--brand)]/60"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Fechado</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Mensagem fora do horário</Label>
                        <textarea
                          value={bh.mensagem_fora_horario}
                          onChange={(e) => setBh((b) => ({ ...b, mensagem_fora_horario: e.target.value }))}
                          placeholder="Ex: Olá! Nosso atendimento funciona de Seg-Sex, das 09h às 18h. Retornaremos em breve!"
                          rows={4}
                          className="w-full bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]/60 resize-none"
                        />
                        <p className="text-xs text-muted-foreground">Enviada uma vez a cada 4h quando o contato escreve fora do horário.</p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-[color:var(--hairline)] shrink-0">
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
