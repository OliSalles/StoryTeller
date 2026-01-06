# ⚙️ Configuração de Ambientes (Dev e Prod)

## 📋 Visão Geral

O projeto usa variáveis de ambiente diferentes para **desenvolvimento** e **produção**.

```
DESENVOLVIMENTO (local)     vs     PRODUÇÃO (VPS/EasyPanel)
├─ Banco: localhost              ├─ Banco: VPS
├─ Debug: ativado                ├─ Debug: desativado
├─ JWT: simples                  ├─ JWT: forte e seguro
└─ OpenAI: chave de teste        └─ OpenAI: chave de prod
```

---

## 🔧 Configuração de DESENVOLVIMENTO

### **Passo 1: Copiar template**

```bash
# Na raiz do projeto, copie o template:
cp config.dev.template .env
```

### **Passo 2: Editar valores**

Abra o arquivo `.env` e ajuste:

```bash
# Deixe como está (banco Docker local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bardo

# Pode usar um secret simples em dev
JWT_SECRET=dev-secret-key-123

# Adicione sua chave OpenAI (pode ser de teste)
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

### **Passo 3: Iniciar Docker (banco local)**

```bash
# Sobe o PostgreSQL em container Docker
docker compose up -d

# Aplicar migrações
npm run db:push
```

### **Passo 4: Rodar projeto**

```bash
npm run dev
```

**Acesse:** http://localhost:3000

---

## 🚀 Configuração de PRODUÇÃO (EasyPanel)

### **Passo 1: Configurar variáveis no EasyPanel**

1. **Acesse seu app no EasyPanel**
2. Vá em **Settings** → **Environment Variables**
3. Adicione as variáveis abaixo:

### **Variáveis OBRIGATÓRIAS:**

| Variável | Valor | Como obter |
|----------|-------|------------|
| `NODE_ENV` | `production` | Fixo |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Crie um banco no EasyPanel |
| `JWT_SECRET` | `string-aleatoria-forte` | Execute: `npm run generate:jwt` |
| `OPENAI_API_KEY` | `sk-proj-...` | https://platform.openai.com/api-keys |

### **Variáveis OPCIONAIS:**

| Variável | Valor | Quando usar |
|----------|-------|-------------|
| `PORT` | `3000` | Geralmente não precisa mudar |
| `CLIENT_URL` | `https://seu-dominio.com` | Se tiver domínio customizado |
| `SERVER_URL` | `https://seu-dominio.com` | Se tiver domínio customizado |
| `DEBUG` | `false` | Desativar logs verbosos |
| `LOG_LEVEL` | `error` | Apenas erros em prod |

### **AWS S3 (se usar uploads):**

| Variável | Valor |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | Sua access key |
| `AWS_SECRET_ACCESS_KEY` | Sua secret key |
| `AWS_REGION` | `us-east-1` |
| `AWS_BUCKET_NAME` | Nome do bucket |

---

## 🗄️ Configurar Banco de Dados no EasyPanel

### **Opção 1: Banco interno do EasyPanel (recomendado)**

1. No EasyPanel, vá em **Services**
2. Clique em **Create Service** → **PostgreSQL**
3. Dê um nome: `bardo-db`
4. Anote as credenciais geradas
5. Use a connection string no `DATABASE_URL`

**Exemplo:**
```
postgresql://bardo_user:senha_gerada@postgres-bardo-db:5432/bardo
```

### **Opção 2: Banco externo**

Se tiver um PostgreSQL rodando em outro lugar:
```
postgresql://usuario:senha@ip-do-servidor:5432/nome_do_banco
```

---

## 🔐 Gerar JWT Secret

### **Para produção (obrigatório):**

```bash
# Execute localmente:
npm run generate:jwt

# Copie o secret gerado e adicione no EasyPanel
```

### **Ou gere manualmente:**

```bash
# Linux/Mac:
openssl rand -base64 32

# Windows (PowerShell):
npm run generate:jwt:win
```

---

## 📝 Checklist de Configuração

### **✅ Desenvolvimento:**

- [ ] Arquivo `.env` criado (copiar de `config.dev.template`)
- [ ] `DATABASE_URL` apontando para `localhost:5432`
- [ ] `JWT_SECRET` definido (pode ser simples)
- [ ] `OPENAI_API_KEY` configurada
- [ ] Docker Compose rodando (`docker compose up -d`)
- [ ] Migrações aplicadas (`npm run db:push`)
- [ ] Servidor rodando (`npm run dev`)

### **✅ Produção (EasyPanel):**

- [ ] Banco PostgreSQL criado no EasyPanel
- [ ] `DATABASE_URL` configurada no EasyPanel
- [ ] `JWT_SECRET` forte gerado e configurado
- [ ] `NODE_ENV=production` configurado
- [ ] `OPENAI_API_KEY` de produção configurada
- [ ] Migrações aplicadas no banco de prod
- [ ] App deployado e rodando

---

## 🔄 Diferenças entre Dev e Prod

| Configuração | Desenvolvimento | Produção |
|--------------|----------------|----------|
| **Banco** | Docker local (localhost:5432) | PostgreSQL no EasyPanel |
| **JWT_SECRET** | Simples (dev-secret-123) | Forte (gerado com openssl) |
| **NODE_ENV** | `development` | `production` |
| **Debug** | `true` (logs verbosos) | `false` (apenas erros) |
| **OpenAI** | Chave de teste/limite baixo | Chave de produção |
| **Hot Reload** | ✅ Sim (tsx watch) | ❌ Não (tsx normal) |
| **Vite Dev Server** | ✅ Sim (HMR) | ❌ Não (serve static) |
| **Source Maps** | ✅ Sim | ❌ Não |

---

## 🆘 Problemas Comuns

### **Erro: "JWT_SECRET is not defined"**

**Solução:**
```bash
# Dev: Adicione no .env
JWT_SECRET=dev-secret-key-123

# Prod: Configure no EasyPanel Environment Variables
```

### **Erro: "Cannot connect to database"**

**Solução Dev:**
```bash
# Certifique-se que o Docker está rodando
docker compose up -d
docker ps  # Deve mostrar postgres rodando
```

**Solução Prod:**
```bash
# Verifique DATABASE_URL no EasyPanel
# Teste a conexão com:
# psql "postgresql://user:pass@host:5432/db"
```

### **Erro: "OpenAI API key not found"**

**Solução:**
```bash
# Dev: Adicione no .env
OPENAI_API_KEY=sk-proj-sua-chave

# Prod: Configure no EasyPanel Environment Variables
```

---

## 📂 Arquivos de Configuração

```
Repositório:
├─ config.dev.template       ← Template para desenvolvimento
├─ config.prod.template      ← Template para produção
├─ CONFIGURACAO_AMBIENTES.md ← Este guia
└─ .env                      ← Seu arquivo local (não commitado)
```

**⚠️ IMPORTANTE:** O arquivo `.env` **NUNCA** deve ser commitado no Git!

Está no `.gitignore` para evitar vazar credenciais.

---

## 🎯 Próximos Passos

1. **Desenvolvimento:**
   - Copie `config.dev.template` para `.env`
   - Configure suas chaves
   - Execute `docker compose up -d`
   - Execute `npm run dev`

2. **Produção:**
   - Configure variáveis no EasyPanel
   - Crie banco PostgreSQL
   - Gere JWT_SECRET forte
   - Faça deploy (`git push origin main`)

---

**Agora você tem ambientes separados e profissionais! 🚀**









