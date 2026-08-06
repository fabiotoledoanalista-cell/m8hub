-- ============================================================
-- FEATURE: Filas de atendimento
-- ============================================================
CREATE TABLE IF NOT EXISTS public.queues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  nome        text NOT NULL,
  descricao   text,
  cor         text NOT NULL DEFAULT '#34D399',
  ativo       boolean NOT NULL DEFAULT true,
  posicao     integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.queue_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id   uuid NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (queue_id, user_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_cards') THEN
    ALTER TABLE public.crm_cards ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.queues(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY queues_auth ON public.queues
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY queue_members_auth ON public.queue_members
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FEATURE: Campanhas de disparo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  nome         text NOT NULL,
  mensagem     text NOT NULL,
  status       text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','agendada','enviando','pausada','concluida','erro')),
  agendado_em  timestamptz,
  iniciado_em  timestamptz,
  concluido_em timestamptz,
  total        integer NOT NULL DEFAULT 0,
  enviados     integer NOT NULL DEFAULT 0,
  erros        integer NOT NULL DEFAULT 0,
  intervalo_ms integer NOT NULL DEFAULT 3000,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  telefone    text NOT NULL,
  nome        text,
  status      text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro')),
  erro_msg    text,
  enviado_em  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_auth ON public.campaigns
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY campaign_contacts_auth ON public.campaign_contacts
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FEATURE: Mensagens agendadas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  telefone     text NOT NULL,
  nome_contato text,
  mensagem     text NOT NULL,
  agendado_em  timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro','cancelado')),
  erro_msg     text,
  enviado_em   timestamptz,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_messages_auth ON public.scheduled_messages
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FEATURE: API pública + Webhooks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  nome         text NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  key_preview  text NOT NULL,
  ativo        boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  nome       text NOT NULL,
  url        text NOT NULL,
  eventos    text[] NOT NULL DEFAULT ARRAY['mensagem.recebida'],
  ativo      boolean NOT NULL DEFAULT true,
  secret     text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id  uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  evento      text NOT NULL,
  payload     jsonb,
  status_code integer,
  sucesso     boolean NOT NULL DEFAULT false,
  erro_msg    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_auth ON public.api_keys
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY webhooks_auth ON public.webhooks
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY webhook_logs_auth ON public.webhook_logs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- FEATURE: Flow Builder
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  nome         text NOT NULL,
  descricao    text,
  ativo        boolean NOT NULL DEFAULT false,
  trigger_tipo text NOT NULL DEFAULT 'palavra_chave' CHECK (trigger_tipo IN ('palavra_chave','primeiro_contato','sempre')),
  trigger_valor text,
  nodes        jsonb NOT NULL DEFAULT '[]',
  edges        jsonb NOT NULL DEFAULT '[]',
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flow_executions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id      uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL,
  telefone     text NOT NULL,
  current_node text,
  status       text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','erro')),
  context      jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY flows_auth ON public.flows
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY flow_executions_auth ON public.flow_executions
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Quick replies / Templates de resposta
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  titulo     text NOT NULL,
  mensagem   text NOT NULL,
  atalho     text,
  posicao    integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY quick_replies_auth ON public.quick_replies
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
