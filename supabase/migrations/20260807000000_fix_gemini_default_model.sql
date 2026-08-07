-- O default antigo 'google/gemini-2.5-flash' vem da integracao legada via
-- Lovable AI Gateway (nomes de modelo prefixados). O app hoje chama a API
-- do Google diretamente, e o Google descontinuou esse nome de modelo para
-- chaves novas (erro 404 "no longer available to new users").
-- Troca o default da coluna e corrige linhas existentes que ainda estao
-- com o valor quebrado e nunca foram customizadas manualmente.

ALTER TABLE public.agent_config
  ALTER COLUMN ai_model SET DEFAULT 'gemini-2.0-flash';

UPDATE public.agent_config
SET ai_model = 'gemini-2.0-flash'
WHERE ai_model = 'google/gemini-2.5-flash';
