import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
  x: z.number(),
  y: z.number(),
  config: z.record(z.unknown()).optional(),
});

const edgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
});

export const listFlows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("flows").select("id,nome,descricao,ativo,trigger_tipo,trigger_valor,created_at,updated_at")
      .eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getFlow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: flow, error } = await supabase
      .from("flows").select("*").eq("id", data.id).eq("company_id", companyId).single();
    if (error) throw error;
    return flow;
  });

const flowSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  ativo: z.boolean().default(false),
  trigger_tipo: z.enum(["palavra_chave", "primeiro_contato", "sempre"]),
  trigger_valor: z.string().optional(),
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

export const upsertFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid().optional(), ...flowSchema.shape }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { id, ...rest } = data;
    const payload = { ...rest, updated_at: new Date().toISOString() };
    if (id) {
      const { error } = await supabase.from("flows").update(payload).eq("id", id).eq("company_id", companyId);
      if (error) throw error;
      return { id };
    }
    const { data: row, error } = await supabase
      .from("flows").insert({ ...payload, company_id: companyId, created_by: userId }).select("id").single();
    if (error) throw error;
    return row;
  });

export const deleteFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("flows").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const toggleFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), ativo: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("flows").update({ ativo: data.ativo }).eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });
