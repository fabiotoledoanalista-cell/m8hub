import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listFlows, upsertFlow, deleteFlow, toggleFlow, getFlow } from "@/lib/flows.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Workflow, Plus, Trash2, X, Loader2, Play, Pause, Pencil, MessageSquare, GitBranch, Clock, Zap, ArrowRight, CheckCircle2, MoveRight } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/flows")({
  head: () => ({ meta: [{ title: `${brand.name} — Flow Builder` }] }),
  component: FlowsPage,
});

type FlowItem = { id: string; nome: string; descricao: string | null; ativo: boolean; trigger_tipo: string; trigger_valor: string | null; created_at: string; updated_at: string };
type NodeType = "mensagem" | "condicao" | "delay" | "fim";
type Node = { id: string; tipo: NodeType; posX: number; posY: number; config: Record<string, any> };
type Edge = { id: string; source: string; target: string; label?: string };

const NODE_COLORS: Record<NodeType, string> = {
  mensagem: "var(--neonGreen)",
  condicao: "var(--infoBlue)",
  delay:    "var(--warnAmber)",
  fim:      "var(--errorRed)",
};

const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  mensagem: <MessageSquare className="size-4" />,
  condicao: <GitBranch className="size-4" />,
  delay:    <Clock className="size-4" />,
  fim:      <CheckCircle2 className="size-4" />,
};

const TRIGGER_LABELS: Record<string, string> = {
  palavra_chave:   "Palavra-chave",
  primeiro_contato: "Primeiro contato",
  sempre:          "Sempre (toda mensagem)",
};

