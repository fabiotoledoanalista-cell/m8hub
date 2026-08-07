// Chat de IA. Por enquanto, somente Anthropic (Claude) está habilitado —
// Gemini e OpenAI foram desligados temporariamente durante a fase de
// validação. A empresa usa sua própria chave da Anthropic.

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiProviderConfig {
  provider?: "anthropic" | string;
  model?: string;
  openaiKey?: string;
  anthropicKey?: string;
}

export async function lovableAiChat(
  messages: ChatMsg[],
  modelOrConfig: string | AiProviderConfig = "claude-sonnet-4-5",
): Promise<string> {
  const cfg: AiProviderConfig =
    typeof modelOrConfig === "string"
      ? { provider: "anthropic", model: modelOrConfig }
      : modelOrConfig;

  const key = cfg.anthropicKey?.trim();
  if (!key) throw new Error("Chave Anthropic (Claude) não configurada na sua empresa.");
  const model = cfg.model || "claude-sonnet-4-5";
  return anthropicChat(key, model, messages);
}

async function anthropicChat(key: string, model: string, messages: ChatMsg[]): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const conv = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: conv }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const txt = (data?.content || [])
    .filter((p: any) => p?.type === "text")
    .map((p: any) => p.text)
    .join("\n")
    .trim();
  return txt;
}
