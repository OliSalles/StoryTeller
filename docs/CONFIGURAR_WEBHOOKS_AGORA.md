# 🚀 Configure os Webhooks do Stripe AGORA (5 minutos)

## ❗ Por que você está no plano Free mesmo após pagar?

Porque o **webhook do Stripe não está configurado**. O webhook é responsável por avisar seu servidor quando um pagamento é concluído.

---

## ✅ Solução Rápida (3 passos)

### **Passo 1: Abrir 2 terminais**

Você precisa de **2 terminais abertos ao mesmo tempo**:

- **Terminal 1**: Servidor da aplicação
- **Terminal 2**: Stripe CLI (webhooks)

---

### **Passo 2: Terminal 1 - Iniciar o Servidor**

```powershell
npm run dev
```

✅ Deixe este terminal rodando!

---

### **Passo 3: Terminal 2 - Configurar Webhooks**

#### 3.1. Fazer login no Stripe:

```powershell
stripe login
```

- Vai abrir o navegador
- Clique em "Allow access"
- Volte para o terminal

#### 3.2. Iniciar o listener de webhooks:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Você verá algo como:

```
> Ready! Your webhook signing secret is whsec_abc123xyz456...
```

#### 3.3. Copiar o Webhook Secret:

**COPIE** o valor que começa com `whsec_` (exemplo: `whsec_abc123xyz456...`)

#### 3.4. Atualizar o arquivo `.env`:

Abra o arquivo `.env` na raiz do projeto e adicione/atualize esta linha:

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz456...
```

(Cole o valor que você copiou no passo anterior)

#### 3.5. Reiniciar o Servidor (Terminal 1):

Volte para o **Terminal 1**, pressione `Ctrl+C` e execute novamente:

```powershell
npm run dev
```

---

## 🎉 Pronto! Agora teste:

1. Acesse: http://localhost:5173/pricing
2. Escolha um plano e faça o pagamento
3. Use o cartão de teste: `4242 4242 4242 4242`
4. No **Terminal 2** (Stripe CLI), você verá os webhooks sendo recebidos
5. Após o pagamento, seu plano será atualizado automaticamente! ✅

---

## 📋 Cartões de Teste do Stripe

- **Sucesso**: `4242 4242 4242 4242`
- **Requer autenticação**: `4000 0027 6000 3184`
- **Recusado**: `4000 0000 0000 0002`

**Dados:**
- Data: Qualquer data futura (ex: 12/28)
- CVC: Qualquer 3 dígitos (ex: 123)
- CEP: Qualquer (ex: 12345)

---

## 🔍 Como saber se está funcionando?

No **Terminal 2** (Stripe CLI), você verá:

```
2025-01-06 10:30:15  --> checkout.session.completed [evt_xxxxx]
2025-01-06 10:30:16  <--  [200] POST http://localhost:3000/api/webhooks/stripe
```

Se aparecer `[200]`, significa que funcionou! ✅

---

## ⚠️ Importante

- Mantenha o **Terminal 2** (Stripe CLI) rodando enquanto estiver testando
- Se fechar o Terminal 2, os webhooks param de funcionar
- Cada vez que rodar `stripe listen`, um novo `whsec_` será gerado
- Você precisará atualizar o `.env` com o novo secret

---

## 🆘 Problemas?

### Erro: "No signature provided"
- O `stripe listen` não está rodando
- Execute novamente no Terminal 2

### Erro: "Signature verification failed"
- O `STRIPE_WEBHOOK_SECRET` no `.env` está errado
- Copie o secret correto do Terminal 2
- Reinicie o servidor (Terminal 1)

### Pagamento não atualiza o plano
- Verifique se o Terminal 2 mostra `[200]`
- Se mostrar `[400]` ou `[500]`, há um erro
- Verifique os logs no Terminal 1

---

## 📚 Mais Informações

Veja o guia completo em: `docs/STRIPE_LOCAL_WEBHOOKS.md`

---

## 🎯 Resumo Visual

```
┌─────────────────────────────────────────────────────────────┐
│  Terminal 1                    Terminal 2                   │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  $ npm run dev                 $ stripe login               │
│  ✅ Server running             ✅ Logged in                 │
│                                                              │
│                                $ stripe listen --forward... │
│                                ✅ Webhooks: whsec_abc123... │
│                                                              │
│  [Mantenha rodando]            [Mantenha rodando]           │
└─────────────────────────────────────────────────────────────┘

1. Copie o whsec_abc123... do Terminal 2
2. Cole no arquivo .env
3. Reinicie o Terminal 1 (Ctrl+C e npm run dev)
4. Faça um pagamento de teste
5. ✅ Plano atualizado automaticamente!
```

---

**Tempo estimado: 5 minutos** ⏱️

Boa sorte! 🚀


