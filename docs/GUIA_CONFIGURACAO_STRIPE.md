# 🎯 Guia de Configuração do Stripe

## ✅ Passo a Passo Completo

### 1️⃣ Criar Conta no Stripe

1. Acesse: https://dashboard.stripe.com/register
2. Preencha os dados e crie a conta
3. **Modo de Teste** estará ativado automaticamente

---

### 2️⃣ Criar os Produtos no Dashboard

#### Plano Free (não precisa criar - é gerenciado internamente)

#### Plano Pro

1. No Dashboard do Stripe, vá em **Products** → **Add Product**
2. Preencha:
   - **Name:** Plano Pro
   - **Description:** Features ilimitadas + 500k tokens/mês
3. Em **Pricing**:
   - **Monthly Price:**
     - Price: `R$ 49.00` ou `USD 10.00`
     - Billing period: `Monthly`
     - ID gerado: `price_xxxxx` (copie este ID!)
   - Clique em **Add another price**
   - **Yearly Price:**
     - Price: `R$ 490.00` ou `USD 100.00`
     - Billing period: `Yearly`
     - ID gerado: `price_yyyyy` (copie este ID!)
4. Salve o produto

#### Plano Business

1. Repita o processo acima:
   - **Name:** Plano Business
   - **Description:** Features ilimitadas + 2M tokens/mês
   - **Monthly Price:** `R$ 149.00` ou `USD 30.00` (copie o price_id)
   - **Yearly Price:** `R$ 1.490.00` ou `USD 300.00` (copie o price_id)

---

### 3️⃣ Inserir os Planos no Banco de Dados

Execute este SQL no seu banco PostgreSQL:

```sql
-- Plano Free
INSERT INTO subscription_plans (
  name, display_name, 
  price_monthly, price_yearly,
  features_limit, tokens_limit,
  can_export_jira, can_export_azure,
  has_api_access, has_priority_support,
  has_trial_days,
  is_active
) VALUES (
  'free', 'Gratuito',
  0, 0,
  10, 50000,
  false, false,
  false, false,
  0,
  true
);

-- Plano Pro (SUBSTITUA os price_ids)
INSERT INTO subscription_plans (
  name, display_name, 
  price_monthly, price_yearly,
  features_limit, tokens_limit,
  can_export_jira, can_export_azure,
  has_api_access, has_priority_support,
  has_trial_days,
  stripe_monthly_price_id, stripe_yearly_price_id,
  is_active
) VALUES (
  'pro', 'Pro',
  4900, 49000, -- Em centavos: R$ 49.00 e R$ 490.00
  NULL, 500000, -- NULL = ilimitado
  true, true,
  false, false,
  7, -- 7 dias de trial
  'price_XXXXXXXX', -- SUBSTITUA pelo ID do Stripe
  'price_YYYYYYYY', -- SUBSTITUA pelo ID do Stripe
  true
);

-- Plano Business (SUBSTITUA os price_ids)
INSERT INTO subscription_plans (
  name, display_name, 
  price_monthly, price_yearly,
  features_limit, tokens_limit,
  can_export_jira, can_export_azure,
  has_api_access, has_priority_support,
  has_trial_days,
  stripe_monthly_price_id, stripe_yearly_price_id,
  is_active
) VALUES (
  'business', 'Business',
  14900, 149000, -- Em centavos: R$ 149.00 e R$ 1.490.00
  NULL, 2000000, -- NULL = ilimitado
  true, true,
  true, true,
  0, -- Sem trial
  'price_ZZZZZZZZ', -- SUBSTITUA pelo ID do Stripe
  'price_WWWWWWWW', -- SUBSTITUA pelo ID do Stripe
  true
);
```

---

### 4️⃣ Obter as Chaves da API

#### Secret Key (Backend)

1. No Dashboard, vá em **Developers** → **API Keys**
2. Copie a **Secret key** (começa com `sk_test_...` em modo de teste)
3. Adicione no `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   ```

