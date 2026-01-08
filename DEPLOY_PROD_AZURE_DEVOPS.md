# 🚀 Deploy Produção - Azure DevOps Multi-Projetos

## ✅ Código já está em `main`!

O EasyPanel vai fazer o deploy automático agora (~2-3 minutos).

---

## 📋 O QUE FAZER AGORA

### 1️⃣ Conectar no Banco de Produção

```bash
ssh root@srv988145.vps.locaweb.com.br

docker exec -it storyteller_storyteller_db.1.9ffajpho5et971zu4m0gtty2c psql -U storyteller_user -d storyteller_db
```

---

### 2️⃣ Criar Tabelas do Azure DevOps Melhorado

```sql
-- =====================================================
-- MIGRAÇÃO: Azure DevOps - Nova Estrutura
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

-- Adicionar coluna para vincular feature ao projeto do Azure
ALTER TABLE features 
ADD COLUMN IF NOT EXISTS azure_project_id INTEGER;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_features_azure_project ON features(azure_project_id);

COMMIT;
```

---

### 3️⃣ Migrar Dados Antigos (se existirem)

```sql
-- Migrar credenciais da tabela antiga para a nova
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
  user_id, name,
  default_area, default_iteration, default_state,
  default_board, default_column, default_swimlane,
  created_at, updated_at
)
SELECT 
  user_id,
  project as name,
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
  AND name = azure_devops_configs.project
);
```

---

### 4️⃣ Verificar Migração

```sql
-- Ver credenciais migradas
SELECT 
  id, 
  user_id, 
  organization,
  CASE WHEN pat IS NOT NULL THEN '***OCULTO***' ELSE NULL END as pat_exists
FROM azure_devops_credentials
ORDER BY created_at DESC;

-- Ver projetos migrados
SELECT 
  id,
  user_id,
  name,
  is_active
FROM azure_devops_projects
ORDER BY created_at DESC;
```

---

### 5️⃣ Sair do Banco

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
   [Database] Connection established successfully
   Server running on http://0.0.0.0:3000/
   ```

3. **Se aparecer erro**, compartilhe os logs!

---

## 🧪 Testar Nova Funcionalidade

### 1. Acessar Config do Azure DevOps

```
https://storytellerboard.com/config/azure-devops
```

### 2. Configurar Credenciais

- **Organização:** Nome da sua organização no Azure DevOps
- **PAT:** Personal Access Token
- Clique em "Salvar Credenciais"

### 3. Adicionar Projetos

- Clique em "Adicionar Projeto"
- **Nome do Projeto:** Use o nome exato do Azure DevOps
- **Área Padrão:** (Opcional) Ex: `/Frontend`
- **Iteração Padrão:** (Opcional) Ex: `Sprint 1`
- **Estado Padrão:** (Opcional) Ex: `New`

### 4. Testar Exportação

1. Gere uma feature qualquer
2. Clique em "Exportar" → "Exportar para Azure DevOps"
3. Selecione o projeto no dropdown
4. Confirme a exportação
5. Deve criar um Epic no Azure DevOps

---

## 🎯 O que foi Deployado

### ✅ Nova Estrutura Azure DevOps:

1. **Separação de Credenciais e Projetos**
   - Organização + PAT: configuração global única
   - Projetos: múltiplos por usuário

2. **Interface Visual Completa**
   - Seção de credenciais com toggle de visibilidade no PAT
   - Seção de projetos com CRUD completo
   - Modo de edição inline
   - Confirmação de exclusão

3. **Seleção de Projeto ao Exportar**
   - Dialog com dropdown de projetos
   - Preview das configurações do projeto
   - Validação antes de exportar

4. **Remoção do Campo "Chave"**
   - Simplificado: usa apenas o nome do projeto
   - Nome deve ser exato do Azure DevOps

5. **Aba Jira Oculta**
   - Menu lateral sem "Config. Jira"
   - Código mantido para reativação futura

---

## ✅ Checklist Final

- [ ] Deploy completou no EasyPanel (sem erros nos logs)
- [ ] Conectei no banco de produção via SSH
- [ ] Criei as novas tabelas do Azure DevOps
- [ ] Migrei dados antigos (se existiam)
- [ ] Verifiquei credenciais e projetos no banco
- [ ] Testei acessar a página de config do Azure DevOps
- [ ] Testei configurar organização e PAT
- [ ] Testei adicionar um projeto
- [ ] Testei editar um projeto
- [ ] Testei deletar um projeto
- [ ] Testei exportar uma feature selecionando o projeto
- [ ] Verifiquei que o Epic foi criado no Azure DevOps

---

## 🆘 Se algo der errado

### Erro ao criar tabelas:

```sql
-- Ver se tabelas existem
\dt

-- Ver estrutura das tabelas
\d azure_devops_credentials
\d azure_devops_projects
```

### Deploy não atualizou:

1. Verifique os logs no EasyPanel
2. Force um rebuild se necessário
3. Verifique se o código está em `main`

### Exportação para Azure não funciona:

1. Verifique se o PAT tem permissões corretas
2. Verifique se o nome do projeto está exato
3. Verifique logs do servidor no EasyPanel

---

**Após completar todos os passos, a nova funcionalidade está em produção! 🎉**

Qualquer dúvida ou erro, me avise!

