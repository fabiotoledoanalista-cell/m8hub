import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function resolveTeamContext(
  supabase: any,
  userId: string,
  requestedCompanyId?: string | null,
): Promise<{ companyId: string; role: string; isSuper: boolean }> {
  const { data: superData } = await supabase.rpc("is_super_admin");
  const isSuper = !!superData;
  if (isSuper && requestedCompanyId) {
    return { companyId: requestedCompanyId, role: "owner", isSuper: true };
  }
  const { data, error } = await supabase
    .from("company_user")
    .select("company_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Sem empresa.");
  return { companyId: data.company_id as string, role: data.role as string, isSuper };
}

function assertAdmin(role: string, isSuper: boolean) {
  if (isSuper) return;
  if (role !== "owner" && role !== "admin") {
    throw new Error("Apenas owner/admin podem gerenciar a equipe.");
  }
}

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { companyId?: string | null }) => ({ companyId: d?.companyId ?? null }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId } = await resolveTeamContext(supabase, userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: members, error } = await supabaseAdmin
      .from("company_user")
      .select("id, user_id, role, ativo, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const ids = (members ?? []).map((m: any) => m.user_id);
    let profilesById = new Map<string, { email: string | null; nome: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, nome")
        .in("user_id", ids);
      (profs ?? []).forEach((p: any) => profilesById.set(p.user_id, { email: p.email, nome: p.nome }));
    }
    return {
      members: (members ?? []).map((m: any) => ({
        ...m,
        email: profilesById.get(m.user_id)?.email ?? null,
        nome: profilesById.get(m.user_id)?.nome ?? null,
      })),
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: "admin" | "supervisor" | "atendente"; companyId?: string | null }) => {
    const email = String(d.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido");
    if (!["admin", "supervisor", "atendente"].includes(d.role)) throw new Error("Role inválida");
    return { email, role: d.role, companyId: d.companyId ?? null };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId, role, isSuper } = await resolveTeamContext(supabase, userId, data.companyId);
    assertAdmin(role, isSuper);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Busca user existente por email
    let targetUserId: string | null = null;
    const { data: prof } = await supabaseAdmin.from("profiles").select("user_id").eq("email", data.email).maybeSingle();
    if (prof) targetUserId = prof.user_id;

    // Plan enforcement: só conta se o user ainda não é membro ativo
    if (targetUserId) {
      const { data: alreadyLinked } = await supabaseAdmin
        .from("company_user")
        .select("id, ativo")
        .eq("company_id", companyId)
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (!alreadyLinked?.ativo) {
        const { assertWithinLimit } = await import("./plan-limits.server");
        await assertWithinLimit(companyId, "usuarios");
      }
    } else {
      const { assertWithinLimit } = await import("./plan-limits.server");
      await assertWithinLimit(companyId, "usuarios");
    }

    let tempPassword: string | null = null;
    if (!targetUserId) {
      tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
      });
      if (cErr || !created.user) throw new Error(cErr?.message || "Falha ao criar usuário");
      targetUserId = created.user.id;
      await supabaseAdmin.from("profiles").upsert({ user_id: targetUserId, email: data.email });
    }

    const { error: linkErr } = await supabaseAdmin
      .from("company_user")
      .upsert(
        {
          company_id: companyId,
          user_id: targetUserId,
          role: data.role,
          ativo: true,
          forcar_troca_senha: !!tempPassword,
        },
        { onConflict: "user_id,company_id" },
      );
    if (linkErr) throw linkErr;
    return { ok: true, tempPassword };
  });

export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; ativo: boolean; companyId?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId, role, isSuper } = await resolveTeamContext(supabase, userId, data.companyId);
    assertAdmin(role, isSuper);
    if (data.ativo) {
      const { assertWithinLimit } = await import("./plan-limits.server");
      await assertWithinLimit(companyId, "usuarios");
    }
    const { error } = await supabase
      .from("company_user")
      .update({ ativo: data.ativo })
      .eq("id", data.memberId)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; role: "owner" | "admin" | "supervisor" | "atendente"; companyId?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId, role, isSuper } = await resolveTeamContext(supabase, userId, data.companyId);
    if (!isSuper && role !== "owner") throw new Error("Apenas o owner pode alterar papéis.");
    const { error } = await supabase
      .from("company_user")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; companyId?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId, role, isSuper } = await resolveTeamContext(supabase, userId, data.companyId);
    assertAdmin(role, isSuper);
    const { data: target, error: tErr } = await supabase
      .from("company_user")
      .select("role")
      .eq("id", data.memberId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!target) throw new Error("Membro não encontrado.");
    if (target.role === "owner") throw new Error("Não é possível remover o dono da empresa.");
    const { error } = await supabase
      .from("company_user")
      .delete()
      .eq("id", data.memberId)
      .eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });
