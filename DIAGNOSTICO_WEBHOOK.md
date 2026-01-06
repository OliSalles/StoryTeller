# ⚠️ DIAGNÓSTICO: Webhook não está sendo recebido

## 🔍 Problema Identificado

O checkout está redirecionando corretamente para:
```
http://localhost:5173/subscription/success?session_id=cs_test_a1kDaFM15C6dZ4Udy5WREgY4CoViJoXShpRlrCMHzwaSsSlutHLM5dBjZd
```

**MAS:** O banco de dados não está sendo atualizado porque **o webhook não está chegando ao servidor**.

---

## 📋 Evidências

### ✅ O que está funcionando:

1. **Servidor rodando:** Porta 3000 ativa
2. **Stripe configurado:** Chaves API corretas
3. **Checkout funcionando:** Pagamento processado com sucesso
4. **Redirecionamento correto:** Página de sucesso carrega

### ❌ O que NÃO está funcionando:

1. **Stripe CLI não está encaminhando webhooks**
2. **Nenhum log de webhook no servidor**
3. **Banco de dados não atualiza**

### 🔍 Prova no log do servidor:

```
[Stripe] Creating checkout session with appUrl: http://localhost:5173
[Stripe] Success URL will be: http://localhost:5173/subscription/success
```

**Mas não aparece:**
```
[Webhook] 🎯 Received Stripe webhook request
[Webhook] 📨 Event Type: checkout.session.completed
```

---

## 🔧 SOLUÇÃO

### Passo 1: Abrir um NOVO Terminal PowerShell

Abra um **segundo terminal** (não feche o que está rodando `npm run dev`).

### Passo 2: Executar o Stripe CLI

No novo terminal, execute:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Passo 3: Verificar que está funcionando

Você deve ver algo como:

```
Ready! You are using Stripe API Version [2024-12-18]. Your webhook signing secret is whsec_xxx (^C to quit)
```

### Passo 4: Fazer um novo pagamento de teste

1. Acesse: http://localhost:5173/pricing
2. Escolha um plano
3. Complete o pagamento com cartão de teste: `4242 4242 4242 4242`

### Passo 5: Observar os logs

**No terminal do Stripe CLI, você verá:**
```
2026-01-06 18:30:00   --> payment_intent.created [evt_xxx]
2026-01-06 18:30:00  <--  [200] POST http://localhost:3000/api/webhooks/stripe [evt_xxx]
2026-01-06 18:30:01   --> checkout.session.completed [evt_xxx]
2026-01-06 18:30:01  <--  [200] POST http://localhost:3000/api/webhooks/stripe [evt_xxx]
```

**No terminal do servidor, você verá:**
```
[Webhook] 🎯 Received Stripe webhook request
[Webhook] 📨 Event Type: checkout.session.completed
[Webhook] 🛒 Handling checkout.session.completed
[Webhook] ✅ Created subscription for user X
```

### Passo 6: Verificar o banco de dados

```powershell
npm run db:debug
```

Você deve ver a nova assinatura criada!

---

## 🎯 Por que isso acontece?

O **Stripe CLI** precisa estar rodando **continuamente** para:

1. **Escutar eventos** do Stripe
2. **Encaminhar** esses eventos para `localhost:3000/api/webhooks/stripe`
3. **Simular** o comportamento de produção localmente

Sem o Stripe CLI rodando:
- ✅ O pagamento é processado no Stripe
- ✅ O checkout redireciona corretamente
- ❌ Mas o webhook nunca chega ao seu servidor
- ❌ Então o banco de dados não é atualizado

---

## 📝 Fluxo Correto

### Desenvolvimento Local:

```
Terminal 1: npm run dev
  ↓
Servidor rodando na porta 3000
  ↓
Terminal 2: stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ↓
Stripe CLI escutando eventos
  ↓
Pagamento no Stripe → Webhook → Stripe CLI → Servidor → Banco de Dados
```

### Produção:

```
Pagamento no Stripe → Webhook direto → Servidor → Banco de Dados
```

(Não precisa do Stripe CLI em produção!)

---

## 🚀 Comandos Resumidos

```powershell
# Terminal 1 (já está rodando)
npm run dev

# Terminal 2 (NOVO - execute agora!)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3 (para testes)
npm run db:debug
```

---

## ✅ Checklist

Marque conforme você executa:

- [ ] Terminal 1: `npm run dev` rodando
- [ ] Terminal 2: `stripe listen` rodando
- [ ] Fazer novo pagamento de teste
- [ ] Ver logs no Stripe CLI
- [ ] Ver logs no servidor
- [ ] Executar `npm run db:debug`
- [ ] Confirmar que assinatura foi criada

---

## 🆘 Se ainda não funcionar

### Problema: "stripe: command not found"

**Solução:** Instalar Stripe CLI
```powershell
# Baixe e instale de:
https://stripe.com/docs/stripe-cli
```

### Problema: "Error: listen tcp :3000: bind: address already in use"

**Solução:** Porta 3000 já está em uso
```powershell
# Encontre o processo
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Ou reinicie o servidor
# Ctrl+C no terminal 1, depois:
npm run dev
```

### Problema: Webhook secret incorreto

**Solução:** Atualizar o secret
1. O Stripe CLI mostra o secret quando você executa `stripe listen`
2. Copie o secret (começa com `whsec_`)
3. Atualize no `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
4. Reinicie o servidor (`npm run dev`)

---

## 📚 Documentação

- **Guia Completo:** `docs/PORTAL_CLIENTE_STRIPE.md`
- **Guia de Testes:** `docs/GUIA_TESTE_PORTAL_CLIENTE.md`
- **Stripe CLI:** https://stripe.com/docs/stripe-cli

---

**Status:** ⚠️ Aguardando Stripe CLI ser iniciado  
**Próximo Passo:** Executar `stripe listen` em um novo terminal

