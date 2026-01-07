# ⚡ Checklist Rápido - Variáveis EasyPanel

## 🎯 O que fazer AGORA

### 1. Acesse o EasyPanel
- URL: https://seu-easypanel.com
- Entre na aplicação "stroryTeller"
- Vá em **"Environment Variables"**

---

## 2. Adicione estas 9 variáveis:

### ✅ Copie e Cole (ajuste os valores):

```env
DATABASE_URL=postgresql://postgres:SUA-SENHA@nome-servico-db:5432/postgres
JWT_SECRET=GERE-UMA-CHAVE-ALEATORIA-32-CARACTERES
NODE_ENV=production
PORT=3000
APP_URL=https://seu-dominio.com
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE  
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
OPENAI_API_KEY=sk-proj-XXXXXXX
```

**Opcional (se não usar OAuth):**
```env
OAUTH_SERVER_URL=https://seu-dominio.com
VITE_APP_ID=stroryTeller-production
```

---

## 3. Onde conseguir cada valor:

| Variável | Onde conseguir |
|----------|----------------|
| `DATABASE_URL` | EasyPanel → Services → PostgreSQL → Connection String |
| `JWT_SECRET` | Gerar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com → Developers → API Keys |
| `STRIPE_PUBLISHABLE_KEY` | https://dashboard.stripe.com → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | https://dashboard.stripe.com → Developers → Webhooks |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `APP_URL` | Seu domínio (ex: https://storyteller.com.br) |

---

## 4. Salvar e Reiniciar

1. Clique em **"Save"**
2. Clique em **"Restart"** ou **"Deploy"**
3. Aguarde 30 segundos

---

## 5. Verificar Logs

No EasyPanel → Logs, deve aparecer:

```
✓ STRIPE_SECRET_KEY: ✓ Loaded
✓ OPENAI_API_KEY: ✓ Loaded
✓ DATABASE_URL: ✓ Loaded
✓ Server running on http://0.0.0.0:3000/
```

---

## ✅ Pronto!

Se todos aparecerem com **✓ Loaded**, está funcionando! 🎉

---

## 🚨 Se ainda tiver erro:

Veja o guia completo: `docs/CORRIGIR_EASYPANEL_ENV.md`

