# 📋 Planejamento: Sistema de Assinaturas e Pagamentos

## 🎯 Objetivo

Implementar um sistema de assinaturas (mensal/anual) para monetizar o acesso à plataforma Bardo AI.

---

## 1. 📊 Modelos de Assinatura

### Planos Sugeridos

#### 🆓 **Free (Freemium)**

- **Preço:** Gratuito
- **Limites:**
  - Features ilimitadas
  - 50.000 tokens por mês
  - 1 usuário
  - Sem exportação Jira/Azure DevOps
  - Marca d'água no PDF
- **Objetivo:** Aquisição de usuários

#### 💼 **Pro**

- **Preço:** R$ 49/mês ou R$ 490/ano (2 meses grátis)
- **Trial:** 7 dias gratuitos
- **Limites:**
  - Features ilimitadas
  - 500.000 tokens por mês
  - 1 usuário
  - Exportação Jira/Azure DevOps
  - PDF sem marca d'água
  - Suporte por email

#### 🚀 **Business**

- **Preço:** R$ 149/mês ou R$ 1.490/ano (2 meses grátis)
- **Trial:** Não tem (sem período gratuito)
- **Limites:**
  - Features ilimitadas
  - 2.000.000 tokens por mês
  - 1 usuário
  - Todas as integrações
  - API access
  - Suporte prioritário
  - Relatórios personalizados

#### 🏢 **Enterprise**

- **Preço:** Sob consulta
- **Limites:** Customizados
- **Extras:**
  - Deploy on-premise
  - SLA garantido
  - Treinamento
  - Suporte dedicado

---

## 2. 🗄️ Schema de Banco de Dados

### Tabelas Necessárias

```sql
-- Planos disponíveis
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL, -- 'free', 'pro', 'business', 'enterprise'
  display_name VARCHAR(128) NOT NULL, -- 'Plano Pro'
  price_monthly DECIMAL(10,2), -- 49.00
  price_yearly DECIMAL(10,2), -- 490.00
  features_limit INTEGER, -- NULL = ilimitado
  tokens_limit INTEGER, -- NULL = ilimitado
  users_limit INTEGER, -- NULL = ilimitado
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assinaturas dos usuários
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(32) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing'
  billing_cycle VARCHAR(16) NOT NULL, -- 'monthly', 'yearly'
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- IDs externos (Stripe, etc)
  external_subscription_id VARCHAR(255), -- sub_xxxxx
  external_customer_id VARCHAR(255), -- cus_xxxxx

  -- Limites de uso no período atual
  features_used_this_period INTEGER DEFAULT 0,
  tokens_used_this_period INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de pagamentos
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(32) NOT NULL, -- 'succeeded', 'failed', 'pending'
  external_payment_id VARCHAR(255), -- pi_xxxxx
  payment_method VARCHAR(64), -- 'card', 'boleto', 'pix'
  error_message TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Faturas
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  invoice_number VARCHAR(64) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL, -- 'draft', 'open', 'paid', 'void'
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  pdf_url VARCHAR(512),
  external_invoice_id VARCHAR(255), -- in_xxxxx
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cupons de desconto
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  discount_type VARCHAR(16) NOT NULL, -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2) NOT NULL, -- 20.00 (20% ou R$ 20)
  max_uses INTEGER, -- NULL = ilimitado
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Uso de cupons
CREATE TABLE coupon_usages (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW()
);

-- Logs de eventos de cobrança
CREATE TABLE billing_events (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  event_type VARCHAR(64) NOT NULL, -- 'subscription.created', 'payment.succeeded', etc
  event_data JSONB,
  external_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. 🔌 Integrações de Pagamento

### Opção 1: **Stripe** (RECOMENDADO)

#### ✅ **Vantagens:**

- API bem documentada
- SDK oficial para Node.js
- Webhooks confiáveis
- Suporte a múltiplas moedas
- Checkout hospedado (menos PCI compliance)
- Gestão de assinaturas nativa
- Trial periods
- Proration automática
- Cancelamento e reembolsos
- Dashboard completo

#### ⚠️ **Desvantagens:**

- Taxa: 4.99% + R$ 0.39 por transação (Brasil)
- Requer conta internacional (ou Stripe Brasil)

#### 📦 **Implementação:**

```bash
npm install stripe
```

```typescript
// Exemplo de criação de checkout
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  payment_method_types: ["card"],
  line_items: [
    {
      price: "price_xxxxx", // ID do preço no Stripe
      quantity: 1,
    },
  ],
  mode: "subscription",
  success_url: "https://seusite.com/success",
  cancel_url: "https://seusite.com/cancel",
});
```

---

### Opção 2: **Mercado Pago**

#### ✅ **Vantagens:**

- Popular no Brasil
- Suporte a Pix, boleto, cartão
- Taxa competitiva
- Documentação em português

#### ⚠️ **Desvantagens:**

- API menos robusta que Stripe
- Gestão de assinaturas mais manual
- Webhooks menos confiáveis

---

### Opção 3: **PagSeguro / Asaas / Iugu**

- Opções brasileiras
- Boas para começar
- Limitações em escala

---

## 4. 🔐 Controle de Acesso

### Middleware de Verificação

```typescript
// server/_core/subscription.ts
export async function checkSubscriptionLimits(
  userId: number,
  action: 'create_feature' | 'use_tokens'
) {
  const subscription = await db.getActiveSubscription(userId);

  if (!subscription) {
    // Usuário sem assinatura = plano free
    return checkFreePlanLimits(userId);
  }

  const plan = await db.getSubscriptionPlan(subscription.planId);

  // Verificar limites
  if (action === 'create_feature') {
    if (plan.featuresLimit && subscription.featuresUsedThisPeriod >= plan.featuresLimit) {
      throw new Error('Limite de features atingido');
    }
  }

  if (action === 'use_tokens') {
    if (plan.tokensLimit && subscription.tokensUsedThisPeriod >= plan.tokensLimit) {
      throw new Error('Limite de tokens atingido');
    }
  }

  return true;
}

