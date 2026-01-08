-- Script completo para criar TODAS as tabelas do StoryTeller
-- Execute este script no banco local (Docker)

-- =====================================================
-- CRIAR ENUMs
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE role AS ENUM ('user', 'admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language') THEN
    CREATE TYPE language AS ENUM ('pt', 'en');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status') THEN
    CREATE TYPE status AS ENUM ('draft', 'exported', 'archived');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_target') THEN
    CREATE TYPE export_target AS ENUM ('jira', 'azure_devops');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority') THEN
    CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status') THEN
    CREATE TYPE execution_status AS ENUM ('started', 'processing', 'success', 'error');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
    CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_type') THEN
    CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_trial', 'free_plan');
  END IF;
END $$;

-- =====================================================
-- TABELAS PRINCIPAIS
-- =====================================================

-- Tabela users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name TEXT NOT NULL,
  "openId" VARCHAR(64) UNIQUE,
  "loginMethod" VARCHAR(64) DEFAULT 'local',
  role role DEFAULT 'user' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela llm_configs
CREATE TABLE IF NOT EXISTS llm_configs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(64) NOT NULL DEFAULT 'openai',
  model VARCHAR(128) NOT NULL DEFAULT 'gpt-4',
  api_key TEXT,
  temperature VARCHAR(10) DEFAULT '0.7',
  max_tokens INTEGER DEFAULT 2000,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela jira_configs
CREATE TABLE IF NOT EXISTS jira_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  jira_url VARCHAR(512) NOT NULL,
  email VARCHAR(320) NOT NULL,
  api_token TEXT NOT NULL,
  default_project VARCHAR(128),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela azure_devops_configs
CREATE TABLE IF NOT EXISTS azure_devops_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  organization VARCHAR(256) NOT NULL,
  project VARCHAR(256) NOT NULL,
  pat TEXT NOT NULL,
  default_area VARCHAR(256),
  default_iteration VARCHAR(256),
  default_state VARCHAR(128),
  default_board VARCHAR(256),
  default_column VARCHAR(128),
  default_swimlane VARCHAR(128),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela features
CREATE TABLE IF NOT EXISTS features (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(512) NOT NULL,
  description TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  language language DEFAULT 'pt' NOT NULL,
  status status DEFAULT 'draft' NOT NULL,
  export_target export_target,
  jira_issue_key VARCHAR(64),
  azure_devops_work_item_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela user_stories
CREATE TABLE IF NOT EXISTS user_stories (
  id SERIAL PRIMARY KEY,
  feature_id INTEGER NOT NULL,
  title VARCHAR(512) NOT NULL,
  description TEXT NOT NULL,
  priority priority DEFAULT 'medium' NOT NULL,
  story_points INTEGER,
  jira_issue_key VARCHAR(64),
  azure_devops_work_item_id INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela acceptance_criteria
CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id SERIAL PRIMARY KEY,
  user_story_id INTEGER NOT NULL,
  criterion TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_story_id INTEGER NOT NULL,
  title VARCHAR(512) NOT NULL,
  description TEXT,
  estimated_hours INTEGER,
  jira_issue_key VARCHAR(64),
  azure_devops_work_item_id INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela execution_logs
CREATE TABLE IF NOT EXISTS execution_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  feature_id INTEGER,
  status execution_status NOT NULL,
  prompt_length INTEGER NOT NULL,
  chunks_count INTEGER DEFAULT 0,
  total_stories INTEGER DEFAULT 0,
  ai_response TEXT,
  error_message TEXT,
  start_time TIMESTAMP DEFAULT NOW() NOT NULL,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela token_usage
CREATE TABLE IF NOT EXISTS token_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  feature_id INTEGER,
  operation VARCHAR(128) NOT NULL,
  model VARCHAR(128) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- SISTEMA DE ASSINATURAS
-- =====================================================

-- Tabela subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  price_monthly INTEGER,
  price_yearly INTEGER,
  features_limit INTEGER,
  tokens_limit INTEGER,
  can_export_jira BOOLEAN DEFAULT false,
  can_export_azure BOOLEAN DEFAULT false,
  has_api_access BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  stripe_monthly_price_id VARCHAR(255),
  stripe_yearly_price_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
  status subscription_status NOT NULL,
  billing_cycle billing_cycle NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  tokens_used_this_period INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(32) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  payment_method VARCHAR(64),
  error_message TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- SISTEMA DE CUPONS
-- =====================================================

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

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Planos de assinatura
INSERT INTO subscription_plans (
  name, display_name, 
  price_monthly, price_yearly,
  features_limit, tokens_limit,
  can_export_jira, can_export_azure,
  has_api_access, has_priority_support,
  has_trial_days,
  is_active
) VALUES 
  ('free', 'Gratuito', 0, 0, NULL, 50000, false, false, false, false, 0, true),
  ('pro', 'Pro', 4900, 49099, NULL, 500000, true, true, false, false, 7, true),
  ('business', 'Business', 14900, 149000, NULL, 2000000, true, true, true, true, 0, true)
ON CONFLICT (name) DO NOTHING;

-- Cupons de teste
INSERT INTO coupons (code, type, discount_value, description, max_uses) VALUES
  ('BEMVINDO', 'percentage', 20, 'Desconto de 20% para novos usuários', 100),
  ('PRIMEIRA', 'percentage', 50, 'Desconto de 50% no primeiro mês', 50),
  ('TRIAL30', 'free_trial', 30, '30 dias grátis de trial', NULL),
  ('GRATIS3MESES', 'free_plan', NULL, '3 meses grátis do plano Pro', 20)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Listar todas as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Contar registros em cada tabela
SELECT 
  'users' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons;

