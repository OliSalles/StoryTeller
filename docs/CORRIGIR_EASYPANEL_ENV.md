# 🔧 Corrigir Variáveis de Ambiente no EasyPanel

## 🚨 Problema Identificado

O log mostra que as seguintes variáveis **NÃO estão configuradas** no EasyPanel:

```
❌ OAUTH_SERVER_URL
❌ STRIPE_SECRET_KEY  
❌ OPENAI_API_KEY
❌ DATABASE_URL (às vezes carrega, às vezes não)
```

---

## ✅ Solução: Configurar Variáveis no EasyPanel

### Passo 1: Acessar Configurações da Aplicação (1 min)

1. **Acesse seu EasyPanel:**
   - URL: https://seu-easypanel.com
   - Faça login

2. **Entre na aplicação:**
   - Clique na aplicação "stroryTeller" (ou "bardoai")
   - Vá em **"Environment"** ou **"Environment Variables"**

---

### Passo 2: Adicionar TODAS as Variáveis (5 min)

Copie e cole as variáveis abaixo, **ajustando os valores** conforme sua configuração:

```env
# ========================================
# 🔴 VARIÁVEIS OBRIGATÓRIAS (ESSENCIAIS)
# ========================================

# Database - PostgreSQL
DATABASE_URL=postgresql://postgres:SUA-SENHA-POSTGRES@db-service-name:5432/postgres

# JWT Secret (para autenticação)
JWT_SECRET=sua-chave-jwt-super-secreta-com-pelo-menos-32-caracteres

# Node Environment
NODE_ENV=production

# Porta do servidor
PORT=3000

# URL da aplicação (seu domínio real)
APP_URL=https://seu-dominio.com


# ========================================
# 🟡 STRIPE (OBRIGATÓRIO PARA PAGAMENTOS)
# ========================================

STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE


# ========================================
# 🟡 OPENAI (OBRIGATÓRIO PARA IA)
# ========================================

OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx


# ========================================
# 🟢 OAUTH (OPCIONAL - SE NÃO USAR, COLOQUE VALORES VAZIOS)
# ========================================

VITE_APP_ID=stroryTeller-production
OAUTH_SERVER_URL=https://seu-dominio.com
OWNER_OPEN_ID=seu-owner-id-aqui

# OU se não usar OAuth, deixe assim:
# OAUTH_SERVER_URL=
# OWNER_OPEN_ID=
```

---

### Passo 3: Como Preencher Cada Variável

#### 1️⃣ `DATABASE_URL`

**Formato:**
```
postgresql://usuario:senha@host:porta/database
```

**Opções:**

**Opção A - Banco no mesmo EasyPanel:**
```env
DATABASE_URL=postgresql://postgres:SUA-SENHA@nome-do-servico-db:5432/postgres
```
> ⚠️ Use o **nome do serviço** (ex: `bardoai-db`, `supabase-db`)

**Opção B - Banco externo (Supabase/Neon):**
```env
DATABASE_URL=postgresql://postgres.xxxxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**Como descobrir:**
- No EasyPanel: vá em **Services** → seu banco PostgreSQL → **Connection String**
- No Supabase: vá em **Settings** → **Database** → **Connection String**

---

#### 2️⃣ `JWT_SECRET`

**Gerar nova chave JWT:**

No seu computador local:
```powershell
# Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Ou use o script do projeto:
```powershell
npm run generate:jwt:win
```

**Resultado será algo como:**
```
xK9mP2nQ5rT8wY3zB7cD1eF4gH6jL0oM9nK8lP3qR2s=
```

Cole esse valor em `JWT_SECRET`

---

#### 3️⃣ `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

**Onde encontrar:**

1. **Acesse:** https://dashboard.stripe.com
2. **Login** na sua conta Stripe

**Secret Key:**
- Vá em **Developers** → **API Keys**
- Copie **Secret key** (começa com `sk_live_` em produção ou `sk_test_` em teste)

**Publishable Key:**
- Mesma página (Developers → API Keys)
- Copie **Publishable key** (começa com `pk_live_`)

**Webhook Secret:**
- Vá em **Developers** → **Webhooks**
- Clique no webhook configurado
- Copie **Signing secret** (começa com `whsec_`)

> ⚠️ **IMPORTANTE:** Use as chaves **LIVE** (não as de teste) para produção!

---

#### 4️⃣ `OPENAI_API_KEY`

**Onde encontrar:**

1. **Acesse:** https://platform.openai.com/api-keys
2. **Login** na sua conta OpenAI
3. Clique em **+ Create new secret key**
4. Dê um nome (ex: "StoryTeller Produção")
5. Copie a chave (começa com `sk-proj-`)

> ⚠️ **ATENÇÃO:** A chave só aparece UMA VEZ! Guarde em local seguro!

---

#### 5️⃣ `APP_URL`

**URL do seu domínio em produção:**
```env
APP_URL=https://seu-dominio.com
```

**Exemplos:**
- `https://storyteller.com.br`
- `https://app.seusite.com`
- `https://seu-ip-vps` (se não tiver domínio)

> ⚠️ Deve ser o mesmo domínio configurado no Stripe para redirects!

---

#### 6️⃣ `OAUTH_SERVER_URL` (Opcional)

Se **NÃO usar OAuth**, você tem 2 opções:

**Opção A - Deixar vazio:**
```env
OAUTH_SERVER_URL=
```

**Opção B - Usar o mesmo que APP_URL:**
```env
OAUTH_SERVER_URL=https://seu-dominio.com
```

