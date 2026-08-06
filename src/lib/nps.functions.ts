import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const getNpsConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data } = await (supabase as any)
      .from("nps_config")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    return data ?? { ativo: false, mensagem: "Como você avalia seu atendimento de 1 a 10?", delay_minutos: 5 };
  });

export const saveNpsConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    ativo: z.boolean(),
    mensagem: z.string().min(1).max(500),
    delay_minutos: z.number().int().min(0).max(60 * 24),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: existing } = await (supabase as any)
      .from("nps_config").select("id").eq("company_id", companyId).maybeSingle();

    if (existing) {
      const { error } = await (supabase as any)
        .from("nps_config").update({ ...data }).eq("company_id", companyId);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from("nps_config").insert({ company_id: companyId, ...data });
      if (error) throw error;
    }
    return { ok: true };
  });

export const getNpsResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ start: z.string(), end: z.string() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: rows } = await (supabase as any)
      .from("atendimento_avaliacoes")
      .select("nota, respondido_em, card_id")
      .eq("company_id", companyId)
      .not("nota", "is", null)
      .gte("respondido_em", data.start)
      .lte("respondido_em", data.end);

    const notas = (rows ?? []).map((r: any) => r.nota as number);
    if (!notas.length) return { total: 0, media: null, nps: null, distribuicao: {} };

    const promotores = notas.filter((n) => n >= 9).length;
    const detratores = notas.filter((n) => n <= 6).length;
    const nps = Math.round(((promotores - detratores) / notas.length) * 100);
    const media = notas.reduce((a, b) => a + b, 0) / notas.length;

    const distribuicao: Record<number, number> = {};
    for (let i = 0; i <= 10; i++) distribuicao[i] = 0;
    notas.forEach((n) => { distribuicao[n] = (distribuicao[n] ?? 0) + 1; });

    return { total: notas.length, media, nps, distribuicao };
  });

export const getTmaTme = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ start: z.string(), end: z.string() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    // Cards fechados no período com created_at para calcular TMA
    const { data: cards } = await (supabase as any)
      .from("crm_cards")
      .select("id, owner_id, created_at, fechado_em")
      .eq("company_id", companyId)
      .not("fechado_em", "is", null)
      .gte("fechado_em", data.start)
      .lte("fechado_em", data.end);

    // Primeira mensagem de saída (humano) por número para calcular TME
    const { data: members } = await supabase
      .from("profiles")
      .select("user_id, nome, email")
      .eq("company_id", companyId);

    const memberMap = new Map<string, string>();
    (members ?? []).forEach((m: any) => {
      memberMap.set(m.user_id, m.nome || m.email || m.user_id.slice(0, 8));
    });

    // Agrupa TMA por atendente
    const tmaByOwner = new Map<string, number[]>();
    for (const card of (cards ?? []) as any[]) {
      if (!card.created_at || !card.fechado_em) continue;
      const tma = new Date(card.fechado_em).getTime() - new Date(card.created_at).getTime();
      if (tma <= 0) continue;
      const ownerId = card.owner_id ?? "__sem_dono";
      if (!tmaByOwner.has(ownerId)) tmaByOwner.set(ownerId, []);
      tmaByOwner.get(ownerId)!.push(tma);
    }

    const result: Array<{ nome: string; tma_min: number; total_fechados: number }> = [];
    for (const [ownerId, tmas] of tmaByOwner.entries()) {
      const media = tmas.reduce((a, b) => a + b, 0) / tmas.length;
      result.push({
        nome: ownerId === "__sem_dono" ? "Sem atendente" : (memberMap.get(ownerId) ?? ownerId.slice(0, 8)),
        tma_min: Math.round(media / 60_000),
        total_fechados: tmas.length,
      });
    }

    return result.sort((a, b) => a.tma_min - b.tma_min);
  });
