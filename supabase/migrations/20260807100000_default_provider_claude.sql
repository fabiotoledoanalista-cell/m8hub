-- Fase de validacao: o app agora so fala com a Anthropic (Claude), em
-- qualquer lugar que gere resposta de IA. Ajusta os defaults da tabela
-- agent_config para nao deixar empresas novas com "gemini-2.0-flash"
-- parado no campo ai_model (isso seria mandado como nome de modelo pra
-- API da Anthropic e falharia).

ALTER TABLE public.agent_config
  ALTER COLUMN ai_provider SET DEFAULT 'anthropic';

ALTER TABLE public.agent_config
  ALTER COLUMN ai_model SET DEFAULT 'claude-sonnet-4-5';

UPDATE public.agent_config
SET ai_provider = 'anthropic'
WHERE ai_provider <> 'anthropic';

UPDATE public.agent_config
SET ai_model = 'claude-sonnet-4-5'
WHERE ai_model IS NULL
   OR ai_model = ''
   OR ai_model LIKE 'gemini%'
   OR ai_model LIKE 'gpt%';