// Usar no router
export const featuresRouter = router({
  generate: protectedProcedure
    .input(...)
    .mutation(async ({ ctx, input }) => {
      // Verificar limites ANTES de gerar
      await checkSubscriptionLimits(ctx.user.id, 'create_feature');

      // ... resto do código
    }),
});
```

---

## 5. 🔄 Webhooks

### Eventos Importantes do Stripe

```typescript
// server/webhooks/stripe.ts
import { Router } from "express";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

router.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;
  }

  res.json({ received: true });
});

export default router;
```

---

## 6. 💳 Fluxo de Assinatura

### 6.1 Novo Usuário

```
1. Usuário se registra → Plano FREE automático
2. Usuário navega e testa a plataforma
3. Atinge limite de tokens (50.000 tokens/mês)
4. Modal: "Upgrade para Pro para continuar"
5. Clica em "Assinar" → Redirect para Stripe Checkout
6. Preenche dados de pagamento
7. Stripe processa → Webhook recebido
8. Backend atualiza subscription no banco
9. Redirect de volta para plataforma
10. Acesso liberado com novos limites
```

### 6.2 Upgrade de Plano

```
1. Usuário em Free/Pro quer Business
2. Clica em "Upgrade"
3. Stripe calcula proration (crédito proporcional)
4. Checkout com valor ajustado
5. Pagamento confirmado
6. Limites atualizados imediatamente
```

### 6.3 Cancelamento

```
1. Usuário clica "Cancelar assinatura"
2. Opções:
   - Cancelar imediatamente (reembolso proporcional)
   - Cancelar ao fim do período (mais comum)