function FlowsPage() {
  const getFlows = useServerFn(listFlows);
  const saveFlow = useServerFn(upsertFlow);
  const removeFlow = useServerFn(deleteFlow);
  const toggle = useServerFn(toggleFlow);
  const loadFlow = useServerFn(getFlow);

  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingFlow, setEditingFlow] = useState<Partial<FlowItem> | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; offX: number; offY: number } | null>(null);

  async function load() {
    try { setFlows(await getFlows()); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function openEditor(flow?: FlowItem) {
    if (flow) {
      try {
        const full = await loadFlow({ data: { id: flow.id } });
        setEditingFlow(full);
        setNodes(full.nodes ?? []);
        setEdges(full.edges ?? []);
      } catch (e: any) { toast.error(e.message); return; }
    } else {
      setEditingFlow({ trigger_tipo: "palavra_chave", ativo: false });
      setNodes([{ id: "start", tipo: "mensagem", posX: 80, posY: 80, config: { texto: "Olá! Como posso te ajudar?" } }]);
      setEdges([]);
    }
    setSelectedNode(null);
    setView("editor");
  }

  async function handleSave() {
    if (!editingFlow?.nome?.trim()) return toast.error("Nome do fluxo é obrigatório");
    setSaving(true);
    try {
      await saveFlow({
        data: {
          id: editingFlow.id,
          nome: editingFlow.nome,
          descricao: editingFlow.descricao ?? "",
          ativo: editingFlow.ativo ?? false,
          trigger_tipo: (editingFlow.trigger_tipo ?? "palavra_chave") as any,
          trigger_valor: editingFlow.trigger_valor ?? "",
          nodes,
          edges,
        },
      });
      toast.success("Fluxo salvo!");
      setView("list");
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleToggle(id: string, ativo: boolean) {
    try { await toggle({ data: { id, ativo: !ativo } }); await load(); } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este fluxo?")) return;
    try { await removeFlow({ data: { id } }); toast.success("Fluxo removido"); await load(); } catch (e: any) { toast.error(e.message); }
  }

  function addNode(tipo: NodeType) {
    const id = `node_${Date.now()}`;
    const defaultConfig: Record<NodeType, Record<string, any>> = {
      mensagem: { texto: "Digite sua mensagem aqui..." },
      condicao: { variavel: "mensagem", operador: "contem", valor: "" },
      delay:    { segundos: 3 },
      fim:      { acao: "encerrar" },
    };
    const newNode: Node = { id, tipo, posX: 100 + Math.random() * 200, posY: 100 + Math.random() * 200, config: defaultConfig[tipo] };
    setNodes(n => [...n, newNode]);
    setSelectedNode(newNode);
  }

  function connectNodes(sourceId: string, targetId: string, label?: string) {
    if (sourceId === targetId) return;
    const exists = edges.some(e => e.source === sourceId && e.target === targetId);
    if (exists) return;
    setEdges(e => [...e, { id: `e_${Date.now()}`, source: sourceId, target: targetId, label }]);
  }

  function removeNode(id: string) {
    setNodes(n => n.filter(x => x.id !== id));
    setEdges(e => e.filter(x => x.source !== id && x.target !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  }

  function updateNodeConfig(id: string, config: Record<string, any>) {
    setNodes(n => n.map(x => x.id === id ? { ...x, config: { ...x.config, ...config } } : x));
    setSelectedNode(s => s?.id === id ? { ...s, config: { ...s.config, ...config } } : s);
  }

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragging({ id: nodeId, offX: e.clientX - rect.left, offY: e.clientY - rect.top });
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const canvas = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - canvas.left - dragging.offX;
    const y = e.clientY - canvas.top - dragging.offY;
    setNodes(n => n.map(nd => nd.id === dragging.id ? { ...nd, posX: Math.max(0, x), posY: Math.max(0, y) } : nd));
  }, [dragging]);

  if (view === "editor") return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[color:var(--hairline)] bg-[color:var(--panel)]/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
          <Input value={editingFlow?.nome ?? ""} onChange={e => setEditingFlow(f => ({ ...f!, nome: e.target.value }))} placeholder="Nome do fluxo" className="h-8 w-48 text-sm" />
          <select value={editingFlow?.trigger_tipo ?? "palavra_chave"} onChange={e => setEditingFlow(f => ({ ...f!, trigger_tipo: e.target.value }))}
            className="h-8 text-sm rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel-2)] text-foreground px-2">
            {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {editingFlow?.trigger_tipo === "palavra_chave" && (
            <Input value={editingFlow?.trigger_valor ?? ""} onChange={e => setEditingFlow(f => ({ ...f!, trigger_valor: e.target.value }))}
              placeholder="Ex: oi, olá, ajuda" className="h-8 w-36 text-sm" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {(["mensagem", "condicao", "delay", "fim"] as NodeType[]).map(t => (
            <button key={t} onClick={() => addNode(t)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[color:var(--hairline)] hover:bg-[color:var(--panel-2)] text-muted-foreground hover:text-foreground transition-all"
              style={{ borderColor: `${NODE_COLORS[t]}40` }}>
              <span style={{ color: NODE_COLORS[t] }}>{NODE_ICONS[t]}</span>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-gradient-brand text-primary-foreground h-8">
            {saving ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : null} Salvar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[color:var(--bg-deep)] cursor-default select-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
          onClick={() => setSelectedNode(null)}
        >
          {/* SVG Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.source);
              const tgt = nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              const x1 = src.posX + 96, y1 = src.posY + 28;
              const x2 = tgt.posX, y2 = tgt.posY + 28;
              const cx = (x1 + x2) / 2;
              return (
                <g key={edge.id}>
                  <path d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                    fill="none" stroke="rgba(52,211,153,.5)" strokeWidth={2} strokeDasharray="6 3" />
                  {edge.label && <text x={cx} y={(y1 + y2) / 2 - 6} textAnchor="middle" fill="rgba(100,116,139,.8)" fontSize={10}>{edge.label}</text>}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div key={node.id}
              className={`absolute rounded-xl border shadow-lg cursor-grab active:cursor-grabbing select-none transition-shadow ${selectedNode?.id === node.id ? "ring-2 ring-[color:var(--brand)]" : ""}`}
              style={{ left: node.posX, top: node.posY, width: 192, background: "var(--panel)", borderColor: `${NODE_COLORS[node.tipo]}40` }}
              onMouseDown={e => handleMouseDown(e, node.id)}
              onClick={e => { e.stopPropagation(); setSelectedNode(node); }}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--hairline)] rounded-t-xl" style={{ background: `${NODE_COLORS[node.tipo]}18` }}>
                <span style={{ color: NODE_COLORS[node.tipo] }}>{NODE_ICONS[node.tipo]}</span>
                <span className="text-xs font-bold capitalize" style={{ color: NODE_COLORS[node.tipo] }}>{node.tipo}</span>
                <button onClick={e => { e.stopPropagation(); removeNode(node.id); }} className="ml-auto size-5 grid place-items-center rounded text-muted-foreground hover:text-[color:var(--errorRed)]">
                  <X className="size-3" />
                </button>
              </div>
              <div className="px-3 py-2 text-xs text-muted-foreground truncate">
                {node.tipo === "mensagem" && (node.config.texto || "Sem mensagem")}
                {node.tipo === "condicao" && `Se ${node.config.variavel} ${node.config.operador} "${node.config.valor}"`}
                {node.tipo === "delay" && `Aguardar ${node.config.segundos}s`}
                {node.tipo === "fim" && "Encerrar fluxo"}
              </div>
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Workflow className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">Adicione nós usando os botões acima</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Arraste para posicionar, clique para editar</p>
              </div>
            </div>
          )}
        </div>

        {/* Inspector */}
        {selectedNode && (
          <div className="w-64 border-l border-[color:var(--hairline)] bg-[color:var(--panel)] p-4 space-y-3 overflow-y-auto shrink-0">
            <div className="flex items-center gap-2">
              <span style={{ color: NODE_COLORS[selectedNode.tipo] }}>{NODE_ICONS[selectedNode.tipo]}</span>
              <span className="font-semibold capitalize text-sm">{selectedNode.tipo}</span>
            </div>

            {selectedNode.tipo === "mensagem" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Mensagem</Label>
                <textarea rows={4} value={selectedNode.config.texto ?? ""} onChange={e => updateNodeConfig(selectedNode.id, { texto: e.target.value })}
                  className="w-full rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel-2)] px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]" />
              </div>
            )}

            {selectedNode.tipo === "condicao" && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Variável</Label>
                  <select value={selectedNode.config.variavel ?? "mensagem"} onChange={e => updateNodeConfig(selectedNode.id, { variavel: e.target.value })}
                    className="w-full h-8 text-xs rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel-2)] text-foreground px-2">
                    <option value="mensagem">Mensagem recebida</option>
                    <option value="nome">Nome do contato</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operador</Label>
                  <select value={selectedNode.config.operador ?? "contem"} onChange={e => updateNodeConfig(selectedNode.id, { operador: e.target.value })}
                    className="w-full h-8 text-xs rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel-2)] text-foreground px-2">
                    <option value="contem">Contém</option>
                    <option value="igual">Igual a</option>
                    <option value="comeca_com">Começa com</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input value={selectedNode.config.valor ?? ""} onChange={e => updateNodeConfig(selectedNode.id, { valor: e.target.value })} className="h-8 text-xs" placeholder="Ex: sim, preço, ajuda" />
                </div>
              </div>
            )}

            {selectedNode.tipo === "delay" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Aguardar (segundos)</Label>
                <Input type="number" min={1} max={300} value={selectedNode.config.segundos ?? 3} onChange={e => updateNodeConfig(selectedNode.id, { segundos: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
            )}

            <div className="pt-2 border-t border-[color:var(--hairline)] space-y-2">
              <Label className="text-xs text-muted-foreground">Conectar a...</Label>
              {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                <button key={n.id} onClick={() => connectNodes(selectedNode.id, n.id)}
                  className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]">
                  <MoveRight className="size-3" />
                  <span style={{ color: NODE_COLORS[n.tipo] }}>{NODE_ICONS[n.tipo]}</span>
                  <span className="truncate">{n.config.texto?.slice(0, 20) || n.tipo}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Flow Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automações visuais de conversas no WhatsApp</p>
        </div>
        <Button onClick={() => openEditor()} className="bg-gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-2" /> Novo fluxo
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : flows.length === 0 ? (
        <div className="panel p-12 text-center">
          <Workflow className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhum fluxo criado</p>
          <p className="text-sm text-muted-foreground mt-1">Crie automações visuais para responder automaticamente</p>
          <Button onClick={() => openEditor()} className="mt-4 bg-gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-2" /> Criar primeiro fluxo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map(f => (
            <div key={f.id} className="panel p-5 flex items-center gap-4">
              <div className={`size-10 rounded-xl grid place-items-center shrink-0 ${f.ativo ? "bg-[color:var(--brand-soft)]" : "bg-muted/30"}`}>
                <Workflow className="size-5" style={{ color: f.ativo ? "var(--neonGreen)" : "var(--textMuted)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{f.nome}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${f.ativo ? "text-[color:var(--neonGreen)] bg-[color:var(--brand-soft)] border-[color:var(--brand-soft-strong)]" : "text-muted-foreground bg-muted/40 border-muted"}`}>
                    {f.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    <Zap className="size-3 inline mr-1" />{TRIGGER_LABELS[f.trigger_tipo] ?? f.trigger_tipo}
                    {f.trigger_valor && `: "${f.trigger_valor}"`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(f.id, f.ativo)}
                  className={`size-8 grid place-items-center rounded-lg transition-all ${f.ativo ? "text-[color:var(--neonGreen)] hover:bg-[color:var(--brand-soft)]" : "text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]"}`}
                  title={f.ativo ? "Desativar" : "Ativar"}>
                  {f.ativo ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <button onClick={() => openEditor(f)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]">
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => handleDelete(f.id)} className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-[color:var(--errorRed)] hover:bg-[color:var(--errorBg)]">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
