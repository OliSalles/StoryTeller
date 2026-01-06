# 🔧 Configuração do Stripe CLI para Webhooks Locais

## Por que preciso disso?

Em **desenvolvimento local**, o Stripe não consegue enviar webhooks diretamente para `localhost`.
O Stripe CLI cria um "túnel" que encaminha os webhooks do Stripe para sua máquina local.

---

## 📦 Instalação no Windows

### Opção 1: Via Scoop (Recomendado)

```powershell
# 1. Instale o Scoop (se não tiver)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 2. Adicione o bucket do Stripe
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git

# 3. Instale o Stripe CLI
scoop install stripe

# 4. Verifique a instalação
stripe --version
```

### Opção 2: Download Manual

1. Acesse: https://github.com/stripe/stripe-cli/releases/latest
2. Baixe: `stripe_X.X.X_windows_x86_64.zip`
3. Extraia o arquivo `stripe.exe`
4. Adicione ao PATH ou execute direto do diretório

---

## 🚀 Uso Após Instalação

### 1. Faça login no Stripe:

```bash
stripe login
```

Isso abrirá o navegador para você autorizar o CLI.

### 2. Inicie o listener de webhooks:

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

### 3. Copie o Webhook Secret:

O CLI mostrará algo como:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### 4. Adicione ao `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 5. Reinicie o servidor:

```bash
npm run dev
```

---

## 🧪 Testando

1. Deixe o `stripe listen` rodando em um terminal
2. Em outro terminal, rode `npm run dev`
3. Acesse: http://localhost:3000/pricing
4. Faça um pagamento de teste
5. Veja os webhooks sendo recebidos no terminal do Stripe CLI!

---

## 🌐 Em Produção (EasyPanel)

Webhooks funcionam automaticamente sem o CLI:

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. URL: `https://storytellerboard.com/api/webhooks/stripe`
4. Eventos para escutar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copie o "Signing secret" (whsec_xxx)
6. Adicione no EasyPanel como variável de ambiente: `STRIPE_WEBHOOK_SECRET`

---

## ❓ Alternativa: Testar sem Webhooks

Se quiser testar rapidamente **sem configurar webhooks**, você pode:

1. O pagamento funcionará normalmente
2. A página de sucesso mostrará "Processando..."
3. **Manualmente** crie a assinatura no banco via pgAdmin/dbgate
4. A página detectará automaticamente (faz polling a cada 2s)

Mas para um **teste completo e automático**, o Stripe CLI é essencial! 🚀


