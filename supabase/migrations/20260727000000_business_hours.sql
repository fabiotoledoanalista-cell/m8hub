-- Business hours por fila (ou nível empresa quando queue_id IS NULL)
CREATE TABLE IF NOT EXISTS public.business_hours (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL,
  queue_id         uuid,                           -- NULL = padrão da empresa
  fuso_horario     text NOT NULL DEFAULT 'America/Sao_Paulo',
  mensagem_fora_horario text,
  horarios         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- horarios: [{"dia": 1, "inicio": "09:00", "fim": "18:00"}, ...]
  -- dia: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  ativo            boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Garante unicidade: uma config por (empresa, fila) e uma config padrão por empresa
CREATE UNIQUE INDEX IF NOT EXISTS bh_company_default_unique
  ON public.business_hours (company_id)
  WHERE queue_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bh_queue_unique
  ON public.business_hours (company_id, queue_id)
  WHERE queue_id IS NOT NULL;

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bh_authed"
  ON public.business_hours
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
