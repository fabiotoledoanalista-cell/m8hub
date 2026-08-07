import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

type Tone = "purple" | "orange" | "lilac" | "peach";

const TONES: Record<Tone, { border: string; bg: string; iconBg: string; iconFg: string; trend: string }> = {
  purple: {
    border: "border-[rgba(103,48,142,.38)]",
    bg: "bg-[linear-gradient(160deg,rgba(103,48,142,.18),rgba(103,48,142,.03))]",
    iconBg: "bg-[#67308E]",
    iconFg: "text-white",
    trend: "text-[#67308E]",
  },
  orange: {
    border: "border-[rgba(255,121,34,.42)]",
    bg: "bg-[linear-gradient(160deg,rgba(255,121,34,.20),rgba(255,121,34,.04))]",
    iconBg: "bg-[#FF7922]",
    iconFg: "text-white",
    trend: "text-[#C2570F]",
  },
  lilac: {
    border: "border-[rgba(155,109,196,.42)]",
    bg: "bg-[linear-gradient(160deg,rgba(155,109,196,.20),rgba(155,109,196,.03))]",
    iconBg: "bg-[#9B6DC4]",
    iconFg: "text-white",
    trend: "text-[#8C56B5]",
  },
  peach: {
    border: "border-[rgba(255,159,90,.44)]",
    bg: "bg-[linear-gradient(160deg,rgba(255,159,90,.22),rgba(255,159,90,.04))]",
    iconBg: "bg-[#FF9F5A]",
    iconFg: "text-white",
    trend: "text-[#D9740A]",
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
        <span className={cn(
          "grid place-items-center rounded-lg size-7 shrink-0",
          colored ? cn(t.iconBg, t.iconFg) : "bg-[var(--brand-soft)] text-[var(--brand-strong)]",
        )}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="font-display font-extrabold mt-3 tracking-tight leading-none" style={{ fontSize: 38 }}>
        {value}
      </div>
      {trend && (
        <div className={cn("text-[13px] mt-3 flex items-center gap-1.5 font-semibold", colored ? t.trend : "text-[var(--brand-strong)]")}>
          <TrendingUp className="size-3.5" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
