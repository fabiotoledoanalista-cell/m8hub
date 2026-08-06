import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { Hand, MessageSquareText, Send, Sparkles, User, Search, Bot, ExternalLink, CheckSquare, Square, X, Star, Tag, ArrowLeftRight, StickyNote, Trash2, FileText, Wand2 } from "lucide-react";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { toast } from "sonner";
import { sendWhatsappText, setContactIaActive } from "@/lib/evolution.functions";
import { listQuickReplies } from "@/lib/quick-replies.functions";
import { bulkCloseConversations, rateAtendimento, distributeConversation, updateConversationTags, transferConversation } from "@/lib/atendimento.functions";
import { listNotas, addNota, deleteNota } from "@/lib/notas.functions";
import { gerarResumoIA } from "@/lib/resumo-ia.functions";
import { sugerirResposta } from "@/lib/copiloto.functions";
import { fetchCompanyMembers } from "@/lib/company-members";
import { LeadDrawer, type LeadCard, type Stage, type Member } from "@/components/crm/lead-drawer";

export const Route = createFileRoute("/app/conversas")({
  head: () => ({ meta: [{ title: `${brand.name} — Conversas` }] }),
  component: ConversasPage,
});

interface Msg {
  id: string; numero: string; contato_nome: string | null;
  direcao: "entrada" | "saida"; autor: "ia" | "humano" | "contato";
  texto: string; created_at: string; user_id: string | null;
}

type Filter = "todas" | "nao_lidas" | "minhas" | "ia_ativa" | "resolvidas";

interface QuickReply { id: string; titulo: string; mensagem: string; atalho: string | null }

type StageWithTipo = Stage & { tipo?: string };

