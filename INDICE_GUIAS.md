# 📚 Índice Completo de Guias - Bardo AI

## 🚀 Por Onde Começar?

### Você usa **Hostinger**? ⭐

**Você tem VPS ou Hospedagem Compartilhada?**

#### Tenho **VPS Hostinger** (Recomendado!)

1. **[COMPARACAO_OPCOES.md](./COMPARACAO_OPCOES.md)** 🤔 Veja por que VPS é melhor!
2. **[GUIA_VPS_HOSTINGER.md](./GUIA_VPS_HOSTINGER.md)** ⚡ Tutorial completo VPS
   - 11 passos simples (40 min)
   - Setup profissional completo
   - HTTPS, PM2, Nginx, PostgreSQL

#### Tenho **Hospedagem Compartilhada**

1. **[INICIO_RAPIDO_HOSTINGER.md](./INICIO_RAPIDO_HOSTINGER.md)** ⚡ COMECE AQUI!
   - Passos resumidos em tópicos
   - 30 minutos para colocar no ar
   - Comandos prontos para copiar/colar

2. **[CHECKLIST_HOSTINGER.md](./CHECKLIST_HOSTINGER.md)** 📋
   - Checklist completo passo a passo
   - Imprima e vá marcando
   - Espaço para anotar credenciais

3. **[GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md)** 📖
   - Tutorial completo e detalhado
   - Troubleshooting
   - Suporte e contatos

### Você usa **outra hospedagem estática**?

1. **[GUIA_RAPIDO_HOSPEDAGEM.md](./GUIA_RAPIDO_HOSPEDAGEM.md)** ⚡
   - Deploy para hospedagem que não roda Node.js
   - Backend no Render (grátis)
   - Frontend na sua hospedagem

2. **[STATIC_HOSTING.md](./STATIC_HOSTING.md)** 📖
   - Explicação completa da arquitetura
   - Frontend + Backend separados
   - Opções de provedores

### Você tem **VPS/Servidor**?

1. **[DEPLOYMENT.md](./DEPLOYMENT.md)** 📖
   - Deploy completo em VPS
   - Scripts automatizados
   - Tudo em um servidor

---

## 📂 Guias por Categoria

### 🎯 Início Rápido (5-30 min)

| Guia | Descrição | Para Quem |
|------|-----------|-----------|
| **[INICIO_RAPIDO_HOSTINGER.md](./INICIO_RAPIDO_HOSTINGER.md)** ⭐ | Deploy na Hostinger em 30 min | Usuários Hostinger |
| **[GUIA_RAPIDO_HOSPEDAGEM.md](./GUIA_RAPIDO_HOSPEDAGEM.md)** | Deploy em hospedagem estática | Qualquer hospedagem estática |
| **[README_DEPLOY.md](./README_DEPLOY.md)** | Índice e comandos rápidos | Todos |

### 📖 Guias Completos (1-2h)

| Guia | Descrição | Tamanho |
|------|-----------|---------|
| **[GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md)** | Tutorial completo Hostinger | ~350 linhas |
| **[STATIC_HOSTING.md](./STATIC_HOSTING.md)** | Arquitetura frontend/backend separados | ~250 linhas |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Deploy VPS com scripts automáticos | ~330 linhas |

### 📋 Checklists e Referências

| Guia | Descrição | Formato |
|------|-----------|---------|
| **[CHECKLIST_HOSTINGER.md](./CHECKLIST_HOSTINGER.md)** | Checklist para imprimir | Checkboxes |
| **[ENV_MANAGEMENT.md](./ENV_MANAGEMENT.md)** | Gerenciamento de ambientes | Referência |
| **[DATABASE.md](./DATABASE.md)** | Setup banco de dados local | Passo a passo |

---

## 🎓 Fluxograma de Decisão

```
Você tem hospedagem?
│
├─ SIM, é Hostinger
│  │
│  ├─ Plano Compartilhado (Premium/Business)
│  │  └─→ INICIO_RAPIDO_HOSTINGER.md (Cenário 1)
│  │
│  └─ VPS/Cloud Hostinger
│     └─→ INICIO_RAPIDO_HOSTINGER.md (Cenário 2)
│
├─ SIM, outra hospedagem estática
│  └─→ GUIA_RAPIDO_HOSPEDAGEM.md
│
└─ SIM, tenho VPS
   └─→ DEPLOYMENT.md
```

---

## 🛠️ Ferramentas e Scripts

### Scripts de Ambiente

```powershell
# Configurar para desenvolvimento local
npm run env:local:win

# Configurar para VPS
npm run env:production:win

# Configurar para hospedagem estática
npm run env:static:win
```

### Scripts de Deploy

```powershell
# Deploy completo (VPS)
npm run deploy:windows

# Deploy apenas frontend (hospedagem estática)
npm run deploy:static:win

# Deploy de produção
npm run deploy:prod
```

### Scripts Utilitários

```powershell
# Gerar JWT Secret seguro
npm run generate:jwt:win

# Aplicar migrações do banco
npm run db:push

# Verificar tipos TypeScript
npm run check
```

---

## 📋 Cenários de Uso

