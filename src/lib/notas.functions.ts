import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const listNotas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ card_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: notas, error } = await (supabase as any)
      .from("notas_internas")
      .select("id, conteudo, mencoes, created_at, user_id, profiles(nome, email)")
      .eq("company_id", companyId)
      .eq("card_id", data.card_id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (notas ?? []) as any[];
  });

export const addNota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    card_id: z.string().uuid(),
    conteudo: z.string().min(1).max(2000),
    mencoes: z.array(z.string().uuid()).default([]),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: card } = await supabase
      .from("crm_cards").select("id").eq("id", data.card_id).eq("company_id", companyId).maybeSingle();
    if (!card) throw new Error("Conversa não encontrada");

    const { error } = await (supabase as any).from("notas_internas").insert({
      company_id: companyId,
      card_id: data.card_id,
      user_id: userId,
      conteudo: data.conteudo,
      mencoes: data.mencoes,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteNota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ nota_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { error } = await (supabase as any)
      .from("notas_internas")
      .delete()
      .eq("id", data.nota_id)
      .eq("company_id", companyId)
      .eq("user_id", userId); // só o autor pode deletar
    if (error) throw error;
    return { ok: true };
  });