3. Status muda para 'canceled' ou 'cancel_at_period_end'
4. Ao fim do período, volta para Free
```

---

## 7. 📊 Dashboard de Admin

### Métricas Importantes

- **MRR (Monthly Recurring Revenue):** Receita mensal recorrente
- **ARR (Annual Recurring Revenue):** Receita anual recorrente
- **Churn Rate:** Taxa de cancelamento
- **LTV (Lifetime Value):** Valor vitalício do cliente
- **CAC (Customer Acquisition Cost):** Custo de aquisição

### Página de Admin

```
/admin/subscriptions
- Tabela de todas as assinaturas
- Filtros por plano, status
- Gráficos de crescimento
- Ações: cancelar, reembolsar, trocar plano
```

---

## 8. 🎨 UI/UX

### Páginas Necessárias

1. **`/pricing`** - Página de preços com comparativo de planos
2. **`/checkout`** - Página de checkout (ou Stripe Checkout)
3. **`/account/subscription`** - Gestão da assinatura do usuário
   - Plano atual
   - Próxima cobrança
   - Histórico de pagamentos
   - Upgrade/Downgrade
   - Cancelamento
4. **`/account/billing`** - Faturas e notas fiscais
5. **`/account/usage`** - Uso atual vs limites

### Componentes

- **PlanCard** - Card de cada plano
- **UpgradeModal** - Modal de upgrade
- **UsageProgress** - Barra de progresso de uso
- **PaymentMethodCard** - Gerenciar cartão
- **InvoiceRow** - Item de fatura

---

## 9. ⚖️ Considerações Legais

### Brasil

1. **Nota Fiscal Eletrônica (NF-e)**
   - Obrigatória para PJ
   - Sistemas: Focus NFe, NFe.io, Bling

2. **Termos de Serviço**
   - Política de cancelamento
   - Reembolsos (7 dias - CDC)
   - Responsabilidades

3. **Política de Privacidade (LGPD)**
   - Dados de pagamento
   - Compartilhamento com Stripe
   - Retenção de dados

4. **Impostos**
   - ISS (serviços)
   - PIS/COFINS
   - Considerar contabilidade

---

## 10. 🚀 Roadmap de Implementação

### Fase 1: Preparação (Semana 1-2)

- [ ] Criar conta Stripe
- [ ] Definir planos finais e preços
- [ ] Criar produtos no Stripe Dashboard
- [ ] Modelar banco de dados
- [ ] Criar migrations

### Fase 2: Backend (Semana 3-4)

- [ ] Implementar tabelas de subscriptions
- [ ] Criar funções de query
- [ ] Implementar middleware de verificação de limites
- [ ] Criar endpoints tRPC para subscriptions
- [ ] Integrar Stripe SDK
- [ ] Implementar webhooks

### Fase 3: Frontend (Semana 5-6)

- [ ] Criar página `/pricing`
- [ ] Criar página `/account/subscription`
- [ ] Implementar Stripe Checkout integration
- [ ] Criar modais de upgrade
- [ ] Mostrar limites de uso no dashboard
- [ ] Implementar barras de progresso

### Fase 4: Testes (Semana 7)

- [ ] Testar fluxo completo de assinatura
- [ ] Testar webhooks (Stripe CLI)
- [ ] Testar limites e bloqueios
- [ ] Testar cancelamentos
- [ ] Testar upgrades/downgrades
- [ ] Testar com cartão de teste

### Fase 5: Legal & Lançamento (Semana 8)

- [ ] Escrever Termos de Serviço
- [ ] Atualizar Política de Privacidade
- [ ] Integrar sistema de notas fiscais
- [ ] Deploy em produção
- [ ] Comunicar aos usuários existentes
- [ ] Monitorar primeiros pagamentos

---

## 11. 💰 Projeção Financeira

### Cenário Conservador (1 ano)

| Mês | Free | Pro (R$49) | Business (R$149) | MRR       | Total Acumulado |
| --- | ---- | ---------- | ---------------- | --------- | --------------- |
| 1   | 100  | 5          | 0                | R$ 245    | R$ 245          |
| 3   | 300  | 20         | 2                | R$ 1.278  | R$ 3.834        |
| 6   | 600  | 60         | 8                | R$ 4.132  | R$ 24.792       |
| 12  | 1200 | 150        | 25               | R$ 11.075 | R$ 132.900      |

**Assumindo:**

- 5% conversão Free → Pro
- 1% conversão Pro → Business
- Churn 5% ao mês

---

## 12. 🛠️ Ferramentas e Serviços

### Necessários

- **Stripe** - Pagamentos
- **Stripe Billing** - Gestão de assinaturas
- **Postmark / SendGrid** - Emails transacionais
- **Focus NFe** - Notas fiscais (BR)

### Opcionais

- **ChartMogul** - Analytics de MRR
- **Baremetrics** - Métricas de SaaS
- **Intercom** - Suporte ao cliente
- **Hotjar** - Analytics de comportamento

---

## 13. 📧 Emails Necessários

### Transacionais

1. **Bem-vindo (Free)** - Ao criar conta
2. **Assinatura confirmada** - Ao assinar Pro/Business
3. **Pagamento confirmado** - Todo mês
4. **Pagamento falhou** - Cartão recusado
5. **3 dias para expirar** - Lembrete
6. **Assinatura cancelada** - Confirmação
7. **Limite atingido** - 80% do limite
8. **Fatura disponível** - Link para download

### Marketing (opcional)

- Newsletter mensal
- Dicas de uso
- Novidades da plataforma

---

## 14. 🎯 KPIs para Monitorar

### Métricas de Negócio

- **MRR** (Monthly Recurring Revenue)
- **Churn Rate** (Taxa de cancelamento)
- **ARPU** (Average Revenue Per User)
- **CAC Payback** (Tempo para recuperar custo de aquisição)

### Métricas de Produto

- **Conversão Free → Paid**
- **Tempo até primeira feature**
- **Features criadas por usuário**
- **Taxa de ativação (7 dias)**

### Métricas de Suporte

- **Motivos de cancelamento**
- **Tickets de suporte relacionados a billing**
- **Falhas de pagamento**

---

## 15. ⚠️ Riscos e Mitigações

| Risco                          | Probabilidade | Impacto | Mitigação                           |
| ------------------------------ | ------------- | ------- | ----------------------------------- |
| Churn alto nos primeiros meses | Alta          | Alto    | Trial + onboarding melhor           |
| Fraude de cartões              | Média         | Médio   | Stripe Radar (anti-fraude)          |
| Problemas com webhooks         | Média         | Alto    | Retry logic + monitoramento         |
| Limitações do Stripe no Brasil | Baixa         | Alto    | Considerar Mercado Pago como backup |
| Compliance fiscal              | Alta          | Alto    | Contratar contador especializado    |

---

## 16. 🎓 Recursos de Estudo

### Documentação

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Billing Guide](https://stripe.com/docs/billing)
- [Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)

### Tutoriais

- [Stripe + Node.js Tutorial](https://www.youtube.com/watch?v=1r-F3FIONl8)
- [Build a SaaS with Stripe](https://www.youtube.com/watch?v=288RDbS0W3s)

### Exemplos de Código

- [Stripe Samples](https://github.com/stripe-samples)
- [Next.js + Stripe](https://github.com/vercel/nextjs-subscription-payments)

---

## 💡 Próximos Passos Sugeridos

1. **Validar preços** - Pesquisar concorrentes
2. **Definir planos finais** - Quais features em cada tier
3. **Escolher gateway** - Stripe vs Mercado Pago
4. **Criar conta de teste** - Começar a brincar com API
5. **Prototipar UI** - Página de pricing mockup
6. **Estimar esforço** - Quantas sprints?

---

## 📞 Dúvidas Frequentes

### Q: Preciso de CNPJ?

**A:** Sim, para emitir notas fiscais. Considere MEI se faturar menos de R$ 81k/ano.

### Q: Posso começar sem nota fiscal?

**A:** Tecnicamente sim, mas não é recomendado. Clientes PJ exigem NF.

### Q: Stripe funciona no Brasil?

**A:** Sim, mas precisa de conta internacional. Alternativa: usar Stripe Brasil (stripe.com/br).

### Q: Como testar sem pagar?

**A:** Stripe tem modo de teste com cartões fake. Mercado Pago também.

### Q: Preciso de SSL?

**A:** Sim, HTTPS é obrigatório para processar pagamentos.

---

## ✅ Checklist Final

Antes de lançar:

- [ ] Conta no gateway de pagamento criada
- [ ] Produtos/preços configurados
- [ ] Webhooks testados
- [ ] Termos de serviço publicados
- [ ] Política de privacidade atualizada
- [ ] Sistema de notas fiscais integrado
- [ ] Emails transacionais configurados
- [ ] Testes de ponta a ponta completos
- [ ] Monitoramento de erros ativo (Sentry)
- [ ] Backup do banco de dados configurado
- [ ] Plan B se webhooks falharem
- [ ] Processo de reembolso documentado

---

**Criado em:** Janeiro 2026  
**Revisão sugerida:** A cada trimestre
