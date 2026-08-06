-- Resumo automático por IA ao fechar atendimento
ALTER TABLE crm_cards
  ADD COLUMN IF NOT EXISTS resumo_ia text DEFAULT NULL;