function ConversasPage() {
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const userId = ctx.user.id;


  const sendFn = useServerFn(sendWhatsappText);
  const toggleIaFn = useServerFn(setContactIaActive);
  const getQuickReplies = useServerFn(listQuickReplies);
  const bulkCloseFn = useServerFn(bulkCloseConversations);
  const rateFn = useServerFn(rateAtendimento);
  const distributeFn = useServerFn(distributeConversation);
  const updateTagsFn = useServerFn(updateConversationTags);
  const transferFn = useServerFn(transferConversation);
  const [distributing, setDistributing] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [motivoModal, setMotivoModal] = useState<{ stageId: string; numeros: string[] } | null>(null);
  const [motivos, setMotivos] = useState<string[]>(["Vendeu", "Sem interesse", "Não qualificado", "Sem retorno"]);
  const listNotasFn = useServerFn(listNotas);
  const addNotaFn = useServerFn(addNota);
  const deleteNotaFn = useServerFn(deleteNota);
  const [notas, setNotas] = useState<any[]>([]);
  const [notaDraft, setNotaDraft] = useState("");
  const [savingNota, setSavingNota] = useState(false);
  const gerarResumoFn = useServerFn(gerarResumoIA);
  const [resumoIA, setResumoIA] = useState<string | null>(null);
  const [gerandoResumo, setGerandoResumo] = useState(false);

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [closeMenuOpen, setCloseMenuOpen] = useState(false);
  const [rateModal, setRateModal] = useState<{ numero: string; cardId: string; stageId: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [cards, setCards] = useState<Record<string, LeadCard>>({});
  const [pauses, setPauses] = useState<Record<string, boolean>>({}); // numero → pausado?
  const [stages, setStages] = useState<StageWithTipo[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [active, setActive] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [drawerCard, setDrawerCard] = useState<LeadCard | null>(null);
  const [sending, setSending] = useState(false);
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [sugerindo, setSugerindo] = useState(false);
  const sugerirFn = useServerFn(sugerirResposta);

  // Limpa sugestão ao trocar de conversa
  const prevActive = useRef<string | null>(null);
  if (active !== prevActive.current) {
    prevActive.current = active;
    if (sugestao) setSugestao(null);
  }
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId) return;
    getQuickReplies().then((r) => setQuickReplies(r as QuickReply[])).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void load(companyId);
    const ch = supabase
      .channel(`tenant:${companyId}:mensagens`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `company_id=eq.${companyId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((p) => [m, ...p].slice(0, 500));
          if (m.direcao === "entrada" && m.numero !== active) {
            setUnread((u) => ({ ...u, [m.numero]: (u[m.numero] ?? 0) + 1 }));
          }
        },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "contact_pause", filter: `company_id=eq.${companyId}` },
        () => { void loadPauses(companyId); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, active]);

  useEffect(() => {
    if (active) setUnread((u) => ({ ...u, [active]: 0 }));
    requestAnimationFrame(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }); });
  }, [active, msgs.length]);

  useEffect(() => {
    const card = active ? cards[active] : null;
    if (card?.id) {
      void loadNotas(card.id);
      setResumoIA((card as any).resumo_ia ?? null);
    } else {
      setNotas([]);
      setResumoIA(null);
    }
  }, [active, cards]);

  async function loadPauses(cid: string) {
    const { data } = await supabase.from("contact_pause").select("numero,pausado").eq("company_id", cid);
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => { map[r.numero] = !!r.pausado; });
    setPauses(map);
  }

  async function load(cid: string) {
    const [{ data: m }, { data: c }, { data: st }, mm, { data: cfg }] = await Promise.all([
      supabase.from("mensagens").select("*").eq("company_id", cid).order("created_at", { ascending: false }).limit(500),
      supabase.from("crm_cards").select("*").eq("company_id", cid),
      supabase.from("crm_stage").select("id,nome,cor,ordem,tipo").eq("company_id", cid).order("ordem", { ascending: true }),
      fetchCompanyMembers(cid),
      supabase.from("agent_config").select("motivos_finalizacao").eq("company_id", cid).maybeSingle(),
    ]);
    setMsgs((m ?? []) as Msg[]);
    const map: Record<string, LeadCard> = {};
    (c ?? []).forEach((r: any) => { map[r.numero] = r; });
    setCards(map);
    setStages((st ?? []) as any);
    setMembers(mm);
    if ((cfg as any)?.motivos_finalizacao?.length) setMotivos((cfg as any).motivos_finalizacao);
    await loadPauses(cid);
  }

  async function loadNotas(cardId: string) {
    try {
      const data = await listNotasFn({ data: { card_id: cardId } });
      setNotas(data as any[]);
    } catch { setNotas([]); }
  }

  const conversations = useMemo(() => {
    const map = new Map<string, { numero: string; nome: string | null; last: Msg }>();
    for (const m of msgs) {
      const cur = map.get(m.numero);
      if (!cur) map.set(m.numero, { numero: m.numero, nome: m.contato_nome, last: m });
    }
    let list = Array.from(map.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.nome ?? "").toLowerCase().includes(q) || c.numero.includes(q));
    }
    // Filtros
    list = list.filter((c) => {
      const card = cards[c.numero];
      const iaAtiva = !(pauses[c.numero] ?? false);
      const tipo = card?.stage_id ? stages.find((s) => s.id === card.stage_id)?.tipo : null;
      const resolvida = tipo === "ganho" || tipo === "perda";
      switch (filter) {
        case "nao_lidas": return (unread[c.numero] ?? 0) > 0;
        case "minhas": return card?.owner_id === userId;
        case "ia_ativa": return iaAtiva && !resolvida;
        case "resolvidas": return resolvida;
        default: return true;
      }
    });
    return list.sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
  }, [msgs, search, filter, unread, cards, pauses, stages, userId]);

  const thread = useMemo(() =>
    [...msgs].filter((m) => m.numero === active).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    [msgs, active]);

  const activeConv = conversations.find((c) => c.numero === active) ?? (active ? { numero: active, nome: cards[active]?.nome ?? null, last: thread[thread.length - 1] } : null);
  const activeCard = active ? cards[active] : undefined;
  const activeStage = activeCard?.stage_id ? stages.find((s) => s.id === activeCard.stage_id) : null;
  const iaAtivaAqui = active ? !(pauses[active] ?? false) : true;

  async function toggleIa(v: boolean) {
    if (!active) return;
    setPauses((p) => ({ ...p, [active]: !v })); // optimistic
    try { await toggleIaFn({ data: { numero: active, ativa: v } }); }
    catch (e: any) { toast.error(e?.message); setPauses((p) => ({ ...p, [active]: v })); }
  }

  const resolvedStages = useMemo(() => stages.filter((s) => s.tipo === "ganho" || s.tipo === "perda"), [stages]);

  function toggleSelected(numero: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(numero)) next.delete(numero); else next.add(numero);
      return next;
    });
  }

  function closeSelected(stageId: string) {
    const numeros = Array.from(selected);
    if (numeros.length === 0) return;
    setCloseMenuOpen(false);
    setMotivoModal({ stageId, numeros });
  }

  async function confirmClose(stageId: string, numeros: string[], motivo?: string) {
    try {
      const res = await bulkCloseFn({ data: { numeros, stage_id: stageId, motivo } });
      toast.success(`${res.total} atendimento(s) encerrado(s)`);
      if (numeros.length === 1) {
        const card = cards[numeros[0]];
        if (card) setRateModal({ numero: numeros[0], cardId: card.id, stageId });
      }
      setSelected(new Set());
      setSelectMode(false);
      setMotivoModal(null);
      if (companyId) await load(companyId);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao encerrar");
    }
  }

  async function distribuir(numero: string) {
    setDistributing(numero);
    try {
      await distributeFn({ data: { numero } });
      toast.success("Conversa distribuída");
      if (companyId) await load(companyId);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao distribuir");
    } finally {
      setDistributing(null);
    }
  }

  async function handleSaveNota() {
    const card = active ? cards[active] : null;
    if (!card?.id || !notaDraft.trim()) return;
    setSavingNota(true);
    try {
      await addNotaFn({ data: { card_id: card.id, conteudo: notaDraft.trim(), mencoes: [] } });
      setNotaDraft("");
      await loadNotas(card.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar nota");
    } finally {
      setSavingNota(false);
    }
  }

  async function handleDeleteNota(notaId: string) {
    const card = active ? cards[active] : null;
    if (!card?.id) return;
    try {
      await deleteNotaFn({ data: { nota_id: notaId } });
      await loadNotas(card.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao remover nota");
    }
  }

  async function handleGerarResumo() {
    const card = active ? cards[active] : null;
    if (!card?.id) return;
    setGerandoResumo(true);
    try {
      const res = await gerarResumoFn({ data: { card_id: card.id } });
      if (res.resumo) {
        setResumoIA(res.resumo);
        setCards((prev) => ({ ...prev, [active!]: { ...prev[active!], resumo_ia: res.resumo } as any }));
        toast.success("Resumo gerado");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar resumo");
    } finally {
      setGerandoResumo(false);
    }
  }

  async function assumir() {
    if (!active) return;
    await toggleIa(false);
    toast.success("Você assumiu este atendimento. IA pausada.");
  }

  async function handleRemoveTag(tag: string) {
    if (!active) return;
    const current = cards[active]?.tags ?? [];
    const next = current.filter((t) => t !== tag);
    setCards((c) => ({ ...c, [active]: { ...c[active], tags: next } }));
    try { await updateTagsFn({ data: { numero: active, tags: next } }); }
    catch (e: any) {
      setCards((c) => ({ ...c, [active]: { ...c[active], tags: current } }));
      toast.error(e?.message ?? "Falha ao remover tag");
    }
  }

  async function handleAddTag(raw: string) {
    if (!active) return;
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    const current = cards[active]?.tags ?? [];
    if (current.includes(tag)) return;
    const next = [...current, tag];
    setCards((c) => ({ ...c, [active]: { ...c[active], tags: next } }));
    setTagDraft("");
    try { await updateTagsFn({ data: { numero: active, tags: next } }); }
    catch (e: any) {
      setCards((c) => ({ ...c, [active]: { ...c[active], tags: current } }));
      toast.error(e?.message ?? "Falha ao adicionar tag");
    }
  }

  async function handleTransfer(ownerId: string) {
    if (!active) return;
    setTransferring(true);
    setTransferOpen(false);
    try {
      await transferFn({ data: { numero: active, owner_id: ownerId } });
      setCards((c) => ({ ...c, [active]: { ...c[active], owner_id: ownerId } }));
      const m = members.find((mb) => mb.user_id === ownerId);
      toast.success(`Conversa transferida para ${m?.nome ?? m?.email ?? "atendente"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao transferir");
    } finally {
      setTransferring(false);
    }
  }

  const shortcutMatch = useMemo(() => {
    if (!composer.startsWith("/")) return null;
    const q = composer.slice(1).toLowerCase();
    if (!q) return null;
    return quickReplies.filter((r) => r.atalho?.toLowerCase().startsWith(q)).slice(0, 5);
  }, [composer, quickReplies]);

  async function sendMsg(text?: string) {
    const txt = (text ?? composer).trim();
    if (!txt || !active || !companyId) return;
    setSending(true);
    try {
      await sendFn({ data: { numero: active, texto: txt, contatoNome: activeConv?.nome ?? null } });
      setComposer("");
      setSugestao(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleCopiloto() {
    if (!activeCard?.id || sugerindo) return;
    setSugerindo(true);
    setSugestao(null);
    try {
      const res = await sugerirFn({ data: { card_id: activeCard.id, rascunho: composer || undefined } });
      setSugestao(res.sugestao);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível gerar sugestão");
    } finally {
      setSugerindo(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight">Conversas</h1>
          <p className="text-sm text-muted-foreground">Inbox em tempo real do WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterTabs value={filter} onChange={setFilter} counts={{
            nao_lidas: Object.values(unread).reduce((a, b) => a + b, 0),
          }} />
          <Button
            size="sm" variant={selectMode ? "default" : "outline"}
            onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
          >
            <CheckSquare className="size-3.5 mr-1.5" /> {selectMode ? "Cancelar seleção" : "Selecionar"}
          </Button>
        </div>
      </header>

      {selectMode && selected.size > 0 && resolvedStages.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] px-4 py-2.5">
          <span className="text-[13px] font-semibold">{selected.size} selecionada(s)</span>
          <div className="relative ml-auto">
            <Button size="sm" onClick={() => setCloseMenuOpen((v) => !v)} className="bg-gradient-brand text-primary-foreground">
              Fechar selecionadas
            </Button>
            {closeMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] shadow-lg overflow-hidden">
                {resolvedStages.map((s) => (
                  <button key={s.id} onClick={() => void closeSelected(s.id)}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-[color:var(--panel-2)] flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: s.cor }} /> {s.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px] border border-[color:var(--hairline)] rounded-2xl overflow-hidden h-[calc(100vh-200px)] min-h-[500px] bg-[color:var(--panel)]">
        {/* LISTA */}
        <aside className="border-r border-[color:var(--hairline)] flex flex-col min-h-0 bg-[color:var(--panel)]">
          <div className="p-3 border-b border-[color:var(--hairline)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Buscar contato…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <ul className="flex-1 overflow-auto">
            {conversations.length === 0 && (
              <li className="p-8 text-sm text-muted-foreground text-center">Nenhuma conversa neste filtro.</li>
            )}
            {conversations.map((c) => {
              const on = c.numero === active;
              const u = unread[c.numero] ?? 0;
              const iaAtiva = !(pauses[c.numero] ?? false);
              const isSelected = selected.has(c.numero);
              return (
                <li key={c.numero}>
                  <button
                    onClick={() => (selectMode ? toggleSelected(c.numero) : setActive(c.numero))}
                    className={`relative w-full text-left flex gap-3 p-3 border-b border-[color:var(--hairline)] transition-colors ${
                      on && !selectMode ? "bg-[color:var(--brand-soft)]" : "hover:bg-[color:var(--panel-2)]"
                    }`}
                  >
                    {on && !selectMode && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[color:var(--brand)]" />}
                    {selectMode && (
                      isSelected
                        ? <CheckSquare className="size-4 mt-2.5 shrink-0 text-[color:var(--brand-text)]" />
                        : <Square className="size-4 mt-2.5 shrink-0 text-muted-foreground" />
                    )}
                    <InitialsAvatar name={c.nome || c.numero} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <b className="text-[13.5px] truncate">{c.nome || c.numero}</b>
                        <span className="ml-auto text-[10.5px] text-muted-foreground whitespace-nowrap">
                          {new Date(c.last.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[12.5px] text-muted-foreground truncate flex-1">{c.last.texto}</p>
                        {iaAtiva && (
                          <span title="IA ativa" className="text-[color:var(--brand-text)]"><Bot className="size-3" /></span>
                        )}
                        {u > 0 && (
                          <span className="bg-[color:var(--brand)] text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full grid place-items-center px-1">
                            {u}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {(cards[c.numero]?.queue_id || cards[c.numero]?.owner_id) && (
                    <div className="px-3 pb-2 -mt-1 flex items-center justify-between gap-2">
                      {cards[c.numero]?.owner_id ? (
                        (() => {
                          const owner = members.find((m) => m.user_id === cards[c.numero]?.owner_id);
                          return (
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-[color:var(--brand-text)] font-semibold">
                              <InitialsAvatar name={owner?.nome ?? owner?.email ?? "?"} size={14} />
                              {owner?.nome ?? owner?.email ?? "Atribuído"}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-[10.5px] text-muted-foreground">Aguardando na fila</span>
                      )}
                      {cards[c.numero]?.queue_id && !cards[c.numero]?.owner_id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); void distribuir(c.numero); }}
                          disabled={distributing === c.numero}
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand-text)] hover:brightness-110 disabled:opacity-50"
                        >
                          {distributing === c.numero ? "Distribuindo…" : "Distribuir"}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* THREAD */}
        <section className="flex flex-col min-h-0 bg-[color:var(--panel-2)]">
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              <div className="text-center"><MessageSquareText className="mx-auto mb-2 size-6" />Selecione uma conversa</div>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--hairline)] bg-[color:var(--panel)]">
                <InitialsAvatar name={activeConv?.nome || active} size={38} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{activeConv?.nome || active}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate font-mono">{active}</div>
                </div>
                <div className="ml-auto flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground font-medium">
                    <Bot className="size-3.5" /> IA ativa
                    <Switch checked={iaAtivaAqui} onCheckedChange={(v) => void toggleIa(v)} />
                  </label>
                  <Button size="sm" variant="outline" onClick={() => void assumir()}>
                    <Hand className="size-3.5 mr-1" /> Assumir
                  </Button>
                  <div className="relative">
                    <Button size="sm" variant="outline" disabled={transferring} onClick={() => setTransferOpen((v) => !v)}>
                      <ArrowLeftRight className="size-3.5 mr-1" /> Transferir
                    </Button>
                    {transferOpen && (
                      <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] shadow-lg overflow-hidden">
                        <div className="px-3 py-2 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-[color:var(--hairline)]">
                          Transferir para
                        </div>
                        {members.length === 0 && (
                          <p className="px-3 py-2 text-[12.5px] text-muted-foreground">Nenhum atendente</p>
                        )}
                        {members.map((m) => (
                          <button key={m.user_id} onClick={() => void handleTransfer(m.user_id)}
                            className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-[color:var(--panel-2)] flex items-center gap-2">
                            <InitialsAvatar name={m.nome ?? m.email ?? "?"} size={22} />
                            <span className="truncate">{m.nome ?? m.email}</span>
                            {cards[active!]?.owner_id === m.user_id && (
                              <span className="ml-auto text-[10px] text-[color:var(--brand-text)] font-bold">atual</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {resolvedStages.length > 0 && (
                    <div className="relative">
                      <Button size="sm" variant="outline" onClick={() => { setSelected(new Set([active])); setCloseMenuOpen((v) => !v); }}>
                        Encerrar
                      </Button>
                      {closeMenuOpen && selected.has(active) && selected.size === 1 && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] shadow-lg overflow-hidden">
                          {resolvedStages.map((s) => (
                            <button key={s.id} onClick={() => void closeSelected(s.id)}
                              className="w-full text-left px-3 py-2 text-[13px] hover:bg-[color:var(--panel-2)] flex items-center gap-2">
                              <span className="size-2 rounded-full" style={{ background: s.cor }} /> {s.nome}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </header>

              <div ref={threadRef} className="flex-1 overflow-auto p-4 flex flex-col gap-2.5">
                {thread.map((m) => <Bubble key={m.id} m={m} />)}
              </div>

              {/* Quick replies */}
              {quickReplies.length > 0 && (
                <div className="px-4 pt-2 border-t border-[color:var(--hairline)] bg-[color:var(--panel)] flex gap-2 overflow-x-auto">
                  {quickReplies.map((q) => (
                    <button key={q.id} onClick={() => void sendMsg(q.mensagem)}
                      title={q.mensagem}
                      className="shrink-0 text-[12px] px-3 py-1.5 rounded-full bg-[color:var(--panel-2)] hover:bg-[color:var(--brand-soft)] hover:text-[color:var(--brand-text)] text-muted-foreground transition-colors">
                      {q.titulo}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); void sendMsg(); }}
                className="relative px-4 py-3 border-t border-[color:var(--hairline)] bg-[color:var(--panel)] flex flex-col gap-2">

                {/* Sugestão copiloto */}
                {sugestao && (
                  <div className="flex items-start gap-2 rounded-xl border border-[color:var(--brand)]/30 bg-[color:var(--brand-soft)] px-3 py-2.5 text-sm">
                    <Wand2 className="size-3.5 shrink-0 mt-0.5 text-[color:var(--brand-text)]" />
                    <span className="flex-1 text-[color:var(--brand-text)] leading-snug">{sugestao}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setComposer(sugestao); setSugestao(null); }}
                        className="text-[11px] font-semibold text-[color:var(--brand-text)] bg-[color:var(--brand)]/20 hover:bg-[color:var(--brand)]/30 rounded-md px-2 py-0.5 transition"
                      >
                        Usar
                      </button>
                      <button type="button" onClick={() => setSugestao(null)} className="text-[color:var(--brand-text)]/60 hover:text-[color:var(--brand-text)]">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Autocomplete de atalhos */}
                {shortcutMatch && shortcutMatch.length > 0 && (
                  <div className="absolute bottom-full left-4 right-4 mb-1 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] shadow-lg overflow-hidden">
                    {shortcutMatch.map((r) => (
                      <button key={r.id} type="button" onClick={() => setComposer(r.mensagem)}
                        className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-[color:var(--panel-2)] flex items-center gap-2">
                        <span className="font-mono text-[color:var(--brand-text)]">/{r.atalho}</span>
                        <span className="text-muted-foreground truncate">{r.titulo}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <input
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="Digite uma mensagem… (use /atalho para respostas rápidas)"
                    disabled={sending}
                    className="flex-1 bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[color:var(--brand)]/60"
                  />
                  {/* Botão copiloto */}
                  {activeCard?.id && (
                    <button
                      type="button"
                      onClick={handleCopiloto}
                      disabled={sugerindo}
                      title="Copiloto IA — sugerir resposta"
                      className="size-10 rounded-full grid place-items-center border border-[color:var(--hairline)] bg-[color:var(--panel-2)] hover:bg-[color:var(--brand-soft)] hover:border-[color:var(--brand)]/40 hover:text-[color:var(--brand-text)] text-muted-foreground transition disabled:opacity-50"
                    >
                      {sugerindo
                        ? <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin block" />
                        : <Wand2 className="size-4" />
                      }
                    </button>
                  )}
                  <button
                    type="submit" disabled={sending || !composer.trim()}
                    className="size-10 rounded-full grid place-items-center text-primary-foreground bg-[color:var(--brand)] hover:brightness-110 transition disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        {/* INFO */}
        <aside className="hidden xl:flex flex-col gap-4 border-l border-[color:var(--hairline)] p-5 bg-[color:var(--panel)] overflow-auto">
          {!active ? (
            <p className="text-xs text-muted-foreground text-center mt-6">Selecione uma conversa para ver os detalhes.</p>
          ) : (
            <>
              <div className="flex flex-col items-center text-center gap-2 pb-4 border-b border-[color:var(--hairline)]">
                <InitialsAvatar name={activeConv?.nome || active} size={72} />
                <div>
                  <div className="font-semibold text-sm">{activeConv?.nome || active}</div>
                  <div className="text-[11.5px] text-muted-foreground font-mono">{active}</div>
                </div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Etapa CRM</div>
                {activeStage ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full ring-1"
                    style={{ background: `color-mix(in oklab, ${activeStage.cor} 18%, transparent)`, color: activeStage.cor, borderColor: `color-mix(in oklab, ${activeStage.cor} 35%, transparent)` } as any}>
                    <Sparkles className="size-3.5" /> {activeStage.nome}
                  </span>
                ) : <span className="text-xs text-muted-foreground">Sem etapa</span>}
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold flex items-center gap-1.5">
                  <Tag className="size-3" /> Tags
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(activeCard?.tags ?? []).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2.5 pr-1 py-1 rounded-full bg-[color:var(--panel-2)] text-muted-foreground border border-[color:var(--hairline)]">
                      {t}
                      <button onClick={() => void handleRemoveTag(t)} aria-label={`Remover tag ${t}`}
                        className="size-3.5 grid place-items-center rounded-full hover:text-foreground transition-colors">
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); void handleAddTag(tagDraft); }} className="flex gap-1">
                  <input
                    value={tagDraft} onChange={(e) => setTagDraft(e.target.value)}
                    placeholder="Nova tag…"
                    className="flex-1 min-w-0 bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-[color:var(--brand)]/60"
                  />
                  <button type="submit" disabled={!tagDraft.trim()}
                    className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[color:var(--brand-soft)] text-[color:var(--brand-text)] hover:brightness-110 disabled:opacity-40 transition">
                    +
                  </button>
                </form>
              </div>
              {activeCard?.observacao && (
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Observações</div>
                  <p className="text-[13px] text-foreground/85 whitespace-pre-wrap">{activeCard.observacao}</p>
                </div>
              )}

              {/* Resumo IA */}
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><FileText className="size-3" /> Resumo IA</span>
                  <button
                    onClick={() => void handleGerarResumo()}
                    disabled={gerandoResumo}
                    className="text-[10px] font-semibold text-[color:var(--brand)] hover:underline disabled:opacity-40 transition"
                  >
                    {gerandoResumo ? "Gerando…" : resumoIA ? "Regerar" : "Gerar"}
                  </button>
                </div>
                {resumoIA ? (
                  <p className="text-[12px] text-foreground/85 whitespace-pre-wrap leading-relaxed bg-[color:var(--panel-2)] rounded-lg px-3 py-2 border border-[color:var(--hairline)]">{resumoIA}</p>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground italic">Nenhum resumo gerado ainda.</p>
                )}
              </div>

              {/* Notas Internas */}
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold flex items-center gap-1.5">
                  <StickyNote className="size-3" /> Notas Internas
                </div>
                <div className="flex flex-col gap-1.5 mb-2 max-h-48 overflow-y-auto">
                  {notas.length === 0 && (
                    <p className="text-[11.5px] text-muted-foreground italic">Nenhuma nota ainda.</p>
                  )}
                  {notas.map((n: any) => (
                    <div key={n.id} className="group relative bg-[color:var(--panel-2)] rounded-lg px-3 py-2 border border-[color:var(--hairline)]">
                      <p className="text-[12px] whitespace-pre-wrap break-words text-foreground/90">{n.conteudo}</p>
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {n.profiles?.nome ?? n.profiles?.email ?? "Agente"} · {new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {n.user_id === userId && (
                          <button onClick={() => void handleDeleteNota(n.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <textarea
                    value={notaDraft} onChange={(e) => setNotaDraft(e.target.value)}
                    placeholder="Adicionar nota interna…"
                    rows={2}
                    className="flex-1 min-w-0 bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-[color:var(--brand)]/60 resize-none"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void handleSaveNota(); }}
                  />
                  <button onClick={() => void handleSaveNota()} disabled={!notaDraft.trim() || savingNota}
                    className="px-2.5 text-[11px] font-semibold rounded-lg bg-[color:var(--brand-soft)] text-[color:var(--brand-text)] hover:brightness-110 disabled:opacity-40 transition self-end py-1.5">
                    {savingNota ? "…" : "+"}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Ctrl+Enter para salvar</p>
              </div>
              {activeCard && (
                <Button variant="outline" size="sm" onClick={() => setDrawerCard(activeCard)}>
                  <ExternalLink className="size-3.5 mr-1.5" /> Abrir ficha do lead
                </Button>
              )}
              <div className="mt-auto pt-3 border-t border-[color:var(--hairline)] text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                <User className="size-3" /> {thread.length} mensagens nesta conversa
              </div>
            </>
          )}
        </aside>
      </div>

      {motivoModal && (
        <MotivoModal
          motivos={motivos}
          onClose={() => setMotivoModal(null)}
          onConfirm={(motivo) => void confirmClose(motivoModal.stageId, motivoModal.numeros, motivo)}
        />
      )}

      {companyId && (
        <LeadDrawer
          card={drawerCard} stages={stages} members={members} companyId={companyId}
          onClose={() => setDrawerCard(null)}
          onChanged={() => { if (companyId) void load(companyId); }}
        />
      )}

      {rateModal && (
        <RateModal
          onClose={() => setRateModal(null)}
          onSubmit={async (nota, comentario) => {
            try {
              await rateFn({ data: { card_id: rateModal.cardId, nota, comentario: comentario || undefined } });
              toast.success("Avaliação registrada");
            } catch (e: any) {
              toast.error(e?.message ?? "Falha ao registrar avaliação");
            } finally {
              setRateModal(null);
            }
          }}
        />
      )}
    </div>
  );
}

function MotivoModal({ motivos, onClose, onConfirm }: {
  motivos: string[];
  onClose: () => void;
  onConfirm: (motivo?: string) => void;
}) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="panel p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Motivo do encerramento</h2>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Selecione o motivo para encerrar este atendimento (opcional).</p>
        <div className="flex flex-col gap-2">
          {motivos.map((m) => (
            <button key={m} onClick={() => setSelected(selected === m ? undefined : m)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-colors ${selected === m ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]" : "border-[color:var(--hairline)] hover:bg-[color:var(--panel-2)]"}`}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => onConfirm(undefined)}>
            Pular
          </Button>
          <Button className="flex-1" onClick={() => onConfirm(selected)}>
            Encerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

function RateModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (nota: number, comentario: string) => void | Promise<void> }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="panel p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Avaliar atendimento</h2>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Como foi a qualidade deste atendimento? (opcional)</p>
        <div className="flex items-center justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setNota(n)} aria-label={`${n} estrelas`}>
              <Star className={`size-7 ${n <= nota ? "fill-[color:var(--brand)] text-[color:var(--brand)]" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comentario} onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentário (opcional)"
          className="w-full bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[color:var(--brand)]/60"
          rows={3}
        />
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Pular</Button>
          <Button
            disabled={nota === 0 || saving}
            onClick={async () => { setSaving(true); await onSubmit(nota, comentario); }}
            className="flex-1 bg-gradient-brand text-primary-foreground"
          >
            Salvar avaliação
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterTabs({ value, onChange, counts }: { value: Filter; onChange: (f: Filter) => void; counts: { nao_lidas: number } }) {
  const opts: { v: Filter; label: string; badge?: number }[] = [
    { v: "todas", label: "Todas" },
    { v: "nao_lidas", label: "Não lidas", badge: counts.nao_lidas },
    { v: "minhas", label: "Atribuídas a mim" },
    { v: "ia_ativa", label: "IA ativa" },
    { v: "resolvidas", label: "Resolvidas" },
  ];
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel)] p-1">
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
            value === o.v ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]" : "text-muted-foreground hover:text-foreground"
          }`}>
          {o.label}
          {o.badge ? <span className="bg-[color:var(--brand)] text-primary-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] grid place-items-center">{o.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  const isOut = m.direcao === "saida";
  const ia = m.autor === "ia";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] sm:max-w-[62%] px-3.5 py-2.5 text-[13.5px] ${
          isOut
            ? "bg-[color:var(--brand)] text-primary-foreground rounded-2xl rounded-br-md font-medium"
            : "bg-[color:var(--panel)] text-foreground rounded-2xl rounded-bl-md border border-[color:var(--hairline)]"
        }`}
      >
        {isOut && (
          <span className="block text-[9.5px] font-bold opacity-80 mb-1 uppercase tracking-wider">
            {ia ? "⚡ Agente IA" : "Atendente"}
          </span>
        )}
        <div className="whitespace-pre-wrap break-words">{m.texto}</div>
        <div className={`text-[10.5px] mt-1 ${isOut ? "opacity-70" : "text-muted-foreground"}`}>
          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
