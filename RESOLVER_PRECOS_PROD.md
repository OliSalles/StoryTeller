# 🔧 Resolver: Preços não aparecem em Produção

## 🔍 Diagnóstico Rápido

Execute no servidor de produção:

```bash
npm run db:debug:plans
```

Este comando vai mostrar:
- ✅ Quantos planos estão cadastrados
- ✅ Se os IDs do Stripe estão configurados
- ⚠️ Se está usando IDs de teste ao invés de produção
- ⚠️ Quais planos têm problemas

---

## 🚨 Causas Comuns

### 1. **Planos não foram cadastrados no banco**

**Sintoma:** Script retorna "NENHUM PLANO ENCONTRADO"

**Solução:**
```bash
npm run db:seed:plans
```

### 2. **IDs do Stripe são de TESTE (não produção)**

**Sintoma:** IDs começam com `price_test_`

**Problema:** Em produção, você precisa usar IDs de PRODUÇÃO!

**Solução:**

#### Passo 1: Obter IDs de Produção do Stripe

1. Acesse: https://dashboard.stripe.com
2. **DESATIVE o modo de teste** (toggle no canto superior direito)
3. Vá em: **Produtos**
4. Para cada produto, copie os IDs dos preços:
   - Preço mensal: começa com `price_` (SEM "test")
   - Preço anual: começa com `price_` (SEM "test")

#### Passo 2: Atualizar o Script

Edite: `scripts/seed-subscription-plans.sql`

**Procure as linhas e substitua pelos IDs de PRODUÇÃO:**

```sql
-- Plano Pro
ON CONFLICT (name) DO UPDATE SET
  stripe_monthly_price_id = 'price_SEU_ID_MENSAL_PRO_AQUI',  -- NÃO use price_test_!
  stripe_yearly_price_id = 'price_SEU_ID_ANUAL_PRO_AQUI',    -- NÃO use price_test_!
  ...

-- Plano Business
ON CONFLICT (name) DO UPDATE SET
  stripe_monthly_price_id = 'price_SEU_ID_MENSAL_BUSINESS_AQUI',  -- NÃO use price_test_!
  stripe_yearly_price_id = 'price_SEU_ID_ANUAL_BUSINESS_AQUI',    -- NÃO use price_test_!
  ...
```

#### Passo 3: Executar o Script

```bash
npm run db:seed:plans
```

#### Passo 4: Verificar

```bash
npm run db:debug:plans
```

Agora deve mostrar: `✅ ID mensal está correto (produção)`

### 3. **Chaves do Stripe são de TESTE**

**Sintoma:** Checkout não funciona ou dá erro

**Problema:** `.env` está com chaves de teste (`sk_test_`, `pk_test_`)

**Solução:**

Edite o arquivo `.env` no servidor:

```env
# Use chaves de PRODUÇÃO (não teste!)
STRIPE_SECRET_KEY=sk_live_sua_chave_aqui        # Começa com sk_live_
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_aqui   # Começa com pk_live_
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_aqui
```

Obtenha as chaves em:
1. https://dashboard.stripe.com/apikeys
2. **Desative o modo de teste primeiro!**

Depois, reinicie o servidor:
```bash
pm2 restart storyteller
```

### 4. **Servidor não foi reiniciado**

**Sintoma:** Alterações não têm efeito

**Solução:**
```bash
pm2 restart storyteller
# ou
pm2 restart all
```

### 5. **Build não foi feito**

**Sintoma:** Mudanças no código não aparecem

**Solução:**
```bash
npm run build
pm2 restart storyteller
```

---

## ✅ Checklist de Verificação

Execute em ordem:

- [ ] 1. Verificar planos: `npm run db:debug:plans`
- [ ] 2. Se nenhum plano: `npm run db:seed:plans`
- [ ] 3. Se IDs de teste: Atualizar `seed-subscription-plans.sql` com IDs de produção
- [ ] 4. Executar novamente: `npm run db:seed:plans`
- [ ] 5. Verificar `.env` tem chaves de produção (`sk_live_`, `pk_live_`)
- [ ] 6. Reiniciar servidor: `pm2 restart storyteller`
- [ ] 7. Verificar novamente: `npm run db:debug:plans`
- [ ] 8. Acessar o site e verificar página de Pricing

---

## 🧪 Teste Final

1. Acesse: `https://seu-dominio.com/pricing`
2. Você deve ver 3 planos: Free, Pro, Business
3. Cada plano deve mostrar preços mensais e anuais
4. Botões "Começar Agora" ou "Fazer Upgrade" devem aparecer

Se ainda não aparecer:

```bash
# Ver logs do servidor
pm2 logs storyteller

# Ver logs do navegador
# Abra F12 → Console no navegador
```

---

## 📝 Exemplo Correto vs Incorreto

### ❌ INCORRETO (modo teste):
```sql
stripe_monthly_price_id = 'price_test_51SmHb9PF9dhbqC6rSEp...'  -- ❌ Tem "test"
```

### ✅ CORRETO (modo produção):
```sql
stripe_monthly_price_id = 'price_1TxABC123DEF456GHI789...'  -- ✅ Sem "test"
```

---

## 🆘 Ainda não funciona?

### Ver logs detalhados:

```bash
# Logs do servidor
pm2 logs storyteller --lines 100

# Status do PM2
pm2 status

# Verificar se o servidor está respondendo
curl https://seu-dominio.com/api/trpc/subscriptions.getPlans
```

### Verificar Console do Navegador:

1. Abra o site
2. Pressione F12
3. Vá em "Console"
4. Procure por erros em vermelho

Se houver erro relacionado a CORS, Stripe ou API, me envie o erro completo.

---

## 📚 Arquivos Importantes

- **Script de seed:** `scripts/seed-subscription-plans.sql`
- **Script de debug:** `scripts/debug-prod-plans.js`
- **Variáveis de ambiente:** `.env` (no servidor)
- **Configuração do Stripe:** Dashboard → Produtos

---

**Execute agora:** `npm run db:debug:plans`

