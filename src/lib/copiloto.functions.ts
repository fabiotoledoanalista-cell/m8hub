import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const sugerirResposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    card_id: z.string().uuid(),
    rascunho: z.string().optional(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    // Card + dados do lead para contexto
    const { data: card } = await supabase
      .from("crm_cards")
      .select("numero, nome, observacao, valor, origem")
      .eq("id", data.card_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!card) throw new Error("Conversa não encontrada");

    // Últimas 30 mensagens
    const { data: msgs } = await supabase
      .from("mensagens")
      .select("direcao, autor, texto, created_at")
      .eq("company_id", companyId)
      .eq("numero", card.numero)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!msgs || msgs.length === 0) throw new Error("Sem histórico de mensagens");

    const historico = [...msgs]
      .reverse()
      .map((m: any) => {
        const quem = m.autor === "ia" ? "Assistente" : m.direcao === "saida" ? "Atendente" : "Cliente";
        return `${quem}: ${m.texto}`;
      })
      .join("\n");

    // Config do agente da empresa
    const { data: cfg } = await supabase
      .from("agent_config")
      .select("system_prompt, nome_agente")
      .eq("company_id", companyId)
      .maybeSingle();

    const contextoLead = [
      card.nome && `Nome: ${card.nome}`,
      card.observacao && `Observação: ${card.observacao}`,
      card.valor && `Valor: R$ ${card.valor}`,
    ].filter(Boolean).join(" | ");

    const rascunhoHint = data.rascunho?.trim()
      ? `\n\nO atendente começou a digitar: "${data.rascunho.trim()}". Complete ou melhore essa resposta.`
      : "";

    const { lovableAiChat } = await import("./lovable-ai.server");

    const system = `Você é um copiloto de atendimento ao cliente via WhatsApp.
${cfg?.system_prompt ? `Contexto do negócio:\n${cfg.system_prompt}\n` : ""}
Sua tarefa é sugerir a PRÓXIMA MENSAGEM que o atendente humano deve enviar ao cliente.

Regras:
- Responda APENAS com o texto da mensagem sugerida, sem aspas, sem explicações, sem prefixo
- Tom: cordial, direto, comercial — igual ao que o atendente vem usando na conversa
- Máximo 3 frases; seja objetivo
- Português do Brasil natural, não formal demais
- Se o cliente fez uma pergunta, responda-a; se não, avance o atendimento`;

    const user = `Conversa com o cliente${contextoLead ? ` (${contextoLead})` : ""}:\n\n${historico.slice(-4000)}${rascunhoHint}`;

    const sugestao = await lovableAiChat(
      [{ role: "system", content: system }, { role: "user", content: user }],
      { provider: "gemini", model: "gemini-2.0-flash" },
    );

    return { sugestao: sugestao.replace(/^["']|["']$/g, "").trim() };
  });
