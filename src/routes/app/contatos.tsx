import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brand } from "@/config/brand";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { LeadDrawer, type LeadCard, type Stage, type Member } from "@/components/crm/lead-drawer";
import { Plus, Upload, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createContact, importContacts } from "@/lib/plan.functions";
import { PlanUsageBadge } from "@/components/plan-usage-badge";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { fetchCompanyMembers } from "@/lib/company-members";

const CAMPOS_CSV = [
  { key: "numero", label: "Telefone *", required: true },
  { key: "nome", label: "Nome" },
  { key: "observacao", label: "Observação" },
  { key: "tags", label: "Tags (separadas por vírgula)" },
  { key: "valor", label: "Valor (R$)" },
  { key: "origem", label: "Origem" },
] as const;

type CampoKey = (typeof CAMPOS_CSV)[number]["key"];

export const Route = createFileRoute("/app/contatos")({
  head: () => ({ meta: [{ title: `${brand.name} — Contatos` }] }),
  component: ContatosPage,
});

function ContatosPage() {
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const plan = usePlanFeatures();
  const createContactFn = useServerFn(createContact);
  const importContactsFn = useServerFn(importContacts);
  const [cards, setCards] = useState<LeadCard[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [stageId, setStageId] = useState<string>("todos");
  const [active, setActive] = useState<LeadCard | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoNumero, setNovoNumero] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // CSV import modal state
  const [csvModal, setCsvModal] = useState<{
    headers: string[];
    rows: Record<string, string>[];
    mapping: Record<CampoKey, string>;
    stageId: string;
    importing: boolean;
  } | null>(null);

  async function load() {
    if (!companyId) return;
    const [{ data: c }, { data: st }, cu] = await Promise.all([
      supabase.from("crm_cards").select("*").eq("company_id", companyId).order("ultima_em", { ascending: false }),
      supabase.from("crm_stage").select("id,nome,cor,ordem,tipo").eq("company_id", companyId).order("ordem", { ascending: true }),
      fetchCompanyMembers(companyId),
    ]);
    setCards((c ?? []) as any);
    setStages((st ?? []) as any);
    setMembers(cu);
  }
  useEffect(() => { void load(); }, [companyId]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (stageId !== "todos" && c.stage_id !== stageId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (c.nome ?? "").toLowerCase().includes(q) || c.numero.includes(q);
      }
      return true;
    });
  }, [cards, search, stageId]);

  function stageOf(card: LeadCard) {
    return stages.find((s) => s.id === card.stage_id) ?? null;
  }

  async function criarNovo() {
    if (!novoNumero.trim()) return;
    try {
      await createContactFn({ data: { numero: novoNumero.trim(), nome: novoNome.trim() || null } });
      toast.success("Contato criado");
      setNovoNome(""); setNovoNumero(""); setNewOpen(false);
      await Promise.all([load(), plan.refresh()]);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar");
    }
  }

  function openCSVModal(file: File) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const rows = (res.data as Record<string, string>[]).slice(0, 500);
        if (headers.length === 0) return toast.error("CSV sem cabeçalho reconhecido.");

        // Auto-detect mapping
        const autoMap: Record<string, string> = {};
        const lower = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
        for (const h of headers) {
          const l = lower(h);
          if (!autoMap.numero && (l.includes("tel") || l.includes("phone") || l.includes("numero") || l.includes("fone"))) autoMap.numero = h;
          if (!autoMap.nome && (l.includes("nome") || l.includes("name") || l.includes("contato"))) autoMap.nome = h;
          if (!autoMap.observacao && (l.includes("obs") || l.includes("nota") || l.includes("descri"))) autoMap.observacao = h;
          if (!autoMap.tags && (l.includes("tag") || l.includes("label") || l.includes("categoria"))) autoMap.tags = h;
          if (!autoMap.valor && (l.includes("valor") || l.includes("value") || l.includes("preco"))) autoMap.valor = h;
          if (!autoMap.origem && (l.includes("origem") || l.includes("source") || l.includes("canal"))) autoMap.origem = h;
        }

        setCsvModal({
          headers,
          rows,
          mapping: autoMap as Record<CampoKey, string>,
          stageId: stages[0]?.id ?? "",
          importing: false,
        });
      },
      error: (e) => toast.error(e.message),
    });
  }

  async function confirmImportCSV() {
    if (!csvModal) return;
    const { rows, mapping, stageId } = csvModal;
    const numCol = mapping.numero;
    if (!numCol) return toast.error("Mapeie a coluna de telefone.");

    const contatos = rows
      .map((r) => ({
        numero: (r[numCol] ?? "").replace(/\D/g, ""),
        nome: mapping.nome ? (r[mapping.nome] ?? "").trim() || null : null,
        observacao: mapping.observacao ? (r[mapping.observacao] ?? "").trim() || null : null,
        tags: mapping.tags ? (r[mapping.tags] ?? "").trim() || null : null,
        valor: mapping.valor ? (r[mapping.valor] ?? "") || null : null,
        origem: mapping.origem ? (r[mapping.origem] ?? "").trim() || null : null,
      }))
      .filter((c) => c.numero.length >= 8);

    if (contatos.length === 0) return toast.error("Nenhuma linha válida encontrada.");
    setCsvModal((m) => m ? { ...m, importing: true } : m);
    try {
      const res = await importContactsFn({ data: { contatos, stage_id: stageId || null } });
      toast.success(`${res.inseridos} novo(s) · ${res.atualizados} atualizado(s)`);
      setCsvModal(null);
      await Promise.all([load(), plan.refresh()]);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao importar");
      setCsvModal((m) => m ? { ...m, importing: false } : m);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">Todos os leads gerados pelo WhatsApp.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!plan.loading && (
            <PlanUsageBadge label="contatos" used={plan.usage.contatos} limit={plan.limites.contatos} />
          )}
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) openCSVModal(f); e.currentTarget.value = ""; }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4 mr-2" /> Importar CSV
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4 mr-2" /> Novo contato
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou número…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={stageId} onValueChange={setStageId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estágios</SelectItem>
            {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground ml-auto">{filtered.length} contatos</div>
      </div>

      <div className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--panel)] overflow-hidden">
        <div className="grid grid-cols-12 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-[color:var(--panel-2)] px-5 py-3 border-b border-[color:var(--hairline)]">
          <div className="col-span-4">Contato</div>
          <div className="col-span-2">Número</div>
          <div className="col-span-2">Etapa</div>
          <div className="col-span-2">Valor</div>
          <div className="col-span-2">Última atividade</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--hairline)]">
            {filtered.map((c) => {
              const st = stageOf(c);
              return (
                <li key={c.id}>
                  <button onClick={() => setActive(c)} className="w-full grid grid-cols-12 px-5 py-3.5 items-center text-[14px] text-left hover:bg-[color:var(--panel-2)] transition-colors">
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <InitialsAvatar name={c.nome || c.numero} size={36} />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{c.nome || "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">{(c.tags ?? []).slice(0, 3).join(", ") || c.origem || "—"}</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-muted-foreground font-mono text-[12.5px] truncate">{c.numero}</div>
                    <div className="col-span-2">
                      {st ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ring-1"
                          style={{ background: `color-mix(in oklab, ${st.cor} 18%, transparent)`, color: st.cor, borderColor: `color-mix(in oklab, ${st.cor} 35%, transparent)` } as any}>
                          <span className="size-1.5 rounded-full" style={{ background: st.cor }} />
                          {st.nome}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    <div className="col-span-2 font-semibold">
                      {(c.valor ?? 0) > 0 ? `R$ ${Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground font-normal">—</span>}
                    </div>
                    <div className="col-span-2 text-muted-foreground text-[12.5px] truncate">
                      {new Date(c.ultima_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {companyId && (
        <LeadDrawer
          card={active} stages={stages} members={members} companyId={companyId}
          onClose={() => setActive(null)}
          onChanged={() => { void load(); }}
        />
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do contato" /></div>
            <div className="space-y-1.5"><Label>Telefone (com DDI)</Label><Input value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} placeholder="5511999998888" inputMode="numeric" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={criarNovo} disabled={!novoNumero.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de importação CSV */}
      <Dialog open={!!csvModal} onOpenChange={(o) => { if (!o && !csvModal?.importing) setCsvModal(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar contatos por CSV</DialogTitle>
            <DialogDescription>
              Mapeie as colunas do seu arquivo para os campos do sistema.
              {csvModal && <span className="font-semibold text-foreground"> {csvModal.rows.length} linha(s) encontrada(s).</span>}
            </DialogDescription>
          </DialogHeader>

          {csvModal && (
            <div className="flex flex-col gap-4 overflow-y-auto py-2">
              {/* Mapeamento de colunas */}
              <div className="grid grid-cols-2 gap-3">
                {CAMPOS_CSV.map((campo) => (
                  <div key={campo.key} className="space-y-1">
                    <Label className="text-[12px] flex items-center gap-1">
                      {campo.label}
                      {campo.required && <span className="text-red-500">*</span>}
                    </Label>
                    <Select
                      value={csvModal.mapping[campo.key] ?? "__none"}
                      onValueChange={(v) => setCsvModal((m) => m ? {
                        ...m, mapping: { ...m.mapping, [campo.key]: v === "__none" ? "" : v }
                      } : m)}
                    >
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Não importar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Não importar —</SelectItem>
                        {csvModal.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Etapa destino */}
              <div className="space-y-1">
                <Label className="text-[12px]">Etapa destino</Label>
                <Select value={csvModal.stageId} onValueChange={(v) => setCsvModal((m) => m ? { ...m, stageId: v } : m)}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview das primeiras 5 linhas */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Preview (5 primeiras linhas)</div>
                <div className="overflow-x-auto rounded-lg border border-[color:var(--hairline)] text-[11.5px]">
                  <table className="w-full">
                    <thead className="bg-[color:var(--panel-2)]">
                      <tr>
                        {CAMPOS_CSV.filter((c) => csvModal.mapping[c.key]).map((c) => (
                          <th key={c.key} className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{c.label.replace(" *", "")}</th>
                        ))}
                        <th className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground">Válido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--hairline)]">
                      {csvModal.rows.slice(0, 5).map((row, i) => {
                        const tel = (row[csvModal.mapping.numero] ?? "").replace(/\D/g, "");
                        const valido = tel.length >= 8;
                        return (
                          <tr key={i} className={valido ? "" : "opacity-50"}>
                            {CAMPOS_CSV.filter((c) => csvModal.mapping[c.key]).map((c) => (
                              <td key={c.key} className="px-2.5 py-1.5 truncate max-w-[140px]">{row[csvModal.mapping[c.key]] ?? "—"}</td>
                            ))}
                            <td className="px-2.5 py-1.5">
                              {valido
                                ? <CheckCircle2 className="size-3.5 text-green-500" />
                                : <AlertCircle className="size-3.5 text-red-400" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCsvModal(null)} disabled={csvModal?.importing}>Cancelar</Button>
            <Button onClick={confirmImportCSV} disabled={!csvModal?.mapping.numero || csvModal?.importing}>
              {csvModal?.importing ? "Importando…" : `Importar ${csvModal?.rows.length ?? 0} contatos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