#### Webhook Secret (Backend)

1. Vá em **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. Preencha:
   - **Endpoint URL:** `https://seu-dominio.com/api/webhooks/stripe`
     - Para local: use ngrok ou Stripe CLI
   - **Events to send:**
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Salve e copie o **Signing secret** (começa com `whsec_...`)
5. Adicione no `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

---

### 5️⃣ Testar Localmente com Stripe CLI

#### Instalar Stripe CLI

```bash
# Windows (com Scoop)
scoop install stripe

# Mac
brew install stripe/stripe-cli/stripe

# Linux
# Baixe de: https://github.com/stripe/stripe-cli/releases
```

#### Fazer Login

```bash
stripe login
```

#### Escutar Webhooks Localmente

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Isso vai gerar um webhook secret temporário. Use-o no `.env.local`.

#### Testar Webhook

```bash
stripe trigger checkout.session.completed
```

---

### 6️⃣ Testar Pagamento (Modo de Teste)

Use estes cartões de teste:

| Cenário | Número do Cartão | CVV | Data |
|---------|------------------|-----|------|
| ✅ Sucesso | `4242 4242 4242 4242` | Qualquer | Futura |
| ❌ Falha (cartão recusado) | `4000 0000 0000 0002` | Qualquer | Futura |
| 🔐 3D Secure | `4000 0025 0000 3155` | Qualquer | Futura |

---

### 7️⃣ Passar para Produção

Quando estiver pronto:

1. **Ativar conta**:
   - No Dashboard, vá em **Settings** → **Account details**
   - Complete todos os dados obrigatórios
   - Ative a conta

2. **Mudar para modo Live**:
   - Toggle no Dashboard: **Test mode** → **Live mode**
   - Recrie os produtos (ou mova os existentes)
   - Obtenha as novas chaves:
     - `sk_live_...` (Secret Key)
     - `whsec_...` (Webhook Secret para produção)

3. **Atualizar variáveis de ambiente**:
   ```
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   APP_URL=https://storytellerboard.com
   ```

4. **Recriar webhook** apontando para produção:
   - URL: `https://storytellerboard.com/api/webhooks/stripe`

---

### 8️⃣ Monitoramento

#### Dashboard do Stripe

- **Payments:** Ver todos os pagamentos
- **Customers:** Ver clientes
- **Subscriptions:** Gerenciar assinaturas
- **Logs:** Ver webhooks recebidos

#### Logs da Aplicação

```bash
# Ver logs do webhook
grep "Webhook" logs/app.log
```

---

### 9️⃣ Troubleshooting

#### Webhook não está sendo recebido

1. Verifique se o endpoint está acessível publicamente
2. Veja os logs no Stripe Dashboard → **Developers** → **Webhooks** → **Events**
3. Teste manualmente:
   ```bash
   curl -X POST https://seu-dominio.com/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

#### Pagamento não está aparecendo no banco

1. Veja os logs do servidor
2. Verifique se o webhook está configurado corretamente
3. Confirme que o `STRIPE_WEBHOOK_SECRET` está correto

#### Erro de assinatura do webhook

```
Webhook signature verification failed
```

**Solução:** O `STRIPE_WEBHOOK_SECRET` está errado. Obtenha o correto no Dashboard.

---

### 🎯 Checklist Final

- [ ] Conta Stripe criada
- [ ] Produtos criados no Dashboard
- [ ] Price IDs copiados
- [ ] Planos inseridos no banco de dados
- [ ] `STRIPE_SECRET_KEY` configurada
- [ ] `STRIPE_WEBHOOK_SECRET` configurada
- [ ] Webhook endpoint criado no Stripe
- [ ] Testado pagamento com cartão de teste
- [ ] Webhook recebido e processado corretamente

---

**Pronto! Seu sistema de assinaturas está configurado!** 🎉






