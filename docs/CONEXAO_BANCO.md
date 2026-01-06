# 🗄️ Como Conectar ao Banco de Dados Bardo

## ✅ Status do Banco
- **Container:** `bardo_postgres` (Rodando ✅)
- **Imagem:** postgres:16-alpine
- **Porta:** 5432 (Exposta publicamente)

---

## 🔑 Credenciais de Acesso

```
Host:     localhost
Port:     5432
Database: bardo
Username: postgres
Password: bardo_dev_password
```

---

## 📦 DBeaver (Recomendado)

### Passo 1: Nova Conexão
1. Abra o DBeaver
2. Clique em **"Database" → "New Database Connection"**
3. Ou pressione: `Ctrl + Shift + N`

### Passo 2: Selecione PostgreSQL
1. Selecione **"PostgreSQL"**
2. Clique em **"Next"**

### Passo 3: Configuração

**Aba "Main":**
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `bardo`
- **Username:** `postgres`
- **Password:** `bardo_dev_password`

**Marque as opções:**
- ✅ Save password
- ✅ Show all databases

### Passo 4: Teste
1. Clique em **"Test Connection..."**
2. Se pedir drivers, clique em **"Download"**
3. Aguarde aparecer: **"Connected"** ✅

### Passo 5: Conectar
1. Clique em **"Finish"**
2. A conexão aparecerá no painel esquerdo
3. Expanda para ver as tabelas

---

## 🔌 VSCode Extension (PostgreSQL)

### Passo 1: Instalar Extensão
1. Abra o VSCode
2. Vá em Extensions (`Ctrl+Shift+X`)
3. Busque: **"PostgreSQL"** (by Chris Kolkman)
4. Instale

### Passo 2: Nova Conexão
1. Pressione `Ctrl+Shift+P`
2. Digite: **"PostgreSQL: New Connection"**
3. Preencha:
   - Hostname: `localhost`
   - User: `postgres`
   - Password: `bardo_dev_password`
   - Port: `5432`
   - Database: `bardo`

### Passo 3: Use
1. Conexão aparecerá no Explorer
2. Clique com botão direito → **"New Query"**
3. Execute queries SQL

---

## 💻 Via Terminal (Rápido)

```bash
# Conectar ao banco
docker exec -it bardo_postgres psql -U postgres -d bardo

# Comandos úteis:
\dt              # Listar tabelas
\d users         # Ver estrutura da tabela users
SELECT * FROM users;   # Ver todos os usuários
\q               # Sair
```

---

## 🔍 Comandos SQL Úteis

### Ver todas as tabelas
```sql
SELECT * FROM users;
SELECT * FROM llm_configs;
SELECT * FROM features;
SELECT * FROM user_stories;
SELECT * FROM acceptance_criteria;
SELECT * FROM tasks;
```

### Contar registros
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM features;
```

### Ver estrutura
```sql
\d+ users
\d+ features
```

---

## ⚠️ Problemas Comuns

### Erro: "Connection refused"
**Solução:**
```bash
# Verificar se o container está rodando
docker ps | grep postgres

# Se não estiver, inicie:
docker-compose up -d
```

### Erro: "Password authentication failed"
**Solução:** Verifique se a senha é exatamente: `bardo_dev_password`

### Erro: "Port 5432 is already in use"
**Solução:**
```bash
# Verificar o que está usando a porta
netstat -ano | findstr :5432

# Ou mude a porta no docker-compose.yml para 5433
# ports:
#   - "5433:5432"
# E use 5433 nas conexões
```

---

## 📊 String de Conexão Completa

```
postgresql://postgres:bardo_dev_password@localhost:5432/bardo
```

Use essa string para:
- Scripts Python
- Node.js
- Outras ferramentas de conexão

---

## 🎯 Testar Conexão Rápida

```bash
# PowerShell
docker exec bardo_postgres psql -U postgres -d bardo -c "SELECT version();"

# Deve retornar a versão do PostgreSQL
```

---

**Criado em:** 2025-12-29
**Projeto:** Bardo AI














