import { createFileRoute } from "@tanstack/react-router";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload: any = await request.json().catch(() => ({}));
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { evoSendText, evoSendPresence, evoDownloadMedia } = await import("@/lib/evolution.server");
          const { lovableAiChat } = await import("@/lib/lovable-ai.server");
          const { buildSystemPrompt, parseAiOutput } = await import("@/lib/ai-prompt");

          const event: string | undefined = payload?.event;
          const instanceName: string | undefined =
            payload?.instance || payload?.instanceName || payload?.data?.instance;

          if (!instanceName) return new Response("ok", { status: 200 });
          if (event && event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
            return new Response("ignored", { status: 200 });
          }

          const data = payload?.data ?? payload;
          const key = data?.key ?? {};
          const fromMe: boolean = !!key.fromMe;
          const whatsappMessageId: string | null = typeof key.id === "string" && key.id.trim() ? key.id.trim() : null;
          const remoteJid: string = key.remoteJid || "";
          if (!remoteJid) return new Response("no jid", { status: 200 });
          if (remoteJid.endsWith("@g.us")) return new Response("group", { status: 200 });
          if (fromMe) return new Response("fromMe", { status: 200 });

          const number = remoteJid.split("@")[0];
          const pushName: string | undefined = data?.pushName;
          const msg = data?.message ?? {};
          let text: string =
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            "";

          // Transcrição de áudio via Whisper
          if (!text.trim() && msg.audioMessage && whatsappMessageId && instanceName) {
            text = await transcribeAudio(instanceName, whatsappMessageId) ?? "";
          }

          if (!text || !text.trim()) return new Response("no text", { status: 200 });

          const suppliedToken = new URL(request.url).searchParams.get("t") || request.headers.get("x-webhook-token") || "";
          const { data: inst } = await (supabaseAdmin as any)
            .from("whatsapp_instances")
            .select("company_id, user_id, instance_name, webhook_token")
            .eq("instance_name", instanceName)
            .maybeSingle();
          if (!inst) return new Response("unknown instance", { status: 200 });
          if (!suppliedToken || suppliedToken !== (inst as any).webhook_token) {
            return new Response("invalid webhook", { status: 401 });
          }
          const companyId = (inst as any).company_id as string;
          const userId = (inst as any).user_id as string;

          if (whatsappMessageId) {
            const { data: duplicate } = await (supabaseAdmin as any)
              .from("mensagens")
              .select("id")
              .eq("company_id", companyId)
              .eq("whatsapp_message_id", whatsappMessageId)
              .maybeSingle();
            if (duplicate) return new Response("duplicate", { status: 200 });
          }

          const insertedAt = new Date().toISOString();
          const { data: inserted } = await (supabaseAdmin as any)
            .from("mensagens")
            .insert({
              company_id: companyId,
              user_id: userId,
              numero: number,
              contato_nome: pushName ?? null,
              direcao: "entrada",
              autor: "contato",
              texto: text,
              whatsapp_message_id: whatsappMessageId,
              created_at: insertedAt,
            })
            .select("id, created_at")
            .maybeSingle();
          const myCreatedAt = inserted?.created_at || insertedAt;

          const { data: cfg } = await supabaseAdmin
            .from("agent_config")
            .select("*")
            .eq("company_id", companyId)
            .maybeSingle();

          const palavraPausar = (cfg?.palavra_pausar || "/pausar").toLowerCase().trim();
          const palavraDespausar = (cfg?.palavra_despausar || "/despausar").toLowerCase().trim();
          const lower = text.toLowerCase().trim();

          // Carrega etapas e produtos da company (uma vez)
          const [{ data: stagesRows }, { data: produtosRows }] = await Promise.all([
            supabaseAdmin
              .from("crm_stage")
              .select("id, nome, tipo, ordem")
              .eq("company_id", companyId)
              .order("ordem", { ascending: true }),
            supabaseAdmin
              .from("produto")
              .select("nome, preco, descricao, ativo, ordem")
              .eq("company_id", companyId)
              .eq("ativo", true)
              .order("ordem", { ascending: true }),
          ]);
          const stages = (stagesRows ?? []) as Array<{ id: string; nome: string; tipo: "normal" | "ganho" | "perda" }>;
          const produtos = (produtosRows ?? []).map((p: any) => ({
            nome: p.nome,
            preco: p.preco,
            descricao: p.descricao,
          }));

          // ── Captura resposta NPS ────────────────────────────────────────────
          {
            const nota = parseInt(text.trim(), 10);
            if (!isNaN(nota) && nota >= 0 && nota <= 10) {
              const { data: npsRow } = await (supabaseAdmin as any)
                .from("atendimento_avaliacoes")
                .select("id")
                .eq("company_id", companyId)
                .eq("numero", number)
                .is("nota", null)
                .is("respondido_em", null)
                .order("enviado_em", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (npsRow) {
                await (supabaseAdmin as any)
                  .from("atendimento_avaliacoes")
                  .update({ nota, respondido_em: new Date().toISOString() })
                  .eq("id", npsRow.id);
                await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
                return new Response("nps-captured", { status: 200 });
              }
            }
          }
          // ── fim NPS ─────────────────────────────────────────────────────────

          if (isOptOutMessage(lower)) {
            await supabaseAdmin
              .from("contact_pause")
              .upsert({ company_id: companyId, user_id: userId, numero: number, pausado: true }, { onConflict: "company_id,numero" });
            await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
            return new Response("opt-out", { status: 200 });
          }

          if (lower === palavraPausar) {
            await supabaseAdmin
              .from("contact_pause")
              .upsert({ company_id: companyId, user_id: userId, numero: number, pausado: true }, { onConflict: "company_id,numero" });
            return new Response("paused", { status: 200 });
          }
          if (lower === palavraDespausar) {
            await supabaseAdmin
              .from("contact_pause")
              .upsert({ company_id: companyId, user_id: userId, numero: number, pausado: false }, { onConflict: "company_id,numero" });
            return new Response("resumed", { status: 200 });
          }
          const { data: pauseRow } = await supabaseAdmin
            .from("contact_pause")
            .select("pausado")
            .eq("company_id", companyId)
            .eq("numero", number)
            .maybeSingle();
          if (pauseRow?.pausado) {
            await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
            return new Response("paused-contact", { status: 200 });
          }

          // ── Horário de funcionamento ──────────────────────────────────────────
          {
            const { data: cardBH } = await (supabaseAdmin as any)
              .from("crm_cards").select("queue_id").eq("company_id", companyId).eq("numero", number).maybeSingle();

            // Tenta horário da fila, depois horário padrão da empresa
            let bhRow: any = null;
            if (cardBH?.queue_id) {
              const { data } = await (supabaseAdmin as any)
                .from("business_hours").select("*").eq("company_id", companyId)
                .eq("queue_id", cardBH.queue_id).eq("ativo", true).maybeSingle();
              bhRow = data;
            }
            if (!bhRow) {
              const { data } = await (supabaseAdmin as any)
                .from("business_hours").select("*").eq("company_id", companyId)
                .is("queue_id", null).eq("ativo", true).maybeSingle();
              bhRow = data;
            }

            if (bhRow) {
              const { isWithinBusinessHours } = await import("@/lib/business-hours");
              const dentro = isWithinBusinessHours(bhRow.horarios ?? [], bhRow.fuso_horario ?? "America/Sao_Paulo");
              if (!dentro) {
                // Envia mensagem de fora do horário apenas se não enviou nos últimos 4h
                if (bhRow.mensagem_fora_horario) {
                  const { data: recentOut } = await (supabaseAdmin as any)
                    .from("mensagens").select("id").eq("company_id", companyId).eq("numero", number)
                    .eq("direcao", "saida").eq("texto", bhRow.mensagem_fora_horario)
                    .gte("created_at", new Date(Date.now() - 4 * 60 * 60_000).toISOString())
                    .limit(1);
                  if (!recentOut?.length) {
                    try {
                      await evoSendText(instanceName, number, bhRow.mensagem_fora_horario);
                      await (supabaseAdmin as any).from("mensagens").insert({
                        company_id: companyId, user_id: userId, numero: number,
                        contato_nome: pushName ?? null, direcao: "saida", autor: "ia",
                        texto: bhRow.mensagem_fora_horario,
                      });
                    } catch { /* não bloquear se WhatsApp falhar */ }
                  }
                }
                await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
                return new Response("fora-horario", { status: 200 });
              }
            }
          }
          // ── fim horário de funcionamento ──────────────────────────────────────

          const bufferSec = Math.max(0, Math.min(20, Number(cfg?.segundos_buffer ?? 8)));
          if (bufferSec > 0) {
            await new Promise((r) => setTimeout(r, bufferSec * 1000));
          }

          const { data: newer } = await supabaseAdmin
            .from("mensagens")
            .select("id, created_at")
            .eq("company_id", companyId)
            .eq("numero", number)
            .eq("direcao", "entrada")
            .gt("created_at", myCreatedAt)
            .limit(1);
          if (newer && newer.length > 0) {
            await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
            return new Response("superseded", { status: 200 });
          }

          const { data: humanRecent } = await supabaseAdmin
            .from("mensagens")
            .select("id, created_at, autor")
            .eq("company_id", companyId)
            .eq("numero", number)
            .eq("direcao", "saida")
            .eq("autor", "humano")
            .gte("created_at", new Date(Date.now() - 90_000).toISOString())
            .limit(1);
          if (humanRecent && humanRecent.length > 0) {
            await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
            return new Response("human-active", { status: 200 });
          }

          const { data: histDesc } = await supabaseAdmin
            .from("mensagens")
            .select("autor,direcao,texto,created_at")
            .eq("company_id", companyId)
            .eq("numero", number)
            .order("created_at", { ascending: false })
            .limit(25);
          const historico = (histDesc ?? []).slice().reverse();

          const { data: cardRow } = await supabaseAdmin
            .from("crm_cards")
            .select("status, nome, stage_id")
            .eq("company_id", companyId)
            .eq("numero", number)
            .maybeSingle();
          const estagioAtual = cardRow?.status || stages[0]?.nome || "Conversas";
          const resumoContato = `${cardRow?.nome || pushName || "Contato"} (${number}), ${historico.length} mensagens trocadas`;

          const { data: googleIntegration } = await supabaseAdmin
            .from("google_integration")
            .select("conectado")
            .eq("company_id", companyId)
            .maybeSingle();

          const responderEmPartes = cfg?.responder_em_partes ?? true;
          const system = buildSystemPrompt(cfg ?? {}, {
            responderEmPartes,
            estagioAtual,
            resumoContato,
            produtos,
            stages: stages.map((s) => ({ nome: s.nome, tipo: s.tipo })),
            googleConectado: !!googleIntegration?.conectado,
          });

          const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: system },
            ...historico.map((m) => ({
              role: (m.direcao === "entrada" ? "user" : "assistant") as "user" | "assistant",
              content: m.texto,
            })),
          ];
          if (!messages.length || messages[messages.length - 1].role !== "user") {
            messages.push({ role: "user", content: text });
          }

          // Enforcement de plano: bloqueia IA quando estourar mensagens do mês.
          const { isWithinLimit } = await import("@/lib/plan-limits.server");
          const withinMsgs = await isWithinLimit(companyId, "mensagens");
          if (!withinMsgs) {
            await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
            console.warn("[plan] limite de mensagens atingido — IA não respondeu", companyId);
            return new Response("limit", { status: 200 });
          }
          const throttleReason = await getAiThrottleReason(supabaseAdmin, companyId, number);
          if (throttleReason) {
            await upsertCard(supabaseAdmin, companyId, userId, number, pushName, text, stages);
            console.warn("[whatsapp.safety] resposta pausada", throttleReason, companyId, number);
            return new Response(throttleReason, { status: 200 });
          }
          const { resolveAiProviderConfig } = await import("@/lib/ai-provider.server");
          const providerConfig = await resolveAiProviderConfig(companyId, cfg as any);

          let rawReply = "";
          try {
            rawReply = await lovableAiChat(messages, providerConfig);
          } catch (e: any) {
            console.error("[ai]", e?.message);
          }

          const { parts, stage, agendar } = parseAiOutput(rawReply, stages.map((s) => ({ nome: s.nome, tipo: s.tipo })));
          const finalParts = sanitizeAiParts(responderEmPartes ? parts : [parts.join(" ")]);

          // Cria evento no Google Agenda se a IA marcou [AGENDAR: ...]
          if (agendar && googleIntegration?.conectado) {
            try {
              const { createCalendarEventForCompany } = await import("@/lib/google.server");
              await createCalendarEventForCompany(supabaseAdmin, companyId, {
                titulo: agendar.titulo,
                inicio: agendar.inicio,
                fim: agendar.fim,
                descricao: `Agendado via WhatsApp — ${pushName || number}`,
              });
            } catch (e: any) {
              console.error("[agendar]", e?.message);
            }
          }

          for (let i = 0; i < finalParts.length; i++) {
            const part = finalParts[i];
            if (!part) continue;
            try {
              const typingMs = Math.min(3000, 1200 + Math.floor(part.length * 35));
              await evoSendPresence(instanceName, number, "composing", typingMs);
              await new Promise((r) => setTimeout(r, typingMs));
              await evoSendText(instanceName, number, part);
              await supabaseAdmin.from("mensagens").insert({
                company_id: companyId,
                user_id: userId,
                numero: number,
                contato_nome: pushName ?? null,
                direcao: "saida",
                autor: "ia",
                texto: part,
              });
              if (i < finalParts.length - 1) {
                await new Promise((r) => setTimeout(r, 700 + Math.floor(Math.random() * 800)));
              }
            } catch (e: any) {
              console.error("[send]", e?.message);
            }
          }

          await upsertCard(
            supabaseAdmin,
            companyId,
            userId,
            number,
            pushName,
            finalParts[finalParts.length - 1] || text,
            stages,
            stage,
          );

          // ── Round-robin automático ────────────────────────────────────────
          try {
            const { data: cardForRR } = await supabaseAdmin
              .from("crm_cards")
              .select("id, owner_id, queue_id")
              .eq("company_id", companyId)
              .eq("numero", number)
              .maybeSingle();

            if (cardForRR && !cardForRR.owner_id && cardForRR.queue_id) {
              const { data: queue } = await (supabaseAdmin as any)
                .from("queues")
                .select("auto_distribuir")
                .eq("id", cardForRR.queue_id)
                .maybeSingle();

              if (queue?.auto_distribuir) {
                const { data: memberRows } = await supabaseAdmin
                  .from("queue_members")
                  .select("user_id")
                  .eq("queue_id", cardForRR.queue_id);
                const memberIds = (memberRows ?? []).map((m: any) => m.user_id);

                if (memberIds.length > 0) {
                  const { data: openCards } = await supabaseAdmin
                    .from("crm_cards")
                    .select("owner_id")
                    .eq("company_id", companyId)
                    .eq("queue_id", cardForRR.queue_id)
                    .not("owner_id", "is", null);

                  const load = new Map<string, number>(memberIds.map((id: string) => [id, 0]));
                  (openCards ?? []).forEach((c: any) => {
                    if (c.owner_id && load.has(c.owner_id)) load.set(c.owner_id, (load.get(c.owner_id) ?? 0) + 1);
                  });
                  const chosen = memberIds.reduce((min: string, id: string) => ((load.get(id) ?? 0) < (load.get(min) ?? 0) ? id : min), memberIds[0]);

                  await supabaseAdmin.from("crm_cards").update({ owner_id: chosen }).eq("id", cardForRR.id);
                  await supabaseAdmin.from("lead_evento").insert({
                    company_id: companyId, card_id: cardForRR.id, tipo: "fila_distribuicao",
                    descricao: "Distribuído automaticamente (round-robin)",
                  });
                }
              }
            }
          } catch (rrErr: any) {
            console.warn("[round-robin]", rrErr?.message);
          }
          // ── fim round-robin ───────────────────────────────────────────────

          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("[webhook]", e?.message, e?.stack);
          return new Response("error", { status: 200 });
        }
      },
      GET: async () => new Response(`${brand.name} webhook online`, { status: 200 }),
    },
  },
});

