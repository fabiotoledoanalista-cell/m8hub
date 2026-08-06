import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/tenant";

export const createCheckoutCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome: string }) => {
    const nome = String(d.nome || "").trim();
    if (nome.length < 2) throw new Error("Informe o nome da sua empresa.");
    return { nome };
  })
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("company_user")
      .select("company_id")
      .eq("user_id", context.userId)
      .eq("ativo", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing?.company_id) return { companyId: existing.company_id as string };

    const slug = `${slugify(data.nome)}-${Math.random().toString(36).slice(2, 6)}`;
    const trialAte = new Date(Date.now() + 3 * 86400000).toISOString();

    const { data: company, error: companyErr } = await supabaseAdmin
      .from("company")
      .insert({
        nome: data.nome,
        slug,
        primary_color: "#25D366",
        created_by: context.userId,
        status_cobranca: "checkout_pending",
        onboarding_completed: false,
        onboarding_step: 0,
        trial_ate: trialAte,
      })
      .select("id")
      .single();
    if (companyErr || !company) throw new Error(companyErr?.message || "Falha ao criar empresa");

    const { error: memberErr } = await supabaseAdmin.from("company_user").insert({
      user_id: context.userId,
      company_id: company.id,
      role: "owner",
      ativo: true,
    });
    if (memberErr) throw memberErr;

    return { companyId: company.id as string };
  });