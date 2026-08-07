// SERVER ONLY. Resolve qual provedor/modelo de IA usar para uma empresa.
// Por enquanto so existe Anthropic (Claude) — cada empresa usa sua propria
// chave, configurada em Agente IA -> Modelo IA. Quando outros provedores
// forem reativados, este e o unico lugar que precisa mudar.
import type { AiProviderConfig } from "./lovable-ai.server";

export async function resolveAiProviderConfig(
  companyId: string,
  cfg: { ai_provider?: string | null; ai_model?: string | null; openai_api_key?: string | null; anthropic_api_key?: string | null } | null | undefined,
): Promise<AiProviderConfig> {
  void companyId;
  return {
    provider: "anthropic",
    model: cfg?.ai_model || "claude-sonnet-4-5",
    openaiKey: cfg?.openai_api_key || "",
    anthropicKey: cfg?.anthropic_api_key || "",
  };
}
