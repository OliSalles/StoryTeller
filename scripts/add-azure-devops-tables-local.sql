-- =====================================================
-- AZURE DEVOPS - CRIAR NOVAS TABELAS (DEV LOCAL)
-- =====================================================

-- Credenciais globais (1 por usuário)
CREATE TABLE IF NOT EXISTS azure_devops_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  organization VARCHAR(256) NOT NULL,
  pat TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Projetos (múltiplos por usuário)
CREATE TABLE IF NOT EXISTS azure_devops_projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(256) NOT NULL,
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

-- Adicionar coluna para vincular feature ao projeto
ALTER TABLE features ADD COLUMN IF NOT EXISTS azure_project_id INTEGER;

-- Índices
CREATE INDEX IF NOT EXISTS idx_azure_projects_user ON azure_devops_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_azure_projects_active ON azure_devops_projects(is_active);
CREATE INDEX IF NOT EXISTS idx_features_azure_project ON features(azure_project_id);

-- Verificar
SELECT 
  'azure_devops_credentials' as tabela, 
  COUNT(*) as total 
FROM azure_devops_credentials
UNION ALL
SELECT 
  'azure_devops_projects' as tabela, 
  COUNT(*) as total 
FROM azure_devops_projects;

-- Sucesso!
\echo '✅ Tabelas do Azure DevOps criadas com sucesso!'