### Cenário 1: Desenvolvimento Local

**Objetivo:** Rodar o projeto no seu computador

**Guias:**
1. [DATABASE.md](./DATABASE.md) - Setup PostgreSQL via Docker
2. [ENV_MANAGEMENT.md](./ENV_MANAGEMENT.md) - Configurar ambiente local

**Comandos:**
```powershell
npm run env:local:win
docker-compose up -d
npm run dev
```

---

### Cenário 2: Hostinger Compartilhada

**Objetivo:** Site no ar gastando R$ 0 extra

**Guias:**
1. [INICIO_RAPIDO_HOSTINGER.md](./INICIO_RAPIDO_HOSTINGER.md) ⭐
2. [CHECKLIST_HOSTINGER.md](./CHECKLIST_HOSTINGER.md)
3. [GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md)

**Resumo:**
- Banco: MySQL/PostgreSQL na Hostinger
- Backend: Render (grátis)
- Frontend: Hostinger (seu plano)

---

### Cenário 3: VPS Hostinger

**Objetivo:** Tudo no mesmo servidor

**Guias:**
1. [INICIO_RAPIDO_HOSTINGER.md](./INICIO_RAPIDO_HOSTINGER.md) (Cenário 2)
2. [GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md) (Seção VPS)

**Resumo:**
- Tudo roda no VPS
- Usa PM2 + Nginx + SSL

---

### Cenário 4: Outra Hospedagem Estática

**Objetivo:** Vercel, Netlify, GitHub Pages, etc.

**Guias:**
1. [GUIA_RAPIDO_HOSPEDAGEM.md](./GUIA_RAPIDO_HOSPEDAGEM.md)
2. [STATIC_HOSTING.md](./STATIC_HOSTING.md)

**Resumo:**
- Backend: Render/Railway (grátis)
- Frontend: Sua hospedagem

---

### Cenário 5: VPS Qualquer

**Objetivo:** DigitalOcean, AWS, etc.

**Guias:**
1. [DEPLOYMENT.md](./DEPLOYMENT.md)

**Resumo:**
- Scripts automatizados
- Deploy com 1 comando

---

## 🎯 Objetivos por Tempo

### Tenho 10 minutos

**Objetivo:** Entender o que fazer

**Leia:**
- [README_DEPLOY.md](./README_DEPLOY.md)
- [INICIO_RAPIDO_HOSTINGER.md](./INICIO_RAPIDO_HOSTINGER.md) (se usa Hostinger)

---

### Tenho 30 minutos

**Objetivo:** Colocar no ar (básico)

**Siga:**
1. [INICIO_RAPIDO_HOSTINGER.md](./INICIO_RAPIDO_HOSTINGER.md)
   - Deploy backend no Render: 10 min
   - Build frontend: 5 min
   - Upload na Hostinger: 10 min
   - Testes: 5 min

---

### Tenho 1-2 horas

**Objetivo:** Deploy completo e configurado

**Siga:**
1. [CHECKLIST_HOSTINGER.md](./CHECKLIST_HOSTINGER.md) (imprima!)
2. [GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md) (consulte quando necessário)
3. Configure tudo: banco, backend, frontend, domínio, SSL

---

### Tenho um dia

**Objetivo:** Dominar todo o sistema

**Leia tudo:**
1. [README_DEPLOY.md](./README_DEPLOY.md) - Overview
2. [ENV_MANAGEMENT.md](./ENV_MANAGEMENT.md) - Sistema de ambientes
3. [DATABASE.md](./DATABASE.md) - Banco de dados
4. [GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md) - Hostinger completo
5. [STATIC_HOSTING.md](./STATIC_HOSTING.md) - Arquitetura
6. [DEPLOYMENT.md](./DEPLOYMENT.md) - VPS avançado

---

## 🆘 Troubleshooting

### "Não sei qual guia seguir"

**Responda:**
1. Qual sua hospedagem? → Se Hostinger: [INICIO_RAPIDO_HOSTINGER.md](./INICIO_RAPIDO_HOSTINGER.md)
2. Tem acesso SSH? → Se não: hospedagem estática
3. Quer gastar R$ 0? → Backend no Render

### "Está dando erro"

**Consulte:**
- [GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md) (Seção Troubleshooting)
- [STATIC_HOSTING.md](./STATIC_HOSTING.md) (Seção Problemas Comuns)

### "Quero entender melhor"

**Leia:**
- [STATIC_HOSTING.md](./STATIC_HOSTING.md) - Arquitetura detalhada
- [ENV_MANAGEMENT.md](./ENV_MANAGEMENT.md) - Sistema de ambientes

---

## 📞 Suporte

### Hostinger
- Chat: https://www.hostinger.com.br/suporte
- WhatsApp: (11) 4950-6622
- Email: suporte@hostinger.com

### Render
- Docs: https://render.com/docs
- Discord: https://render.com/discord

### Projeto
- Leia os guias acima
- Veja a seção "Troubleshooting"
- Abra uma issue no GitHub

---

## 📝 Contribuir

Encontrou um erro ou quer melhorar os guias?

1. Abra uma issue
2. Sugira melhorias
3. Envie um PR

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0.0

