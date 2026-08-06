-- Campos personalizados por contato/card
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  nome        text NOT NULL CHECK (char_length(nome) <= 80),
  tipo        text NOT NULL CHECK (tipo IN ('texto','numero','data','booleano','selecao')),
  opcoes      text[] DEFAULT NULL,
  obrigatorio boolean NOT NULL DEFAULT false,
  ordem       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_field_def_nome ON custom_field_definitions(company_id, nome);
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfd_company ON custom_field_definitions;
CREATE POLICY cfd_company ON custom_field_definitions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  card_id     uuid NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  field_id    uuid NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  valor       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(card_id, field_id)
);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfv_company ON custom_field_values;
CREATE POLICY cfv_company ON custom_field_values FOR ALL USING (auth.uid() IS NOT NULL);
