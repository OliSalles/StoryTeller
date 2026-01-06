# 🔄 Fluxos e Diagramas - Sistema de Assinaturas

## 📊 1. Fluxo Completo de Assinatura

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUÁRIO ACESSA PLATAFORMA                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Novo Usuário?    │
                    └──────────────────┘
                      │             │
                  Sim │             │ Não
                      ▼             ▼
            ┌──────────────┐  ┌──────────────┐
            │   Registro   │  │    Login     │
            │ (Plano Free) │  │              │
            └──────────────┘  └──────────────┘
                      │             │
                      └─────┬───────┘
                            ▼
                  ┌──────────────────┐
                  │   Dashboard       │
                  │  Gerar Feature    │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Verificar Limite │
                  └──────────────────┘
                      │         │
              Dentro  │         │ Excedeu
                      ▼         ▼
            ┌──────────────┐  ┌──────────────┐
            │   Processar  │  │ Modal Upgrade│
            │   Feature    │  │ "Limite      │
            │              │  │  atingido"   │
            └──────────────┘  └──────────────┘
                                      │
                              Clica   │
                             "Upgrade"│
                                      ▼
                            ┌──────────────────┐
                            │ Página /pricing  │
                            │ Escolhe plano    │
                            └──────────────────┘
                                      │
                            Seleciona │
                              Plano   │
                                      ▼
                            ┌──────────────────┐
                            │ Stripe Checkout  │
                            │ Insere Cartão    │
                            └──────────────────┘
                                      │
                          Pagamento   │
                          Aprovado    │
                                      ▼
                            ┌──────────────────┐
                            │ Webhook Recebido │
                            │ (backend)        │
                            └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ Atualizar DB     │
                            │ - subscription   │
                            │ - payments       │
                            └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ Enviar Email     │
                            │ "Bem-vindo!"     │
                            └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ Redirect para    │
                            │ /subscription/   │
                            │    success       │
                            └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ Usuário usa      │
                            │ plataforma com   │
                            │ novos limites    │
                            └──────────────────┘
```

---

## 💳 2. Fluxo de Pagamento Mensal

```
DIA 1 (Início do período)
├─ Assinatura criada
├─ Contadores zerados
│   ├─ features_used_this_period = 0
│   └─ tokens_used_this_period = 0
└─ current_period_end = DIA 30

DIA 1-29 (Durante o período)
├─ Usuário usa plataforma
├─ A cada feature criada:
│   └─ features_used_this_period++
├─ A cada token usado:
│   └─ tokens_used_this_period += N
└─ Verificação antes de cada ação:
    └─ Se usado >= limite → Bloquear

DIA 30 (Fim do período / Renovação)
├─ Stripe tenta cobrar cartão
├─ Sucesso:
│   ├─ Webhook: invoice.payment_succeeded
│   ├─ Zerar contadores
│   │   ├─ features_used_this_period = 0
│   │   └─ tokens_used_this_period = 0
│   ├─ Atualizar current_period_end = DIA 60
│   └─ Enviar email: "Pagamento confirmado"
│
└─ Falha:
    ├─ Webhook: invoice.payment_failed
    ├─ Status → past_due
    ├─ Enviar email: "Falha no pagamento"
    ├─ Stripe retenta 3x (dias 31, 33, 35)
    └─ Se todas falharem:
        ├─ Status → canceled
        ├─ Downgrade para Free
        └─ Enviar email: "Assinatura cancelada"
```

---

## 🔄 3. Fluxo de Upgrade/Downgrade

### Upgrade (Free → Pro ou Pro → Business)

```
1. Usuário clica "Upgrade" no dashboard
   │
   ▼
2. Modal com opções de plano
   │
   ▼
3. Seleciona "Pro Mensal" (R$ 49/mês)
   │
   ▼
4. Backend cria Stripe Checkout Session
   │
   ▼
5. Usuário paga no Stripe
   │
   ▼
