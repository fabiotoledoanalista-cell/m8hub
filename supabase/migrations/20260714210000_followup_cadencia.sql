-- ============================================================
-- FEATURE: Cadência de follow-up automático (reengajamento por silêncio)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.followup_sequences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  nome        text NOT NULL,
  descricao   text,
  ativo       boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.followup_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id   uuid NOT NULL REFERENCES public.followup_sequences(id) ON DELETE CASCADE,
  ordem         integer NOT NULL,
  dias_silencio integer NOT NULL CHECK (dias_silencio > 0),
  mensagem      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, ordem)
);

CREATE TABLE IF NOT EXISTS public.followup_enrollments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL,
  numero           text NOT NULL,
  card_id          uuid REFERENCES public.crm_cards(id) ON DELETE SET NULL,
  sequence_id      uuid NOT NULL REFERENCES public.followup_sequences(id) ON DELETE CASCADE,
  current_step     integer NOT NULL DEFAULT 0,
  last_step_sent_at timestamptz,
  status           text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','cancelado')),
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_steps_sequence ON public.followup_steps(sequence_id, ordem);
CREATE INDEX IF NOT EXISTS idx_followup_enrollments_company ON public.followup_enrollments(company_id);
CREATE INDEX IF NOT EXISTS idx_followup_enrollments_status ON public.followup_enrollments(status) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_followup_enrollments_numero ON public.followup_enrollments(company_id, numero);

ALTER TABLE public.followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY followup_sequences_access ON public.followup_sequences
  FOR ALL
  USING (public.has_company_access(company_id) OR public.is_super_admin())
  WITH CHECK (public.has_company_access(company_id) OR public.is_super_admin());

CREATE POLICY followup_steps_access ON public.followup_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_sequences s
      WHERE s.id = sequence_id AND (public.has_company_access(s.company_id) OR public.is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.followup_sequences s
      WHERE s.id = sequence_id AND (public.has_company_access(s.company_id) OR public.is_super_admin())
    )
  );

CREATE POLICY followup_enrollments_access ON public.followup_enrollments
  FOR ALL
  USING (public.has_company_access(company_id) OR public.is_super_admin())
  WITH CHECK (public.has_company_access(company_id) OR public.is_super_admin());
