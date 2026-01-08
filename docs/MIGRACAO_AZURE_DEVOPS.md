# 🔄 Migração: Azure DevOps - Nova Estrutura

## 📋 O que mudou?

### ❌ Antes (Estrutura Antiga):
```
azure_devops_configs
├── organization
├── project (apenas 1)
├── pat
└── configurações padrão
```

**Limitação:** Apenas **1 projeto** por usuário.

---

### ✅ Depois (Nova Estrutura):
```
azure_devops_credentials (1 por usuário)
├── organization
└── pat

azure_devops_projects (N por usuário)
├── name (nome amigável)
├── project_key (chave do projeto)
└── configurações padrão
```

**Vantagem:** **Múltiplos projetos** por usuário! 🎉

---

## 🎯 Benefícios:

1. ✅ **Múltiplos Projetos** - Crie quantos projetos quiser
2. ✅ **Organização** - Separe credenciais de projetos
3. ✅ **Seleção Flexível** - Escolha o projeto ao exportar
4. ✅ **Segurança** - Token armazenado uma vez

---

## 🚀 Como Migrar:

### Passo 1: Executar Script SQL (5 min)

#### Local (Desenvolvimento):
```bash
docker exec -it storyteller_postgres psql -U postgres -d storyteller
```

#### Produção:
```bash
ssh root@seu-ip-vps
docker exec -it storyteller_storyteller_db.1.9ffajpho5et971zu4m0gtty2c psql -U storyteller_user -d storyteller_db
```

Cole o SQL:
```sql
\i scripts/migrate-azure-devops-structure.sql
```

Ou cole o conteúdo do arquivo `scripts/migrate-azure-devops-structure.sql`

---

### Passo 2: Verificar Migração (1 min)

```sql
-- Ver credenciais migradas
SELECT id, user_id, organization FROM azure_devops_credentials;

-- Ver projetos migrados
SELECT id, user_id, name, project_key FROM azure_devops_projects;

-- Ver se features têm a nova coluna
\d features
```

Deve aparecer a coluna `azure_project_id` na tabela `features`.

---

### Passo 3: Testar na Interface (2 min)

1. **Acesse:** http://localhost:5173/azure-devops-config (ou produção)
2. **Verifique:**
   - ✅ Seção "Credenciais" com Organização + Token
   - ✅ Seção "Projetos" com lista de projetos
   - ✅ Botão "Adicionar Projeto"

---

## 📊 Exemplo de Dados:

### Credenciais (1 por usuário):
```
┌────┬─────────┬──────────────┬──────┐
│ id │ user_id │ organization │ pat  │
├────┼─────────┼──────────────┼──────┤
│  1 │    1    │ MinhaOrg     │ *** │
└────┴─────────┴──────────────┴──────┘
```

### Projetos (múltiplos por usuário):
```
┌────┬─────────┬─────────────┬─────────────┬──────────┐
│ id │ user_id │    name     │ project_key │ is_active│
├────┼─────────┼─────────────┼─────────────┼──────────┤
│  1 │    1    │ Projeto A   │ PROJA       │   true   │
│  2 │    1    │ Projeto B   │ PROJB       │   true   │
│  3 │    1    │ Teste       │ TEST        │   true   │
└────┴─────────┴─────────────┴─────────────┴──────────┘
```

---

## 🔄 Fluxo de Uso:

### 1. Configurar Credenciais (uma vez)
```
Página de Config
├── Organização: "MinhaOrg"
└── Token: "••••••••"
```

### 2. Adicionar Projetos
```
Página de Config
├── Projeto 1: "Frontend" (chave: FRONT)
├── Projeto 2: "Backend" (chave: BACK)
└── Projeto 3: "Mobile" (chave: MOBILE)
```

### 3. Exportar Feature
```
Gerar Feature
├── Nome: "Nova Feature"
├── Descrição: "..."
└── [Exportar para Azure]
    └── Selecionar Projeto: [Frontend ▼]
                            ├── Frontend
                            ├── Backend
                            └── Mobile
```

---

## 🎨 Nova Interface:

### Seção 1: Credenciais
```
┌─────────────────────────────────────────┐
│ 🔑 Credenciais do Azure DevOps         │
├─────────────────────────────────────────┤
│                                         │
│ Organização *                          │
│ ┌─────────────────────────────────┐   │
│ │ MinhaOrg                         │   │
│ └─────────────────────────────────┘   │
│                                         │
│ Personal Access Token *                │
│ ┌─────────────────────────────────┐   │
│ │ •••••••••••••••        [👁️]    │   │
│ └─────────────────────────────────┘   │
│                                         │
│ [Salvar Credenciais]                   │
└─────────────────────────────────────────┘
```

### Seção 2: Projetos
```
┌─────────────────────────────────────────┐
│ 📦 Projetos                             │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Frontend (FRONT)         [✏️] [🗑️] │   │
│ │ Área: /Frontend                  │   │
│ │ Board: Main Board                │   │
│ └─────────────────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Backend (BACK)           [✏️] [🗑️] │   │
│ │ Área: /Backend                   │   │
│ │ Board: Development               │   │
│ └─────────────────────────────────┘   │
│                                         │
│ [+ Adicionar Projeto]                  │
└─────────────────────────────────────────┘
```

---

## ⚠️ Notas Importantes:

### 1. Migração Automática
- Os dados antigos são **automaticamente migrados**
- A tabela antiga **não é deletada** (para segurança)
- Você pode remover a tabela antiga depois de confirmar que tudo funciona

### 2. Compatibilidade
- A API antiga (`azureDevOps`) **continua funcionando**
- A nova API (`azureDevOpsImproved`) é usada pela nova interface
- Migração é **não-destrutiva**

### 3. Rollback
Se precisar voltar atrás:
```sql
-- Restaurar tabela antiga (se não foi deletada)
-- As funcionalidades antigas continuam funcionando
```

---

## ✅ Checklist de Migração:

- [ ] Executei o script SQL no banco local
- [ ] Executei o script SQL no banco de produção
- [ ] Verifiquei que as credenciais foram migradas
- [ ] Verifiquei que os projetos foram migrados
- [ ] Testei a nova interface
- [ ] Adicionei um novo projeto
- [ ] Testei exportar feature selecionando projeto

---

## 🆘 Troubleshooting:

### Erro: "table already exists"
É seguro ignorar. Significa que a tabela já foi criada.

### Credenciais não migraram
```sql
-- Ver se há dados na tabela antiga
SELECT * FROM azure_devops_configs;

-- Migrar manualmente
INSERT INTO azure_devops_credentials (user_id, organization, pat)
SELECT user_id, organization, pat FROM azure_devops_configs LIMIT 1;
```

### Projetos não migraram
```sql
-- Ver quantos registros existem
SELECT COUNT(*) FROM azure_devops_configs;

-- Migrar manualmente
INSERT INTO azure_devops_projects (user_id, name, project_key)
VALUES (1, 'Meu Projeto', 'PROJ');
```

---

**Pronto para migrar? Execute o script e aproveite os múltiplos projetos! 🚀**


