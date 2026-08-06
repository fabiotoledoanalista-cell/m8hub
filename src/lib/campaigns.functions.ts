import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";
import { z } from "zod";

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*, campaign_contacts(*)")
      .eq("id", data.id)
      .eq("company_id", companyId)
      .single();
    if (error) throw error;
    return campaign;
  });

const campaignSchema = z.object({
  nome: z.string().min(1),
  mensagem: z.string().min(1),
  agendado_em: z.string().nullable().optional(),
  intervalo_ms: z.number().min(1000).max(60000).default(3000),
});

export const upsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid().optional(), ...campaignSchema.shape }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { id, ...rest } = data;
    const payload = { ...rest, company_id: companyId, created_by: userId, updated_at: new Date().toISOString() };
    if (id) {
      const { error } = await supabase.from("campaigns").update(rest).eq("id", id).eq("company_id", companyId);
      if (error) throw error;
      return { id };
    }
    const { data: row, error } = await supabase.from("campaigns").insert(payload).select("id").single();
    if (error) throw error;
    return row;
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase.from("campaigns").delete().eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const addCampaignContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    campaign_id: z.string().uuid(),
    contacts: z.array(z.object({ telefone: z.string(), nome: z.string().optional() })),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    // verifica ownership antes de inserir
    const { data: camp } = await supabase
      .from("campaigns").select("id,total").eq("id", data.campaign_id).eq("company_id", companyId).single();
    if (!camp) throw new Error("Campanha não encontrada");

    const rows = data.contacts.map(c => ({ campaign_id: data.campaign_id, telefone: c.telefone, nome: c.nome }));
    const { error } = await supabase.from("campaign_contacts").insert(rows);
    if (error) throw error;

    // acumula o total em vez de sobrescrever
    const newTotal = (camp.total ?? 0) + rows.length;
    await supabase.from("campaigns").update({ total: newTotal, updated_at: new Date().toISOString() }).eq("id", data.campaign_id);
    return { ok: true, total: newTotal };
  });

export const startCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);

    const { data: campaign } = await supabase
      .from("campaigns").select("*, campaign_contacts(*)").eq("id", data.id).eq("company_id", companyId).single();
    if (!campaign) throw new Error("Campanha não encontrada");

    const { data: instance } = await supabase
      .from("whatsapp_instances").select("instance_name,status").eq("company_id", companyId).maybeSingle();
    if (!instance || instance.status !== "connected") throw new Error("WhatsApp não conectado. Conecte antes de enviar.");

    await supabase.from("campaigns").update({ status: "enviando", iniciado_em: new Date().toISOString() }).eq("id", data.id);

    const { evoSendText } = await import("./evolution.server");
    // limite de 100 contatos por chamada — seguro para serverless (timeout ~30s)
    const contacts = (campaign.campaign_contacts ?? [])
      .filter((c: any) => c.status === "pendente")
      .slice(0, 100);
    let enviados = 0, erros = 0;

    for (const contact of contacts) {
      // verifica se a campanha foi pausada a cada iteração
      const { data: check } = await supabase.from("campaigns").select("status").eq("id", data.id).single();
      if (check?.status === "pausada") break;

      try {
        await evoSendText(instance.instance_name, contact.telefone, campaign.mensagem);
        await supabase.from("campaign_contacts").update({ status: "enviado", enviado_em: new Date().toISOString() }).eq("id", contact.id);
        enviados++;
      } catch (e: any) {
        await supabase.from("campaign_contacts").update({ status: "erro", erro_msg: e?.message }).eq("id", contact.id);
        erros++;
      }
      await new Promise(r => setTimeout(r, campaign.intervalo_ms ?? 3000));
    }

    await supabase.from("campaigns").update({
      status: "concluida", concluido_em: new Date().toISOString(), enviados, erros, updated_at: new Date().toISOString(),
    }).eq("id", data.id);

    return { ok: true, enviados, erros };
  });

export const pauseCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    await supabase.from("campaigns").update({ status: "pausada" }).eq("id", data.id).eq("company_id", companyId);
    return { ok: true };
  });
