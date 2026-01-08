# 🚀 Deploy Produção - Checklist Completo

## ✅ Código já deployado!

O código foi mergeado para `main` e o EasyPanel está fazendo o deploy automático agora (~2-3 minutos).

---

## 📋 O QUE FAZER AGORA (Banco de Dados de Produção)

### 1️⃣ Conectar no Banco de Produção (2 min)

```bash
ssh root@seu-ip-vps

docker exec -it storyteller_storyteller_db.1.9ffajpho5et971zu4m0gtty2c psql -U storyteller_user -d storyteller_db
```

---

### 2️⃣ Criar Tabelas de Cupons (1 min)

Cole este SQL:

```sql
-- Criar ENUM para tipo de cupom
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_type') THEN
    CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_trial', 'free_plan');
  END IF;
END $$;

-- Tabela de cupons
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  type coupon_type NOT NULL,
  discount_value INTEGER,
  plan_id INTEGER,
  duration_stripe VARCHAR(32) DEFAULT 'once',
  duration_months INTEGER,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0 NOT NULL,
  valid_from TIMESTAMP DEFAULT NOW() NOT NULL,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true NOT NULL,
  stripe_coupon_id VARCHAR(255),
  description VARCHAR(512),
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de uso de cupons
CREATE TABLE IF NOT EXISTS coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  subscription_id INTEGER,
  discount_applied INTEGER NOT NULL,
  used_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
```

---

### 3️⃣ Atualizar Planos com IDs do Stripe (1 min)

```sql
-- Atualizar Plano Pro com IDs de preço REAIS do Stripe
UPDATE subscription_plans
SET
  stripe_monthly_price_id = 'price_1SmJ1XPF9dhbqC6rzY0iiHxO',
  stripe_yearly_price_id = 'price_1SmOzvPF9dhbqC6rsdYMap3N',
  has_trial_days = 0
WHERE name = 'pro';

-- Atualizar Plano Business com IDs de preço REAIS do Stripe
UPDATE subscription_plans
SET
  stripe_monthly_price_id = 'price_1SmKbCPF9dhbqC6re81wKJoE',
  stripe_yearly_price_id = 'price_1SmP0rPF9dhbqC6rTNVdSY0m',
  has_trial_days = 0
WHERE name = 'business';

-- Verificar
SELECT
  name,
  display_name,
  has_trial_days,
  stripe_monthly_price_id,
  stripe_yearly_price_id
FROM subscription_plans;
```

Deve aparecer:

```
   name   | display_name | has_trial_days |    stripe_monthly_price_id     |     stripe_yearly_price_id
----------+--------------+----------------+--------------------------------+--------------------------------
 free     | Gratuito     |              0 |                                |
 pro      | Pro          |              0 | price_1SmJ1XPF9dhbqC6rzY0iiHxO | price_1SmOzvPF9dhbqC6rsdYMap3N
 business | Business     |              0 | price_1SmKbCPF9dhbqC6re81wKJoE | price_1SmP0rPF9dhbqC6rTNVdSY0m
```

---

### 4️⃣ Criar Cupons de Exemplo (Opcional - 1 min)

```sql
-- Cupons promocionais de exemplo
INSERT INTO coupons (code, type, discount_value, description, max_uses) VALUES
  ('BEMVINDO', 'percentage', 20, 'Desconto de 20% para novos usuários', 100),
  ('LANCAMENTO', 'percentage', 30, 'Desconto de lançamento - 30% off', 50),
  ('PRIMEIRA', 'percentage', 50, 'Primeira compra - 50% off', NULL)
ON CONFLICT (code) DO NOTHING;

-- Ver cupons criados
SELECT code, type, discount_value, description, max_uses FROM coupons;
```

---

### 5️⃣ Sair do Banco (1 seg)

```sql
\q
```

```bash
exit
```

---

## 🔍 Verificar Deploy no EasyPanel

1. **Acesse o EasyPanel:**
   - Vá em **Logs** da aplicação `storyteller`
2. **Deve aparecer:**

   ```
   ✅ Stripe initialized successfully
   🔍 Environment Check:
      STRIPE_SECRET_KEY: ✓ Loaded
      OPENAI_API_KEY: ✓ Loaded
      DATABASE_URL: ✓ Loaded
   Server running on http://0.0.0.0:3000/
   ```

3. **Se aparecer erro**, compartilhe os logs!

---

## 🧪 Testar em Produção

### 1. Acessar o site

```
https://storytellerboard.com
```

### 2. Criar/Fazer login

### 3. Ver planos

```
https://storytellerboard.com/pricing
```

### 4. Testar checkout

- Clique em "Assinar" no plano Pro
- Use cartão de teste: `4242 4242 4242 4242`
- Deve cobrar **imediatamente** R$ 49,00
- Sem período de trial

### 5. Aplicar cupom (se criou)

- No checkout, digite: `BEMVINDO`
- Deve aplicar 20% de desconto
- Total: R$ 39,20

### 6. Gerenciar assinatura

- Após assinar, clique em "Gerenciar Assinatura"
- Deve abrir o Portal do Cliente Stripe

---

## 📊 Verificar no Banco

```bash
ssh root@seu-ip-vps
docker exec -it storyteller_storyteller_db.1.9ffajpho5et971zu4m0gtty2c psql -U storyteller_user -d storyteller_db
```

```sql
-- Ver assinaturas criadas
SELECT
  id,
  user_id,
  plan_id,
  status,
  stripe_subscription_id
FROM subscriptions
ORDER BY created_at DESC
LIMIT 5;

-- Ver cupons usados
SELECT
  c.code,
  COUNT(cu.id) as total_usos,
  SUM(cu.discount_applied) / 100.0 as total_desconto_reais
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
GROUP BY c.id, c.code;
```

---

## 🎯 Resumo do Deploy

### ✅ O que foi deployado:

1. **Sistema de Cupons Completo**
   - Criar, validar, aplicar cupons
   - 4 tipos: porcentagem, fixo, trial, plano grátis
   - Limite de uso e validade
   - Integração com Stripe

2. **Correções de Bugs**
   - Portal do cliente aceita status "trialing"
   - Rota `applyCoupon` corrigida

3. **Melhorias nos Planos**
   - Trial removido (Pro/Business cobram imediatamente)
   - Plano Free serve como período de teste
   - IDs de preço do Stripe atualizados

---

## 🆘 Se algo der errado:

### Erro ao criar tabelas:

```sql
-- Ver se tabelas existem
\dt

-- Ver se o ENUM existe
SELECT typname FROM pg_type WHERE typname = 'coupon_type';
```

### Deploy não atualizou:

1. Verifique os logs no EasyPanel
2. Se necessário, force um rebuild
3. Verifique se as variáveis de ambiente estão corretas

### Webhook não funciona:

```
https://storytellerboard.com/api/webhooks/stripe
```

Deve estar configurado no Stripe Dashboard.

---

## ✅ Checklist Final

- [ ] Deploy completou no EasyPanel (sem erros nos logs)
- [ ] Conectei no banco de produção via SSH
- [ ] Criei as tabelas de cupons
- [ ] Atualizei os planos com IDs do Stripe
- [ ] Removi trial dos planos (has_trial_days = 0)
- [ ] Testei criar usuário
- [ ] Testei fazer checkout (com cobrança imediata)
- [ ] Testei aplicar cupom
- [ ] Testei "Gerenciar Assinatura"
- [ ] Verifiquei que assinatura foi criada no banco

---

**Após completar todos os passos, está em produção! 🎉**

Qualquer dúvida ou erro, me avise!
