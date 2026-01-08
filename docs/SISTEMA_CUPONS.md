# 🎫 Sistema de Cupons - Guia Completo

## 📋 Visão Geral

O sistema de cupons permite criar códigos promocionais com:
- ✅ Descontos em porcentagem ou valor fixo
- ✅ Planos gratuitos (trial estendido ou permanente)
- ✅ Limite de uso (único, múltiplo, ilimitado)
- ✅ Validade configurável
- ✅ Integração com Stripe

---

## 🚀 Instalação (Produção)

### 1. Criar tabelas no banco (2 min)

Via SSH:

```bash
ssh root@seu-ip-vps
docker exec -it storyteller_storyteller_db.1.9ffajpho5et971zu4m0gtty2c psql -U storyteller_user -d storyteller_db
```

Cole o SQL:

```sql
-- Criar ENUM para tipo de cupom
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_trial', 'free_plan');

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

-- Cupons de exemplo
INSERT INTO coupons (code, type, discount_value, description, max_uses) VALUES
  ('BEMVINDO', 'percentage', 20, 'Desconto de 20% para novos usuários', 100),
  ('PRIMEIRA', 'percentage', 50, 'Desconto de 50% no primeiro mês', 50),
  ('TRIAL30', 'free_trial', 30, '30 dias grátis de trial', NULL),
  ('GRATIS3MESES', 'free_plan', NULL, '3 meses grátis do plano Pro', 20)
ON CONFLICT (code) DO NOTHING;

-- Ver cupons criados
SELECT * FROM coupons ORDER BY created_at;

\q
```

---

## 🎯 Tipos de Cupons

### 1️⃣ Desconto em Porcentagem (`percentage`)

**Exemplo:** 20% off

```sql
INSERT INTO coupons (code, type, discount_value, description, max_uses) VALUES
  ('DESCONTO20', 'percentage', 20, '20% de desconto', 100);
```

**Campos:**
- `discount_value`: Valor de 0-100 (ex: 20 = 20%)

---

### 2️⃣ Desconto Fixo (`fixed`)

**Exemplo:** R$ 10 de desconto

```sql
INSERT INTO coupons (code, type, discount_value, description, max_uses) VALUES
  ('10REAIS', 'fixed', 1000, 'R$ 10 de desconto', 50);
```

**Campos:**
- `discount_value`: Valor em centavos (1000 = R$ 10,00)

---

### 3️⃣ Trial Estendido (`free_trial`)

**Exemplo:** 30 dias grátis

```sql
INSERT INTO coupons (code, type, discount_value, description) VALUES
  ('TRIAL30', 'free_trial', 30, '30 dias de trial grátis');
```

**Campos:**
- `discount_value`: Número de dias extras de trial

---

### 4️⃣ Plano Gratuito (`free_plan`)

**Exemplo:** 3 meses grátis

```sql
INSERT INTO coupons (code, type, description, duration_stripe, duration_months, max_uses) VALUES
  ('3MESESGRATIS', 'free_plan', '3 meses do plano Pro grátis', 'repeating', 3, 20);
```

**Campos:**
- `discount_value`: NULL (não usado)
- `duration_stripe`: `once`, `repeating`, ou `forever`
- `duration_months`: Quantos meses aplicar (se `repeating`)

---

## 💡 Exemplos Práticos

### Cupom Black Friday (50% off, válido por 3 dias)

```sql
INSERT INTO coupons (
  code, type, discount_value, 
  description, max_uses,
  valid_from, valid_until
) VALUES (
  'BLACKFRIDAY50', 
  'percentage', 
  50,
  'Black Friday - 50% de desconto', 
  NULL,
  '2026-11-24 00:00:00',
  '2026-11-27 23:59:59'
);
```

---

### Cupom de Indicação (1 uso por usuário)

```sql
INSERT INTO coupons (
  code, type, discount_value, 
  description, max_uses
) VALUES (
  'INDIQUE123', 
  'fixed', 
  2000,
  'R$ 20 off por indicação', 
  1
);
```

> **Nota:** O sistema automaticamente impede que o mesmo usuário use o cupom mais de uma vez.

---

