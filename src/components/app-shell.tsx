import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pingPresenca } from "@/lib/supervisao.functions";
import {
  LayoutDashboard, Bot, KanbanSquare, LogOut, Smartphone, Shield,
  Inbox, Users, BarChart3, Settings, Contact, Zap, MessageCircle,
  Megaphone, Clock, Workflow, Globe, ListFilter, MessageSquareText, Repeat2, Activity, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brand, supportWhatsappUrl, supportWhatsappDisplay } from "@/config/brand";
import { deriveBrandTokens } from "@/lib/color-utils";
import { TrialBanner } from "@/components/trial-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileBottomNav, type MobileNavItem } from "@/components/mobile-bottom-nav";
import { toast } from "sonner";
import type { CompanyRow, Membership } from "@/lib/tenant";
import { useWhatsappStatus } from "@/hooks/use-whatsapp-status";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  supervisorOk?: boolean;
  superAdminOnly?: boolean;
  hideForAtendente?: boolean;
  tag?: string;
  badge?: boolean;
};

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Atendimento",
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/conversas", label: "Conversas", icon: Inbox, badge: true },
      { to: "/app/crm", label: "CRM Kanban", icon: KanbanSquare },
      { to: "/app/agente", label: "Agente IA", icon: Bot, tag: "IA", adminOnly: true },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/app/campanhas", label: "Campanhas", icon: Megaphone, adminOnly: true },
      { to: "/app/agendadas", label: "Agendadas", icon: Clock, hideForAtendente: true },
      { to: "/app/followup", label: "Cadências", icon: Repeat2, adminOnly: true, superAdminOnly: true, tag: "NOVO" },
      { to: "/app/flows", label: "Flow Builder", icon: Workflow, adminOnly: true, superAdminOnly: true, tag: "NOVO" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/app/contatos", label: "Contatos", icon: Contact },
      { to: "/app/filas", label: "Filas", icon: ListFilter, adminOnly: true },
      { to: "/app/respostas-rapidas", label: "Respostas Rápidas", icon: MessageSquareText, hideForAtendente: true },
      { to: "/app/supervisao", label: "Supervisão", icon: Activity, adminOnly: true, supervisorOk: true },
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true, supervisorOk: true },
      { to: "/app/conexao", label: "Conexão", icon: Smartphone, hideForAtendente: true },
      { to: "/app/equipe", label: "Equipe", icon: Users, adminOnly: true, supervisorOk: true },
      { to: "/app/integracao", label: "Integrações", icon: Globe, adminOnly: true },
      { to: "/app/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
      { to: "/app/manual", label: "Manual do Sistema", icon: BookOpen, adminOnly: true },
    ],
  },
];

export function AppShell({
  children,
  company,
  membership,
  email,
  nome,
  isSuperAdmin,
}: {
  children: ReactNode;
  company: CompanyRow | null;
  membership?: Membership | null;
  email?: string | null;
  nome?: string | null;
  isSuperAdmin?: boolean;
}) {
  const loc = useLocation();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/entrar", search: { modo: "login" }, replace: true });
  }

  const pingFn = useServerFn(pingPresenca);
  useEffect(() => {
    void pingFn({});
    const interval = setInterval(() => void pingFn({}).catch(() => {}), 60_000);
    return () => clearInterval(interval);
  }, []);

  const primary = company?.primary_color || brand.primary;
  const tokens = deriveBrandTokens(primary);
  const displayName = company?.nome_fantasia || company?.nome || brand.name;
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const isSupervisor = membership?.role === "supervisor";
  const isAtendente = membership?.role === "atendente";
  const roleLabel =
    membership?.role === "owner" ? "Dono"
    : membership?.role === "admin" ? "Admin"
    : membership?.role === "supervisor" ? "Gestor"
    : membership?.role === "atendente" ? "Colaborador"
    : "Membro";
  const userName = nome || (email || "Você").split("@")[0];

  const mobileItems: MobileNavItem[] = [
    { to: "/app/dashboard", label: "Início", icon: LayoutDashboard },
    { to: "/app/conversas", label: "Conversas", icon: Inbox },
    { to: "/app/crm", label: "CRM", icon: KanbanSquare },
    { to: "/app/contatos", label: "Contatos", icon: Contact },
    ...(isAdmin
      ? [{ to: "/app/agente", label: "Agente", icon: Bot }]
      : isAtendente
        ? []
        : [{ to: "/app/conexao", label: "Conexão", icon: Smartphone }]),
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground"
      style={{
        ["--brand" as any]: tokens.brand,
        ["--brand-strong" as any]: tokens.brandStrong,
        ["--brand-soft" as any]: tokens.brandSoft,
        ["--brand-soft-strong" as any]: tokens.brandSoftStrong,
        ["--brand-text" as any]: tokens.brandText,
        ["--primary" as any]: tokens.brand,
        ["--primary-foreground" as any]: tokens.primaryForeground,
        ["--sidebar-primary" as any]: tokens.brand,
        ["--ring" as any]: tokens.brand,
      }}
    >
      {company && <TrialBanner company={company} />}

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-[color:var(--panel)]/80 backdrop-blur-xl border-b border-[color:var(--hairline)]">
        <div className="flex items-center gap-2.5 min-w-0">
          {company?.logo_url && (
            <img src={company.logo_url} alt={company.nome} className="size-8 rounded-lg object-cover ring-1 ring-[color:var(--hairline)]" />
          )}
          <div className="min-w-0">
            <div className="font-display font-bold tracking-tight text-[14.5px] leading-none truncate">{displayName}</div>
            <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">CRM</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <button
            onClick={signOut}
            title="Sair"
            className="size-9 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar
          loc={loc}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          isAtendente={isAtendente}
          primary={primary}
          displayName={displayName}
          userName={userName}
          roleLabel={roleLabel}
        />
        <main className="flex-1 px-4 pt-4 pb-28 md:p-8 md:pb-8 max-w-7xl w-full mx-auto">
          <div className="hidden md:flex items-center justify-between gap-3 mb-6">
            <WhatsappStatusPill />
            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />
              <div
                className="size-9 rounded-full grid place-items-center text-[13px] font-bold text-[color:var(--brand-text)] ring-1 ring-[color:var(--hairline-strong)]"
                style={{ background: "var(--brand-soft)" }}
                title={email || ""}
              >
                {(userName || "U").slice(0, 1).toUpperCase()}
              </div>
              <button
                onClick={signOut}
                title="Sair"
                className="size-9 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
          {children}
        </main>
      </div>

      <MobileBottomNav items={mobileItems} accent={primary} />
    </div>
  );
}