> 💡 O sistema vai continuar funcionando mesmo sem OAuth configurado!

---

### Passo 4: Salvar e Reiniciar (2 min)

1. **No EasyPanel:**
   - Depois de adicionar TODAS as variáveis
   - Clique em **"Save"** ou **"Salvar"**

2. **Reiniciar aplicação:**
   - Vá em **"Restart"** ou **"Reiniciar"**
   - Ou faça um novo **"Deploy"**

3. **Aguardar:**
   - A aplicação vai reiniciar (~30 segundos)

---

### Passo 5: Verificar Logs (1 min)

1. **Ver se funcionou:**
   - No EasyPanel → sua app → **"Logs"**

2. **Deve aparecer:**
   ```
   🔍 Environment Check:
      STRIPE_SECRET_KEY: ✓ Loaded
      OPENAI_API_KEY: ✓ Loaded
      DATABASE_URL: ✓ Loaded
   Server running on http://0.0.0.0:3000/
   ```

3. **Se aparecer `✗ Missing`:**
   - Verifique se salvou as variáveis
   - Verifique se reiniciou a aplicação
   - Verifique se não tem espaços extras nos valores

---

## 🔍 Template Completo para Copiar

Copie este template e preencha com seus valores reais:

```env
# ============= OBRIGATÓRIAS =============
DATABASE_URL=postgresql://postgres:SENHA@NOME-SERVICO-DB:5432/postgres
JWT_SECRET=GERE-UMA-CHAVE-JWT-ALEATORIA-SEGURA
NODE_ENV=production
PORT=3000
APP_URL=https://SEU-DOMINIO.com

# ============= STRIPE =============
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# ============= OPENAI =============
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXX

# ============= OAUTH (OPCIONAL) =============
VITE_APP_ID=stroryTeller-production
OAUTH_SERVER_URL=https://SEU-DOMINIO.com
OWNER_OPEN_ID=
```

---

## 🚨 Erros Comuns e Soluções

### ❌ "ELIFECYCLE Command failed"

**Causa:** Variáveis essenciais faltando (DATABASE_URL ou JWT_SECRET)

**Solução:**
1. Verifique se `DATABASE_URL` está correto
2. Verifique se `JWT_SECRET` foi adicionado
3. Reinicie a aplicação

---

### ❌ "Port 80/3000 is busy"

**Causa:** Aplicação tentando usar porta já em uso

**Solução:**
No EasyPanel, configure:
```env
PORT=3000
```
E no EasyPanel, na configuração da app, defina **"Port"** = **3000**

---

### ❌ "[OAuth] ERROR: OAUTH_SERVER_URL is not configured!"

**Causa:** Variável `OAUTH_SERVER_URL` não foi definida

**Solução - Opção 1 (Rápida):**
```env
OAUTH_SERVER_URL=https://seu-dominio.com
```

**Solução - Opção 2 (Remover aviso):**
Edite `server/_core/oauth.ts` e comente o console.error

---

### ❌ "⚠️ Stripe not configured"

**Causa:** Chaves do Stripe não configuradas

**Impacto:**
- ✅ App vai rodar normalmente
- ❌ Pagamentos não vão funcionar
- ❌ Assinaturas não vão funcionar

**Solução:**
Adicione as 3 chaves do Stripe (veja Passo 3.3 acima)

---

## 📋 Checklist Final

Antes de considerar resolvido, verifique:

- [ ] Adicionei `DATABASE_URL` no EasyPanel
- [ ] Adicionei `JWT_SECRET` no EasyPanel
- [ ] Adicionei `STRIPE_SECRET_KEY` no EasyPanel
- [ ] Adicionei `STRIPE_PUBLISHABLE_KEY` no EasyPanel
- [ ] Adicionei `STRIPE_WEBHOOK_SECRET` no EasyPanel
- [ ] Adicionei `OPENAI_API_KEY` no EasyPanel
- [ ] Adicionei `APP_URL` no EasyPanel
- [ ] Adicionei `NODE_ENV=production` no EasyPanel
- [ ] Adicionei `PORT=3000` no EasyPanel
- [ ] Salvei as variáveis no EasyPanel
- [ ] Reiniciei a aplicação
- [ ] Verifiquei os logs - todos ✓ Loaded
- [ ] Testei acessar o site
- [ ] Testei fazer login
- [ ] Testei gerar uma feature

---

## 🎯 Resultado Esperado

Após configurar tudo corretamente, o log deve mostrar:

```
[OAuth] Initialized with baseURL: https://seu-dominio.com
✓ Stripe configured successfully
🔍 Environment Check:
   STRIPE_SECRET_KEY: ✓ Loaded
   OPENAI_API_KEY: ✓ Loaded
   DATABASE_URL: ✓ Loaded
Server running on http://0.0.0.0:3000/

🔗 Links úteis:
   🏠 Home: http://localhost:3000
   🔐 Login: http://localhost:3000/login
   📝 Registro: http://localhost:3000/register
   💰 Planos: http://localhost:3000/pricing
   ✨ Gerar Feature: http://localhost:3000/generate
```

**Nenhum erro de "Missing" ou "ELIFECYCLE"!** 🎉

---

## 📞 Precisa de Ajuda?

Se ainda tiver problemas:

1. **Compartilhe os logs completos**
2. **Tire screenshot das variáveis configuradas** (esconda valores sensíveis)
3. **Informe qual erro específico está aparecendo**

---

**Bom deploy! 🚀**

