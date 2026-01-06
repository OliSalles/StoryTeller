# Configuração de Webhooks do Stripe para Desenvolvimento Local

Para testar pagamentos localmente, você precisa configurar os webhooks do Stripe usando o Stripe CLI.

## 🚀 Passo a Passo

### 1. Instalar o Stripe CLI

**Windows (usando winget):**
```powershell
winget install stripe.stripe-cli
```

**Ou usando Scoop:**
```powershell
scoop install stripe
```

**Ou baixar diretamente:**
- Acesse: https://github.com/stripe/stripe-cli/releases
- Baixe o instalador para Windows
- Execute o instalador

### 2. Fazer Login no Stripe

```bash
stripe login
```

Isso abrirá seu navegador para você autorizar o acesso.

### 3. Verificar a Instalação

```bash
stripe --version
```

### 4. Iniciar o Encaminhamento de Webhooks

Com o servidor rodando em uma janela do terminal (`npm run dev`), abra **outra janela** do terminal e execute:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Você verá algo como:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 5. Copiar o Webhook Secret

Copie o valor que aparece depois de `whsec_` e atualize seu arquivo `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 6. Reiniciar o Servidor

Após atualizar o `.env`, reinicie o servidor:

```bash
# Pressione Ctrl+C no terminal do servidor
npm run dev
```

### 7. Testar um Pagamento

Agora quando você fizer um pagamento de teste no Stripe, os webhooks serão encaminhados para seu servidor local e o banco de dados será atualizado automaticamente!

## 🔍 Monitoramento

No terminal onde você executou `stripe listen`, você verá todos os eventos que o Stripe está enviando:

```
2025-01-06 10:30:15  --> checkout.session.completed [evt_xxxxx]
2025-01-06 10:30:16  <--  [200] POST http://localhost:3000/api/webhooks/stripe
```

## 🧪 Testar Webhooks Manualmente

Você também pode disparar eventos de teste:

```bash
# Testar um pagamento bem-sucedido
stripe trigger checkout.session.completed

# Testar uma assinatura criada
stripe trigger customer.subscription.created

# Testar um pagamento falhado
stripe trigger invoice.payment_failed
```

## 📝 Cartões de Teste do Stripe

Use estes cartões para testar pagamentos:

- **Pagamento bem-sucedido**: `4242 4242 4242 4242`
- **Pagamento requer autenticação**: `4000 0027 6000 3184`
- **Pagamento recusado**: `4000 0000 0000 0002`
- **Cartão insuficiente**: `4000 0000 0000 9995`

**Dados para preencher:**
- Data de validade: Qualquer data futura (ex: 12/28)
- CVC: Qualquer 3 dígitos (ex: 123)
- CEP: Qualquer CEP (ex: 12345)

## ⚠️ Importante

- O webhook secret gerado pelo `stripe listen` é **temporário**
- Quando você parar o `stripe listen` e iniciar novamente, um novo secret será gerado
- Você precisará atualizar o `.env` com o novo secret
- Para produção, você usará um webhook secret permanente configurado no Dashboard do Stripe

## 🔧 Troubleshooting

### Erro: "No signature provided"
- Certifique-se de que o `stripe listen` está rodando
- Verifique se o `STRIPE_WEBHOOK_SECRET` está no `.env`
- Reinicie o servidor após atualizar o `.env`

### Erro: "Signature verification failed"
- O webhook secret no `.env` está desatualizado
- Copie o novo secret do terminal onde `stripe listen` está rodando
- Atualize o `.env` e reinicie o servidor

### Webhook não está sendo recebido
- Verifique se o servidor está rodando na porta 3000
- Verifique se não há firewall bloqueando
- Confirme que o `stripe listen` está apontando para a URL correta

## 📚 Recursos Adicionais

- [Documentação Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhooks do Stripe](https://stripe.com/docs/webhooks)
- [Eventos do Stripe](https://stripe.com/docs/api/events/types)

---

## 🎯 Resumo Rápido

```bash
# Terminal 1: Servidor da aplicação
npm run dev

# Terminal 2: Encaminhamento de webhooks
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copie o webhook secret que aparece e adicione no .env
# Reinicie o servidor (Terminal 1)
```

Pronto! Agora os pagamentos serão processados corretamente no desenvolvimento local! 🎉