6. Webhook: checkout.session.completed
   │
   ├─ Se tinha Free:
   │   └─ Criar nova subscription
   │
   └─ Se tinha Pro (upgrade para Business):
       ├─ Stripe calcula proration
       ├─ Cobra diferença (proporcional)
       └─ Atualizar subscription no banco
   │
   ▼
7. Limites aumentam IMEDIATAMENTE
   │
   ▼
8. Usuário volta para plataforma
   └─ Pode usar novos limites
```

### Downgrade (Business → Pro ou Pro → Free)

```
1. Usuário clica "Cancelar" ou "Downgrade"
   │
   ▼
2. Modal de confirmação
   "Tem certeza? Você perderá [features]"
   │
   ▼
3. Opções:
   ├─ Cancelar imediatamente (reembolso proporcional)
   └─ Cancelar ao fim do período (mais comum)
   │
   ▼
4. Se escolher "ao fim do período":
   ├─ cancel_at_period_end = true
   ├─ Usuário continua usando até DIA 30
   └─ Mensagem: "Seu plano expira em X dias"
   │
   ▼
5. DIA 30 (fim do período):
   ├─ Webhook: customer.subscription.deleted
   ├─ Status → canceled
   ├─ Criar nova subscription (Free)
   │   ├─ features_limit = 10
   │   └─ tokens_limit = 50000
   └─ Email: "Seu plano foi alterado para Free"
   │
   ▼
6. Próxima vez que usar:
   └─ Novos limites aplicados
```

---

## 🚨 4. Fluxo de Limite Atingido

```
USUÁRIO TENTA CRIAR FEATURE
│
▼
┌────────────────────────────────┐
│ checkFeatureLimit(userId)      │
└────────────────────────────────┘
│
▼
┌────────────────────────────────┐
│ Buscar subscription ativa      │
└────────────────────────────────┘
│
├─ Sem subscription (Free):
│  └─ Verificar: featuresThisMonth < 10?
│     ├─ SIM: Permitir
│     └─ NÃO: Bloquear → Modal
│
└─ Com subscription (Pro/Business):
   └─ Verificar: featuresUsedThisPeriod < featuresLimit?
      ├─ SIM: Permitir
      └─ NÃO: Bloquear → Modal

SE BLOQUEADO:
│
▼
┌────────────────────────────────┐
│ Frontend mostra modal:         │
│ ┌──────────────────────────┐   │
│ │ 🚫 Limite Atingido       │   │
│ │                          │   │
│ │ Você usou 10/10 features │   │
│ │ este mês.                │   │
│ │                          │   │
│ │ [Fazer Upgrade]          │   │
│ └──────────────────────────┘   │
└────────────────────────────────┘
│
Clica "Fazer Upgrade"
│
▼
Redirect para /pricing
```

---

## 📧 5. Fluxo de Emails

```
EVENTO                          EMAIL                    QUANDO
───────────────────────────────────────────────────────────────
✅ Registro                    → Bem-vindo Free         → Imediato
✅ Primeira feature criada     → Dicas de uso           → +1h
✅ Assinatura criada          → Bem-vindo Pro/Biz      → Imediato
✅ Pagamento bem-sucedido     → Recibo                 → Imediato
❌ Pagamento falhou           → Ação necessária        → Imediato
⏰ 3 dias antes renovação     → Lembrete               → -3 dias
⚠️  80% do limite atingido    → Alerta                 → Ao atingir
🚫 100% do limite atingido   → Upgrade necessário     → Ao atingir
❌ Assinatura cancelada       → Feedback + Oferta      → Imediato
🔄 Downgrade agendado         → Confirmação            → Imediato
📄 Fatura disponível          → Download NF            → +24h
```

---

## 💰 6. Cálculo de Proration (Upgrade)

```
EXEMPLO: Usuário em Pro Mensal (R$ 49) quer Business (R$ 149)

