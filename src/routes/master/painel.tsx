import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { brand } from "@/config/brand";
import { Building2, MessageSquareText, KanbanSquare, TrendingUp, Activity, Pause, Sparkles } from "lucide-react";
import { masterKpis } from "@/lib/master.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/master/painel")({
  head: () => ({ meta: [{ title: `${brand.name} — Master` }] }),
  component: Painel,
});

function Painel() {
  const kpis = useServerFn(masterKpis);
  const [data, setData] = useState<{ stats: any; series: { mes: string; total: number }[] } | null>(null);

  useEffect(() => {
    void (async () => {
      try { setData(await kpis()); } catch (e: any) { toast.error(e?.message); }
    })();
  }, []);

  if (!data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const s = data.stats;

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold">Painel Master</h1>
          <p className="text-xs text-muted-foreground">Visão geral de toda a plataforma.</p>
        </div>
        <div className="flex items-center gap-2 bg-[color:var(--orange-soft)] border border-[color:var(--orange-soft-strong)] text-[color:var(--orange-text)] text-[12.5px] font-semibold px-3 py-1.5 rounded-full">
          <span className="size-2 rounded-full bg-[#FF7922]" /> Modo Master
        </div>
      </header>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <MasterKpi accent icon={<Building2 className="size-4" />} label="Empresas" value={s.total} trend={`+${s.novasMes} este mês`} />
        <MasterKpi icon={<Activity className="size-4" />} label="Ativas" value={s.ativas} trend={`${Math.round((s.ativas / Math.max(1, s.total)) * 100)}%`} />
        <MasterKpi icon={<Sparkles className="size-4" />} label="Em trial" value={s.trial} />
        <MasterKpi icon={<Pause className="size-4" />} label="Suspensas" value={s.suspensas} />
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        <MasterKpi icon={<TrendingUp className="size-4" />} label="Novas no mês" value={s.novasMes} />
        <MasterKpi icon={<MessageSquareText className="size-4" />} label="Mensagens (total)" value={s.mensagens} />
        <MasterKpi icon={<KanbanSquare className="size-4" />} label="Cards no funil (total)" value={s.cards} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-[15px] font-semibold">Crescimento de empresas</h2>
        <p className="text-xs text-muted-foreground mb-3">últimos 12 meses</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,34,41,.08)" />
            <XAxis dataKey="mes" fontSize={11} stroke="#8A8690" />
            <YAxis fontSize={11} allowDecimals={false} stroke="#8A8690" />
            <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid var(--hairline)", borderRadius: 12, color: "var(--foreground)" }} />
            <Line type="monotone" dataKey="total" stroke="#67308E" strokeWidth={2.5} dot={{ r: 3, fill: "#67308E" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MasterKpi({ icon, label, value, trend, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; trend?: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        accent
          ? "border-[color:var(--brand-soft-strong)] bg-[linear-gradient(160deg,var(--brand-soft),transparent)]"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span className="text-[#67308E]">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="font-display font-extrabold text-2xl sm:text-3xl mt-2">{value}</div>
      {trend && <div className="text-xs mt-2 text-[color:var(--brand-strong)] flex items-center gap-1.5"><TrendingUp className="size-3.5" />{trend}</div>}
    </div>
  );
}
