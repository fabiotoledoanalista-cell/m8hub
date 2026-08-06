import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

function generateApiKey() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return "tgcrm_" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashKey(key: string) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(key));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("api_keys").select("id,nome,key_preview,ativo,last_used_at,created_at")
      .eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ nome: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);
    const keyPreview = rawKey.slice(0, 12) + "..." + rawKey.slice(-4);
    const { data: row, error } = await supabase
      .from("api_keys")
      .insert({ nome: data.nome, key_hash: keyHash, key_preview: keyPreview, company_id: companyId, created_by: userId })
      .select("id").single();
    if (error) throw error;
    return { id: row.id, key: rawKey, key_preview: keyPreview };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("api_keys").update({ ativo: false }).eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("api_keys").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

// ── Webhooks ──────────────────────────────────────────────────────────────────

export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("webhooks").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const upsertWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid().optional(),
    nome: z.string().min(1),
    url: z.string().url(),
    eventos: z.array(z.string()).min(1),
    ativo: z.boolean().default(true),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabase.from("webhooks").update(rest).eq("id", id).eq("company_id", companyId);
      if (error) throw error;
      return { id };
    }
    const { data: row, error } = await supabase
      .from("webhooks").insert({ ...rest, company_id: companyId, created_by: userId }).select("id").single();
    if (error) throw error;
    return row;
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("webhooks").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const listWebhookLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ webhook_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    // verifica ownership do webhook antes de retornar os logs
    const { data: wh } = await supabase
      .from("webhooks").select("id").eq("id", data.webhook_id).eq("company_id", companyId).single();
    if (!wh) throw new Error("Webhook não encontrado");

    const { data: logs, error } = await supabase
      .from("webhook_logs").select("*").eq("webhook_id", data.webhook_id)
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return logs ?? [];
  });
