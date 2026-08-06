export interface HorarioSlot {
  dia: number;    // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  inicio: string; // "09:00"
  fim: string;    // "18:00"
}

/**
 * Retorna true se o horário atual (no fuso dado) está dentro de algum slot configurado.
 * Retorna true por padrão quando horarios está vazio ou fuso é inválido (fail-open).
 */
export function isWithinBusinessHours(
  horarios: HorarioSlot[],
  fusoHorario: string,
): boolean {
  if (!horarios || horarios.length === 0) return true;
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: fusoHorario,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dia = weekdayMap[parts.weekday] ?? 0;
    const h = parseInt(parts.hour === "24" ? "0" : parts.hour);
    const m = parseInt(parts.minute);
    const nowMin = h * 60 + m;

    return horarios.some((slot) => {
      if (slot.dia !== dia) return false;
      const [ih, im] = slot.inicio.split(":").map(Number);
      const [fh, fm] = slot.fim.split(":").map(Number);
      return nowMin >= ih * 60 + im && nowMin < fh * 60 + fm;
    });
  } catch {
    return true; // fuso inválido → assume dentro do horário
  }
}
