# ⚡ Guia Rápido de Configuração

## 🚀 Setup em 3 minutos

### **Para Desenvolvimento Local:**

```bash
# 1. Copiar template de configuração
npm run env:setup dev
# Windows: npm run env:setup:win dev

# 2. Editar .env com suas chaves
# Abra o arquivo .env e configure:
# - OPENAI_API_KEY
# - JWT_SECRET (pode ser simples: "dev-secret-123")

# 3. Subir banco de dados
docker compose up -d

# 4. Aplicar migrações
npm run db:push

# 5. Rodar aplicação
npm run dev
```

**Pronto! Acesse:** http://localhost:3000

---

### **Para Produção (EasyPanel):**

```bash
# 1. Gerar JWT Secret forte
npm run generate:jwt
# Windows: npm run generate:jwt:win
# Copie o secret gerado

# 2. No EasyPanel, configure as variáveis:
# - NODE_ENV=production
# - DATABASE_URL=postgresql://...  (do banco que você criou)
# - JWT_SECRET=... (o que você gerou no passo 1)
# - OPENAI_API_KEY=sk-proj-...

# 3. Fazer deploy
git checkout main
git merge dev
git push origin main
```

**EasyPanel faz o resto automaticamente!** 🎉

---

## 📋 Variáveis Essenciais

### **Desenvolvimento:**
- `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/bardo` (Docker)
- `JWT_SECRET`: Qualquer string (ex: "dev-secret-123")
- `OPENAI_API_KEY`: Sua chave da OpenAI

### **Produção:**
- `NODE_ENV`: `production`
- `DATABASE_URL`: String de conexão do seu banco PostgreSQL
- `JWT_SECRET`: String forte e aleatória (use `npm run generate:jwt`)
- `OPENAI_API_KEY`: Sua chave de produção da OpenAI

---

## 🆘 Comandos Úteis

```bash
# Configurar ambiente de desenvolvimento
npm run env:setup dev

# Configurar ambiente de produção  
npm run env:setup prod

# Gerar JWT Secret
npm run generate:jwt

# Ver logs do banco (Docker)
docker compose logs -f postgres

# Aplicar migrações
npm run db:push

# Rodar em desenvolvimento
npm run dev

# Build para produção (local)
npm run build
```

---

## 📖 Documentação Completa

- **[CONFIGURACAO_AMBIENTES.md](./CONFIGURACAO_AMBIENTES.md)** - Guia detalhado de configuração
- **[WORKFLOW_BRANCHES.md](./WORKFLOW_BRANCHES.md)** - Como trabalhar com Git branches
- **[GUIA_EASYPANEL.md](./GUIA_EASYPANEL.md)** - Deploy no EasyPanel

---

## 🎯 Troubleshooting Rápido

### **Erro: "Cannot connect to database"**
```bash
# Certifique-se que o Docker está rodando:
docker compose up -d
docker ps
```

### **Erro: "JWT_SECRET is not defined"**
```bash
# Adicione no arquivo .env:
JWT_SECRET=dev-secret-123
```

### **Erro: "OpenAI API key not found"**
```bash
# Adicione no arquivo .env:
OPENAI_API_KEY=sk-proj-sua-chave
```

### **App não atualiza no EasyPanel**
```bash
# Force um rebuild no painel do EasyPanel:
# Settings → Rebuild
```

---

**Tudo pronto! Agora você tem ambientes separados! 🚀**