async function transcribeAudio(instanceName: string, messageId: string): Promise<string | null> {
  try {
    const { evoDownloadMedia } = await import("@/lib/evolution.server");
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) { console.error("[whisper] OPENAI_API_KEY não configurada"); return null; }

    const media = await evoDownloadMedia(instanceName, messageId);
    if (!media?.base64) { console.error("[whisper] evoDownloadMedia retornou vazio para", messageId); return null; }

    const audioBuffer = Buffer.from(media.base64, "base64");
    const ext = media.mimetype?.includes("ogg") ? "ogg" : media.mimetype?.includes("mp4") ? "mp4" : "ogg";
    console.log("[whisper] transcrevendo audio", ext, audioBuffer.length, "bytes");

    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: media.mimetype || "audio/ogg" }), `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("language", "pt");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!res.ok) { const t = await res.text(); console.error("[whisper] erro API", res.status, t); return null; }
    const result = await res.json();
    console.log("[whisper] transcrição:", result?.text);
    return result?.text?.trim() || null;
  } catch (e: any) {
    console.error("[whisper]", e?.message);
    return null;
  }
}

const OPT_OUT_WORDS = ["parar", "pare", "cancelar", "sair", "remover", "descadastrar", "stop", "unsubscribe"];

function isOptOutMessage(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return OPT_OUT_WORDS.some((word) => normalized === word || normalized.includes(` ${word} `));
}

function sanitizeAiParts(parts: string[]) {
  return parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((part) => (part.length > 700 ? `${part.slice(0, 697).trim()}...` : part))
    .slice(0, 2);
}

async function getAiThrottleReason(admin: any, companyId: string, numero: string): Promise<string | null> {
  const now = Date.now();
  const [contactRecent, companyRecent] = await Promise.all([
    admin
      .from("mensagens")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("numero", numero)
      .eq("direcao", "saida")
      .eq("autor", "ia")
      .gte("created_at", new Date(now - 10 * 60_000).toISOString()),
    admin
      .from("mensagens")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("direcao", "saida")
      .eq("autor", "ia")
      .gte("created_at", new Date(now - 60_000).toISOString()),
  ]);

  if ((contactRecent.count ?? 0) >= 20) return "contact-rate-limit";
  if ((companyRecent.count ?? 0) >= 60) return "company-rate-limit";
  return null;
}

async function upsertCard(
  admin: any,
  companyId: string,
  userId: string,
  numero: string,
  nome: string | undefined,
  ultimaMensagem: string,
  stages: Array<{ id: string; nome: string; tipo: "normal" | "ganho" | "perda" }>,
  proposedStageName?: string | null,
) {
  const { data: existing } = await admin
    .from("crm_cards")
    .select("status, nome, stage_id")
    .eq("company_id", companyId)
    .eq("numero", numero)
    .maybeSingle();

  const stageByName = new Map(stages.map((s) => [s.nome.toLowerCase(), s]));
  const stageById = new Map(stages.map((s) => [s.id, s]));

  const currentStage = existing?.stage_id ? stageById.get(existing.stage_id) : undefined;
  const currentTipo = currentStage?.tipo ?? (existing?.status ? stageByName.get(String(existing.status).toLowerCase())?.tipo : undefined);
  const isLocked = currentTipo === "ganho" || currentTipo === "perda";

  const proposed = proposedStageName ? stageByName.get(proposedStageName.toLowerCase()) : undefined;

  let finalStage = currentStage;
  if (proposed && !isLocked) finalStage = proposed;
  if (!finalStage) finalStage = stages[0]; // fallback

  const payload: any = {
    company_id: companyId,
    user_id: userId,
    numero,
    nome: existing?.nome || nome || null,
    ultima_mensagem: ultimaMensagem.slice(0, 240),
    ultima_em: new Date().toISOString(),
  };
  if (finalStage) {
    payload.stage_id = finalStage.id;
    payload.status = finalStage.nome;
  } else if (existing?.status) {
    payload.status = existing.status;
  } else {
    payload.status = "Conversas";
  }

  await admin
    .from("crm_cards")
    .upsert(payload, { onConflict: "company_id,numero" });
}
