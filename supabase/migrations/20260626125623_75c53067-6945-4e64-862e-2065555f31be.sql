
-- 1) Re-scope policies from public (anon+auth) to authenticated only
DROP POLICY IF EXISTS agent_config_owner_admin ON public.agent_config;
CREATE POLICY agent_config_owner_admin ON public.agent_config
  FOR ALL TO authenticated
  USING (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']))
  WITH CHECK (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS billing_owner_admin_read ON public.company_billing;
CREATE POLICY billing_owner_admin_read ON public.company_billing
  FOR SELECT TO authenticated
  USING (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS billing_owner_admin_write ON public.company_billing;
CREATE POLICY billing_owner_admin_write ON public.company_billing
  FOR ALL TO authenticated
  USING (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']))
  WITH CHECK (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS google_integration_owner_admin ON public.google_integration;
CREATE POLICY google_integration_owner_admin ON public.google_integration
  FOR ALL TO authenticated
  USING (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']))
  WITH CHECK (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS profiles_company_admin_select ON public.profiles;
CREATE POLICY profiles_company_admin_select ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_user me
    JOIN company_user target ON target.company_id = me.company_id
    WHERE me.user_id = auth.uid() AND me.ativo = true
      AND me.role = ANY (ARRAY['owner'::tenant_role,'admin'::tenant_role])
      AND target.user_id = profiles.user_id AND target.ativo = true
  ));

DROP POLICY IF EXISTS subscription_owner_admin_read ON public.subscription;
CREATE POLICY subscription_owner_admin_read ON public.subscription
  FOR SELECT TO authenticated
  USING (is_super_admin() OR has_company_role(company_id, ARRAY['owner','admin']));

-- 2) Revoke EXECUTE on SECURITY DEFINER functions from PUBLIC/anon; keep
--    EXECUTE for authenticated where RLS / RPC needs them, plus service_role.
REVOKE EXECUTE ON FUNCTION public.is_super_admin()              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_company_access(uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_company_id()           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_super_admin_if_empty()   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_stages()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_super_admin()              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid)       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_company_id()           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_super_admin_if_empty()   TO authenticated, service_role;
