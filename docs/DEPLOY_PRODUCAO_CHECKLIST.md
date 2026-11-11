# 🚀 Checklist de Deploy para Produção - StoryTeller

## ✅ Código já está no GitHub!

Commit: `d226e57`  
Branch: `dev`  
Status: ✅ Pronto para deploy

---

## 📋 CHECKLIST DE DEPLOY

### 1️⃣ Preparar Ambiente de Produção

#### 1.1. Fazer Pull do Código Atualizado

No servidor de produção:

```bash
cd /caminho/para/seu/projeto
git checkout dev
git pull origin dev
```

#### 1.2. Instalar Dependências

```bash
pnpm install
```

---

### 2️⃣ Configurar Variáveis de Ambiente

#### 2.1. Criar arquivo `.env` de produção

```bash
# Se ainda não tem o arquivo .env, crie a partir do template:
cp env.production.example .env

# OU use o script:
npm run env:production
```

#### 2.2. Editar o arquivo `.env`

```bash
nano .env
# ou
code .env
```

#### 2.3. Configurações OBRIGATÓRIAS:

```env
# ================================
# Banco de Dados - PostgreSQL
# ================================
DATABASE_URL=postgresql://usuario:senha@host:5432/database

# ================================
# Autenticação
# ================================
JWT_SECRET=gere_uma_string_aleatoria_segura_aqui

# ================================
# OAuth (Opcional)
# ================================
VITE_APP_ID=storyteller-prod
OAUTH_SERVER_URL=https://seu-dominio.com
OWNER_OPEN_ID=seu-email@dominio.com

# ================================
# Ambiente
# ================================
NODE_ENV=production

# ================================
# Porta do servidor
# ================================
PORT=3000

# ================================
# Stripe - MODO PRODUÇÃO
# ================================
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_de_producao_aqui
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica_de_producao_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_de_producao_aqui

# ================================
# URL da aplicação
# ================================
APP_URL=https://seu-dominio.com
```

#### 2.4. Gerar JWT Secret (se necessário)

```bash
npm run generate:jwt
# Copie a string gerada e cole no JWT_SECRET
```

---

### 3️⃣ Configurar Stripe em Produção

#### 3.1. Obter Chaves de Produção

1. Acesse: https://dashboard.stripe.com
2. **Desative o "Modo de teste"** (toggle no canto superior direito)
3. Vá em: **Desenvolvedores → Chaves de API**
4. Copie:
   - **Chave publicável:** `pk_live_...`
   - **Chave secreta:** `sk_live_...`
5. Cole no `.env`

#### 3.2. Configurar Webhook de Produção

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em **"Adicionar endpoint"**
3. Configure:
   - **URL do endpoint:** `https://seu-dominio.com/api/webhooks/stripe`
   - **Descrição:** "StoryTeller Production Webhooks"
   - **Versão:** Latest
   
4. Selecione os eventos:
   ```
   ✅ checkout.session.completed
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ✅ invoice.payment_succeeded
   ✅ invoice.payment_failed
   ✅ payment_method.attached
   ✅ payment_method.detached
   ✅ customer.updated
   ✅ customer.tax_id.created
   ✅ customer.tax_id.deleted
   ✅ customer.tax_id.updated
   ✅ billing_portal.configuration.created
   ✅ billing_portal.configuration.updated
   ✅ billing_portal.session.created
   ```

5. Clique em **"Adicionar endpoint"**
6. **Copie o "Signing secret"** (começa com `whsec_`)
7. Cole no `.env` como `STRIPE_WEBHOOK_SECRET`

#### 3.3. Configurar Portal do Cliente

1. Acesse: https://dashboard.stripe.com/settings/billing/portal
2. **Desative o "Modo de teste"**
3. Configure:
   - **Perfil do negócio:**
     - Título: "Gerencie sua assinatura do StoryTeller"
     - URL de Política de Privacidade
     - URL de Termos de Serviço
   
   - **Funcionalidades:**
     - ✅ Cancelar assinatura (ao final do período)
     - ✅ Atualizar assinatura (selecione os produtos/preços)
     - ✅ Gerenciar métodos de pagamento
     - ✅ Ver histórico de faturas
     - ✅ Atualizar informações
   
   - **URL de retorno padrão:**
     - `https://seu-dominio.com/account/subscription`

4. Clique em **"Salvar alterações"**

---

### 4️⃣ Popular Planos de Assinatura

#### 4.1. Atualizar IDs dos Preços no Script

Edite: `scripts/seed-subscription-plans.sql`

**IMPORTANTE:** Use os IDs de **PRODUÇÃO** (não os de teste)!

```sql
-- Plano Pro
ON CONFLICT (name) DO UPDATE SET
  stripe_monthly_price_id = 'price_seu_id_mensal_pro_PRODUCAO',
  stripe_yearly_price_id = 'price_seu_id_anual_pro_PRODUCAO',
  ...

-- Plano Business
ON CONFLICT (name) DO UPDATE SET
  stripe_monthly_price_id = 'price_seu_id_mensal_business_PRODUCAO',
  stripe_yearly_price_id = 'price_seu_id_anual_business_PRODUCAO',
  ...
```

#### 4.2. Executar o Script

```bash
npm run db:seed:plans
```

---

### 5️⃣ Aplicar Migrações do Banco

```bash
npm run db:push
```

---

### 6️⃣ Build da Aplicação

