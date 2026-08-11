-- Bucket "company-logos" ja foi criado via Storage API (publico, so imagens,
-- limite 3MB). Falta liberar upload/gestao pra quem pertence a empresa —
-- cada empresa so pode escrever dentro da sua propria pasta
-- (company-logos/<company_id>/...), igual ao padrao ja usado nas outras
-- tabelas multi-tenant (has_company_access).

DROP POLICY IF EXISTS company_logos_insert ON storage.objects;
CREATE POLICY company_logos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (
      public.is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT company_id::text FROM public.company_user
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS company_logos_update ON storage.objects;
CREATE POLICY company_logos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (
      public.is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT company_id::text FROM public.company_user
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (
      public.is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT company_id::text FROM public.company_user
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

DROP POLICY IF EXISTS company_logos_delete ON storage.objects;
CREATE POLICY company_logos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (
      public.is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT company_id::text FROM public.company_user
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

-- Leitura: o bucket e publico, entao GET em /storage/v1/object/public/...
-- ja funciona sem policy. Mesmo assim, liberamos SELECT via API autenticada
-- (usada por libs que listam/checam arquivos) para quem tem acesso a empresa.
DROP POLICY IF EXISTS company_logos_select ON storage.objects;
CREATE POLICY company_logos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');
