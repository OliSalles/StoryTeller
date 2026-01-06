# 🚀 DEPLOY EM PRODUÇÃO - GUIA RÁPIDO

## ✅ Status Atual

- ✅ Código commitado e no GitHub
- ✅ Branch: `dev`
- ✅ Commit: `d226e57`
- ✅ Sistema de assinaturas completo
- ✅ Portal do Cliente integrado
- ✅ Webhooks implementados

---

## 🎯 O QUE FAZER AGORA

### No Servidor de Produção:

```bash
# 1. Fazer pull do código
cd /caminho/do/projeto
git pull origin dev

# 2. Instalar dependências
pnpm install

# 3. Configurar .env de produção
npm run env:production
# Depois edite o .env com suas credenciais reais

# 4. Aplicar migrações
npm run db:push

# 5. Popular planos (IMPORTANTE: use IDs de produção!)
# Edite scripts/seed-subscription-plans.sql primeiro
npm run db:seed:plans

# 6. Build
npm run build

# 7. Iniciar (PM2)
pm2 start npm --name "storyteller" -- start
pm2 save
```

---

## ⚙️ Configurações CRÍTICAS

### 1. Arquivo `.env` de Produção

```env
# Banco
DATABASE_URL=postgresql://usuario:senha@host:5432/database

# Segurança
JWT_SECRET=string_aleatoria_segura_aqui

# Ambiente
NODE_ENV=production
PORT=3000
APP_URL=https://seu-dominio.com

# Stripe PRODUÇÃO (não teste!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Stripe Dashboard - Modo PRODUÇÃO

**Desative o modo de teste!** (toggle no canto superior)

#### 2.1. Obter Chaves de API

https://dashboard.stripe.com/apikeys

- Copie `sk_live_...` e `pk_live_...`

#### 2.2. Configurar Webhook

https://dashboard.stripe.com/webhooks

**Adicionar endpoint:**
- URL: `https://seu-dominio.com/api/webhooks/stripe`
- Eventos:
  ```
  checkout.session.completed
  customer.subscription.*
  invoice.payment_*
  payment_method.*
  customer.updated
  customer.tax_id.*
  billing_portal.*
  ```

**Copie o "Signing secret" (whsec_...) e cole no .env**

#### 2.3. Configurar Portal do Cliente

https://dashboard.stripe.com/settings/billing/portal

- Habilite cancelamento, upgrade/downgrade, pagamentos, faturas
- URL de retorno: `https://seu-dominio.com/account/subscription`

### 3. Atualizar IDs dos Preços

Edite: `scripts/seed-subscription-plans.sql`

**USE OS IDs DE PRODUÇÃO!**

Exemplo:
```sql
stripe_monthly_price_id = 'price_PRODUCAO_mensal_pro'  -- NÃO use price_test_!
stripe_yearly_price_id = 'price_PRODUCAO_anual_pro'    -- NÃO use price_test_!
```

---

## ✅ Checklist Mínimo

- [ ] Pull do código (`git pull origin dev`)
- [ ] `.env` configurado com credenciais de PRODUÇÃO
- [ ] Stripe em modo PRODUÇÃO (não teste)
- [ ] Webhook configurado no Stripe Dashboard
- [ ] IDs dos preços atualizados para produção
- [ ] Migrações aplicadas (`npm run db:push`)
- [ ] Planos populados (`npm run db:seed:plans`)
- [ ] Build feito (`npm run build`)
- [ ] Servidor iniciado (`pm2 start`)
- [ ] Teste: fazer um pagamento real pequeno

---

## 🧪 Testar

1. Acesse: `https://seu-dominio.com`
2. Faça login
3. Vá para "Pricing"
4. Faça um pagamento pequeno (ex: plano mensal)
5. Verifique se a assinatura foi criada:
   ```bash
   npm run db:debug
   ```
6. Teste o Portal do Cliente em "Assinatura" → "Gerenciar Assinatura"

---

## 📚 Documentação Completa

**Checklist detalhado:** `DEPLOY_PRODUCAO_CHECKLIST.md` (200+ linhas)

**Outros guias:**
- `docs/PORTAL_CLIENTE_STRIPE.md` - Portal do Cliente
- `docs/GUIA_TESTE_PORTAL_CLIENTE.md` - Testes
- `docs/INDICE_GUIAS.md` - Índice completo

---

## ⚠️ IMPORTANTE

### ❌ NÃO use chaves de teste em produção!
- `sk_test_` → Errado
- `sk_live_` → Correto

### ❌ NÃO use IDs de preço de teste!
- `price_test_` → Errado  
- `price_` (sem test) → Correto

### ✅ SEMPRE verifique:
- Modo PRODUÇÃO ativado no Stripe Dashboard
- Webhook configurado e ativo
- Banco de dados de produção acessível

---

**Status:** 🚀 Pronto para deploy!  
**Próximo passo:** Seguir o checklist acima

