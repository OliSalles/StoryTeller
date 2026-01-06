# 🚀 Guia Rápido - Deploy para Hospedagem Estática

## ⚠️ Situação Atual

Você tem uma **hospedagem estática** (não executa Node.js) e precisa fazer upload manual dos arquivos.

## 🎯 Solução: Frontend + Backend Separados

### Parte 1: Backend (GRÁTIS - Render.com)

O backend (Node.js) precisa rodar em um servidor separado.

#### Opção A: Render (Recomendado - Gratuito)

1. **Criar conta:**
   - Acesse: https://render.com
   - Faça login com GitHub

2. **Criar Web Service:**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub `bardoAi`
   - Nome: `bardoai-backend`

3. **Configurar:**
   ```
   Environment: Node
   Build Command: npm install && npm run build:backend
   Start Command: npm start
   ```

4. **Adicionar Variáveis de Ambiente:**
   Clique em "Environment" e adicione:
   ```
   DATABASE_URL=postgresql://bardoai:bardoai123@seu-db-host:5432/bardoai
   JWT_SECRET=gere-uma-string-aleatoria-de-32-caracteres
   NODE_ENV=production
   PORT=3000
   ```

5. **Deploy!**
   - Render vai gerar uma URL tipo: `https://bardoai-backend.onrender.com`
   - **ANOTE ESSA URL!** Você vai usar no próximo passo

#### Opção B: Sem Backend (Apenas Teste)

Se você só quer testar o frontend sem funcionalidades:
- Pule a parte do backend
- O frontend vai carregar, mas não vai conseguir:
  - Fazer login
  - Gerar features
  - Acessar histórico

### Parte 2: Frontend (Sua Hospedagem Atual)

Agora você vai fazer o build do frontend e fazer upload:

```powershell
# 1. Configure o ambiente
npm run env:static:win

# 2. Edite o .env e adicione a URL do backend
# Abra o arquivo .env e cole a URL que o Render gerou:
# VITE_API_URL=https://bardoai-backend.onrender.com

# 3. Faça o build do frontend
npm run deploy:static:win

# 4. Os arquivos estarão em: dist\public\
# Faça upload de TUDO que está nessa pasta!
```

## 📁 O que fazer upload

Faça upload de **TODOS** os arquivos dentro de `dist\public\`:

```
dist\public\
├── index.html           ← Esse arquivo deve estar na RAIZ da hospedagem
├── assets\
│   ├── index-kDapbyrg.css
│   └── index-CVMvfSF-.js
└── (outros arquivos...)
```

## ⚡ Comandos Rápidos

| Comando | Quando Usar |
|---------|-------------|
| `npm run env:static:win` | Configurar para hospedagem estática |
| `npm run deploy:static:win` | Build do frontend |
| `npm run env:local:win` | Voltar para desenvolvimento local |
| `npm run dev` | Rodar localmente |

## 🔄 Fluxo Completo

### Primeira Vez:

```powershell
# 1. Deploy do backend no Render (faça uma vez)
# Siga os passos da Parte 1 acima
# URL gerada: https://bardoai-backend.onrender.com

# 2. Configure o frontend
npm run env:static:win

# 3. Edite o .env
code .env
# ou
notepad .env
# Cole: VITE_API_URL=https://bardoai-backend.onrender.com

# 4. Build e abra a pasta
npm run deploy:static:win

# 5. Upload manual
# Faça upload de tudo em dist\public\ para sua hospedagem
```

### Próximas Atualizações:

```powershell
# 1. Build do frontend
npm run deploy:static:win

# 2. Upload manual
# Faça upload de tudo em dist\public\ (substituindo os arquivos)
```

## 🆘 Problemas Comuns

### "Não consigo fazer login"

**Causa:** Backend não está configurado ou não está rodando.

**Solução:**
1. Verifique se o backend está rodando no Render
2. Acesse: `https://seu-backend.onrender.com/health`
3. Deve retornar algo como `{"status": "ok"}`

### "Erro de CORS"

**Causa:** Backend não está permitindo requisições do seu domínio.

**Solução:** O código já está preparado, mas se persistir:
1. No Render, adicione variável: `CORS_ORIGIN=https://seu-site.com`

### "Backend demorou muito"

**Causa:** Render Free "dorme" após 15 min de inatividade.

**Solução:**
- Normal! Primeiro acesso demora ~30s
- Acessos seguintes são rápidos
- Ou pague $7/mês para evitar sleep

### "Arquivos não aparecem"

**Causa:** Upload incorreto.

**Solução:**
1. Certifique-se de que `index.html` está na RAIZ
2. A pasta `assets\` deve estar ao lado do `index.html`
3. Estrutura correta:
   ```
   SUA_HOSPEDAGEM/
   ├── index.html       ← na raiz!
   └── assets/
       ├── *.css
       └── *.js
   ```

## 💰 Custos

### Opção Gratuita (Recomendada):

| Serviço | Custo | Limitação |
|---------|-------|-----------|
| **Backend** (Render) | Grátis | Sleep após 15 min |
| **Frontend** (Sua hospedagem) | Seu plano atual | - |
| **Database** (Seu local ou Supabase free) | Grátis | Limitações do free tier |

**Total: R$ 0/mês** (assumindo que você já tem a hospedagem)

### Opção Paga:

| Serviço | Custo |
|---------|-------|
| Render Starter | $7/mês (sem sleep) |
| Render Pro | $19/mês (mais recursos) |

## 📞 Precisa de Ajuda?

**Me diga:**
1. Qual é o nome da sua hospedagem? (Hostinger, Locaweb, etc.)
2. Você conseguiu fazer o deploy do backend no Render?
3. Qual erro está aparecendo?

## 📚 Documentação Completa

- **`STATIC_HOSTING.md`** - Explicação detalhada de toda a arquitetura
- **`ENV_MANAGEMENT.md`** - Sistema de gerenciamento de ambientes
- **`DEPLOYMENT.md`** - Guia completo de deploy (VPS)