function Sidebar({
  loc, isSuperAdmin, isAdmin, isSupervisor, isAtendente, primary, displayName, userName, roleLabel,
}: any) {
  return (
    <aside className="hidden md:flex w-[260px] min-h-screen border-r border-[color:var(--hairline)] bg-[color:var(--sidebar-bg)] flex-col">
      <div className="px-5 py-4 border-b border-[color:var(--hairline)]">
        <div className="font-display font-extrabold tracking-tight text-[17px] leading-tight truncate">{displayName}</div>
        <div className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">CRM</div>
      </div>
      <div className="px-5 py-4 border-b border-[color:var(--hairline)]">
        <div className="text-[14px] font-semibold text-foreground truncate">{userName}</div>
        <div className="text-[12px] text-muted-foreground truncate">{roleLabel}</div>
      </div>

      <nav className="p-3 flex-1 overflow-y-auto space-y-5">
        {sections.map((sec) => {
          const visibleItems = sec.items
            .filter((i) => !i.superAdminOnly || isSuperAdmin)
            .filter((i) => !i.adminOnly || isAdmin || (isSupervisor && i.supervisorOk))
            .filter((i) => !i.hideForAtendente || !isAtendente);
          if (visibleItems.length === 0) return null;
          return (
          <div key={sec.label}>
            <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              {sec.label}
            </div>
            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => (
                <NavLink key={item.to} item={item} active={loc.pathname.startsWith(item.to)} primary={primary} />
              ))}
            </div>
          </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[color:var(--hairline)]">
        {isSuperAdmin && (
          <Link to="/master/painel" className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-destructive hover:bg-[color:var(--panel-2)]">
            <Shield className="size-4" /> Painel Master
          </Link>
        )}
        <a
          href={supportWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="size-3" />
          <span>Suporte: {supportWhatsappDisplay}</span>
        </a>
        <div className="mt-2 px-2 text-[10px] text-muted-foreground/60">Desenvolvido por ToledoTech Digital</div>
      </div>
    </aside>
  );
}

function NavLink({ item, active, primary }: { item: NavItem; active: boolean; primary: string }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`relative flex items-center gap-3 px-3 py-[11px] rounded-lg text-[14.5px] font-medium whitespace-nowrap transition-all ${
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]"
      }`}
      style={
        active
          ? {
              background: "var(--brand-soft)",
              boxShadow: `inset 0 0 0 1px var(--brand-soft-strong), 0 0 22px -10px ${primary}`,
            }
          : undefined
      }
    >
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
          style={{ background: primary, boxShadow: `0 0 12px ${primary}` }}
        />
      )}
      <Icon className="size-[18px] shrink-0" style={active ? { color: primary } : undefined} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.tag && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded ring-1"
          style={{
            background: "var(--orange-soft)",
            color: "var(--orange-text)",
            borderColor: "var(--orange-soft-strong)",
          }}
        >
          {item.tag}
        </span>
      )}
    </Link>
  );
}

function WhatsappStatusPill() {
  const status = useWhatsappStatus();
  const connected = status === "connected";
  const connecting = status === "connecting";
  const label = connected ? "WhatsApp conectado" : connecting ? "Conectando…" : "WhatsApp desconectado";
  const color = connected ? "#16a34a" : connecting ? "#f59e0b" : "#dc2626";
  return (
    <div
      className="flex items-center gap-2 text-[13.5px] font-medium px-3 py-1.5 rounded-full bg-[color:var(--panel)] border border-[color:var(--hairline)]"
      style={{ color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      {label}
    </div>
  );
}

