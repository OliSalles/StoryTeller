-- Configurações por empresa (ex.: seção de débitos técnicos no chat). Aditiva e idempotente.
-- Faça backup antes de aplicar em produção.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
