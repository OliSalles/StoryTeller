# Guia de Deploy para VPS

## Sistema de Gerenciamento de Ambientes

O projeto possui um sistema automático para gerenciar configurações de diferentes ambientes:

- **`env.local.example`** - Configurações para desenvolvimento local (Docker)
- **`env.production.example`** - Configurações para VPS (Supabase)

### Scripts Disponíveis:

```bash
# Linux/Mac
npm run env:local         # Configura para ambiente local
npm run env:production    # Configura para ambiente de produção

# Windows
npm run env:local:win     # Configura para ambiente local
npm run env:production:win # Configura para ambiente de produção
```

## Configurações Necessárias

### 1. Configuração para Desenvolvimento Local

**Opção Automática (Recomendado):**

```bash
# Linux/Mac
npm run env:local

# Windows
npm run env:local:win
```

Isso irá:

- ✅ Criar automaticamente o arquivo `.env`
- ✅ Configurar para PostgreSQL local (Docker)
- ✅ Fazer backup do `.env` anterior se existir

**Configuração Local (Docker):**

```bash
DATABASE_URL=postgresql://bardoai:bardoai123@localhost:5432/bardoai
JWT_SECRET=local-dev-secret-key-change-in-production-32-chars-minimum
NODE_ENV=development
PORT=3000
```

### 2. Configuração para VPS (Produção)

**Opção Automática (Recomendado):**

```bash
# Linux/Mac
npm run env:production

# Windows
npm run env:production:win
```

Isso irá:

- ✅ Criar automaticamente o arquivo `.env`
- ✅ Configurar template para VPS (Supabase)
- ✅ Fazer backup do `.env` anterior se existir
- ⚠️ **Você ainda precisa editar o `.env` com suas credenciais reais!**

**Após executar o comando acima, edite o `.env` e ajuste:**

```bash
# Database - Supabase PostgreSQL na VPS
DATABASE_URL=postgresql://postgres:SUA-SENHA-AQUI@seu-host:5432/postgres

# JWT Secret - Gere uma string aleatória segura
JWT_SECRET=GERE-UMA-STRING-ALEATORIA-SEGURA-DE-32-CARACTERES

# URL base da aplicação
VITE_APP_ID=bardoai
OAUTH_SERVER_URL=https://seu-dominio.com
OWNER_OPEN_ID=seu-open-id

# Ambiente
NODE_ENV=production
PORT=3000
```

### 3. Ajustar a URL do Database

**Baseado nas informações que você forneceu anteriormente:**

```bash
# Opção 1: URL pública do Supabase
DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@automacoes-supabase-n8n.rh8xvb.easypanel.host:5432/postgres

# Opção 2: Se estiver na mesma rede Docker (recomendado)
DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@db:5432/postgres
```

## Fluxo de Trabalho Completo

### 🏠 Desenvolvimento Local:

```bash
# 1. Configure o ambiente local
npm run env:local        # Linux/Mac
npm run env:local:win    # Windows

# 2. Suba o Docker (PostgreSQL)
docker-compose up -d

# 3. Execute o deploy local
npm run deploy           # Linux/Mac
npm run deploy:windows   # Windows

# 4. Inicie o servidor
npm run dev
```

### 🚀 Deploy na VPS:

```bash
# 1. Configure o ambiente de produção
npm run env:production   # Linux/Mac
npm run env:production:win # Windows

# 2. Edite o .env com suas credenciais reais
nano .env
# Ajuste DATABASE_URL, JWT_SECRET, etc.

# 3. Execute o deploy de produção
npm run deploy:prod

# 4. Inicie o servidor
npm start

# Ou use PM2 para manter rodando:
pm2 start "npm start" --name bardoai
pm2 save
```

### 🔄 Alternando Entre Ambientes:

```bash
# Voltar para local
npm run env:local && npm run dev

# Ir para produção
npm run env:production && nano .env && npm run deploy:prod
```

**💾 Backups Automáticos:** Sempre que você trocar de ambiente, o script cria automaticamente um backup do `.env` anterior!

### 4. Build e Deploy

#### Opção 1: Deploy Automático (Recomendado) 🚀

O projeto inclui scripts automatizados que fazem tudo para você!

**Linux/Mac:**

```bash
# 1. Clone o repositório
git clone seu-repo
cd bardoAi

# 2. Configure o .env com as variáveis acima

# 3. Execute o script de deploy (faz tudo automaticamente)
npm run deploy
```

**Windows (PowerShell):**

