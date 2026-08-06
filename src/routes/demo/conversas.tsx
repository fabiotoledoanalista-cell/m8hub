import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { Hand, MessageSquareText, Send, Sparkles, User } from "lucide-react";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { AuthorBadge } from "@/components/dashboard/message-timeline";
import { demoMensagens, demoCards, type DemoMsg } from "@/lib/demo-data";

export const Route = createFileRoute("/demo/conversas")({
  head: () => ({ meta: [{ title: `${brand.name} — Conversas (demo)` }] }),
  component: ConversasDemo,
});

const STAGE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  conversas: { bg: "bg-[rgba(34,211,238,.15)]", fg: "text-[#a7e9f5]", label: "Conversa" },
  negociando: { bg: "bg-[rgba(255,176,32,.15)]", fg: "text-[#ffd591]", label: "Negociando" },
  ganho: { bg: "bg-[rgba(37,211,102,.15)]", fg: "text-[#9af0bd]", label: "Ganho" },
  perda: { bg: "bg-[rgba(255,90,90,.15)]", fg: "text-[#ff9d9d]", label: "Perda" },
};

function ConversasDemo() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string | null>(demoMensagens[0]?.numero ?? null);
  const [composer, setComposer] = useState("");
  const [iaActive, setIaActive] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);

  const conversations = useMemo(() => {
    const map = new Map<string, { numero: string; nome: string; last: DemoMsg }>();
    [...demoMensagens].sort((a, b) => +b.quando - +a.quando).forEach((m) => {
      if (!map.has(m.numero)) map.set(m.numero, { numero: m.numero, nome: m.nome, last: m });
    });
    let list = Array.from(map.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.nome.toLowerCase().includes(q) || c.numero.includes(q));
    }
    return list;
  }, [search]);

  const thread = useMemo(() =>
    [...demoMensagens].filter((m) => m.numero === active).sort((a, b) => +a.quando - +b.quando),
    [active]);

  useEffect(() => {
    requestAnimationFrame(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }); });
  }, [active]);

  const activeConv = conversations.find((c) => c.numero === active);
  const activeCard = active ? demoCards.find((c) => c.numero === active) : undefined;
  const stage = activeCard?.status ?? "conversas";
  const stageCfg = STAGE_COLORS[stage] ?? STAGE_COLORS.conversas;

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold">Conversas</h1>
          <p className="text-xs text-muted-foreground">Inbox em tempo real do WhatsApp — exemplo.</p>
        </div>
      </header>

      <div className="grid md:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_260px] gap-0 border border-border rounded-2xl overflow-hidden h-[calc(100vh-180px)] min-h-[480px] bg-card">
        {/* LISTA */}
        <aside className="border-r border-border flex flex-col min-h-0 bg-card">
          <div className="p-3 border-b border-border">
            <Input placeholder="Buscar contato…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ul className="flex-1 overflow-auto">
            {conversations.map((c) => {
              const on = c.numero === active;
              return (
                <li key={c.numero}>
                  <button
                    onClick={() => setActive(c.numero)}
                    className={`relative w-full text-left flex gap-3 p-3 border-b border-border transition-colors ${on ? "bg-[rgba(37,211,102,.08)]" : "hover:bg-muted/40"}`}
                  >
                    {on && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--brand)]" />}
                    <InitialsAvatar name={c.nome || c.numero} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <b className="text-[13px] truncate">{c.nome}</b>
                        <span className="ml-auto text-[10.5px] text-muted-foreground whitespace-nowrap">
                          {c.last.quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5">{c.last.texto}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* THREAD */}
        <section className="flex flex-col min-h-0 bg-muted/30">
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              <div className="text-center"><MessageSquareText className="mx-auto mb-2 size-6" />Selecione uma conversa</div>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <InitialsAvatar name={activeConv?.nome || active} size={36} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{activeConv?.nome || active}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{active}</div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    IA ativa
                    <Switch checked={iaActive} onCheckedChange={setIaActive} />
                  </label>
                  <Button size="sm" variant="outline" disabled>
                    <Hand className="size-3.5 mr-1" /> Assumir
                  </Button>
                </div>
              </header>
              <div ref={threadRef} className="flex-1 overflow-auto p-4 flex flex-col gap-2.5">
                {thread.map((m) => <Bubble key={m.id} m={m} />)}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); setComposer(""); }}
                className="px-4 py-3 border-t border-border flex gap-2 items-center"
              >
                <input
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Digite uma mensagem… (demo)"
                  className="flex-1 bg-background border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]/60"
                />
                <button
                  type="submit"
                  className="size-10 rounded-full grid place-items-center text-primary-foreground bg-gradient-to-br from-[#00E676] to-[#25D366] hover:brightness-110 transition"
                  aria-label="Enviar"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </>
          )}
        </section>

        {/* INFO */}
        <aside className="hidden xl:flex flex-col gap-3 border-l border-border p-4 bg-card overflow-auto">
          {!active ? (
            <p className="text-xs text-muted-foreground text-center mt-6">Selecione uma conversa para ver os detalhes.</p>
          ) : (
            <>
              <div className="flex flex-col items-center text-center gap-2 pb-3 border-b border-border">
                <InitialsAvatar name={activeConv?.nome || active} size={72} />
                <div>
                  <div className="font-semibold text-sm">{activeConv?.nome || active}</div>
                  <div className="text-[11px] text-muted-foreground">{active}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Estágio CRM</div>
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full ${stageCfg.bg} ${stageCfg.fg}`}>
                  <Sparkles className="size-3.5" /> {stageCfg.label}
                </span>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Tags</div>
                <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground mr-1 mb-1">whatsapp</span>
                <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground mr-1 mb-1">{stage}</span>
              </div>
              {activeCard?.observacao && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Observações</div>
                  <p className="text-[12.5px] text-foreground/80 whitespace-pre-wrap">{activeCard.observacao}</p>
                </div>
              )}
              <div className="mt-auto pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
                <User className="size-3" /> {thread.length} mensagens nesta conversa
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: DemoMsg }) {
  const isOut = m.direcao === "saida";
  const ia = m.autor === "ia";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] sm:max-w-[62%] px-3.5 py-2.5 text-[13px] ${
          isOut
            ? "bg-gradient-to-br from-[#1f9d57] to-[#25D366] text-primary-foreground rounded-2xl rounded-br-md font-medium"
            : "bg-muted text-foreground rounded-2xl rounded-bl-md"
        }`}
      >
        {isOut && (
          <span className="block text-[9.5px] font-bold opacity-80 mb-1 uppercase tracking-wider">
            {ia ? "⚡ Agente IA" : "Atendente"}
          </span>
        )}
        {!isOut && <span className="block mb-1"><AuthorBadge autor={m.autor} /></span>}
        <div className="whitespace-pre-wrap break-words">{m.texto}</div>
        <div className={`text-[10px] mt-1 ${isOut ? "opacity-70" : "text-muted-foreground"}`}>
          {m.quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
        </div>
      </div>
    </div>
  );
}
