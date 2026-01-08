-- Script para criar tabelas de cupons
-- Execute após criar as tabelas principais

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

-- Índices para melhor performance
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


