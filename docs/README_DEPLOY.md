# 📦 Sistema Completo de Deploy - Bardo AI

## 🎯 Escolha Seu Cenário

### Cenário 1: Hospedagem Estática (Seu caso!)
**Você tem:** Hospedagem que NÃO roda Node.js (só arquivos HTML/CSS/JS)  
**Solução:** Frontend na hospedagem + Backend no Render (grátis)  
**Guia:** [`GUIA_RAPIDO_HOSPEDAGEM.md`](./GUIA_RAPIDO_HOSPEDAGEM.md) ⭐

### Cenário 2: VPS Completa
**Você tem:** Servidor com acesso SSH e pode rodar Node.js  
**Solução:** Tudo no mesmo servidor  
**Guia:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)

### Cenário 3: Desenvolvimento Local
**Você tem:** Seu computador  
**Solução:** Docker + PostgreSQL local  
**Guia:** [`DATABASE.md`](./DATABASE.md)

## 🚀 Comandos Rápidos por Cenário

### 💻 Desenvolvimento Local

```powershell
# Configurar
npm run env:local:win

# Subir banco de dados
docker-compose up -d

# Rodar projeto
npm run dev
```

### 🌐 Hospedagem Estática (Recomendado para você!)

```powershell
# 1. Configurar
npm run env:static:win

# 2. Editar .env com URL do backend
notepad .env
# Adicione: VITE_API_URL=https://seu-backend.onrender.com

# 3. Build
npm run deploy:static:win

# 4. Upload manual de dist\public\
```

**Backend (Faça uma vez):**
1. Acesse: https://render.com
2. Crie Web Service conectado ao GitHub
3. Configure: `npm run build:backend` + `npm start`
4. Copie a URL gerada

### 🖥️ VPS Completa

```bash
# Configurar
npm run env:production

# Editar .env
nano .env

# Deploy automático
npm run deploy:prod

# Iniciar
npm start
```

## 📁 Estrutura de Arquivos de Configuração

```
bardoAi/
├── env.local.example         # Template: Desenvolvimento local
├── env.production.example    # Template: VPS
├── env.static.example        # Template: Hospedagem estática ⭐
├── .env                      # Arquivo ativo (não versionado)
├── .env.backup.*             # Backups automáticos
│
├── scripts/
│   ├── setup-env.js          # Gerenciador de ambientes
│   ├── setup-env.ps1         # Gerenciador (Windows)
│   ├── deploy.js             # Deploy completo
│   ├── deploy.ps1            # Deploy (Windows)
│   ├── deploy-static.js      # Deploy estático
│   └── deploy-static.ps1     # Deploy estático (Windows)
│
└── docs/
    ├── GUIA_RAPIDO_HOSPEDAGEM.md  ⭐ COMECE AQUI!
    ├── STATIC_HOSTING.md           # Detalhes hospedagem estática
    ├── DEPLOYMENT.md               # Deploy VPS
    ├── ENV_MANAGEMENT.md           # Gerenciamento de ambientes
    └── DATABASE.md                 # Setup banco de dados
```

## 🔧 Todos os Comandos Disponíveis

### Gerenciamento de Ambientes

| Comando | Descrição |
|---------|-----------|
| `npm run env:local` | Configura para desenvolvimento local (Linux/Mac) |
| `npm run env:local:win` | Configura para desenvolvimento local (Windows) ⭐ |
| `npm run env:production` | Configura para VPS (Linux/Mac) |
| `npm run env:production:win` | Configura para VPS (Windows) |
| `npm run env:static` | Configura para hospedagem estática (Linux/Mac) |
| `npm run env:static:win` | Configura para hospedagem estática (Windows) ⭐ |

### Build e Deploy

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento local com hot reload |
| `npm run build` | Build completo (frontend + backend) |
| `npm run build:frontend` | Build apenas frontend |
| `npm run build:backend` | Build apenas backend |
| `npm run deploy:windows` | Deploy automático completo (Windows) |
| `npm run deploy:prod` | Deploy para produção (VPS) |
| `npm run deploy:static:win` | Deploy para hospedagem estática (Windows) ⭐ |
| `npm start` | Inicia servidor em produção |

### Banco de Dados

| Comando | Descrição |
|---------|-----------|
| `npm run db:push` | Aplica migrações do banco de dados |
| `npm run db:migrate` | Alias para db:push |

### Utilitários

| Comando | Descrição |
|---------|-----------|
| `npm run generate:jwt` | Gera JWT_SECRET seguro (Linux/Mac) |
| `npm run generate:jwt:win` | Gera JWT_SECRET seguro (Windows) |
| `npm run check` | Verifica tipos TypeScript |
| `npm test` | Executa testes |
| `npm run format` | Formata código com Prettier |

## 🎓 Guias Completos

### 📚 Para Seu Caso (Hospedagem Estática):

1. **[GUIA_RAPIDO_HOSPEDAGEM.md](./GUIA_RAPIDO_HOSPEDAGEM.md)** ⭐
   - Passo a passo completo
   - Deploy do backend no Render (grátis)
   - Build e upload do frontend
   - Troubleshooting

2. **[STATIC_HOSTING.md](./STATIC_HOSTING.md)**
   - Explicação detalhada da arquitetura
   - Opções de hospedagem
   - Configurações avançadas

### 📚 Outros Guias:

3. **[ENV_MANAGEMENT.md](./ENV_MANAGEMENT.md)**
   - Sistema de gerenciamento de ambientes
   - Como alternar entre ambientes
   - Sistema de backups

4. **[DEPLOYMENT.md](./DEPLOYMENT.md)**
   - Deploy em VPS completa
   - Scripts automáticos
   - Configuração de produção

5. **[DATABASE.md](./DATABASE.md)**
   - Setup do PostgreSQL local
   - Docker Compose
   - Conexão com DBeaver

## 🔥 Resumo para Você (Hospedagem Estática)

```powershell
# ===== BACKEND (Faça UMA VEZ) =====

# 1. Acesse https://render.com e crie uma conta
# 2. Crie um "Web Service" conectado ao seu GitHub
# 3. Configure:
#    Build: npm install && npm run build:backend
#    Start: npm start
# 4. Adicione variáveis de ambiente (DATABASE_URL, JWT_SECRET)
# 5. Copie a URL gerada: https://seu-backend.onrender.com


# ===== FRONTEND (Toda vez que atualizar) =====

# 1. Configure o ambiente
npm run env:static:win

# 2. Edite o .env com a URL do backend
notepad .env
# Cole: VITE_API_URL=https://seu-backend.onrender.com

# 3. Faça o build
npm run deploy:static:win

# 4. Faça upload de TUDO em dist\public\ para sua hospedagem
# Certifique-se de que index.html está na RAIZ!
```

## 💡 Dicas Importantes

1. **Sempre faça backup:** Os scripts criam backups automáticos do `.env`
2. **Nunca commite .env:** Já está no `.gitignore`
3. **Use senhas diferentes:** Local vs Produção
4. **Teste localmente primeiro:** `npm run dev`
5. **Backend no Render é grátis:** Mas "dorme" após 15 min (primeiro acesso demora)

## 🆘 Precisa de Ajuda?

Leia o guia específico para seu cenário:
- **Hospedagem Estática:** [`GUIA_RAPIDO_HOSPEDAGEM.md`](./GUIA_RAPIDO_HOSPEDAGEM.md) ⭐
- **VPS:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Local:** [`DATABASE.md`](./DATABASE.md)

Ou me pergunte! 😊

