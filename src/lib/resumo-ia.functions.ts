import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const gerarResumoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ card_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: card } = await supabase
      .from("crm_cards")
      .select("id, numero, nome")
      .eq("id", data.card_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!card) throw new Error("Conversa não encontrada");

    const { data: cfg } = await supabase
      .from("agent_config")
      .select("ai_provider, ai_model, openai_api_key, anthropic_api_key")
      .eq("company_id", companyId)
      .maybeSingle();

    const { data: msgs } = await supabase
      .from("mensagens")
      .select("direcao, autor, texto, created_at")
      .eq("company_id", companyId)
      .eq("numero", card.numero)
      .order("created_at", { ascending: true })
      .limit(200);

    if (!msgs || msgs.length === 0) return { ok: true, resumo: null };

    const historico = (msgs as any[])
      .map((m) => {
        const quem = m.autor === "ia" ? "IA" : m.direcao === "saida" ? "Atendente" : "Cliente";
        return `${quem}: ${m.texto}`;
      })
      .join("\n");

    const { lovableAiChat } = await import("./lovable-ai.server");
    const { resolveAiProviderConfig } = await import("./ai-provider.server");
    const providerConfig = await resolveAiProviderConfig(companyId, cfg as any);

    const system = `Você é um assistente de CRM. Sua tarefa é gerar um RESUMO OBJETIVO de uma conversa de WhatsApp entre uma empresa e um cliente.

O resumo deve ter no máximo 3 parágrafos curtos:
1. **O que o cliente queria** — problema, interesse ou necessidade apresentada.
2. **O que foi tratado** — principais pontos discutidos, propostas, dúvidas esclarecidas.
3. **Resultado** — se houve venda, agendamento, sem interesse, ou pendência. Se não ficou claro, diga "Resultado não definido".

Seja direto, sem jargão. Escreva em português do Brasil. Não inclua saudações nem cabeçalhos.`;

    const user = `Resumo da conversa com ${card.nome ?? card.numero}:\n\n${historico.slice(0, 12000)}`;

    const resumo = await lovableAiChat(
      [{ role: "system", content: system }, { role: "user", content: user }],
      providerConfig,
    );

    await (supabase as any)
      .from("crm_cards")
      .update({ resumo_ia: resumo })
      .eq("id", data.card_id)
      .eq("company_id", companyId);

    return { ok: true, resumo };
  });
