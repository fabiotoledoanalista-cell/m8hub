import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const listQuickReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("quick_replies")
      .select("*")
      .eq("company_id", companyId)
      .order("posicao");
    if (error) throw error;
    return data ?? [];
  });

const quickReplySchema = z.object({
  titulo: z.string().min(1),
  mensagem: z.string().min(1),
  atalho: z.string().optional(),
  posicao: z.number().int().default(0),
});

export const upsertQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid().optional(), ...quickReplySchema.shape }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabase.from("quick_replies").update(rest).eq("id", id).eq("company_id", companyId);
      if (error) throw error;
      return { id };
    }
    const { data: row, error } = await supabase
      .from("quick_replies")
      .insert({ ...rest, company_id: companyId, created_by: userId })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("quick_replies").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });
