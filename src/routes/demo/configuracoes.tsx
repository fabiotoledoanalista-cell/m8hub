import { createFileRoute } from "@tanstack/react-router";
import { brand } from "@/config/brand";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Building2, Palette, CreditCard, Smartphone, CheckCircle2, Lock } from "lucide-react";

export const Route = createFileRoute("/demo/configuracoes")({
  head: () => ({ meta: [{ title: `${brand.name} — Configurações (demo)` }] }),
  component: ConfigDemo,
});

function ConfigDemo() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Configurações</h1>
        <p className="text-xs text-muted-foreground">Empresa, identidade, plano e conexão — exemplo.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Empresa" icon={<Building2 className="size-4" />}>
          <RO label="Nome da empresa" value="Padaria do Bairro" />
          <RO label="CNPJ" value="12.345.678/0001-00" />
          <div className="space-y-1.5"><Label>Endereço</Label><Textarea readOnly rows={2} value="Rua Domingos de Morais, 1234 — Vila Mariana — São Paulo/SP" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <RO label="Telefone" value="+55 11 99999-0000" />
            <RO label="E-mail" value="contato@padariadobairro.com" />
          </div>
        </Card>

        <Card title="Identidade visual" icon={<Palette className="size-4" />}>
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl grid place-items-center text-primary-foreground font-display font-extrabold text-2xl bg-gradient-brand">P</div>
            <div className="text-sm">
              <div className="font-semibold">Logo da empresa</div>
              <div className="text-xs text-muted-foreground">PNG ou JPG até 2MB</div>
            </div>
            <Button variant="outline" size="sm" disabled className="ml-auto">Trocar</Button>
          </div>
          <div className="space-y-1.5">
            <Label>Cor primária</Label>
            <div className="flex gap-2 items-center">
              <span className="size-10 rounded-xl ring-1 ring-border" style={{ background: "#22C55E" }} />
              <Input readOnly value="#22C55E" className="font-mono" />
            </div>
          </div>
          <RO label="Slug público" value="padaria-do-bairro" />
        </Card>

        <Card title="Plano e cobrança" icon={<CreditCard className="size-4" />}>
          <div className="rounded-xl border border-[var(--brand-soft-strong)] bg-[var(--brand-soft)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--brand-text)] font-bold">Plano atual</div>
                <div className="font-display font-extrabold text-xl mt-0.5">Pro · R$ 197/mês</div>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-[var(--brand)]/20 text-[var(--brand-text)] inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" />Ativo
              </span>
            </div>
            <ul className="mt-3 text-[12.5px] text-muted-foreground space-y-1">
              <li>• Conversas ilimitadas</li>
              <li>• Até 5 atendentes</li>
              <li>• Integração Google Agenda</li>
              <li>• Suporte prioritário</li>
            </ul>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <RO label="Próxima cobrança" value="15/07/2026" />
            <RO label="Método" value="Cartão final 4242" />
          </div>
          <Button variant="outline" disabled className="w-full">Gerenciar assinatura</Button>
        </Card>

        <Card title="Conexão WhatsApp" icon={<Smartphone className="size-4" />}>
          <div className="rounded-xl border border-border bg-muted p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-[var(--brand)]/20 text-[var(--brand-text)] grid place-items-center">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Conectado</div>
              <div className="text-[11px] text-muted-foreground font-mono">+55 11 99999-0000</div>
            </div>
            <Button variant="outline" size="sm" disabled>Desconectar</Button>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted p-3">
            <div>
              <div className="text-sm font-semibold">Receber notificações</div>
              <div className="text-[11px] text-muted-foreground">E-mail quando a IA escalar para humano</div>
            </div>
            <Switch checked disabled />
          </div>
          <RO label="Webhook URL" value="https://atende-zap-ai.lovable.app/api/public/whatsapp-webhook" />
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
        <Lock className="size-3" /> Demonstração — somente leitura.
      </p>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h3 className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--brand-text)] flex items-center gap-1.5">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

function RO({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input readOnly value={value} /></div>;
}
