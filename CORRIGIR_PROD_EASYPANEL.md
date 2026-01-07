# 🚨 SOLUÇÃO: Produção não está funcionando no EasyPanel

## 🔍 O Problema

Os logs mostram que **variáveis de ambiente não estão configuradas** no EasyPanel:

```
❌ OAUTH_SERVER_URL is not configured!
❌ STRIPE_SECRET_KEY missing
❌ OPENAI_API_KEY missing
❌ DATABASE_URL missing (ou às vezes carregando)
🔴 ELIFECYCLE Command failed
```

**Resultado:** A aplicação não consegue iniciar corretamente! ❌

---

## ✅ A Solução (5 minutos)

### 1️⃣ Entre no EasyPanel

```
🌐 Acesse: https://seu-easypanel.com
📱 Aplicação: "stroryTeller"
⚙️ Vá em: "Environment Variables"
```

---

### 2️⃣ Adicione estas variáveis:

Copie e cole **TODAS** (ajuste os valores):

```env
# ===== OBRIGATÓRIAS (sem isso não funciona) =====
DATABASE_URL=postgresql://postgres:senha@db-service:5432/postgres
JWT_SECRET=GERE-UMA-CHAVE-ALEATORIA-32-CARACTERES
NODE_ENV=production
PORT=3000
APP_URL=https://seu-dominio.com

# ===== STRIPE (pagamentos) =====
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# ===== OPENAI (IA) =====
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXX

# ===== OAUTH (opcional) =====
OAUTH_SERVER_URL=https://seu-dominio.com
VITE_APP_ID=stroryTeller-production
```

---

### 3️⃣ Onde conseguir cada valor?

| Variável | Como conseguir |
|----------|----------------|
| **DATABASE_URL** | EasyPanel → Services → PostgreSQL → "Connection String" |
| **JWT_SECRET** | Execute: `npm run generate:jwt:win` |
| **STRIPE_SECRET_KEY** | https://dashboard.stripe.com → Developers → API Keys |
| **STRIPE_PUBLISHABLE_KEY** | Mesma página acima |
| **STRIPE_WEBHOOK_SECRET** | https://dashboard.stripe.com → Developers → Webhooks |
| **OPENAI_API_KEY** | https://platform.openai.com/api-keys |
| **APP_URL** | Seu domínio (ex: https://storyteller.com.br) |

---

### 4️⃣ Salvar e Reiniciar

1. ✅ Clique em **"Save"**
2. 🔄 Clique em **"Restart"** ou **"Deploy"**
3. ⏱️ Aguarde 30 segundos

---

### 5️⃣ Verificar se Funcionou

No EasyPanel → **Logs**, deve aparecer:

```
✅ [OAuth] Initialized with baseURL: https://seu-dominio.com
✅ Stripe configured successfully
🔍 Environment Check:
   STRIPE_SECRET_KEY: ✓ Loaded
   OPENAI_API_KEY: ✓ Loaded
   DATABASE_URL: ✓ Loaded
✅ Server running on http://0.0.0.0:3000/
```

**Se todos têm ✓ Loaded = SUCESSO!** 🎉

---

## 🛠️ Ferramentas Criadas para Ajudar

### ⚡ Checklist Rápido
```bash
# Ver resumo rápido:
cat docs/EASYPANEL_ENV_CHECKLIST.md
```

### 📖 Guia Completo
```bash
# Ver guia detalhado:
cat docs/CORRIGIR_EASYPANEL_ENV.md
```

### 🔍 Verificar Variáveis Localmente
```powershell
# Windows - verificar se suas variáveis estão OK:
npm run check:env:win
```

```bash
# Linux/Mac - verificar se suas variáveis estão OK:
npm run check:env
```

---

## 🎯 Resumo

| Passo | O que fazer | Tempo |
|-------|-------------|-------|
| 1 | Entrar no EasyPanel | 30s |
| 2 | Adicionar variáveis | 3min |
| 3 | Salvar e reiniciar | 30s |
| 4 | Verificar logs | 30s |

**Total: ~5 minutos** ⚡

---

## 🆘 Ainda não funcionou?

### ❌ Se aparecer "ELIFECYCLE Command failed":
- Verifique se `DATABASE_URL` está correto
- Verifique se `JWT_SECRET` foi adicionado

### ❌ Se aparecer "Missing":
- Verifique se salvou as variáveis
- Verifique se reiniciou a aplicação
- Verifique se não tem espaços extras

### ❌ Se ainda tiver problemas:
1. **Logs completos:** Copie todos os logs do EasyPanel
2. **Screenshot:** Tire foto das variáveis configuradas (esconda valores sensíveis)
3. **Compartilhe:** Envie os logs/screenshots para debug

---

## 📚 Documentação Completa

- **⚡ Checklist Rápido:** `docs/EASYPANEL_ENV_CHECKLIST.md`
- **📖 Guia Completo:** `docs/CORRIGIR_EASYPANEL_ENV.md`
- **🚀 Deploy EasyPanel:** `docs/GUIA_EASYPANEL.md`

---

## ✅ Checklist Final

Antes de considerar resolvido:

- [ ] Adicionei TODAS as variáveis no EasyPanel
- [ ] Salvei as configurações
- [ ] Reiniciei a aplicação
- [ ] Verifiquei os logs - todos com ✓ Loaded
- [ ] Testei acessar o site
- [ ] Testei fazer login

---

**Pronto para configurar? Siga os passos acima! 🚀**

---

**Dica:** Use o comando `npm run check:env:win` localmente para verificar suas variáveis antes de configurar no EasyPanel!

