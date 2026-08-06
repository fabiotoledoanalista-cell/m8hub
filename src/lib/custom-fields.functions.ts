import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

const TipoEnum = z.enum(["texto", "numero", "data", "booleano", "selecao"]);

// ── Definições ──────────────────────────────────────────────────────────────

export const listFieldDefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await (supabase as any)
      .from("custom_field_definitions")
      .select("*")
      .eq("company_id", companyId)
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []) as any[];
  });

export const upsertFieldDef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid().optional(),
    nome: z.string().min(1).max(80),
    tipo: TipoEnum,
    opcoes: z.array(z.string().max(100)).max(50).optional(),
    obrigatorio: z.boolean().default(false),
    ordem: z.number().int().default(0),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    if (data.tipo !== "selecao") data = { ...data, opcoes: undefined };

    if (data.id) {
      const { error } = await (supabase as any)
        .from("custom_field_definitions")
        .update({ nome: data.nome, tipo: data.tipo, opcoes: data.opcoes ?? null, obrigatorio: data.obrigatorio, ordem: data.ordem })
        .eq("id", data.id)
        .eq("company_id", companyId);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from("custom_field_definitions")
        .insert({ company_id: companyId, nome: data.nome, tipo: data.tipo, opcoes: data.opcoes ?? null, obrigatorio: data.obrigatorio, ordem: data.ordem });
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteFieldDef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await (supabase as any)
      .from("custom_field_definitions")
      .delete()
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

// ── Valores ─────────────────────────────────────────────────────────────────

export const listFieldValues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ card_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: vals, error } = await (supabase as any)
      .from("custom_field_values")
      .select("field_id, valor")
      .eq("company_id", companyId)
      .eq("card_id", data.card_id);
    if (error) throw error;
    const map: Record<string, string | null> = {};
    for (const v of (vals ?? [])) map[v.field_id] = v.valor;
    return map;
  });

export const saveFieldValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    card_id: z.string().uuid(),
    values: z.record(z.string().uuid(), z.string().nullable()),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: card } = await supabase
      .from("crm_cards").select("id").eq("id", data.card_id).eq("company_id", companyId).maybeSingle();
    if (!card) throw new Error("Conversa não encontrada");

    const upserts = Object.entries(data.values).map(([field_id, valor]) => ({
      company_id: companyId,
      card_id: data.card_id,
      field_id,
      valor: valor ?? null,
      updated_at: new Date().toISOString(),
    }));

    if (upserts.length > 0) {
      const { error } = await (supabase as any)
        .from("custom_field_values")
        .upsert(upserts, { onConflict: "card_id,field_id" });
      if (error) throw error;
    }
    return { ok: true };
  });
