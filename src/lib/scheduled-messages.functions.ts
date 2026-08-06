import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const listScheduledMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("company_id", companyId)
      .order("agendado_em", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const createScheduledMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    telefone: z.string().min(8),
    nome_contato: z.string().optional(),
    mensagem: z.string().min(1),
    agendado_em: z.string().datetime({ offset: true }).refine(
      v => new Date(v) > new Date(),
      { message: "A data deve ser no futuro" }
    ),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: row, error } = await supabase
      .from("scheduled_messages")
      .insert({ ...data, company_id: companyId, created_by: userId })
      .select("id").single();
    if (error) throw error;
    return row;
  });

export const cancelScheduledMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase
      .from("scheduled_messages")
      .update({ status: "cancelado" })
      .eq("id", data.id)
      .eq("company_id", companyId)
      .eq("status", "pendente");
    if (error) throw error;
    return { ok: true };
  });

export const deleteScheduledMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase
      .from("scheduled_messages").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const processPendingScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: instance } = await supabase
      .from("whatsapp_instances").select("instance_name,status").eq("company_id", companyId).maybeSingle();
    if (!instance || instance.status !== "connected") return { ok: false, msg: "WhatsApp não conectado" };

    const now = new Date().toISOString();
    const { data: pending } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "pendente")
      .lte("agendado_em", now);

    const { evoSendText } = await import("./evolution.server");
    let enviados = 0;
    for (const msg of pending ?? []) {
      try {
        await evoSendText(instance.instance_name, msg.telefone, msg.mensagem);
        await supabase.from("scheduled_messages").update({ status: "enviado", enviado_em: new Date().toISOString() }).eq("id", msg.id);
        enviados++;
      } catch (e: any) {
        await supabase.from("scheduled_messages").update({ status: "erro", erro_msg: e?.message }).eq("id", msg.id);
      }
    }
    return { ok: true, enviados };
  });
