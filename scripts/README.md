# Scripts de Deploy e Configuração

Esta pasta contém scripts automatizados para facilitar o deployment e configuração do StroryTeller AI.

## Scripts Disponíveis

### `configure-customer-portal.js` - Configurar Portal do Cliente Stripe
Script Node.js que configura automaticamente o Portal do Cliente do Stripe com todas as funcionalidades necessárias.

**O que faz:**
- Cria uma configuração personalizada do Portal do Cliente
- Habilita gerenciamento de assinaturas (upgrade/downgrade)
- Habilita cancelamento de assinaturas
- Habilita gerenciamento de métodos de pagamento
- Habilita visualização de histórico de faturas
- Habilita atualização de informações de faturamento
- Configura URL de retorno padrão

**Uso:**
```bash
npm run stripe:configure-portal
```

**Requisitos:**
- Arquivo `.env` com `STRIPE_SECRET_KEY` configurada
- Conta Stripe ativa

**Funcionalidades habilitadas:**
- ✅ Atualizar assinatura (upgrade/downgrade)
- ✅ Cancelar assinatura (ao final do período)
- ✅ Gerenciar métodos de pagamento
- ✅ Ver histórico de faturas
- ✅ Atualizar informações de faturamento
- ✅ Adicionar IDs fiscais

**Documentação completa:** `/docs/PORTAL_CLIENTE_STRIPE.md`

---

### `seed-plans.js` - Popular Planos de Assinatura
Script Node.js que popula ou atualiza os planos de assinatura no banco de dados com os preços e IDs do Stripe configurados.

**O que faz:**
- Conecta ao banco de dados usando a `DATABASE_URL` do `.env`
- Executa o SQL do arquivo `seed-subscription-plans.sql`
- Cria ou atualiza os planos: Free, Pro e Business
- Configura os IDs dos preços do Stripe
- Mostra uma lista dos planos cadastrados

**Uso:**
```bash
npm run db:seed:plans
```

**Requisitos:**
- Arquivo `.env` com `DATABASE_URL` configurada
- Banco de dados criado e com as tabelas migradas (`npm run db:push`)

---

### `deploy.js` (Linux/Mac/Node)
Script Node.js que automatiza todo o processo de deploy:
- Verifica a existência do arquivo `.env`
- Instala dependências
- Verifica tipos TypeScript
- Aplica migrações do banco de dados
- Faz build da aplicação

**Uso:**
```bash
npm run deploy
```

### `deploy.ps1` (Windows PowerShell)
Script PowerShell equivalente ao `deploy.js` para Windows:
- Mesmas funcionalidades do script Node.js
- Cores no terminal PowerShell
- Tratamento de erros específico do Windows

**Uso:**
```powershell
npm run deploy:windows
```

## Como Funciona

1. **Verificação do `.env`**: Garante que o arquivo de configuração existe
2. **Instalação**: Roda `npm install` para garantir que todas as dependências estão instaladas
3. **Type Check**: Verifica erros de TypeScript (não bloqueia o build)
4. **Migrações**: Aplica todas as migrações pendentes do banco de dados
5. **Build**: Compila frontend (Vite) e backend (ESBuild)
6. **Sucesso**: Mostra mensagem colorida e próximos passos

## Variáveis de Ambiente Detectadas

Os scripts detectam automaticamente a variável `NODE_ENV`:
- `development`: Para desenvolvimento local
- `production`: Para deploy em produção na VPS

## Em Caso de Erro

Se alguma etapa falhar, o script:
- Mostra uma mensagem de erro clara
- Para a execução (não continua se houver erro crítico)
- Sugere ações corretivas

### Erros Comuns

**`.env` não encontrado:**
```
⚠ Arquivo .env não encontrado!
Crie um arquivo .env com as seguintes variáveis:
  - DATABASE_URL
  - JWT_SECRET
  - NODE_ENV
```

**Falha nas migrações:**
```
⚠ Atenção: Falha nas migrações. Verifique a DATABASE_URL
```
- Verifique se o DATABASE_URL está correto
- Verifique se o banco de dados está acessível
- Verifique se as credenciais estão corretas

**Build falhou:**
```
✗ Build falhou!
```
- Verifique erros de TypeScript com `npm run check`
- Verifique se todas as dependências foram instaladas

## Customização

Você pode modificar os scripts para adicionar:
- Testes automatizados antes do build
- Notificações (Slack, Discord, email)
- Backup do banco antes das migrações
- Deploy automático via SSH
- Reinício de serviços (PM2, systemd)

## Exemplo de Uso Completo

### Primeira vez (desenvolvimento local):
```bash
# 1. Clone o projeto
git clone seu-repo
cd stroryTeller

# 2. Crie o .env
cp .env.example .env
# Edite o .env com suas configurações

# 3. Execute o deploy
npm run deploy

# 4. Inicie o servidor
npm run dev
```

### Deploy em produção (VPS):
```bash
# 1. No servidor, clone o projeto
git clone seu-repo
cd stroryTeller

# 2. Configure o .env de produção
nano .env
# Configure DATABASE_URL, JWT_SECRET, etc.

# 3. Execute o deploy de produção
NODE_ENV=production npm run deploy

# 4. Inicie o servidor
npm start

# Ou use PM2 para manter rodando:
pm2 start "npm start" --name stroryTeller
pm2 save
pm2 startup
```

## Integração Contínua (CI/CD)

Estes scripts podem ser facilmente integrados em pipelines CI/CD:

**GitHub Actions:**
```yaml
- name: Deploy
  run: npm run deploy:prod
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

**GitLab CI:**
```yaml
deploy:
  script:
    - npm run deploy:prod
  variables:
    DATABASE_URL: $DATABASE_URL
    JWT_SECRET: $JWT_SECRET
```













