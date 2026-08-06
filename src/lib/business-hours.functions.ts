import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

const horarioSlotSchema = z.object({
  dia: z.number().int().min(0).max(6),
  inicio: z.string().regex(/^\d{2}:\d{2}$/),
  fim: z.string().regex(/^\d{2}:\d{2}$/),
});

export const getBusinessHoursForQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ queue_id: z.string().uuid().optional() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    let q = (supabase as any).from("business_hours").select("*").eq("company_id", companyId);
    q = data.queue_id ? q.eq("queue_id", data.queue_id) : q.is("queue_id", null);
    const { data: row } = await q.maybeSingle();
    return row ?? null;
  });

export const saveBusinessHoursForQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    queue_id: z.string().uuid().optional(),
    ativo: z.boolean(),
    fuso_horario: z.string().min(1),
    mensagem_fora_horario: z.string().max(500).optional(),
    horarios: z.array(horarioSlotSchema),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { queue_id, ...rest } = data;

    const payload = {
      ...rest,
      company_id: companyId,
      queue_id: queue_id ?? null,
      updated_at: new Date().toISOString(),
    };

    // Verifica se já existe para fazer update ou insert
    let checkQ = (supabase as any).from("business_hours").select("id").eq("company_id", companyId);
    checkQ = queue_id ? checkQ.eq("queue_id", queue_id) : checkQ.is("queue_id", null);
    const { data: existing } = await checkQ.maybeSingle();

    if (existing) {
      const { error } = await (supabase as any).from("business_hours").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any).from("business_hours").insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  });
