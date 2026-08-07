import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

type Tone = "purple" | "orange" | "blue" | "green";

const TONES: Record<Tone, { border: string; bg: string; icon: string; trend: string }> = {
  purple: {
    border: "border-[rgba(103,48,142,.28)]",
    bg: "bg-[linear-gradient(160deg,rgba(103,48,142,.12),rgba(103,48,142,.02))]",
    icon: "text-[#67308E]",
    trend: "text-[#67308E]",
  },
  orange: {
    border: "border-[rgba(255,121,34,.32)]",
    bg: "bg-[linear-gradient(160deg,rgba(255,121,34,.14),rgba(255,121,34,.02))]",
    icon: "text-[#C2570F]",
    trend: "text-[#C2570F]",
  },
  blue: {
    border: "border-[rgba(59,130,246,.28)]",
    bg: "bg-[linear-gradient(160deg,rgba(59,130,246,.12),rgba(59,130,246,.02))]",
    icon: "text-[#2563EB]",
    trend: "text-[#2563EB]",
  },
  green: {
    border: "border-[rgba(22,163,74,.28)]",
    bg: "bg-[linear-gradient(160deg,rgba(22,163,74,.12),rgba(22,163,74,.02))]",
    icon: "text-[#15803D]",
    trend: "text-[#15803D]",
  },
};

export function KpiCard({
  icon, label, value, trend, tone, accent, className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  tone?: Tone;
  /** @deprecated use tone="purple" */
  accent?: boolean;
  className?: string;
}) {
  const colored = !!tone || !!accent;
  const t = TONES[tone ?? "purple"];
  return (
    <div
      className={cn(
        "rounded-2xl border p-6",
        colored ? cn(t.border, t.bg) : "border-border bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[14px] font-medium text-foreground/80">
        <span className={cn("grid place-items-center", colored ? t.icon : "text-[var(--brand-strong)]")}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="font-display font-extrabold mt-3 tracking-tight leading-none" style={{ fontSize: 38 }}>
        {value}
      </div>
      {trend && (
        <div className={cn("text-[13px] mt-3 flex items-center gap-1.5 font-medium", colored ? t.trend : "text-[var(--brand-strong)]")}>
          <TrendingUp className="size-3.5" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
