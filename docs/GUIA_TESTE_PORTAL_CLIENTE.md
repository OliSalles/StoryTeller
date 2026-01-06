# 🧪 Guia de Teste - Portal do Cliente Stripe

## 📋 Pré-requisitos

Antes de testar, certifique-se de que:

- ✅ Servidor está rodando (`npm run dev`)
- ✅ Stripe CLI está rodando (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- ✅ Você tem uma assinatura ativa (faça um pagamento de teste se necessário)

## 🎯 Cenários de Teste

### 1. Acessar o Portal do Cliente

**Passos:**
1. Faça login na aplicação: http://localhost:5173/login
2. Vá para "Assinatura" no menu
3. Clique no botão "Gerenciar Assinatura"
4. Você será redirecionado para o Portal do Cliente do Stripe

**Resultado esperado:**
- ✅ Redirecionamento bem-sucedido
- ✅ Portal carrega com as informações da sua assinatura
- ✅ Interface em português (ou inglês, dependendo da configuração)

---

### 2. Visualizar Histórico de Faturas

**Passos:**
1. No Portal do Cliente, procure a seção "Faturas" ou "Invoices"
2. Clique para ver o histórico completo

**Resultado esperado:**
- ✅ Lista de todas as faturas pagas
- ✅ Possibilidade de fazer download de cada fatura em PDF
- ✅ Status de cada fatura (Paga, Pendente, etc.)

**Webhook esperado:**
- Nenhum (apenas visualização)

---

### 3. Adicionar Novo Método de Pagamento

**Passos:**
1. No Portal do Cliente, vá para "Métodos de pagamento"
2. Clique em "Adicionar método de pagamento"
3. Use um cartão de teste: `4242 4242 4242 4242`
4. Data de validade: qualquer data futura
5. CVV: qualquer 3 dígitos
6. Salve o método de pagamento

**Resultado esperado:**
- ✅ Cartão adicionado com sucesso
- ✅ Mensagem de confirmação

**Webhook esperado:**
```
[Webhook] 💳 Handling payment_method.attached
[Webhook] Payment method pm_xxx attached to customer cus_xxx
```

---

### 4. Alterar Método de Pagamento Padrão

**Passos:**
1. Se você tem múltiplos métodos de pagamento
2. Selecione um diferente como padrão
3. Confirme a alteração

**Resultado esperado:**
- ✅ Método padrão atualizado

**Webhook esperado:**
```
[Webhook] 👤 Handling customer.updated
[Webhook] Customer cus_xxx updated
[Webhook] Default payment method updated to: pm_xxx
```

---

### 5. Remover Método de Pagamento

**Passos:**
1. No Portal do Cliente, vá para "Métodos de pagamento"
2. Selecione um método que NÃO seja o padrão
3. Clique em "Remover"
4. Confirme a remoção

**Resultado esperado:**
- ✅ Método removido com sucesso
- ⚠️ Não é possível remover o método padrão se for o único

**Webhook esperado:**
```
[Webhook] 💳 Handling payment_method.detached
[Webhook] Payment method pm_xxx detached from customer cus_xxx
```

---

### 6. Atualizar Informações de Faturamento

**Passos:**
1. No Portal do Cliente, vá para "Informações de faturamento"
2. Atualize o email, endereço ou telefone
3. Salve as alterações

**Resultado esperado:**
- ✅ Informações atualizadas com sucesso

**Webhook esperado:**
```
[Webhook] 👤 Handling customer.updated
[Webhook] Customer cus_xxx updated
[Webhook] Customer email: novo-email@example.com
```

---

### 7. Adicionar ID Fiscal (CPF/CNPJ)

**Passos:**
1. No Portal do Cliente, vá para "Informações fiscais" ou "Tax ID"
2. Clique em "Adicionar ID fiscal"
3. Selecione o tipo (ex: BR CPF, BR CNPJ)
4. Insira um número de teste:
   - CPF: `123.456.789-00`
   - CNPJ: `12.345.678/0001-00`
5. Salve

**Resultado esperado:**
- ✅ ID fiscal adicionado
- ⚠️ Status de validação pode aparecer

**Webhook esperado:**
```
[Webhook] 🧾 Handling customer.tax_id.created
[Webhook] Tax ID created for customer cus_xxx
[Webhook] Type: br_cpf, Value: 12345678900, Verification status: unavailable
```

---

### 8. Cancelar Assinatura

**Passos:**
1. No Portal do Cliente, procure "Cancelar assinatura"
2. Clique em "Cancelar"
3. Selecione um motivo (ex: "Muito caro")
4. Confirme o cancelamento

**Resultado esperado:**
- ✅ Assinatura marcada para cancelamento
- ✅ Mensagem informando que a assinatura continua até o final do período
- ✅ Data de cancelamento exibida

**Webhook esperado:**
```
[Webhook] 🔄 Handling customer.subscription.updated
[Webhook] Processing customer.subscription.updated
[Webhook] Updated subscription sub_xxx
```

**Verificar no banco:**
```bash
npm run db:debug
```

Você deve ver:
- `cancel_at_period_end: true`
- `current_period_end: [data futura]`

---

### 9. Reativar Assinatura Cancelada

**Passos:**
1. Após cancelar, volte ao Portal do Cliente
2. Você verá uma opção "Reativar assinatura" ou "Renovar"
3. Clique para reativar
4. Confirme

**Resultado esperado:**
- ✅ Assinatura reativada
- ✅ `cancel_at_period_end` volta para `false`

**Webhook esperado:**
```
[Webhook] 🔄 Handling customer.subscription.updated
[Webhook] Processing customer.subscription.updated
[Webhook] Updated subscription sub_xxx
```

---

### 10. Fazer Upgrade de Plano (se configurado)

**Passos:**
1. No Portal do Cliente, procure "Atualizar plano" ou "Change plan"
2. Selecione um plano superior
3. Confirme a mudança

**Resultado esperado:**
- ✅ Plano atualizado imediatamente
- ✅ Cobrança proporcional (proration) criada
- ✅ Novo limite de tokens disponível

**Webhook esperado:**
```
[Webhook] 🔄 Handling customer.subscription.updated
[Webhook] Processing customer.subscription.updated
[Webhook] Updated subscription sub_xxx
```

**Verificar no banco:**
```bash
npm run db:debug
```

Você deve ver:
- `plan_id` atualizado para o novo plano
- `tokens_used_this_period` resetado para 0

---

## 🔍 Como Verificar os Webhooks

### Terminal do Stripe CLI

Mantenha o terminal do Stripe CLI aberto durante os testes:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Você verá algo como:

```
Ready! You are using Stripe API Version [2024-12-18]. Your webhook signing secret is whsec_xxx (^C to quit)

2026-01-06 18:30:00   --> payment_method.attached [evt_xxx]
2026-01-06 18:30:00  <--  [200] POST http://localhost:3000/api/webhooks/stripe [evt_xxx]
```

### Logs do Servidor

No terminal onde você rodou `npm run dev`, você verá:

```
[Webhook] 🎯 Received Stripe webhook request
[Webhook] 📨 Event Type: payment_method.attached
[Webhook] 💳 Handling payment_method.attached
[Webhook] ✅ Event processed successfully
```

### Dashboard do Stripe

Acesse: https://dashboard.stripe.com/test/events

Você pode ver todos os eventos disparados e seus detalhes.

---

## 🐛 Troubleshooting

### Erro: "Você não tem uma assinatura ativa"

**Causa:** Você não tem uma assinatura no banco de dados.

**Solução:**
```bash
# Fazer um pagamento de teste
# 1. Vá para http://localhost:5173/pricing
# 2. Escolha um plano
# 3. Complete o checkout com cartão de teste: 4242 4242 4242 4242
```

### Portal não carrega / Erro 404

**Causa:** Configuração do Portal não está ativa.

**Solução:**
```bash
npm run stripe:configure-portal
```

Ou configure manualmente em:
https://dashboard.stripe.com/settings/billing/portal

### Webhooks não estão sendo recebidos

**Causa:** Stripe CLI não está rodando ou webhook secret está incorreto.

**Solução:**
```bash
# 1. Inicie o Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 2. Copie o webhook secret exibido
# 3. Atualize no .env.local:
STRIPE_WEBHOOK_SECRET=whsec_xxx

# 4. Reinicie o servidor
npm run dev
```

### Erro: "No such customer"

**Causa:** Assinatura de teste manual sem Stripe Customer ID real.

**Solução:**
- Faça um pagamento real através do checkout
- Ou aguarde a integração completa com Stripe

---

## ✅ Checklist de Testes

Marque cada item conforme você testa:

- [ ] Acessar Portal do Cliente
- [ ] Visualizar histórico de faturas
- [ ] Adicionar método de pagamento
- [ ] Alterar método padrão
- [ ] Remover método de pagamento
- [ ] Atualizar informações de faturamento
- [ ] Adicionar ID fiscal
- [ ] Cancelar assinatura
- [ ] Reativar assinatura
- [ ] Fazer upgrade de plano (se configurado)
- [ ] Verificar todos os webhooks foram recebidos
- [ ] Verificar banco de dados foi atualizado corretamente

---

## 📊 Resultados Esperados

Após completar todos os testes, você deve ter:

1. **Webhooks funcionando:** Todos os eventos listados acima foram recebidos e processados
2. **Banco de dados atualizado:** Mudanças refletidas no banco
3. **UI atualizada:** Página de assinatura mostra informações corretas
4. **Logs limpos:** Sem erros no console do servidor

---

## 🚀 Próximos Passos

Após testar localmente:

1. **Configurar Portal em Produção:**
   - Acesse: https://dashboard.stripe.com/settings/billing/portal
   - Ative o modo produção
   - Configure as mesmas funcionalidades

2. **Adicionar Webhooks de Produção:**
   - Acesse: https://dashboard.stripe.com/webhooks
   - Adicione endpoint: `https://seu-dominio.com/api/webhooks/stripe`
   - Selecione todos os eventos

3. **Atualizar Variáveis de Ambiente:**
   - Use chaves de produção (`sk_live_...`, `pk_live_...`)
   - Atualize `STRIPE_WEBHOOK_SECRET` com o secret de produção

4. **Testar em Produção:**
   - Faça um pagamento real (pequeno valor)
   - Teste o Portal do Cliente em produção
   - Monitore logs e webhooks

---

**Documentação completa:** `/docs/PORTAL_CLIENTE_STRIPE.md`

**Última atualização:** 06/01/2026