```bash
npm run build
```

Isso vai:
- Compilar o frontend (Vite)
- Empacotar o backend
- Gerar os arquivos otimizados

---

### 7️⃣ Iniciar o Servidor

#### Opção A: PM2 (Recomendado)

```bash
# Instalar PM2 (se ainda não tem)
npm install -g pm2

# Iniciar aplicação
pm2 start npm --name "storyteller" -- start

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
```

#### Opção B: Direto (para testes)

```bash
npm start
```

---

### 8️⃣ Configurar Nginx (se aplicável)

Se estiver usando Nginx como reverse proxy:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    # SSL
    ssl_certificate /caminho/para/cert.pem;
    ssl_certificate_key /caminho/para/key.pem;

    # Proxy para Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reiniciar Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

### 9️⃣ Verificar o Deploy

#### 9.1. Testar a Aplicação

```bash
# Ver logs do PM2
pm2 logs storyteller

# Ver status
pm2 status

# Verificar se está respondendo
curl https://seu-dominio.com
```

#### 9.2. Acessar pelo Navegador

1. Acesse: `https://seu-dominio.com`
2. Faça login
3. Vá para "Pricing"
4. Faça um pagamento de teste pequeno (R$ 1,00 se possível)

#### 9.3. Verificar Webhooks

1. Acesse: https://dashboard.stripe.com/events
2. Você deve ver os eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`

#### 9.4. Verificar Banco de Dados

```bash
npm run db:debug
```

Você deve ver a nova assinatura criada!

---

### 🔟 Configurar Monitoramento (Opcional)

#### 10.1. Logs do PM2

```bash
# Ver logs em tempo real
pm2 logs storyteller

# Ver logs salvos
pm2 logs storyteller --lines 100
```

#### 10.2. Monitoramento do Stripe

- Dashboard: https://dashboard.stripe.com
- Eventos: https://dashboard.stripe.com/events
- Webhooks: https://dashboard.stripe.com/webhooks

---

## ✅ CHECKLIST FINAL

Marque cada item:

### Preparação
- [ ] Pull do código atualizado (`git pull origin dev`)
- [ ] Dependências instaladas (`pnpm install`)

### Configuração
- [ ] Arquivo `.env` criado
- [ ] `DATABASE_URL` configurado
- [ ] `JWT_SECRET` gerado e configurado
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `APP_URL` configurado com domínio real

### Stripe
- [ ] Chaves de produção obtidas (sk_live_, pk_live_)
- [ ] Webhook de produção configurado
- [ ] `STRIPE_WEBHOOK_SECRET` configurado
- [ ] Portal do Cliente configurado em modo produção
- [ ] Planos de assinatura populados com IDs de produção

### Build e Deploy
- [ ] Migrações aplicadas (`npm run db:push`)
- [ ] Build realizado (`npm run build`)
- [ ] Servidor iniciado (PM2 ou npm start)
- [ ] Nginx configurado (se aplicável)

### Testes
- [ ] Aplicação acessível via HTTPS
- [ ] Login funcionando
- [ ] Página de Pricing carregando
- [ ] Pagamento de teste realizado
- [ ] Webhook recebido e processado
- [ ] Assinatura criada no banco
- [ ] Portal do Cliente acessível

### Monitoramento
- [ ] Logs do PM2 verificados
- [ ] Dashboard do Stripe monitorado
- [ ] Eventos de webhook verificados

---

## 🆘 Troubleshooting

### Problema: Webhook não está chegando

**Verificar:**
1. URL do webhook está correta?
2. Webhook está em modo produção (não teste)?
3. `STRIPE_WEBHOOK_SECRET` está correto?
4. Servidor está acessível externamente?

**Testar:**
```bash
# Ver logs do webhook no Stripe Dashboard
https://dashboard.stripe.com/webhooks/[seu_webhook_id]

# Testar endpoint manualmente
curl -X POST https://seu-dominio.com/api/webhooks/stripe
```

### Problema: Erro de conexão com banco

**Verificar:**
1. `DATABASE_URL` está correto?
2. Banco de dados está acessível?
3. Credenciais estão corretas?

**Testar:**
```bash
# Testar conexão
psql $DATABASE_URL
```

### Problema: Aplicação não inicia

**Verificar logs:**
```bash
pm2 logs storyteller --lines 50
```

**Verificar porta:**
```bash
netstat -tuln | grep 3000
```

### Problema: Build falha

**Limpar e tentar novamente:**
```bash
rm -rf dist
rm -rf node_modules/.vite
npm run build
```

---

## 📚 Documentação

- **Portal do Cliente:** `docs/PORTAL_CLIENTE_STRIPE.md`
- **Guia de Testes:** `docs/GUIA_TESTE_PORTAL_CLIENTE.md`
- **Stripe Webhooks:** `docs/STRIPE_LOCAL_WEBHOOKS.md`
- **Índice Completo:** `docs/INDICE_GUIAS.md`

---

## 🎯 Próximos Passos Após Deploy

1. **Monitorar primeiros pagamentos reais**
2. **Verificar emails de notificação (se configurado)**
3. **Testar Portal do Cliente com cliente real**
4. **Configurar backups do banco de dados**
5. **Configurar alertas de erro (Sentry, etc.)**

---

**Status:** 🚀 Pronto para deploy!  
**Última atualização:** 06/01/2026  
**Versão:** 1.0.0

