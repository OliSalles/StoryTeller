# Configuração do DBeaver

## 🗄️ Credenciais do Banco de Dados Local

### Informações de Conexão

```
Tipo: PostgreSQL
Host: localhost
Porta: 5432
Database: storyteller
Usuário: postgres
Senha: storyteller_dev_password
```

## 📝 Passo a Passo

1. **Abrir DBeaver**

2. **Nova Conexão**
   - `Database` → `New Database Connection`
   - Ou pressione `Ctrl + Shift + N`

3. **Selecionar PostgreSQL**
   - Escolha PostgreSQL na lista
   - Clique em **Next**

4. **Configurar Conexão**
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `storyteller`
   - **Username**: `postgres`
   - **Password**: `storyteller_dev_password`
   - ✅ Marque "Save password"

5. **Testar Conexão**
   - Clique em **Test Connection**
   - Baixe os drivers se solicitado
   - Aguarde confirmação: ✅ "Connected"

6. **Finalizar**
   - Clique em **Finish**

## 🔍 Queries Úteis

### Ver Planos de Assinatura
```sql
SELECT 
  name, 
  display_name, 
  price_monthly/100.0 as price_monthly_brl,
  price_yearly/100.0 as price_yearly_brl,
  features_limit, 
  tokens_limit,
  can_export_jira,
  can_export_azure
FROM subscription_plans
ORDER BY price_monthly;
```

### Ver Usuários Cadastrados
```sql
SELECT 
  id, 
  email, 
  name, 
  role, 
  login_method,
  created_at, 
  last_signed_in
FROM users
ORDER BY created_at DESC;
```

### Ver Features Criadas
```sql
SELECT 
  f.id, 
  f.title, 
  u.email as user_email, 
  f.status, 
  f.language,
  f.created_at
FROM features f
LEFT JOIN users u ON f.user_id = u.id
ORDER BY f.created_at DESC;
```

### Ver User Stories de uma Feature
```sql
SELECT 
  us.id,
  us.title,
  us.description,
  us.priority,
  us.story_points,
  f.title as feature_title
FROM user_stories us
JOIN features f ON us.feature_id = f.id
WHERE f.id = 1  -- Substitua pelo ID da feature
ORDER BY us.order_index;
```

### Ver Uso de Tokens por Usuário
```sql
SELECT 
  u.email,
  tu.operation,
  tu.model,
  SUM(tu.total_tokens) as total_tokens,
  SUM(tu.prompt_tokens) as prompt_tokens,
  SUM(tu.completion_tokens) as completion_tokens,
  COUNT(*) as operations_count
FROM token_usage tu
JOIN users u ON tu.user_id = u.id
GROUP BY u.email, tu.operation, tu.model
ORDER BY total_tokens DESC;
```

### Ver Assinaturas Ativas
```sql
SELECT 
  u.email,
  u.name,
  sp.display_name as plan_name,
  s.status,
  s.billing_cycle,
  s.current_period_start,
  s.current_period_end,
  s.tokens_used_this_period,
  sp.tokens_limit
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active'
ORDER BY s.current_period_end;
```

## 🗂️ Estrutura do Banco

### Tabelas Principais

1. **users** - Usuários do sistema
2. **subscription_plans** - Planos de assinatura (Free, Pro, Business)
3. **subscriptions** - Assinaturas dos usuários
4. **payments** - Histórico de pagamentos
5. **features** - Features geradas
6. **user_stories** - User stories das features
7. **acceptance_criteria** - Critérios de aceite
8. **tasks** - Tarefas técnicas
9. **execution_logs** - Logs de execução
10. **token_usage** - Uso de tokens da IA
11. **llm_configs** - Configurações do LLM
12. **jira_configs** - Configurações do Jira
13. **azure_devops_configs** - Configurações do Azure DevOps

## 🐳 Gerenciamento do Container

### Verificar se está rodando
```powershell
docker ps --filter "name=storyteller_postgres"
```

### Iniciar o container
```powershell
docker-compose up -d
```

### Parar o container
```powershell
docker-compose down
```

### Parar e remover volumes (⚠️ APAGA DADOS)
```powershell
docker-compose down -v
```

### Ver logs do PostgreSQL
```powershell
docker logs storyteller_postgres
```

### Acessar o PostgreSQL via linha de comando
```powershell
docker exec -it storyteller_postgres psql -U postgres -d storyteller
```

## 🔧 Troubleshooting

### Erro: "Connection refused"
- Verifique se o container está rodando: `docker ps`
- Se não estiver, inicie: `docker-compose up -d`
- Aguarde alguns segundos para o PostgreSQL inicializar

### Erro: "Password authentication failed"
- Verifique se está usando a senha correta: `storyteller_dev_password`
- Verifique o usuário: `postgres`
- Reinicie o container: `docker restart storyteller_postgres`

### Erro: "Database does not exist"
- Crie o database: `docker exec storyteller_postgres psql -U postgres -c "CREATE DATABASE storyteller;"`
- Execute as migrações: `pnpm db:push`

### Container não está rodando
```powershell
# Verificar status
docker ps -a --filter "name=storyteller_postgres"

# Iniciar
docker start storyteller_postgres

# Ou recriar
docker-compose up -d
```

## 📚 Referências

- [Documentação do DBeaver](https://dbeaver.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM](https://orm.drizzle.team/)


