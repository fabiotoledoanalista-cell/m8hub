-- Fase 3: Jornada de trabalho + Round-robin automático + Role supervisor

-- 1. Tabela business_hours (jornada de trabalho por empresa/fila)
CREATE TABLE IF NOT EXISTS business_hours (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  queue_id              uuid REFERENCES queues(id) ON DELETE CASCADE DEFAULT NULL,
  ativo                 boolean NOT NULL DEFAULT true,
  fuso_horario          text NOT NULL DEFAULT 'America/Sao_Paulo',
  mensagem_fora_horario text DEFAULT NULL,
  horarios              jsonb NOT NULL DEFAULT '[]',
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, queue_id)
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bh_company ON business_hours;
CREATE POLICY bh_company ON business_hours FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. Round-robin automático: flag na fila
ALTER TABLE queues
  ADD COLUMN IF NOT EXISTS auto_distribuir boolean NOT NULL DEFAULT false;
