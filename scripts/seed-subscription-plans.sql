-- Script para popular os planos de assinatura
-- Execute após criar as tabelas

-- Limpar planos existentes (CUIDADO EM PRODUÇÃO!)
-- DELETE FROM subscription_plans;

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
  NULL, 50000, -- Features ilimitadas, 50k tokens
  false, false,
  false, false,
  0,
  true
) ON CONFLICT (name) DO UPDATE SET
  features_limit = EXCLUDED.features_limit,
  tokens_limit = EXCLUDED.tokens_limit;

-- Plano Pro
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
  4900, 49099, -- R$ 49.00 mensal e R$ 490.99 anual (em centavos)
  NULL, 500000, -- Features ilimitadas, 500k tokens
  true, true,
  false, false,
  7, -- 7 dias de trial
  'price_1SmJ1XPF9dhbqC6rzY0iiHxO', -- ID mensal R$ 49,00
  'price_1SmOzvPF9dhbqC6rsdYMap3N', -- ID anual R$ 490,99
  true
) ON CONFLICT (name) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  tokens_limit = EXCLUDED.tokens_limit,
  stripe_monthly_price_id = EXCLUDED.stripe_monthly_price_id,
  stripe_yearly_price_id = EXCLUDED.stripe_yearly_price_id;

-- Plano Business
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
  14900, 149000, -- R$ 149.00 mensal e R$ 1.490.00 anual (em centavos)
  NULL, 2000000, -- Features ilimitadas, 2M tokens
  true, true,
  true, true,
  0, -- Sem trial
  'price_1SmKbCPF9dhbqC6re81wKJoE', -- ID mensal R$ 149,00
  'price_1SmP0rPF9dhbqC6rTNVdSY0m', -- ID anual R$ 1.490,00
  true
) ON CONFLICT (name) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  tokens_limit = EXCLUDED.tokens_limit,
  stripe_monthly_price_id = EXCLUDED.stripe_monthly_price_id,
  stripe_yearly_price_id = EXCLUDED.stripe_yearly_price_id;

-- Verificar se foi inserido corretamente
SELECT * FROM subscription_plans ORDER BY price_monthly;