DIA 1  ────────── DIA 15 ───────────── DIA 30
       ↑                  ↑
    Pagou Pro       Faz Upgrade
    R$ 49

CÁLCULO:
1. Dias restantes no período: 15 dias (de 30)
2. Valor usado do plano Pro: R$ 49 × (15/30) = R$ 24,50
3. Crédito proporcional: R$ 24,50
4. Valor do novo plano (15 dias): R$ 149 × (15/30) = R$ 74,50
5. TOTAL A PAGAR AGORA: R$ 74,50 - R$ 24,50 = R$ 50,00

PRÓXIMA RENOVAÇÃO (DIA 30):
- Cobrará valor cheio: R$ 149
```

---

## 🔐 7. Níveis de Acesso por Plano

```
FEATURE                    FREE    PRO    BUSINESS   ENTERPRISE
─────────────────────────────────────────────────────────────────
Features/mês                10     Ilimitado  Ilimitado   Custom
Tokens/mês                  50k    500k   2M          Custom
Usuários                    1      1      1           Custom
Trial gratuito             Não     7 dias Não         Sob consulta
Exportar Jira              ❌      ✅      ✅          ✅
Exportar Azure DevOps      ❌      ✅      ✅          ✅
PDF sem marca d'água       ❌      ✅      ✅          ✅
API Access                 ❌      ❌      ✅          ✅
Suporte por email          ❌      ✅      ✅          ✅
Suporte prioritário        ❌      ❌      ✅          ✅
Relatórios personalizados  ❌      ❌      ✅          ✅
SLA                        ❌      ❌      ❌          ✅
Deploy on-premise          ❌      ❌      ❌          ✅
Treinamento                ❌      ❌      ❌          ✅
```

---

## 📊 8. Estimativa de Custos Operacionais

### Custos por Transação (Stripe Brasil)

```
RECEITA          TAXA STRIPE       LÍQUIDO
────────────────────────────────────────────
R$ 49  (Pro)     R$ 2,84 (5.8%)   R$ 46,16
R$ 149 (Business) R$ 7,82 (5.2%)  R$ 141,18
R$ 490 (Pro/ano)  R$ 24,84 (5.1%) R$ 465,16

Fórmula Stripe: 4.99% + R$ 0.39 por transação
```

### Custos de Infraestrutura (Mensal)

```
SERVIÇO                   CUSTO ESTIMADO
───────────────────────────────────────────
Hostinger VPS              R$ 50-100/mês
PostgreSQL (prod)          R$ 0 (incluso VPS)
Stripe (taxa)              5% da receita
Email (Postmark)           R$ 0 (10k grátis)
Notas Fiscais (Focus NFe)  R$ 29/mês
CDN/Assets (Cloudflare)    R$ 0 (plano free)
Monitoramento (Sentry)     R$ 0 (plano free)
───────────────────────────────────────────
TOTAL FIXO                 ~R$ 80/mês
TOTAL VARIÁVEL             ~5% da receita
```

### Break-even (Ponto de Equilíbrio)

```
Para cobrir custos fixos de R$ 80/mês:

Com plano Pro (R$ 49 - líquido R$ 46):
└─ Mínimo 2 assinantes

Com plano Business (R$ 149 - líquido R$ 141):
└─ Mínimo 1 assinante

CONCLUSÃO: Com apenas 2 clientes Pro OU 1 cliente Business,
você já cobre os custos operacionais.
```

---

## 📈 9. Projeção de Crescimento

### Cenário Otimista (12 meses)

```
MÊS │ FREE │ PRO │ BUSINESS │  MRR   │  TOTAL ACUM.
────┼──────┼─────┼──────────┼────────┼──────────────
 1  │ 100  │  10 │    1     │  R$ 639│  R$ 639
 2  │ 200  │  20 │    2     │ R$1.278│  R$ 1.917
 3  │ 300  │  35 │    4     │ R$2.311│  R$ 4.228
 6  │ 600  │  80 │   10     │ R$5.410│ R$ 32.460
 12 │1.200 │ 200 │   40     │R$15.760│ R$ 189.120

