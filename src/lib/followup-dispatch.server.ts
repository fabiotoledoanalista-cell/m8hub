// Server-only: motor de disparo da cadência de follow-up, chamado pela rota de cron.

export async function runFollowupDispatch() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { evoSendText } = await import("@/lib/evolution.server");

  const results = { processados: 0, enviados: 0, concluidos: 0, cancelados: 0, erros: 0 };

  const { data: enrollments, error } = await supabaseAdmin
    .from("followup_enrollments")
    .select("id, company_id, numero, card_id, sequence_id, current_step, last_step_sent_at, created_at, created_by")
    .eq("status", "ativo");
  if (error) throw error;
  if (!enrollments || enrollments.length === 0) return results;

  for (const enr of enrollments as any[]) {
    results.processados++;
    try {
      // Card já resolvido (ganho/perda)? encerra a cadência.
      if (enr.card_id) {
        const { data: card } = await supabaseAdmin
          .from("crm_cards").select("stage_id").eq("id", enr.card_id).maybeSingle();
        if (card?.stage_id) {
          const { data: stage } = await supabaseAdmin
            .from("crm_stage").select("tipo").eq("id", card.stage_id).maybeSingle();
          if (stage?.tipo === "ganho" || stage?.tipo === "perda") {
            await supabaseAdmin.from("followup_enrollments")
              .update({ status: "cancelado", updated_at: new Date().toISOString() }).eq("id", enr.id);
            results.cancelados++;
            continue;
          }
        }
      }

      // Atendimento pausado (humano assumiu)? não avança, tenta de novo amanhã.
      const { data: pause } = await supabaseAdmin
        .from("contact_pause").select("pausado").eq("company_id", enr.company_id).eq("numero", enr.numero).maybeSingle();
      if (pause?.pausado) continue;

      const anchor = enr.last_step_sent_at ?? enr.created_at;

      // Lead respondeu desde a última etapa? encerra a cadência (reengajou sozinho).
      const { data: replied } = await supabaseAdmin
        .from("mensagens").select("id")
        .eq("company_id", enr.company_id).eq("numero", enr.numero)
        .eq("direcao", "entrada").gt("created_at", anchor)
        .limit(1).maybeSingle();
      if (replied) {
        await supabaseAdmin.from("followup_enrollments")
          .update({ status: "cancelado", updated_at: new Date().toISOString() }).eq("id", enr.id);
        results.cancelados++;
        continue;
      }

      const nextOrdem = enr.current_step + 1;
      const { data: step } = await supabaseAdmin
        .from("followup_steps").select("id, ordem, dias_silencio, mensagem")
        .eq("sequence_id", enr.sequence_id).eq("ordem", nextOrdem).maybeSingle();
      if (!step) {
        await supabaseAdmin.from("followup_enrollments")
          .update({ status: "concluido", updated_at: new Date().toISOString() }).eq("id", enr.id);
        results.concluidos++;
        continue;
      }

      const diasPassados = (Date.now() - new Date(anchor).getTime()) / 86400000;
      if (diasPassados < step.dias_silencio) continue;

      const { data: inst } = await supabaseAdmin
        .from("whatsapp_instances").select("instance_name, user_id").eq("company_id", enr.company_id).maybeSingle();
      if (!inst?.instance_name) { results.erros++; continue; }

      await evoSendText(inst.instance_name, enr.numero, step.mensagem);
      await supabaseAdmin.from("mensagens").insert({
        company_id: enr.company_id, user_id: enr.created_by ?? inst.user_id,
        numero: enr.numero, direcao: "saida", autor: "ia", texto: step.mensagem,
      });

      const { data: hasNext } = await supabaseAdmin
        .from("followup_steps").select("id").eq("sequence_id", enr.sequence_id).eq("ordem", nextOrdem + 1).maybeSingle();
      await supabaseAdmin.from("followup_enrollments").update({
        current_step: nextOrdem,
        last_step_sent_at: new Date().toISOString(),
        status: hasNext ? "ativo" : "concluido",
        updated_at: new Date().toISOString(),
      }).eq("id", enr.id);
      results.enviados++;
      if (!hasNext) results.concluidos++;
    } catch {
      results.erros++;
    }
  }

  return results;
}
