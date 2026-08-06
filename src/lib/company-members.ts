import { supabase } from "@/integrations/supabase/client";

export interface CompanyMember {
  user_id: string;
  nome: string | null;
  email: string | null;
}

/**
 * company_user.user_id não tem FK declarada (aponta pra auth.users sem
 * constraint), então o PostgREST não consegue montar o embed automático
 * `profiles(nome,email)` — sempre retorna 400. Busca em duas etapas e
 * junta em memória.
 */
export async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data: rows, error } = await supabase
    .from("company_user").select("user_id").eq("company_id", companyId).eq("ativo", true);
  if (error) throw error;
  const userIds = (rows ?? []).map((r: any) => r.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("user_id,nome,email").in("user_id", userIds);
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  return userIds.map((id: string) => ({
    user_id: id,
    nome: profileMap.get(id)?.nome ?? null,
    email: profileMap.get(id)?.email ?? null,
  }));
}