```powershell
# 1. Clone o repositório
git clone seu-repo
cd bardoAi

# 2. Configure o .env com as variáveis acima

# 3. Execute o script de deploy (faz tudo automaticamente)
npm run deploy:windows
```

**O que o script de deploy faz automaticamente:**

- ✅ Instala todas as dependências
- ✅ Verifica tipos TypeScript
- ✅ Aplica migrações do banco de dados
- ✅ Faz o build da aplicação
- ✅ Mostra mensagens de sucesso/erro coloridas

#### Opção 2: Deploy Manual (Passo a Passo)

Se preferir fazer manualmente:

```bash
# 1. Na VPS, clone o repositório
git clone seu-repo
cd bardoAi

# 2. Instale as dependências
npm install

# 3. Configure o .env com as variáveis acima

# 4. Execute as migrações do banco
npm run db:push

# 5. Build da aplicação
npm run build

# 6. Inicie a aplicação
npm start
```

### 4. Verificações de Compatibilidade

✅ **O que já está pronto:**

- PostgreSQL via Drizzle ORM (funciona em qualquer PostgreSQL)
- Autenticação JWT customizada
- Exportação de PDF
- Integração com OpenAI

✅ **O que precisa ser ajustado:**

- `DATABASE_URL` apontando para o Supabase da VPS
- `JWT_SECRET` configurado
- Variáveis de ambiente corretas

### 5. Diferenças entre Local e VPS

| Configuração | Local (Docker) | VPS (Supabase)                               |
| ------------ | -------------- | -------------------------------------------- |
| Host DB      | localhost      | seu-host.easypanel.host ou db                |
| Porta DB     | 5432           | 5432 (ou outra se configurada)               |
| Usuário DB   | bardoai        | postgres                                     |
| Senha DB     | bardoai123     | your-super-secret-and-long-postgres-password |
| Database     | bardoai        | postgres                                     |

### 6. Testando a Conexão

Após configurar o `.env` na VPS, teste a conexão:

```bash
# Execute o servidor
npm run dev

# Se conectar com sucesso, você verá:
# "Server running on http://localhost:3000/"
```

### 7. Problemas Comuns

**Erro de conexão com o banco:**

- Verifique se a senha está correta
- Confirme se o host está acessível
- Verifique se a porta está correta (geralmente 5432)

**Schema não existe:**

- Execute `npm run db:push` para criar as tabelas

**Permissões:**

- O usuário `postgres` precisa ter permissões de CREATE/ALTER/DROP

## Scripts Disponíveis

O projeto possui vários scripts npm para facilitar o desenvolvimento e deploy:

| Script                       | Descrição                                                |
| ---------------------------- | -------------------------------------------------------- |
| `npm run env:local`          | 🔧 Configura ambiente local (Linux/Mac)                  |
| `npm run env:local:win`      | 🔧 Configura ambiente local (Windows)                    |
| `npm run env:production`     | 🔧 Configura ambiente de produção (Linux/Mac)            |
| `npm run env:production:win` | 🔧 Configura ambiente de produção (Windows)              |
| `npm run dev`                | Inicia o servidor em modo desenvolvimento com hot reload |
| `npm run build`              | Faz o build da aplicação (frontend + backend)            |
| `npm start`                  | Inicia o servidor em produção                            |
| `npm run deploy`             | 🚀 Script automático de deploy (Linux/Mac)               |
| `npm run deploy:windows`     | 🚀 Script automático de deploy (Windows)                 |
| `npm run deploy:prod`        | Deploy para produção com NODE_ENV=production             |
| `npm run db:push`            | Aplica migrações do banco de dados                       |
| `npm run check`              | Verifica tipos TypeScript sem fazer build                |
| `npm test`                   | Executa os testes                                        |

### Comandos Rápidos

**Desenvolvimento Local:**

```bash
npm run dev
```

**Deploy na VPS (automático):**

```bash
# Linux/Mac
npm run deploy:prod

# Windows
npm run deploy:windows
```

**Atualizar banco após mudanças no schema:**

```bash
npm run db:push
```

## Resumo

O código atual **vai funcionar na VPS** sem alterações! Você só precisa:

1. ✅ Ajustar o `DATABASE_URL` no arquivo `.env` da VPS
2. ✅ Executar `npm run deploy` (ou `npm run deploy:windows`)
3. ✅ Iniciar com `npm start`

**Tudo automatizado!** Os scripts cuidam de:

- Instalar dependências
- Rodar migrações
- Fazer build
- Verificar erros

Tudo foi desenvolvido de forma agnóstica ao ambiente, então funcionará tanto local quanto na VPS! 🚀
