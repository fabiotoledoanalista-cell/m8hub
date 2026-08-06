import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const listSequences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("followup_sequences")
      .select("*, followup_steps(id, ordem, dias_silencio, mensagem)")
      .eq("company_id", companyId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((s: any) => ({
      ...s,
      followup_steps: (s.followup_steps ?? []).sort((a: any, b: any) => a.ordem - b.ordem),
    }));
  });

const sequenceSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
  steps: z.array(z.object({
    ordem: z.number().int().min(1),
    dias_silencio: z.number().int().min(1),
    mensagem: z.string().min(1),
  })).min(1),
});

export const upsertSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid().optional(), ...sequenceSchema.shape }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { id, steps, ...rest } = data;

    let sequenceId = id;
    if (id) {
      const { error } = await supabase.from("followup_sequences").update(rest).eq("id", id).eq("company_id", companyId);
      if (error) throw error;
      await supabase.from("followup_steps").delete().eq("sequence_id", id);
    } else {
      const { data: row, error } = await supabase
        .from("followup_sequences").insert({ ...rest, company_id: companyId, created_by: userId }).select("id").single();
      if (error) throw error;
      sequenceId = row.id;
    }

    const stepRows = steps.map((s) => ({ ...s, sequence_id: sequenceId }));
    const { error: stepsError } = await supabase.from("followup_steps").insert(stepRows);
    if (stepsError) throw stepsError;
    return { id: sequenceId };
  });

export const deleteSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("followup_sequences").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const enrollInSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ numero: z.string().min(1), card_id: z.string().uuid().optional(), sequence_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: existing } = await supabase
      .from("followup_enrollments").select("id")
      .eq("company_id", companyId).eq("numero", data.numero).eq("status", "ativo").maybeSingle();
    if (existing) throw new Error("Este contato já está em uma cadência ativa");
    const { error } = await supabase.from("followup_enrollments").insert({
      company_id: companyId, numero: data.numero, card_id: data.card_id ?? null,
      sequence_id: data.sequence_id, created_by: userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const cancelEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("followup_enrollments")
      .update({ status: "cancelado", updated_at: new Date().toISOString() })
      .eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const getEnrollmentForContact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ numero: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: enr } = await supabase
      .from("followup_enrollments")
      .select("*, followup_sequences(nome, followup_steps(ordem))")
      .eq("company_id", companyId).eq("numero", data.numero).eq("status", "ativo").maybeSingle();
    return enr ?? null;
  });
