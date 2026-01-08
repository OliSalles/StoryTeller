# 🔧 Configurar Stripe Local (Modo Teste)

## ✅ Planos já configurados no banco

Os planos já foram atualizados com os IDs de preço do Stripe:

| Plano | Mensal | Anual | Stripe Monthly ID | Stripe Yearly ID |
|-------|--------|-------|-------------------|------------------|
| **Pro** | R$ 49,00 | R$ 490,99 | `price_1SmJ1XPF9dhbqC6rzY0iiHxO` | `price_1SmOzvPF9dhbqC6rsdYMap3N` |
| **Business** | R$ 149,00 | R$ 1.490,00 | `price_1SmKbCPF9dhbqC6re81wKJoE` | `price_1SmP0rPF9dhbqC6rTNVdSY0m` |

---

## 📝 Passo 1: Criar arquivo .env.local

Na raiz do projeto, crie o arquivo `.env.local` com este conteúdo:

```env
# ================================
# Configuração Local (Desenvolvimento)
# ================================

# Database - PostgreSQL Docker
DATABASE_URL=postgresql://postgres:storyteller_dev_password@localhost:5432/storyteller

# JWT Secret
JWT_SECRET=dev-secret-key-storyteller-local-2024

# OAuth (opcional para local)
VITE_APP_ID=storyteller-local
OAUTH_SERVER_URL=http://localhost:5173

# Ambiente
NODE_ENV=development

# Porta do servidor
PORT=5173

# ==============================
# STRIPE (Modo de TESTE) 🧪
# ==============================

STRIPE_SECRET_KEY=sk_test_51SmHb9PF9dhbqC6r...COPIE_SUA_CHAVE_AQUI...
STRIPE_PUBLISHABLE_KEY=pk_test_51SmHb9PF9dhbqC6r...COPIE_SUA_CHAVE_AQUI...

# Webhook Secret (configurar depois de criar o webhook)
STRIPE_WEBHOOK_SECRET=

# URL da aplicação
APP_URL=http://localhost:5173

# ==============================
# OPENAI (Opcional para testes)
# ==============================

OPENAI_API_KEY=sk-proj-your-openai-key-here
```

---

## 🔗 Passo 2: Configurar Webhook Local do Stripe

Para testar webhooks localmente, você precisa do **Stripe CLI**.

### Opção 1: Instalar Stripe CLI (Recomendado)

**Windows (via Scoop):**
```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Ou baixe direto:**
https://github.com/stripe/stripe-cli/releases

### Opção 2: Testar sem Webhooks

Você pode testar o checkout sem webhooks, mas as assinaturas não serão criadas automaticamente no banco.

---

## 🚀 Passo 3: Configurar Webhook (se instalou Stripe CLI)

### 1. Login no Stripe CLI

```powershell
stripe login
```

Isso vai abrir o navegador para você autorizar.

### 2. Escutar webhooks localmente

```powershell
stripe listen --forward-to http://localhost:5173/api/webhooks/stripe
```

### 3. Copiar o Webhook Secret

O comando acima vai mostrar algo como:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Copie esse secret** e adicione no `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 4. Reiniciar o servidor

```powershell
# Parar o servidor (Ctrl+C)
# Rodar novamente
npm run dev
```

---

## 🧪 Passo 4: Testar o Sistema

### 1. Acessar a aplicação

```
http://localhost:5173
```

### 2. Criar um usuário

Registre-se no sistema.

### 3. Acessar página de planos

```
http://localhost:5173/pricing
```

### 4. Testar checkout

Clique em "Assinar" em qualquer plano.

### 5. Usar cartão de teste do Stripe

No checkout do Stripe, use:

**Cartão de sucesso:**
- Número: `4242 4242 4242 4242`
- Data: Qualquer data futura (ex: 12/34)
- CVC: Qualquer 3 dígitos (ex: 123)
- CEP: Qualquer (ex: 12345)

**Outros cartões de teste:**
- **Falha genérica:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- **Requer autenticação:** `4000 0027 6000 3184`

Veja mais: https://stripe.com/docs/testing

---

## ✅ Passo 5: Verificar se funcionou

### No terminal do webhook (se configurou):

Deve aparecer:
```
[Webhook] 🎯 Received Stripe webhook request
[Webhook] 📨 Event Type: checkout.session.completed
[Webhook] ✅ Created subscription for user X
```

### No banco de dados:

```powershell
docker exec -it storyteller_postgres psql -U postgres -d storyteller
```

```sql
-- Ver assinaturas criadas
SELECT * FROM subscriptions;

-- Ver pagamentos
SELECT * FROM payments;
```

---

## 🎫 Testar Cupons

### Aplicar um cupom no checkout:

1. Na página de checkout, digite o código: `BEMVINDO`
2. Clique em "Aplicar"
3. Deve aparecer: "Desconto de 20% aplicado!"

**Cupons disponíveis:**
- `BEMVINDO` - 20% off
- `PRIMEIRA` - 50% off
- `TRIAL30` - 30 dias grátis
- `GRATIS3MESES` - 3 meses grátis

---

## 🆘 Troubleshooting

### Erro: "STRIPE_SECRET_KEY missing"

Certifique-se de que o arquivo `.env.local` existe e contém a chave.

### Erro: "Webhook signature verification failed"

O `STRIPE_WEBHOOK_SECRET` está incorreto. Use o secret que o `stripe listen` forneceu.

### Checkout abre mas não redireciona

Verifique se o `APP_URL` está correto no `.env.local`.

### Assinatura não aparece no banco

O webhook não está funcionando. Configure o Stripe CLI ou teste sem webhooks.

---

## 📚 Recursos

- **Stripe Dashboard (Teste):** https://dashboard.stripe.com/test/dashboard
- **Documentação Stripe:** https://stripe.com/docs
- **Cartões de Teste:** https://stripe.com/docs/testing
- **Stripe CLI:** https://stripe.com/docs/stripe-cli

---

**Pronto para testar! 🚀**

Depois de validar localmente, podemos fazer deploy para produção.

