
## O que vai mudar

Substituir o checkout Paddle por **link externo** (Kiwify/Cakto/Perfectpay) configurado por plano no Painel Master, e abrir **webhooks públicos** que recebem a confirmação de pagamento e ativam/renovam/cancelam a assinatura ligando pelo **e-mail do comprador**.

## 1. Banco de dados (migração)

Alterar `plan`:
- `checkout_url text` (link da Kiwify/Cakto onde o cliente paga)

Alterar `subscription` (tornar genérica, sem quebrar o que já existe):
- `provider text not null default 'manual'` (`'kiwify' | 'cakto' | 'perfectpay' | 'manual' | 'paddle'`)
- `external_subscription_id text` (id da venda/assinatura externa)
- `external_customer_id text`
- `buyer_email text` (chave de vínculo)
- Paddle columns viram nullable (não removo agora pra não quebrar registros antigos).
- Índice `(provider, external_subscription_id)` e `(buyer_email)`.

## 2. Webhook público

`src/routes/api/public/billing/webhook.ts` — um único endpoint, multiplataforma:

```
POST /api/public/billing/webhook?provider=kiwify&token=...
POST /api/public/billing/webhook?provider=cakto&token=...
POST /api/public/billing/webhook?provider=perfectpay&token=...
```

- Verifica token no query string contra secret (`KIWIFY_WEBHOOK_TOKEN`, `CAKTO_WEBHOOK_TOKEN`, `PERFECTPAY_WEBHOOK_TOKEN`).
- Normaliza o payload da plataforma para `{ event, buyerEmail, externalId, productRef, status, periodEnd }`.
- Localiza a empresa: `profiles.email = buyerEmail` → `company_user.user_id` → `company`.
  - Se não achar: registra `pending_billing_event` (criar tabela simples de log) e responde 200 (Kiwify retenta de outra forma).
- Localiza o plano: tenta `plan.slug = productRef` ou `plan.checkout_url contém productRef`. Fallback: mantém plano atual.
- Mapeia evento:
  - `purchase_approved` / `subscription_renewed` → `subscription.status='active'`, `company.status_cobranca='ativo'`, atualiza `current_period_end`.
  - `subscription_canceled` / `chargeback` → `status='canceled'`, `status_cobranca='suspenso'`.
  - `payment_failed` → `status='past_due'`, `status_cobranca='pendente'`.
- Upsert por `(provider, external_subscription_id)`.

## 3. UI Master

`src/routes/master/planos.tsx`: adicionar campo **"URL de checkout (Kiwify/Cakto)"** em cada plano. Persistir em `plan.checkout_url`.

`src/routes/master/configuracoes.tsx`: mostrar as **URLs de webhook** prontas pra copiar/colar em cada plataforma:
```
https://<dominio>/api/public/billing/webhook?provider=kiwify&token=<KIWIFY_WEBHOOK_TOKEN>
https://<dominio>/api/public/billing/webhook?provider=cakto&token=<CAKTO_WEBHOOK_TOKEN>
```
Também exibir status `Aguardando 1º webhook` ou `Recebido em <data>` (de uma tabela `billing_event_log`).

## 4. Checkout do cliente

`src/routes/app/checkout.tsx`: remover Paddle. Continua mostrando os 3 planos (UI atual), mas o botão **"Assinar"** vira:
- `<a href={plano.checkout_url} target="_blank">` com `?email={userEmail}` pré-preenchido (Kiwify/Cakto suportam querystring de e-mail).
- Mostra um painel "Aguardando confirmação do pagamento" com polling a cada 5s na `subscription` da empresa do usuário. Quando vier `active` → redireciona para `/app/dashboard`.
- Mantém aviso: **use o mesmo e-mail do cadastro pra liberação automática**.

## 5. Limpeza Paddle

- Tirar `usePaddleCheckout`, `PaymentTestModeBanner`, `paddle.ts`, `paddle.server.ts` dos imports ativos (deixo os arquivos no repo por enquanto, sem uso).
- O webhook `src/routes/api/public/payments/webhook.ts` (Paddle) eu deixo no lugar mas inerte (não chamamos mais). Posso deletar depois se você quiser.

## 6. Secrets que vou pedir

Após você aprovar este plano vou chamar `add_secret` para:
- `KIWIFY_WEBHOOK_TOKEN` — token livre que você cola na URL na Kiwify (vou gerar uma string sugerida)
- `CAKTO_WEBHOOK_TOKEN`
- `PERFECTPAY_WEBHOOK_TOKEN`

Você pode usar a mesma string nos 3 se quiser simplificar.

## Detalhes técnicos

- Webhook em `/api/public/*` (bypass de auth na publicação).
- Uso `supabaseAdmin` dentro do handler (carregado via `await import`).
- Eventos normalizados em `src/lib/billing/normalize.ts` (um arquivo por plataforma).
- Tabela `billing_event_log(id, provider, event_type, payload jsonb, processed_at, matched_company_id, created_at)` pra auditoria e debug.
- Polling no cliente usa `useQuery` com `refetchInterval: 5000` enquanto status ≠ active.

## Ordem de execução

1. Migração SQL (plan + subscription + billing_event_log).
2. `add_secret` dos 3 tokens.
3. Webhook + normalizadores.
4. UI Master (campo checkout_url + tela de webhook URLs).
5. Refatorar `/app/checkout` (link externo + polling).
6. Publicar e testar com uma venda real em modo cartão de teste da Kiwify.
