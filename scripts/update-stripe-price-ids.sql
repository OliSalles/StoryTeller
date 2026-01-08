-- Atualizar os planos com os IDs de preço do Stripe (modo teste)
-- Execute após criar a tabela subscription_plans

-- Plano Pro - R$ 49,00/mês e R$ 490,99/ano
UPDATE subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1SmJ1XPF9dhbqC6rzY0iiHxO',
  stripe_yearly_price_id = 'price_1SmOzvPF9dhbqC6rsdYMap3N'
WHERE name = 'pro';

-- Plano Business - R$ 149,00/mês e R$ 1.490,00/ano
UPDATE subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1SmKbCPF9dhbqC6re81wKJoE',
  stripe_yearly_price_id = 'price_1SmP0rPF9dhbqC6rTNVdSY0m'
WHERE name = 'business';

-- Verificar os planos atualizados
SELECT 
  id,
  name,
  display_name,
  price_monthly / 100.0 as preco_mensal_brl,
  price_yearly / 100.0 as preco_anual_brl,
  stripe_monthly_price_id,
  stripe_yearly_price_id
FROM subscription_plans
ORDER BY price_monthly;


