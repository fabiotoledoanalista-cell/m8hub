-- ============================================================
-- FEATURE: Avaliação de qualidade do atendimento (ao encerrar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.atendimento_avaliacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  card_id       uuid REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  nota          integer NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario    text,
  avaliado_por  uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atendimento_avaliacoes_company ON public.atendimento_avaliacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_atendimento_avaliacoes_card ON public.atendimento_avaliacoes(card_id);

ALTER TABLE public.atendimento_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY atendimento_avaliacoes_access ON public.atendimento_avaliacoes
  FOR ALL
  USING (public.has_company_access(company_id) OR public.is_super_admin())
  WITH CHECK (public.has_company_access(company_id) OR public.is_super_admin());
