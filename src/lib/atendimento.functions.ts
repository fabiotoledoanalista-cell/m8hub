import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const bulkCloseConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    numeros: z.array(z.string()).min(1),
    stage_id: z.string().uuid(),
    motivo: z.string().max(200).optional(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: stage } = await supabase
      .from("crm_stage").select("id,nome").eq("id", data.stage_id).eq("company_id", companyId).single();
    if (!stage) throw new Error("Etapa não encontrada");

    const updatePayload: Record<string, unknown> = {
      stage_id: data.stage_id,
      status: stage.nome,
      fechado_em: new Date().toISOString(),
    };
    if (data.motivo) updatePayload.motivo_fechamento = data.motivo;

    const { data: cards, error } = await supabase
      .from("crm_cards")
      .update(updatePayload)
      .eq("company_id", companyId)
      .in("numero", data.numeros)
      .select("id");
    if (error) throw error;

    if (cards && cards.length > 0) {
      const emLote = data.numeros.length > 1;
      const eventos = cards.map((c) => ({
        company_id: companyId, card_id: c.id, tipo: emLote ? "fechamento_lote" : "fechamento",
        descricao: emLote
          ? `Atendimento encerrado em lote → ${stage.nome}${data.motivo ? ` (${data.motivo})` : ""}`
          : `Atendimento encerrado → ${stage.nome}${data.motivo ? ` (${data.motivo})` : ""}`,
      }));
      await supabase.from("lead_evento").insert(eventos);
    }
    return { ok: true, total: cards?.length ?? 0 };
  });

export const distributeConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ numero: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: card } = await supabase
      .from("crm_cards").select("id,queue_id,owner_id").eq("company_id", companyId).eq("numero", data.numero).single();
    if (!card) throw new Error("Conversa não encontrada");
    if (!card.queue_id) throw new Error("Esta conversa não está em nenhuma fila");
    if (card.owner_id) throw new Error("Esta conversa já tem um atendente");

    const { data: memberRows } = await supabase.from("queue_members").select("user_id").eq("queue_id", card.queue_id);
    const memberIds = (memberRows ?? []).map((m) => m.user_id);
    if (memberIds.length === 0) throw new Error("Fila sem membros para distribuir");

    // round-robin simples: escolhe quem tem menos cards abertos (sem etapa de ganho/perda) nesta fila
    const { data: openCards } = await supabase
      .from("crm_cards").select("owner_id").eq("company_id", companyId).eq("queue_id", card.queue_id).not("owner_id", "is", null);
    const load = new Map<string, number>(memberIds.map((id) => [id, 0]));
    (openCards ?? []).forEach((c) => { if (c.owner_id && load.has(c.owner_id)) load.set(c.owner_id, (load.get(c.owner_id) ?? 0) + 1); });
    const chosen = memberIds.reduce((min, id) => ((load.get(id) ?? 0) < (load.get(min) ?? 0) ? id : min), memberIds[0]);

    const { error } = await supabase.from("crm_cards").update({ owner_id: chosen }).eq("id", card.id);
    if (error) throw error;

    const { data: profile } = await supabase.from("profiles").select("nome,email").eq("user_id", chosen).maybeSingle();
    await supabase.from("lead_evento").insert({
      company_id: companyId, card_id: card.id, tipo: "fila_distribuicao",
      descricao: `Distribuído automaticamente para ${profile?.nome ?? profile?.email ?? chosen.slice(0, 8)}`,
    });
    return { ok: true, owner_id: chosen };
  });

export const updateConversationTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ numero: z.string().min(1), tags: z.array(z.string().max(50)).max(20) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase
      .from("crm_cards").update({ tags: data.tags }).eq("numero", data.numero).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const transferConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ numero: z.string().min(1), owner_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: card } = await supabase
      .from("crm_cards").select("id").eq("numero", data.numero).eq("company_id", companyId).single();
    if (!card) throw new Error("Conversa não encontrada");
    const { error } = await supabase
      .from("crm_cards").update({ owner_id: data.owner_id }).eq("id", card.id);
    if (error) throw error;
    const { data: profile } = await supabase.from("profiles").select("nome,email").eq("user_id", data.owner_id).maybeSingle();
    await supabase.from("lead_evento").insert({
      company_id: companyId, card_id: card.id, tipo: "transferencia",
      descricao: `Transferido para ${profile?.nome ?? profile?.email ?? data.owner_id.slice(0, 8)}`,
    });
    return { ok: true };
  });

export const rateAtendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ card_id: z.string().uuid(), nota: z.number().int().min(1).max(5), comentario: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("atendimento_avaliacoes").insert({
      company_id: companyId, card_id: data.card_id, nota: data.nota,
      comentario: data.comentario ?? null, avaliado_por: userId,
    });
    if (error) throw error;
    return { ok: true };
  });
