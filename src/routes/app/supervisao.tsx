import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { brand } from "@/config/brand";
import { getDashboardSupervisao } from "@/lib/supervisao.functions";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, MessageCircle, Users, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/app/supervisao")({
  head: () => ({ meta: [{ title: `${brand.name} — Supervisão` }] }),
  beforeLoad: ({ context }: any) => {
    const r = context?.membership?.role;
    if (r === "atendente") throw redirect({ to: "/app/dashboard" });
  },
  component: SupervisaoPage,
});

type Atendente = {
  user_id: string;
  nome: string;
  online: boolean;
  last_seen_at: string | null;
  conversas_abertas: number;
  maior_espera_min: number;
};

type Fila = {
  id: string;
  nome: string;
  cor: string;
  aguardando: number;
  mais_antigo_min: number;
  membros_online: number;
  total_membros: number;
};

function fmtTempo(min: number) {
  if (min <= 0) return "—";
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

function fmtLastSeen(iso: string | null) {
  if (!iso) return "nunca";
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return "agora";
  if (diff < 60) return `${diff}min atrás`;
  return `${Math.floor(diff / 60)}h atrás`;
}

function urgencyColor(min: number) {
  if (min <= 0) return "var(--fg3)";
  if (min <= 10) return "var(--green)";
  if (min <= 30) return "var(--amber)";
  return "var(--red)";
}

function SupervisaoPage() {
  const ctx = Route.useRouteContext() as any;
  const companyId = ctx.company?.id;
  const getDashFn = useServerFn(getDashboardSupervisao);

  const [data, setData] = useState<{ atendentes: Atendente[]; filas: Fila[]; total_abertos: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function refresh() {
    try {
      const d = await getDashFn({});
      setData(d as any);
      setLastUpdate(new Date());
    } catch { /* silencia */ }
  }

  useEffect(() => {
    if (!companyId) return;
    void refresh();
    const interval = setInterval(refresh, 30_000);

    // Realtime: atualiza quando card muda
    const ch = supabase
      .channel(`supervisao:${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_cards", filter: `company_id=eq.${companyId}` }, () => void refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `company_id=eq.${companyId}` }, () => void refresh())
      .subscribe();

    return () => { clearInterval(interval); void supabase.removeChannel(ch); };
  }, [companyId]);

  const online = data?.atendentes.filter((a) => a.online).length ?? 0;
  const totalAtendentes = data?.atendentes.length ?? 0;
  const semDono = data?.filas.reduce((s, f) => s + f.aguardando, 0) ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight">Supervisão</h1>
          <p className="text-sm text-muted-foreground">
            Visão em tempo real · atualiza a cada 30s
            {lastUpdate && <span className="ml-2 opacity-60">· {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full px-3 py-1">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            ao vivo
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={<Users className="size-4" />} label="Atendentes online" value={`${online} / ${totalAtendentes}`} sub="nos últimos 5 min" />
        <KpiTile icon={<MessageCircle className="size-4" />} label="Conversas abertas" value={String(data?.total_abertos ?? "—")} sub="em andamento" />
        <KpiTile icon={<Clock className="size-4" />} label="Aguardando atribuição" value={String(semDono)} sub="sem atendente" warn={semDono > 5} />
        <KpiTile icon={<Activity className="size-4" />} label="Carga média" value={online > 0 && data ? `${Math.round((data.total_abertos - semDono) / online)}` : "—"} sub="conv. por atendente online" />
      </div>

      {/* Atendentes */}
      <section>
        <h2 className="font-display text-[17px] font-semibold mb-3">Atendentes</h2>
        {!data ? (
          <div className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--panel)] p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : data.atendentes.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--panel)] p-8 text-center text-sm text-muted-foreground">Nenhum atendente cadastrado.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.atendentes
              .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0) || b.conversas_abertas - a.conversas_abertas)
              .map((a) => <AtendenteCard key={a.user_id} a={a} />)}
          </div>
        )}
      </section>

      {/* Filas */}
      {data && data.filas.length > 0 && (
        <section>
          <h2 className="font-display text-[17px] font-semibold mb-3">Filas</h2>
          <div className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--panel)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--hairline)]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fila</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Membros online</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aguardando</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mais antigo</th>
                </tr>
              </thead>
              <tbody>
                {data.filas.map((f) => (
                  <tr key={f.id} className="border-b border-[color:var(--hairline)] last:border-0 hover:bg-[color:var(--panel-2)]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full shrink-0" style={{ background: f.cor }} />
                        <span className="font-medium">{f.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      <span className={f.membros_online > 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground"}>
                        {f.membros_online}/{f.total_membros}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      <span className={f.aguardando > 0 ? "font-semibold" : "text-muted-foreground"} style={{ color: f.aguardando > 0 ? urgencyColor(f.mais_antigo_min) : undefined }}>
                        {f.aguardando}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted-foreground" style={{ color: f.mais_antigo_min > 0 ? urgencyColor(f.mais_antigo_min) : undefined }}>
                      {fmtTempo(f.mais_antigo_min)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function KpiTile({ icon, label, value, sub, warn }: { icon: React.ReactNode; label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-[color:var(--panel)] p-5 ${warn ? "border-amber-400/60" : "border-[color:var(--hairline)]"}`}>
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
      <p className={`text-3xl font-extrabold tabular-nums leading-none ${warn ? "text-amber-500" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function AtendenteCard({ a }: { a: Atendente }) {
  const espera = a.maior_espera_min;
  return (
    <div className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--panel)] p-4 flex gap-3">
      {/* Avatar + status */}
      <div className="relative shrink-0">
        <div className="size-10 rounded-full bg-[color:var(--brand-soft)] grid place-items-center font-bold text-[color:var(--brand-text)] text-sm">
          {a.nome.slice(0, 2).toUpperCase()}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[color:var(--panel)] ${a.online ? "bg-green-500" : "bg-gray-400"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">{a.nome}</span>
          {a.online
            ? <Wifi className="size-3 text-green-500 shrink-0" />
            : <WifiOff className="size-3 text-muted-foreground shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">{a.online ? "online" : fmtLastSeen(a.last_seen_at)}</p>
        <div className="flex items-center gap-4 mt-2">
          <div>
            <p className="text-[11px] text-muted-foreground">Abertas</p>
            <p className="text-lg font-bold tabular-nums leading-none">{a.conversas_abertas}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Maior espera</p>
            <p className="text-lg font-bold tabular-nums leading-none" style={{ color: urgencyColor(espera) }}>
              {fmtTempo(espera)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
