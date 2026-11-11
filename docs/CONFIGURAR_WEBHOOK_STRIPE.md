# 🔗 Configurar Webhook do Stripe

## 📋 **Opção 1: Desenvolvimento Local (Stripe CLI)**

### ✅ **Já está parcialmente configurado!**

Você já tem o Stripe CLI instalado. Agora precisa mantê-lo rodando corretamente.

### **Passo a Passo:**

#### 1. **Abrir 2 Terminais:**

**Terminal 1 - Servidor:**
```powershell
npm run dev
```

**Terminal 2 - Stripe CLI:**
```powershell
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

#### 2. **Copiar o Webhook Secret:**

Quando rodar `stripe listen`, você verá:
```
> Ready! Your webhook signing secret is whsec_abc123xyz...
```

**COPIE** esse valor `whsec_abc123xyz...`

#### 3. **Atualizar `.env.local`:**

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz...
```

#### 4. **Reiniciar o Servidor (Terminal 1):**

```powershell
# Pressione Ctrl+C
npm run dev
```

#### 5. **Testar:**

Faça um pagamento de teste e veja os logs aparecerem no Terminal 2!

---

## 🌐 **Opção 2: Produção (Dashboard do Stripe)**

### **Para quando fazer deploy na VPS/Hostinger:**

#### 1. **Acessar Dashboard:**

https://dashboard.stripe.com/test/webhooks

#### 2. **Clicar em "+ Add endpoint"**

#### 3. **Configurar o Endpoint:**

```
Endpoint URL: https://seu-dominio.com/api/webhooks/stripe
Description: StoryTeller Webhooks
```

#### 4. **Selecionar Eventos:**

Marque estes eventos:

- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

Ou simplesmente selecione: **"Listen to all events"** (mais fácil)

#### 5. **Adicionar Endpoint:**

Clique em **"Add endpoint"**

#### 6. **Copiar o Signing Secret:**

Após criar, você verá:

```
Signing secret: whsec_prod_xyz123abc...
```

**COPIE** esse valor!

#### 7. **Adicionar no `.env` da Produção:**

No seu servidor de produção (VPS/Hostinger), adicione no arquivo `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_prod_xyz123abc...
```

#### 8. **Reiniciar o Servidor:**

```bash
# No servidor de produção
pm2 restart storyteller
# ou
systemctl restart storyteller
```

---

## 🧪 **Como Testar se Está Funcionando:**

### **1. Através do Stripe Dashboard:**

1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Clique no seu endpoint
3. Clique em "Send test webhook"
4. Escolha `checkout.session.completed`
5. Clique em "Send test webhook"

Você deve ver **"200 OK"** no dashboard!

### **2. Através de um Pagamento Real:**

1. Acesse: http://localhost:5173/pricing
2. Escolha um plano
3. Use cartão de teste: `4242 4242 4242 4242`
4. Complete o pagamento
5. Verifique os logs:

**Terminal 2 (Stripe CLI):**
```
--> checkout.session.completed [evt_xxxxx]
<-- [200] POST http://localhost:3000/api/webhooks/stripe ✅
```

**Terminal 1 (Servidor):**
```
============================================================
[Webhook] 🎯 Received Stripe webhook request
============================================================
[Webhook] ✅ Signature verified successfully
[Webhook] 📨 Event Type: checkout.session.completed
[Webhook] ✅ Created subscription for user 2
============================================================
```

### **3. Verificar no Banco:**

```powershell
npm run db:debug
```

Você deve ver a assinatura criada!

---

## ❌ **Problemas Comuns:**

### **Erro: "No signature provided"**

**Causa:** Stripe CLI não está rodando

**Solução:**
```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

### **Erro: "Signature verification failed"**

**Causa:** Webhook secret incorreto ou desatualizado

**Solução:**
1. Copie o novo secret do Stripe CLI
2. Atualize `.env.local`
3. Reinicie o servidor

---

### **Erro: "[400] ou [500]"**

**Causa:** Erro no código do webhook

**Solução:**
Veja os logs do servidor (Terminal 1) para detalhes do erro

---

## 🎯 **Resumo Rápido:**

### **Para Desenvolvimento Local:**

```powershell
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copiar whsec_... para .env.local
# Reiniciar Terminal 1
```

### **Para Produção:**

1. Dashboard Stripe → Webhooks → Add endpoint
2. URL: `https://seu-dominio.com/api/webhooks/stripe`
3. Eventos: Todos (ou os 6 listados acima)
4. Copiar signing secret → `.env` da produção
5. Reiniciar servidor

---

## 💡 **Dica Pro:**

Por enquanto, **use a solução automática** (CheckoutSync) que já implementamos! 

Ela funciona **sem webhook** e sincroniza automaticamente após o pagamento.

Quando fizer deploy em produção, configure o webhook oficial do Stripe para ter processamento em tempo real! 🚀

---

## 📚 **Links Úteis:**

- [Dashboard Webhooks](https://dashboard.stripe.com/test/webhooks)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Eventos do Stripe](https://stripe.com/docs/api/events/types)
- [Testar Webhooks](https://dashboard.stripe.com/test/webhooks)

---

**Dúvidas?** Execute os comandos e me avise se aparecer algum erro! 🎉

