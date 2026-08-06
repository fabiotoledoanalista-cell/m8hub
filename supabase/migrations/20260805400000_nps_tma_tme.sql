-- NPS e TMA/TME

-- Adiciona campos em atendimento_avaliacoes para rastrear NPS via WhatsApp
ALTER TABLE atendimento_avaliacoes
  ADD COLUMN IF NOT EXISTS numero text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enviado_em timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS respondido_em timestamptz DEFAULT NULL;

-- Coluna created_at em crm_cards para calcular TMA
ALTER TABLE crm_cards
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Configuração de NPS por empresa
CREATE TABLE IF NOT EXISTS nps_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE UNIQUE,
  ativo           boolean NOT NULL DEFAULT false,
  mensagem        text NOT NULL DEFAULT 'Como você avalia seu atendimento de 1 a 10?',
  delay_minutos   integer NOT NULL DEFAULT 5
);

ALTER TABLE nps_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nps_cfg_policy ON nps_config;
CREATE POLICY nps_cfg_policy ON nps_config FOR ALL USING (auth.uid() IS NOT NULL);
