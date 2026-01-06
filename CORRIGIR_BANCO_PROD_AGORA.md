# 🚨 ERRO: Tabela subscription_plans não existe

## ❌ Erro que você está vendo:

```
Failed query: select ... from "subscription_plans" 
where "subscription_plans"."is_active" = $1
```

**Causa:** A tabela `subscription_plans` não existe no banco de dados de produção.

---

## ✅ SOLUÇÃO RÁPIDA

Execute estes comandos **NO SERVIDOR DE PRODUÇÃO** em ordem:

### 1. Aplicar Migrações do Banco de Dados

```bash
# Ir para o diretório do projeto
cd /caminho/do/seu/projeto

# Fazer pull do código atualizado
git pull origin main

# Instalar dependências (se necessário)
pnpm install

# APLICAR MIGRAÇÕES (CRIA AS TABELAS)
npm run db:push
```

**O que esse comando faz:**
- Cria a tabela `subscription_plans`
- Cria a tabela `subscriptions`
- Cria a tabela `payments`
- Cria a tabela `token_usage`
- Adiciona índices e relacionamentos

### 2. Popular os Planos de Assinatura

Depois que as migrações forem aplicadas:

```bash
npm run db:seed:plans
```

**O que esse comando faz:**
- Cadastra 3 planos: Free, Pro, Business
- Configura limites de tokens
- Configura preços
- Adiciona IDs do Stripe

### 3. Verificar se funcionou

```bash
npm run db:debug:plans
```

**Você deve ver:**
```
✅ Encontrados 3 planos no banco de dados

📦 Plano: Free
📦 Plano: Pro
📦 Plano: Business
```

### 4. Reiniciar o Servidor

```bash
pm2 restart storyteller
# ou
pm2 restart all
```

### 5. Testar no Navegador

Acesse: `https://seu-dominio.com/pricing`

Os preços devem aparecer! ✅

---

## 🔍 Se ainda não funcionar

### Verificar se o DATABASE_URL está correto

```bash
# No servidor, verifique o .env
cat .env | grep DATABASE_URL
```

Deve mostrar algo como:
```
DATABASE_URL=postgresql://usuario:senha@host:5432/database
```

Se estiver errado, edite:
```bash
nano .env
# ou
code .env
```

### Testar conexão com o banco

```bash
# Tentar conectar manualmente
psql $DATABASE_URL
```

Se der erro de conexão:
- Verifique se o PostgreSQL está rodando
- Verifique se as credenciais estão corretas
- Verifique se o host está acessível

---

## 📋 Checklist de Verificação

Execute em ordem e marque:

- [ ] 1. `git pull origin main` - Código atualizado
- [ ] 2. `pnpm install` - Dependências instaladas
- [ ] 3. `npm run db:push` - Migrações aplicadas (TABELAS CRIADAS)
- [ ] 4. `npm run db:seed:plans` - Planos cadastrados
- [ ] 5. `npm run db:debug:plans` - Verificar se funcionou
- [ ] 6. `pm2 restart storyteller` - Servidor reiniciado
- [ ] 7. Acessar `https://seu-dominio.com/pricing` - Testar

---

## ⚠️ IMPORTANTE: IDs do Stripe

Após popular os planos, você ainda precisa configurar os **IDs do Stripe de PRODUÇÃO**.

### Verificar se são IDs de teste:

```bash
npm run db:debug:plans
```

Se mostrar: `⚠️ ID mensal é de TESTE!`

**Você precisa:**

1. **Obter IDs de PRODUÇÃO:**
   - https://dashboard.stripe.com
   - **DESATIVAR modo de teste**
   - Ir em: Produtos
   - Copiar IDs dos preços (começam com `price_` sem "test")

2. **Editar o script:**
   ```bash
   nano scripts/seed-subscription-plans.sql
   ```
   
   Substituir:
   ```sql
   -- ANTES (teste - não funciona em produção)
   stripe_monthly_price_id = 'price_test_...'
   
   -- DEPOIS (produção - funciona!)
   stripe_monthly_price_id = 'price_1TxABC...'  -- Sem "test"
   ```

3. **Executar novamente:**
   ```bash
   npm run db:seed:plans
   npm run db:debug:plans  # Verificar
   pm2 restart storyteller
   ```

---

## 🆘 Se encontrar outros erros

### Erro: "permission denied for schema public"

**Solução:**
```sql
-- Conectar ao banco
psql $DATABASE_URL

-- Dar permissões
GRANT ALL ON SCHEMA public TO seu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seu_usuario;
```

### Erro: "database does not exist"

**Solução:**
```bash
# Criar o banco
createdb storyteller

# Ou via psql
psql -U postgres
CREATE DATABASE storyteller;
```

### Erro: "drizzle-kit not found"

**Solução:**
```bash
pnpm install drizzle-kit drizzle-orm
npm run db:push
```

---

## 📚 Documentação Relacionada

- **Guia de Deploy:** `DEPLOY_AGORA.md`
- **Checklist Completo:** `DEPLOY_PRODUCAO_CHECKLIST.md`
- **Resolver Preços:** `RESOLVER_PRECOS_PROD.md`

---

## 🎯 Ordem Correta de Deploy

Para referência futura, a ordem correta é:

1. ✅ `git pull origin main`
2. ✅ `pnpm install`
3. ✅ Configurar `.env` com credenciais de produção
4. ✅ **`npm run db:push`** ← VOCÊ PULOU ESTE PASSO!
5. ✅ `npm run db:seed:plans`
6. ✅ `npm run build`
7. ✅ `pm2 start` ou `pm2 restart`

---

**Execute agora:**

```bash
cd /caminho/do/projeto
git pull origin main
npm run db:push
npm run db:seed:plans
npm run db:debug:plans
pm2 restart storyteller
```

Depois disso, acesse: `https://seu-dominio.com/pricing`

Os preços devem aparecer! 🚀