Taxa de conversão:
- Free → Pro: 10% ao mês
- Pro → Business: 5% ao mês
- Churn: 5% ao mês
```

---

## ⚙️ 10. Estados da Assinatura

```
┌──────────┐
│ TRIALING │ → Período de teste (7 dias gratuitos)
└──────────┘
     │
     ▼
┌──────────┐
│  ACTIVE  │ → Assinatura ativa e pagando
└──────────┘
     │
     ├─→ PAGAMENTO OK → Continua ACTIVE
     │
     ├─→ PAGAMENTO FALHOU
     │      │
     │      ▼
     │   ┌──────────┐
     │   │ PAST_DUE │ → Tentando cobrar
     │   └──────────┘
     │      │
     │      ├─→ Conseguiu cobrar → Volta ACTIVE
     │      │
     │      └─→ Não conseguiu → CANCELED
     │
     └─→ USUÁRIO CANCELA
            │
            ▼
         ┌──────────┐
         │ CANCELED │ → Fim da assinatura
         └──────────┘
```

---

## 🎯 11. Métricas para Dashboard Admin

```
MÉTRICA                    CÁLCULO
────────────────────────────────────────────────────
MRR                        SUM(planos ativos × preço mensal)
ARR                        MRR × 12
New MRR                    MRR de novas assinaturas este mês
Expansion MRR              MRR de upgrades
Churned MRR                MRR perdido por cancelamentos
Churn Rate                 (Cancelamentos / Total assinantes) × 100
ARPU                       MRR / Total assinantes
LTV                        ARPU / Churn Rate
Conversão Free→Paid        (Novos Pagos / Total Free) × 100
Trial→Paid Conversion      (Trials convertidos / Total trials) × 100
```

---

## ✅ Checklist de Implementação

```
FASE 1: DATABASE
[ ] Criar tabelas (subscription_plans, subscriptions, payments, etc)
[ ] Criar migrations
[ ] Inserir planos padrão (free, pro, business)
[ ] Testar queries

FASE 2: STRIPE
[ ] Criar conta Stripe
[ ] Configurar produtos e preços no dashboard
[ ] Instalar SDK (npm install stripe)
[ ] Testar em modo de desenvolvimento
[ ] Configurar webhooks

FASE 3: BACKEND
[ ] Implementar funções de subscription
[ ] Criar middleware de verificação de limites
[ ] Integrar webhooks do Stripe
[ ] Criar endpoints tRPC
[ ] Testar fluxo completo

FASE 4: FRONTEND
[ ] Criar página /pricing
[ ] Criar página /account/subscription
[ ] Implementar modais de upgrade
[ ] Mostrar limites e uso no dashboard
[ ] Testar UX completo

FASE 5: EMAILS
[ ] Configurar serviço de email (Postmark/SendGrid)
[ ] Criar templates de emails
[ ] Implementar envios automáticos
[ ] Testar em sandbox

FASE 6: LEGAL
[ ] Escrever Termos de Serviço
[ ] Atualizar Política de Privacidade
[ ] Integrar sistema de NF (Focus NFe)
[ ] Revisar com advogado

FASE 7: TESTES
[ ] Testar cadastro + assinatura
[ ] Testar limites e bloqueios
[ ] Testar webhooks (Stripe CLI)
[ ] Testar cancelamento
[ ] Testar upgrade/downgrade
[ ] Testar falha de pagamento

FASE 8: DEPLOY
[ ] Deploy em produção
[ ] Migrar banco de dados
[ ] Configurar variáveis de ambiente
[ ] Ativar modo live no Stripe
[ ] Monitorar primeiros pagamentos
```

---

**Pronto! Agora você tem uma visão completa dos fluxos! 🚀**

