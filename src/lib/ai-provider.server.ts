// SERVER ONLY. Resolve qual provedor/modelo de IA usar para uma empresa,
// respeitando a configuracao em agent_config e o plano contratado — mesma
// regra usada no webhook do WhatsApp, para o Copiloto e o Resumo IA nao
// divergirem do provedor escolhido (ex: empresa configurou Claude e ainda
// assim cai no Gemini em algum recurso).
import type { AiProviderConfig } from "./lovable-ai.server";

export async function resolveAiProviderConfig(
  companyId: string,
  cfg: { ai_provider?: string | null; ai_model?: string | null; openai_api_key?: string | null; anthropic_api_key?: string | null } | null | undefined,
): Promise<AiProviderConfig> {
  const { getCompanyPlan } = await import("./plan-limits.server");
  const { allowsProvider } = await import("./plan-features");

  let provider = cfg?.ai_provider || "gemini";
  let model = cfg?.ai_model || "gemini-2.0-flash";

  const plan = await getCompanyPlan(companyId);
  if (!allowsProvider(plan.slug, provider)) {
    provider = "gemini";
    model = "gemini-2.0-flash";
  }

  return {
    provider,
    model,
    openaiKey: cfg?.openai_api_key || "",
    anthropicKey: cfg?.anthropic_api_key || "",
  };
}
