# 🚀 Guia de Desenvolvimento Local

## 📋 Configuração Inicial

### 1. **Configurar Variáveis de Ambiente**

```bash
# Copie o arquivo de exemplo
cp .env.local.example .env.local
```

Edite `.env.local` e adicione sua chave da OpenAI:
```
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

### 2. **Iniciar o Banco de Dados**

```bash
# Inicie o PostgreSQL via Docker
docker-compose up -d

# Aguarde o container inicializar
```

### 3. **Instalar Dependências**

```bash
pnpm install
```

### 4. **Iniciar o Servidor de Desenvolvimento**

```bash
npm run dev
```

O app estará disponível em: `http://localhost:3000`

---

## 📁 Estrutura de Arquivos de Ambiente

| Arquivo | Versionado? | Uso |
|---------|-------------|-----|
| `.env.local` | ❌ Não | Configurações pessoais de dev (credenciais reais) |
| `.env.local.example` | ✅ Sim | Template para outros devs |
| `.env` | ❌ Não | Fallback ou config compartilhada |
| `config.dev.template` | ✅ Sim | Template de configuração de dev |
| `config.prod.template` | ✅ Sim | Template de configuração de prod |

---

## 🔑 Credenciais do Banco Local

**PostgreSQL (via Docker):**
- Host: `localhost`
- Porta: `5432`
- Usuário: `postgres`
- Senha: `bardo_dev_password`
- Database: `bardo`

**Connection String:**
```
postgresql://postgres:bardo_dev_password@localhost:5432/bardo
```

---

## 🔄 Workflow Git

### **Branch de Desenvolvimento:**
```bash
git checkout dev
git pull origin dev

# Faça suas alterações
git add .
git commit -m "feat: sua feature"
git push origin dev
```

### **Branch de Produção:**
```bash
# Apenas depois de testar tudo em dev!
git checkout main
git merge dev
git push origin main
```

---

## 🛠️ Comandos Úteis

### **Banco de Dados:**

```bash
# Conectar ao PostgreSQL local
docker exec -it bardo_postgres psql -U postgres -d bardo

# Ver tabelas
docker exec bardo_postgres psql -U postgres -d bardo -c '\dt'

# Ver usuários
docker exec bardo_postgres psql -U postgres -d bardo -c 'SELECT id, name, email, role FROM users;'

# Tornar usuário admin
docker exec bardo_postgres psql -U postgres -d bardo -c "UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';"
```

### **Logs:**

```bash
# Ver logs do banco
docker logs bardo_postgres

# Ver logs do app (no terminal onde npm run dev está rodando)
```

### **Limpar e Reconstruir:**

```bash
# Parar e remover containers
docker-compose down -v

# Iniciar novamente
docker-compose up -d

# Reinstalar dependências
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 🚨 Dicas Importantes

1. **Nunca commite `.env.local`** - Ele contém suas credenciais pessoais!
2. **Sempre trabalhe na branch `dev`** - Só merge para `main` quando estiver pronto para prod
3. **Teste localmente antes de fazer push** - Evite bugs em produção
4. **Use a chave de dev da OpenAI** - Não use a mesma chave de produção

---

## 🐛 Problemas Comuns

### **"Failed query: select ... from users"**
- **Solução:** Verifique se o PostgreSQL está rodando e se a `DATABASE_URL` está correta no `.env.local`

### **"Docker not running"**
- **Solução:** Abra o Docker Desktop e aguarde inicializar

### **"Port 5432 already in use"**
- **Solução:** Outro PostgreSQL está rodando. Pare-o ou use outra porta no `docker-compose.yml`

### **"OPENAI_API_KEY não configurada"**
- **Solução:** Adicione sua chave no `.env.local`

---

## 📞 Suporte

Se tiver problemas, verifique:
1. `.env.local` está configurado corretamente?
2. Docker Desktop está rodando?
3. Banco de dados tem as tabelas criadas?
4. Você está na branch `dev`?

**Boa codificação! 🎉**









