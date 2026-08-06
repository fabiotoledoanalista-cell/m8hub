import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const listQueues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("queues")
      .select("*, queue_members(user_id)")
      .eq("company_id", companyId)
      .order("posicao");
    if (error) throw error;

    const userIds = Array.from(new Set((data ?? []).flatMap((q: any) => (q.queue_members ?? []).map((m: any) => m.user_id))));
    const profileMap = new Map<string, { nome: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id,nome,email").in("user_id", userIds);
      (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, { nome: p.nome, email: p.email }));
    }

    return (data ?? []).map((q: any) => ({
      ...q,
      queue_members: (q.queue_members ?? []).map((m: any) => ({ user_id: m.user_id, profiles: profileMap.get(m.user_id) ?? null })),
    }));
  });

const queueSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  cor: z.string().default("#34D399"),
  ativo: z.boolean().default(true),
  auto_distribuir: z.boolean().default(false),
});

export const upsertQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid().optional(), ...queueSchema.shape }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabase.from("queues").update(rest).eq("id", id).eq("company_id", companyId);
      if (error) throw error;
      return { id };
    }
    const { data: row, error } = await supabase.from("queues").insert({ ...rest, company_id: companyId }).select("id").single();
    if (error) throw error;
    return row;
  });

export const deleteQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("queues").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const setQueueMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ queue_id: z.string().uuid(), user_ids: z.array(z.string().uuid()) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    // verifica ownership da fila antes de alterar membros
    const { data: q } = await supabase
      .from("queues").select("id").eq("id", data.queue_id).eq("company_id", companyId).single();
    if (!q) throw new Error("Fila não encontrada");

    await supabase.from("queue_members").delete().eq("queue_id", data.queue_id);
    if (data.user_ids.length > 0) {
      const rows = data.user_ids.map(user_id => ({ queue_id: data.queue_id, user_id }));
      const { error } = await supabase.from("queue_members").insert(rows);
      if (error) throw error;
    }
    return { ok: true };
  });