### Cupom VIP (uso ilimitado, sem expiração)

```sql
INSERT INTO coupons (
  code, type, discount_value, 
  description, max_uses
) VALUES (
  'VIP2026', 
  'percentage', 
  30,
  'Desconto VIP - 30% permanente', 
  NULL
);
```

---

### Cupom para Plano Específico

```sql
-- Cupom válido APENAS para o plano Pro (plan_id = 2)
INSERT INTO coupons (
  code, type, discount_value, 
  plan_id, description
) VALUES (
  'PROPREMIUM', 
  'percentage', 
  25,
  2,
  'Desconto exclusivo para plano Pro'
);
```

---

##  📊 Gerenciar Cupons

### Ver todos os cupons

```sql
SELECT 
  id, 
  code, 
  type, 
  discount_value, 
  used_count, 
  max_uses,
  is_active 
FROM coupons 
ORDER BY created_at DESC;
```

---

### Ver uso de um cupom

```sql
SELECT 
  c.code,
  c.description,
  c.used_count,
  c.max_uses,
  cu.user_id,
  cu.discount_applied / 100.0 as desconto_reais,
  cu.used_at
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
WHERE c.code = 'BEMVINDO'
ORDER BY cu.used_at DESC;
```

---

### Desativar cupom

```sql
UPDATE coupons SET is_active = false WHERE code = 'CUPOM123';
```

---

### Atualizar limite de uso

```sql
UPDATE coupons SET max_uses = 500 WHERE code = 'BEMVINDO';
```

---

### Estender validade

```sql
UPDATE coupons 
SET valid_until = '2026-12-31 23:59:59' 
WHERE code = 'PROMO2026';
```

---

## 🎨 Como o Usuário Usa

### 1. Na página de checkout

O usuário digita o código do cupom antes de finalizar a compra:

```
┌─────────────────────────────────┐
│  Plano Pro - R$ 49,00/mês      │
│                                 │
│  [Digite o cupom] [Aplicar]    │
│                                 │
│  ✅ Cupom BEMVINDO aplicado!   │
│  Desconto: -R$ 9,80 (20%)      │
│                                 │
│  Total: R$ 39,20/mês           │
│                                 │
│  [Finalizar Compra]            │
└─────────────────────────────────┘
```

---

### 2. Validação automática

O sistema verifica:
- ✅ Cupom existe e está ativo
- ✅ Não expirou
- ✅ Ainda tem usos disponíveis
- ✅ Usuário não usou antes
- ✅ É válido para o plano selecionado

---

## 🔗 Integração com Stripe

Para cupons funcionarem no Stripe também:

```sql
-- Criar cupom que sincroniza com Stripe
-- (via API, depois implementaremos no frontend)
```

O sistema pode criar o cupom automaticamente no Stripe quando `createInStripe = true`.

---

## 📈 Relatórios

### Total de descontos dados

```sql
SELECT 
  SUM(discount_applied) / 100.0 as total_descontos_reais,
  COUNT(*) as total_usos
FROM coupon_usage;
```

---

### Cupons mais usados

```sql
SELECT 
  c.code,
  c.description,
  c.used_count,
  SUM(cu.discount_applied) / 100.0 as total_desconto_dado
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
GROUP BY c.id
ORDER BY c.used_count DESC
LIMIT 10;
```

---

## 🎯 Próximos Passos

1. ✅ Tabelas criadas
2. ⏳ Adicionar interface admin para criar cupons
3. ⏳ Adicionar campo no checkout para aplicar cupom
4. ⏳ Integrar com Stripe Checkout
5. ⏳ Criar página de relatórios de cupons

---

## 🆘 Troubleshooting

### Erro: "relation 'coupon_type' does not exist"

Execute:
```sql
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_trial', 'free_plan');
```

---

### Erro: "Cupom já existe"

O código precisa ser único. Use outro código ou delete o existente:
```sql
DELETE FROM coupons WHERE code = 'CODIGO_DUPLICADO';
```

---

**Sistema de cupons implementado! 🎉**

Agora você pode criar cupons diretamente no banco de dados e eles estarão disponíveis para uso imediatamente!


