-- ============================================================
-- Finalização por inatividade + Motivos de finalização + Notas internas
-- ============================================================

-- 1. agent_config: horas_inatividade e motivos_finalizacao
ALTER TABLE agent_config
  ADD COLUMN IF NOT EXISTS horas_inatividade integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS motivos_finalizacao text[] DEFAULT ARRAY['Vendeu','Sem interesse','Não qualificado','Sem retorno'];

-- 2. crm_cards: motivo_fechamento + fechado_em
ALTER TABLE crm_cards
  ADD COLUMN IF NOT EXISTS motivo_fechamento text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fechado_em timestamptz DEFAULT NULL;

-- 3. Tabela notas_internas
CREATE TABLE IF NOT EXISTS notas_internas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  card_id     uuid NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  conteudo    text NOT NULL CHECK (char_length(conteudo) <= 2000),
  mencoes     uuid[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notas_internas_card_idx ON notas_internas(card_id);
CREATE INDEX IF NOT EXISTS notas_internas_company_idx ON notas_internas(company_id);

-- RLS
ALTER TABLE notas_internas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_company" ON notas_internas;
CREATE POLICY "notas_company" ON notas_internas
  FOR ALL USING (auth.uid() IS NOT NULL);
