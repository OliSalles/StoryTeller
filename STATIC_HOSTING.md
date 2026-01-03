# 🌐 Deploy para Hospedagem Estática

## ⚠️ Importante: Entendendo a Arquitetura

Este projeto tem **duas partes**:
1. **Frontend** (React/Vite) - Pode ser hospedado em hospedagem estática
2. **Backend** (Node.js/Express) - Precisa de um servidor Node.js rodando

## 🎯 Opções de Deploy

### Opção 1: Backend + Frontend Separados (Recomendado)

#### Frontend (Hospedagem Estática)
- Vercel
- Netlify  
- GitHub Pages
- Cloudflare Pages
- Seu provedor de hospedagem atual

#### Backend (Precisa de Node.js)
- Render (gratuito)
- Railway (gratuito)
- Fly.io (gratuito)
- Heroku
- Ou sua VPS/servidor

### Opção 2: Tudo em Um Servidor Node.js

Se você tem acesso a um servidor que roda Node.js (mesmo que limitado):
- Render
- Railway
- Fly.io
- DigitalOcean App Platform
- AWS Elastic Beanstalk

## 🚀 Configuração para Hospedagem Estática + Backend Separado

### 1. Configure as Variáveis de Ambiente

Crie um arquivo `env.static.example` para hospedagem estática:

```bash
# Backend URL - Apontando para onde seu backend está rodando
VITE_API_URL=https://seu-backend.render.com

# Database - No servidor backend
DATABASE_URL=postgresql://usuario:senha@host:5432/database

# JWT Secret - No servidor backend
JWT_SECRET=sua-string-secreta-de-32-caracteres

# Ambiente
NODE_ENV=production
PORT=3000
```

### 2. Build do Frontend

```bash
# Build apenas o frontend
npm run build:frontend

# Isso gera arquivos em: dist/public/
# Upload esses arquivos para sua hospedagem estática
```

### 3. Deploy do Backend

O backend precisa rodar em um servidor Node.js. Recomendamos **Render** (gratuito):

1. Crie conta no [Render](https://render.com)
2. Conecte seu repositório GitHub
3. Configure como "Web Service"
4. Build Command: `npm install && npm run build:backend`
5. Start Command: `npm start`
6. Configure as variáveis de ambiente

## 📦 Fluxo de Trabalho Atual

### Como você está fazendo agora:

```bash
# 1. Build completo
npm run build

# 2. Arquivos gerados:
dist/
├── public/          # Frontend (HTML, CSS, JS)
│   ├── index.html
│   └── assets/
└── index.js         # Backend (Node.js) - NÃO FUNCIONA em hospedagem estática!
```

### ⚠️ Problema:

Sua hospedagem estática **não executa o arquivo `dist/index.js`** (backend Node.js).
Ela só serve os arquivos em `dist/public/` (HTML, CSS, JS).

## ✅ Solução: Deploy Separado

### Passo 1: Hospedar o Backend (GRÁTIS no Render)

1. **Criar conta no Render:**
   - Acesse: https://render.com
   - Faça login com GitHub
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório `bardoAi`

2. **Configurar o Web Service:**
   ```
   Name: bardoai-backend
   Environment: Node
   Build Command: npm install && npm run build:backend
   Start Command: npm start
   ```

3. **Adicionar Variáveis de Ambiente:**
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=sua-string-secreta
   NODE_ENV=production
   PORT=3000
   ```

4. **Deploy!**
   - Render vai gerar uma URL: `https://bardoai-backend.onrender.com`
   - Anote essa URL!

### Passo 2: Configurar o Frontend para Usar o Backend

Crie um arquivo `env.static.example`:

```bash
# URL do backend no Render
VITE_API_URL=https://bardoai-backend.onrender.com
```

### Passo 3: Build e Upload do Frontend

```bash
# 1. Configure o ambiente
npm run env:static

# 2. Build do frontend
npm run build:frontend

# 3. Upload da pasta dist/public/ para sua hospedagem
# Copie tudo que está em dist/public/ e faça upload
```

## 🔧 Scripts Necessários

Vou criar os scripts para facilitar esse processo!

## 💰 Custos

### Opção Gratuita (Recomendada):

- **Frontend:** Sua hospedagem atual (provavelmente grátis)
- **Backend:** Render Free Tier
  - ✅ 750 horas/mês (suficiente para 1 projeto)
  - ✅ Deploy automático via Git
  - ✅ HTTPS gratuito
  - ⚠️ Dorme após 15 min de inatividade (primeiro acesso leva ~30s)

### Opção Paga:

- **Render:** $7/mês (sem sleep, mais rápido)
- **Railway:** $5/mês
- **DigitalOcean:** $5/mês

## 🤔 Preciso de Ajuda para Decidir?

**Responda essas perguntas:**

1. Sua hospedagem atual executa Node.js? (Digite `node -v` no terminal da hospedagem)
   - ✅ SIM → Use Opção 2 (tudo junto)
   - ❌ NÃO → Use Opção 1 (separado)

2. Você quer gastar dinheiro?
   - ✅ SIM → Recomendo DigitalOcean App Platform ($5/mês, tudo junto)
   - ❌ NÃO → Recomendo Render (gratuito, backend) + Sua hospedagem (frontend)

3. Quantos usuários simultâneos você espera?
   - Poucos (<100) → Render Free está ótimo
   - Muitos (>100) → Considere Render pago ou DigitalOcean

## 📝 Próximos Passos

Me diga:
1. **Qual é o nome da sua hospedagem atual?** (Vercel, Netlify, Hostinger, etc.)
2. **Ela executa Node.js?** 
3. **Você está disposto a usar Render (gratuito) para o backend?**

Com essas informações, vou criar os scripts exatos que você precisa! 🚀




