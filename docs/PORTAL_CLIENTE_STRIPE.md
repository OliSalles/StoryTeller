# Portal do Cliente Stripe - Guia Completo

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Configuração](#configuração)
4. [Integração](#integração)
5. [Webhooks](#webhooks)
6. [Testes](#testes)
7. [Produção](#produção)

---

## 🎯 Visão Geral

O Portal do Cliente do Stripe permite que seus clientes gerenciem suas próprias assinaturas, métodos de pagamento e informações de faturamento sem precisar entrar em contato com o suporte.

### O que os clientes podem fazer:

- ✅ **Atualizar assinatura** - Fazer upgrade/downgrade de planos
- ✅ **Cancelar assinatura** - Cancelar ao final do período de faturamento
- ✅ **Gerenciar pagamentos** - Adicionar/remover cartões de crédito
- ✅ **Ver faturas** - Acessar histórico completo de pagamentos
- ✅ **Atualizar dados** - Modificar email, endereço e informações fiscais
- ✅ **IDs Fiscais** - Adicionar CPF/CNPJ para notas fiscais

---

## ⚙️ Configuração

### 1. Configuração Automática (Recomendado)

Execute o script de configuração:

```bash
npm run stripe:configure-portal
```

Este script criará uma configuração padrão com todas as funcionalidades habilitadas.

### 2. Configuração Manual no Dashboard

Acesse: https://dashboard.stripe.com/settings/billing/portal

**Perfil do Negócio:**
- Título: "Gerencie sua assinatura do StoryTeller"
- URL de Política de Privacidade
- URL de Termos de Serviço

**Funcionalidades:**

#### Atualização de Assinatura
- ✅ Habilitado
- Permitir: Preço, Quantidade, Código Promocional
- Comportamento de Rateio: Criar rateios

#### Cancelamento de Assinatura
- ✅ Habilitado
- Modo: Ao final do período
- Solicitar motivo: Sim
- Opções de motivo:
  - Muito caro
  - Faltam recursos
  - Mudei para outro serviço
  - Não estou usando
  - Atendimento ao cliente
  - Muito complexo
  - Baixa qualidade
  - Outro

#### Gerenciamento de Pagamento
- ✅ Habilitado
- Permitir adicionar/remover métodos de pagamento

#### Histórico de Faturas
- ✅ Habilitado
- Mostrar todas as faturas pagas e pendentes

#### Atualização de Cliente
- ✅ Habilitado
- Permitir atualizar: Email, Endereço, Telefone, ID Fiscal

#### Pausa de Assinatura
- ❌ Desabilitado (pode ser habilitado se necessário)

**URL de Retorno Padrão:**
- Desenvolvimento: `http://localhost:5173/account/subscription`
- Produção: `https://storytellerboard.com/account/subscription`

---

## 🔗 Integração

### Backend (Já Implementado)

#### Endpoint para criar sessão do portal

```typescript
// server/subscriptions.routers.ts
createPortal: protectedProcedure.mutation(async ({ ctx }) => {
  const subscription = await db.getActiveSubscription(ctx.user.id);
  
  if (!subscription || !subscription.stripeCustomerId) {
    throw new Error("Você não tem uma assinatura ativa");
  }
  
  const session = await createCustomerPortalSession(subscription.stripeCustomerId);
  
  return { url: session.url };
})
```

#### Função auxiliar

```typescript
// server/_core/stripe.ts
export async function createCustomerPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${ENV.appUrl}/account/subscription`,
  });
  
  return session;
}
```

### Frontend (Já Implementado)

#### Botão "Gerenciar Assinatura"

```tsx
// client/src/pages/AccountSubscription.tsx
const createPortal = trpc.subscriptions.createPortal.useMutation();

const handleManageSubscription = async () => {
  try {
    const result = await createPortal.mutateAsync();
    if (result.url) {
      window.location.href = result.url; // Redirecionar para o Portal
    }
  } catch (error: any) {
    toast.error(error.message || "Erro ao abrir portal de pagamento");
  }
};

<Button onClick={handleManageSubscription}>
  <ExternalLink className="mr-2 h-4 w-4" />
  Gerenciar Assinatura
</Button>
```

---

## 🔔 Webhooks

Os seguintes webhooks são processados automaticamente:

### Eventos de Assinatura

| Evento | Descrição | Handler |
|--------|-----------|---------|
| `customer.subscription.updated` | Assinatura atualizada (upgrade/downgrade) | `handleSubscriptionUpdated` |
| `customer.subscription.deleted` | Assinatura cancelada | `handleSubscriptionDeleted` |

### Eventos de Pagamento

| Evento | Descrição | Handler |
|--------|-----------|---------|
| `payment_method.attached` | Método de pagamento adicionado | `handlePaymentMethodAttached` |
| `payment_method.detached` | Método de pagamento removido | `handlePaymentMethodDetached` |

### Eventos de Cliente

| Evento | Descrição | Handler |
|--------|-----------|---------|
| `customer.updated` | Informações do cliente atualizadas | `handleCustomerUpdated` |
| `customer.tax_id.created` | ID fiscal adicionado | `handleCustomerTaxIdCreated` |
| `customer.tax_id.deleted` | ID fiscal removido | `handleCustomerTaxIdDeleted` |
| `customer.tax_id.updated` | ID fiscal atualizado | `handleCustomerTaxIdUpdated` |

### Eventos do Portal

| Evento | Descrição | Handler |
|--------|-----------|---------|
| `billing_portal.configuration.created` | Configuração do portal criada | `handlePortalConfigCreated` |
| `billing_portal.configuration.updated` | Configuração do portal atualizada | `handlePortalConfigUpdated` |
| `billing_portal.session.created` | Sessão do portal criada | `handlePortalSessionCreated` |

### Configuração de Webhooks

**Desenvolvimento (Stripe CLI):**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Produção:**
1. Acesse: https://dashboard.stripe.com/webhooks
2. Adicione endpoint: `https://seu-dominio.com/api/webhooks/stripe`
3. Selecione todos os eventos acima
4. Copie o webhook secret para `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Testes

### 1. Testar Portal Localmente

1. Inicie o servidor:
```bash
npm run dev
```

2. Inicie o Stripe CLI (em outro terminal):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Acesse a aplicação:
```
http://localhost:5173
```

4. Faça login e vá para "Assinatura"

5. Clique em "Gerenciar Assinatura"

### 2. Cenários de Teste

#### Teste 1: Atualizar Método de Pagamento
1. Acesse o portal
2. Clique em "Adicionar método de pagamento"
3. Use cartão de teste: `4242 4242 4242 4242`
4. Verifique webhook `payment_method.attached`

#### Teste 2: Fazer Upgrade de Plano
1. Acesse o portal
2. Clique em "Atualizar plano"
3. Selecione um plano superior
4. Confirme a mudança
5. Verifique webhook `customer.subscription.updated`

#### Teste 3: Cancelar Assinatura
1. Acesse o portal
2. Clique em "Cancelar assinatura"
3. Selecione um motivo
4. Confirme o cancelamento
5. Verifique que `cancel_at_period_end = true`
6. Verifique webhook `customer.subscription.updated`

#### Teste 4: Reativar Assinatura Cancelada
1. Após cancelar, acesse o portal novamente
2. Clique em "Reativar assinatura"
3. Verifique que `cancel_at_period_end = false`
4. Verifique webhook `customer.subscription.updated`

#### Teste 5: Adicionar ID Fiscal
1. Acesse o portal
2. Vá para "Informações de faturamento"
3. Adicione um CPF/CNPJ de teste
4. Verifique webhook `customer.tax_id.created`

#### Teste 6: Ver Histórico de Faturas
1. Acesse o portal
2. Clique em "Faturas"
3. Verifique que todas as faturas aparecem
4. Faça download de uma fatura

### 3. Verificar Logs

```bash
# Logs do servidor
npm run dev

# Logs do Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Verificar banco de dados
npm run db:debug
```

---

## 🚀 Produção

### Checklist de Deploy

- [ ] Configurar Portal no modo produção (Dashboard)
- [ ] Adicionar webhook de produção
- [ ] Atualizar `STRIPE_SECRET_KEY` (live key)
- [ ] Atualizar `STRIPE_PUBLISHABLE_KEY` (live key)
- [ ] Atualizar `STRIPE_WEBHOOK_SECRET` (live secret)
- [ ] Atualizar `APP_URL` para URL de produção
- [ ] Configurar URLs de Política de Privacidade e Termos
- [ ] Testar fluxo completo em produção
- [ ] Monitorar logs de webhook

### Variáveis de Ambiente (Produção)

```env
# Stripe - Modo Produção
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URL da aplicação
APP_URL=https://storytellerboard.com
```

### Monitoramento

**Dashboard do Stripe:**
- Eventos: https://dashboard.stripe.com/events
- Webhooks: https://dashboard.stripe.com/webhooks
- Clientes: https://dashboard.stripe.com/customers
- Assinaturas: https://dashboard.stripe.com/subscriptions

**Logs da Aplicação:**
- Todos os eventos de webhook são logados com prefixo `[Webhook]`
- Erros são logados com stack trace completo

---

## 📚 Recursos Adicionais

### Documentação Oficial
- [Portal do Cliente - Stripe](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Configuração do Portal](https://stripe.com/docs/api/customer_portal/configuration)
- [Webhooks](https://stripe.com/docs/webhooks)

### Links Úteis
- [Dashboard do Stripe](https://dashboard.stripe.com)
- [Cartões de Teste](https://stripe.com/docs/testing#cards)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

### Suporte
- Documentação: `/docs`
- Issues: GitHub Issues
- Email: suporte@storytellerboard.com

---

## 🎨 Personalização

### Links Diretos

Você pode criar links diretos para páginas específicas do portal:

```typescript
// Direcionar para página de cancelamento
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${appUrl}/account/subscription`,
  flow_data: {
    type: 'subscription_cancel',
    subscription_cancel: {
      subscription: subscriptionId,
    },
  },
});

// Direcionar para página de atualização de assinatura
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${appUrl}/account/subscription`,
  flow_data: {
    type: 'subscription_update',
    subscription_update: {
      subscription: subscriptionId,
    },
  },
});
```

### Múltiplas Configurações

Se você precisa de diferentes configurações para diferentes tipos de clientes:

```typescript
// Criar configuração personalizada
const premiumConfig = await stripe.billingPortal.configurations.create({
  features: {
    subscription_cancel: {
      enabled: false, // Premium users não podem cancelar pelo portal
    },
  },
});

// Usar configuração específica
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  configuration: premiumConfig.id,
  return_url: `${appUrl}/account/subscription`,
});
```

---

**Última atualização:** 06/01/2026

