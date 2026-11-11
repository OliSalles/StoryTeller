# 🧪 Teste do Webhook - Debug Completo

Adicionei logs detalhados ao webhook. Agora vamos testar passo a passo:

## ✅ Situação Atual

- ✅ Planos cadastrados: Free, Pro, Business
- ✅ Stripe CLI instalado
- ⚠️ **Problema**: Nenhuma assinatura sendo criada após pagamento

---

## 🚀 Passo a Passo para Testar

### 1️⃣ Parar tudo e reiniciar com os novos logs

**Terminal 1 - Servidor:**
```powershell
# Se estiver rodando, pare com Ctrl+C
npm run dev
```

**Terminal 2 - Stripe CLI:**
```powershell
# Se estiver rodando, pare com Ctrl+C
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Aguarde aparecer:
```
> Ready! Your webhook signing secret is whsec_...
```

---

### 2️⃣ Verificar se o .env está correto

Abra o arquivo `.env` e confirme que tem esta linha (com o valor correto do Terminal 2):

```env
STRIPE_WEBHOOK_SECRET=whsec_d0e0763f6b260d1a96592ef47c7dd5c33178bf17ba17d9508cb65a4fb04a9190
```

Se o valor for diferente, atualize com o novo valor que aparecer no Terminal 2.

---

### 3️⃣ Reiniciar o servidor (Terminal 1)

Depois de confirmar o `.env`:

```powershell
# Pressione Ctrl+C se estiver rodando
npm run dev
```

Aguarde aparecer:
```
✅ Stripe initialized successfully
🚀 Server running on port 3000
```

---

### 4️⃣ Fazer um pagamento de teste

1. Acesse: http://localhost:5173/pricing
2. Clique em **"Assinar"** no plano **Pro** ou **Business**
3. Use o cartão de teste:
   - Número: **4242 4242 4242 4242**
   - Data: **12/28**
   - CVC: **123**
   - CEP: **12345**
4. Preencha um email (pode ser qualquer um)
5. Clique em **"Assinar"**

---

### 5️⃣ Observar os logs

**O que você DEVE ver:**

#### **Terminal 2 (Stripe CLI):**
```
2025-01-06 ... --> checkout.session.completed [evt_xxxxx]
2025-01-06 ... <-- [200] POST http://localhost:3000/api/webhooks/stripe
```

✅ O `[200]` significa sucesso!

#### **Terminal 1 (Servidor):**
```
============================================================
[Webhook] 🎯 Received Stripe webhook request
[Webhook] Timestamp: 2025-01-06T...
============================================================
[Webhook] ✅ Signature verified successfully
[Webhook] 📨 Event Type: checkout.session.completed
[Webhook] Event ID: evt_xxxxx

[Webhook] 🛒 Handling checkout.session.completed
[Webhook] ========================================
[Webhook] Processing checkout.session.completed
[Webhook] Session ID: cs_test_xxxxx
[Webhook] Session metadata: {
  "userId": "2",
  "planId": "2",
  "billingCycle": "monthly"
}
[Webhook] Parsed values:
[Webhook]   userId: 2
[Webhook]   planId: 2
[Webhook]   billingCycle: monthly
[Webhook] Retrieving subscription from Stripe: sub_xxxxx
[Webhook] Stripe subscription retrieved:
[Webhook]   ID: sub_xxxxx
[Webhook]   Status: active
[Webhook]   Customer: cus_xxxxx
[Webhook] Creating subscription in database...
[Webhook] Subscription data: { ... }
[Webhook] ✅ Created subscription for user 2
[Webhook] ========================================
[Webhook] ✅ Event processed successfully
============================================================
```

---

### 6️⃣ Verificar no banco de dados

Depois do pagamento, execute:

```powershell
npm run db:debug
```

Você DEVE ver algo como:

```
💳 ASSINATURAS:
   [1] lucasallesoliveira@gmail.com - Pro
      Status: active
      Ciclo: monthly
      ...
```

---

## 🔍 Diagnóstico de Problemas

### ❌ Problema 1: Terminal 2 não mostra eventos

**Sintoma:** Nenhuma linha aparece no Terminal 2 após o pagamento.

**Causa:** Stripe CLI não está conectado ou está com problema.

**Solução:**
```powershell
# Terminal 2
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

### ❌ Problema 2: Terminal 2 mostra `[400]` ou `[500]`

**Sintoma:**
```
2025-01-06 ... --> checkout.session.completed [evt_xxxxx]
2025-01-06 ... <-- [400] POST http://localhost:3000/api/webhooks/stripe
```

**Causa:** Erro de assinatura - webhook secret incorreto.

**Solução:**
1. Copie o novo `whsec_...` do Terminal 2
2. Cole no `.env`
3. Reinicie o Terminal 1 (Ctrl+C e `npm run dev`)

---

### ❌ Problema 3: Terminal 1 não mostra logs do webhook

**Sintoma:** Terminal 2 mostra `[200]` mas Terminal 1 não mostra nada.

**Causa:** Servidor não está rodando ou está em outra porta.

**Solução:**
1. Confirme que o Terminal 1 mostra: `Server running on port 3000`
2. Se não mostrar, reinicie: `npm run dev`

---

### ❌ Problema 4: Logs aparecem mas termina em erro

**Sintoma:** Logs aparecem mas com `❌ Error creating subscription in database`

**Causas possíveis:**
- Tabela `subscriptions` não existe no banco
- Dados inválidos
- Problema de conexão com o banco

**Solução:**
```powershell
# Recriar tabelas
npm run db:push

# Verificar
npm run db:debug
```

---

## 📋 Checklist Final

Antes de testar, confirme:

- [ ] Terminal 1 rodando `npm run dev`
- [ ] Terminal 2 rodando `stripe listen`
- [ ] `.env` tem o `STRIPE_WEBHOOK_SECRET` correto
- [ ] Servidor mostra "Server running on port 3000"
- [ ] Stripe CLI mostra "Ready! Your webhook signing secret is..."

---

## 🆘 Se nada funcionar

Execute estes comandos e me envie os resultados:

```powershell
# 1. Verificar planos
npm run db:debug

# 2. Testar webhook manualmente
stripe trigger checkout.session.completed

# 3. Verificar .env
Get-Content .env | Select-String "STRIPE"
```

---

**Boa sorte! 🚀**

Com os logs detalhados, vamos descobrir exatamente onde está o problema!

