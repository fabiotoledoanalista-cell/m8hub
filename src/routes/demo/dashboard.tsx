import { createFileRoute } from "@tanstack/react-router";
import { brand } from "@/config/brand";
import { Bot, MessageCircle, Target, Trophy } from "lucide-react";
import { demoStats, demoMensagens } from "@/lib/demo-data";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MiniAreaChart, type AreaPoint } from "@/components/dashboard/mini-area-chart";
import { AgentStatusCard } from "@/components/dashboard/agent-status-card";
import { MessageTimeline } from "@/components/dashboard/message-timeline";

export const Route = createFileRoute("/demo/dashboard")({
  head: () => ({ meta: [{ title: `${brand.name} — Demonstração` }] }),
  component: DemoDashboard,
});

function DemoDashboard() {
  const series: AreaPoint[] = Array.from({ length: 14 }, (_, i) => ({
    label: String(i),
    a: 12 + Math.round(Math.sin(i * 0.6) * 6 + i * 0.8),
    b: 8 + Math.round(Math.sin(i * 0.7) * 5 + i * 0.6),
  }));
  const last = [...demoMensagens].sort((a, b) => +b.quando - +a.quando).slice(0, 8);
  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Demonstração — dados ilustrativos</p>
        </div>
        <div className="flex items-center gap-2 bg-[rgba(37,211,102,.12)] border border-[rgba(37,211,102,.30)] text-[#bff5d4] text-[12.5px] font-semibold px-3 py-1.5 rounded-full">
          <span className="size-2 rounded-full bg-[#00E676]" /> Agente conectado
        </div>
      </header>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard accent icon={<MessageCircle className="size-4" />} label="Conversas hoje" value={28} trend="+18% vs ontem" />
        <KpiCard icon={<Bot className="size-4" />} label="Respondidas pela IA" value={24} trend="86% no automático" />
        <KpiCard icon={<Target className="size-4" />} label="Em negociação" value={demoStats.negociando} trend="+3 esta semana" />
        <KpiCard icon={<Trophy className="size-4" />} label="Fechados (mês)" value="R$ 4.2k" trend="+32%" />
      </div>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-[15px] font-semibold">Atendimentos · 14 dias</h3>
          <p className="text-xs text-muted-foreground mb-3">recebidas vs respondidas pela IA</p>
          <MiniAreaChart data={series} />
        </div>
        <AgentStatusCard status="connected" numero="+55 11 99999-0000" tempoMedio="3,2s" taxaQualificacao="62%" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-[15px] font-semibold">Últimas mensagens</h3>
        <p className="text-xs text-muted-foreground mb-2">atividade recente</p>
        <MessageTimeline items={last.map((m) => ({ id: m.id, nome: m.nome, autor: m.autor, texto: m.texto, quando: m.quando }))} />
      </div>
    </div>
  );
}
