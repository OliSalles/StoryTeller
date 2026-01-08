-- =====================================================
-- MIGRAÇÃO: Azure DevOps - Nova Estrutura
-- =====================================================
-- Separa credenciais (org + token) de projetos
-- Permite múltiplos projetos por usuário
-- =====================================================

-- PASSO 1: Criar novas tabelas
-- =====================================================

-- Tabela de credenciais (1 por usuário)
CREATE TABLE IF NOT EXISTS azure_devops_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  organization VARCHAR(256) NOT NULL,
  pat TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de projetos (múltiplos por usuário)
CREATE TABLE IF NOT EXISTS azure_devops_projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(256) NOT NULL,
  project_key VARCHAR(256) NOT NULL,
  default_area VARCHAR(256),
  default_iteration VARCHAR(256),
  default_state VARCHAR(128),
  default_board VARCHAR(256),
  default_column VARCHAR(128),
  default_swimlane VARCHAR(128),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_azure_projects_user ON azure_devops_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_azure_projects_active ON azure_devops_projects(is_active);

-- =====================================================
-- PASSO 2: Migrar dados antigos (se existirem)
-- =====================================================

-- Migrar credenciais da tabela antiga
INSERT INTO azure_devops_credentials (user_id, organization, pat, created_at, updated_at)
SELECT DISTINCT ON (user_id)
  user_id,
  organization,
  pat,
  created_at,
  updated_at
FROM azure_devops_configs
WHERE NOT EXISTS (
  SELECT 1 FROM azure_devops_credentials WHERE user_id = azure_devops_configs.user_id
)
ORDER BY user_id, created_at DESC;

-- Migrar projetos da tabela antiga
INSERT INTO azure_devops_projects (
  user_id, name, project_key,
  default_area, default_iteration, default_state,
  default_board, default_column, default_swimlane,
  created_at, updated_at
)
SELECT 
  user_id,
  project as name,  -- Usa o nome do projeto como nome amigável
  project as project_key,
  default_area,
  default_iteration,
  default_state,
  default_board,
  default_column,
  default_swimlane,
  created_at,
  updated_at
FROM azure_devops_configs
WHERE NOT EXISTS (
  SELECT 1 FROM azure_devops_projects 
  WHERE user_id = azure_devops_configs.user_id 
  AND project_key = azure_devops_configs.project
);

-- =====================================================
-- PASSO 3: Verificar migração
-- =====================================================

-- Ver credenciais migradas
SELECT 
  id, 
  user_id, 
  organization,
  CASE WHEN pat IS NOT NULL THEN '***' ELSE NULL END as pat_exists
FROM azure_devops_credentials
ORDER BY created_at DESC;

-- Ver projetos migrados
SELECT 
  id,
  user_id,
  name,
  project_key,
  is_active
FROM azure_devops_projects
ORDER BY created_at DESC;

-- =====================================================
-- PASSO 4: (OPCIONAL) Remover tabela antiga
-- =====================================================

-- ⚠️ CUIDADO: Só execute depois de confirmar que a migração funcionou!
-- DROP TABLE IF EXISTS azure_devops_configs;

-- =====================================================
-- PASSO 5: Adicionar coluna azureProjectId na tabela features
-- =====================================================

-- Adicionar coluna para vincular feature ao projeto do Azure
ALTER TABLE features 
ADD COLUMN IF NOT EXISTS azure_project_id INTEGER;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_features_azure_project ON features(azure_project_id);

COMMIT;

