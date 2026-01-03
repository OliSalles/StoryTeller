# 🎨 Guia Deploy com EasyPanel - VPS Hostinger

## ⚡ Início Rápido (15-20 minutos)

**🎉 Boa notícia!** Com EasyPanel, o deploy é **MUITO mais fácil** que configuração manual!

EasyPanel = Vercel/Netlify na sua própria VPS 🚀

---

## ✅ O que você JÁ tem (não precisa fazer):

- ✅ Docker instalado
- ✅ Nginx configurado automaticamente
- ✅ SSL (Let's Encrypt) automático
- ✅ Interface web visual
- ✅ Deploy via Git automático

---

## 📋 Passo a Passo

### Passo 1: Acessar EasyPanel (1 min)

1. **Abrir EasyPanel:**
   - URL: `https://seu-dominio-easypanel.com` (ou IP:3000)
   - Faça login com suas credenciais

2. **Verificar projeto atual:**
   - Veja se já tem aplicações rodando
   - Elas vão continuar funcionando normalmente

---

### Passo 2: Criar Banco de Dados PostgreSQL (3 min)

1. **No EasyPanel:**
   - Clique em "Services" (ou "Serviços")
   - Clique em "+ Add Service" (ou "+ Adicionar Serviço")

2. **Selecionar PostgreSQL:**
   - Procure por "PostgreSQL"
   - Clique em "PostgreSQL"

3. **Configurar:**
   ```
   Nome: bardoai-db
   
   PostgreSQL Version: 16 (ou latest)
   
   Database Name: bardoai_db
   Database User: bardoai_user
   Database Password: [Gere uma senha forte ou use o gerador]
   
   Volume Path: /data (deixe padrão)
   ```

4. **Criar:**
   - Clique em "Create" ou "Criar"
   - Aguarde o banco iniciar (~1 min)

5. **Anotar informações:**
   ```
   Host: bardoai-db (nome interno do Docker)
   Database: bardoai_db
   User: bardoai_user
   Password: [a senha que você escolheu]
   Port: 5432
   ```

---

### Passo 3: Criar Aplicação (Backend + Frontend) (5 min)

#### Opção A: Deploy via GitHub (Recomendado)

1. **No EasyPanel:**
   - Clique em "Apps" (ou "Aplicações")
   - Clique em "+ Add App" (ou "+ Adicionar Aplicação")

2. **Conectar GitHub:**
   - Selecione "Deploy from GitHub"
   - Autorize o EasyPanel a acessar seu GitHub
   - Selecione o repositório `bardoAi`

3. **Configurar Build:**
   ```
   Nome: bardoai
   
   Build Method: Docker (ou Buildpack)
   
   Branch: main (ou master)
   
   Build Command: npm run build
   
   Start Command: npm start
   
   Port: 3000
   
   Auto Deploy: ✅ Ativado (para deploy automático em cada git push)
   ```

#### Opção B: Upload Manual (Se não quiser conectar GitHub)

1. **No EasyPanel:**
   - Selecione "Deploy from Docker Image"
   - Ou "Deploy from Git URL"

2. **Configurar:**
   ```
   Nome: bardoai
   Port: 3000
   Start Command: npm start
   ```

---

### Passo 4: Configurar Variáveis de Ambiente (3 min)

1. **Na aplicação criada:**
   - Clique na aplicação "bardoai"
   - Vá em "Environment" (ou "Variáveis de Ambiente")

2. **Adicionar variáveis:**

   **Gerar JWT_SECRET primeiro:**
   No seu PC:
   ```powershell
   npm run generate:jwt:win
   # Copie o resultado
   ```

   **No EasyPanel, adicione:**
   ```
   DATABASE_URL=postgresql://bardoai_user:SUA-SENHA@bardoai-db:5432/bardoai_db
   (use host: bardoai-db, pois é o nome do serviço Docker)
   
   JWT_SECRET=cole-aqui-o-jwt-gerado
   
   NODE_ENV=production
   
   PORT=3000
   ```

3. **Salvar:**
   - Clique em "Save" ou "Salvar"

---

### Passo 5: Configurar Domínio e SSL (3 min)

1. **Na aplicação "bardoai":**
   - Vá em "Domains" (ou "Domínios")
   - Clique em "+ Add Domain"

2. **Adicionar domínio:**
   ```
   Domínio: seu-site.com
   ```
   
   **Marque:**
   - ✅ Enable SSL (Let's Encrypt)
   - ✅ Force HTTPS

3. **Configurar DNS:**
   No seu provedor de domínio (GoDaddy, Registro.br, etc.):
   ```
   Tipo: A
   Nome: @ (ou vazio)
   Valor: IP-DA-SUA-VPS
   TTL: 3600
   ```

4. **Aguardar:**
   - DNS propaga em 5-15 min
   - SSL é gerado automaticamente

---

### Passo 6: Deploy Inicial (2 min)

1. **No EasyPanel:**
   - Na aplicação "bardoai"
   - Clique em "Deploy" ou "Fazer Deploy"

2. **Aguardar build:**
   - Você verá os logs em tempo real
   - Build demora ~3-5 min na primeira vez

3. **Verificar logs:**
   - Vá em "Logs"
   - Verifique se não há erros
   - Deve aparecer: "Server running on http://localhost:3000"

---

### Passo 7: Executar Migrações do Banco (2 min)

**Opção A: Via Terminal do EasyPanel**

1. **Na aplicação "bardoai":**
   - Vá em "Terminal" ou "Console"
   - Execute:
   ```bash
   npm run db:push
   ```

**Opção B: Via SSH**

Se o EasyPanel não tiver terminal integrado:
```bash
# SSH na VPS
ssh root@seu-ip-vps

# Entrar no container
docker exec -it bardoai sh

# Executar migrações
npm run db:push

# Sair
exit
```

---

### Passo 8: Testar! (2 min)

1. **Acessar site:**
   - URL: `https://seu-dominio.com`
   - Deve carregar com HTTPS automático

2. **Testar funcionalidades:**
   - [ ] Login funciona
   - [ ] Dashboard carrega
   - [ ] Gera features
   - [ ] Exporta PDF
   - [ ] Histórico funciona

---

## 🔄 Atualizações Futuras

### Deploy Automático (Se configurou GitHub)

```bash
# No seu PC
git add .
git commit -m "Atualização"
git push

# EasyPanel faz deploy automaticamente! 🎉
```

### Deploy Manual

1. No EasyPanel → Aplicação "bardoai"
2. Clique em "Deploy"
3. Pronto!

---

## 📊 Monitoramento

### No EasyPanel:

1. **Logs em Tempo Real:**
   - Aplicação → "Logs"
   - Veja erros e informações

2. **Métricas:**
   - CPU e RAM em tempo real
   - Tráfego de rede

3. **Status:**
   - Se está rodando ou não
   - Número de restarts

---

## 🔐 Segurança

### Backup do Banco

**Opção A: Via EasyPanel**

1. Vá em "Services" → "bardoai-db"
2. "Backups"
3. Configure backup automático

**Opção B: Script Manual**

```bash
# SSH na VPS
ssh root@seu-ip-vps

# Backup
docker exec bardoai-db pg_dump -U bardoai_user bardoai_db > /backup/bardoai_$(date +%Y%m%d).sql
```

---

## 🆘 Troubleshooting

### Build falhou

1. **Ver logs:**
   - EasyPanel → Aplicação → "Build Logs"
   - Identifique o erro

2. **Erros comuns:**
   - Falta de memória → Aumente recursos da app
   - Erro de dependências → Verifique package.json
   - Erro de build → Teste localmente primeiro

### Aplicação não inicia

1. **Ver logs:**
   - EasyPanel → Aplicação → "Logs"

2. **Verificar:**
   - [ ] Variáveis de ambiente corretas
   - [ ] Banco de dados rodando
   - [ ] Porta correta (3000)

### Banco não conecta

1. **Verificar host:**
   - Use o **nome do serviço**: `bardoai-db`
   - Não use `localhost` ou `127.0.0.1`

2. **DATABASE_URL correto:**
   ```
   postgresql://bardoai_user:senha@bardoai-db:5432/bardoai_db
   └─────────────────────────────────┬────────────────────────────┘
                            Nome do serviço Docker
   ```

### SSL não funciona

1. **Verificar DNS:**
   ```bash
   nslookup seu-dominio.com
   # Deve retornar o IP da VPS
   ```

2. **Aguardar:**
   - SSL demora 2-5 min para gerar
   - Veja logs em "Domains" → "SSL Status"

---

## 🎯 Vantagens do EasyPanel

### vs. Configuração Manual

| Aspecto | EasyPanel | Manual |
|---------|-----------|--------|
| Tempo Setup | 15-20 min | 40+ min |
| Dificuldade | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Interface | 🎨 Visual | 💻 Terminal |
| SSL | 🔒 Automático | 🔧 Manual |
| Deploy | 🚀 Git push | 📝 Comandos |
| Logs | 👀 Interface | 📄 Terminal |
| Monitoramento | 📊 Gráficos | 🔍 Manual |
| Múltiplas Apps | ✅ Fácil | ❌ Complexo |

### vs. Render/Vercel

| Aspecto | EasyPanel | Render Free |
|---------|-----------|-------------|
| Custo | R$ 0 extra | R$ 0 |
| "Sleep" | ❌ Nunca | ✅ 15 min |
| Performance | ⚡⚡⚡⚡⚡ | ⚡⚡⚡ |
| Controle | 🎯 Total | ⚠️ Limitado |
| Servidor | 🏠 Seu | ☁️ Deles |

---

## 📱 Múltiplas Aplicações

Uma das **melhores vantagens** do EasyPanel: você pode hospedar **várias aplicações** na mesma VPS!

**Exemplo:**
- ✅ BardoAI (este projeto)
- ✅ Seu site pessoal
- ✅ API de outro projeto
- ✅ Bot do Telegram
- ✅ CMS (Strapi, Ghost, etc.)

Tudo com **interface visual**, **SSL automático** e **deploy via Git**!

---

## 🔄 Migração de Outras Apps

Se você já tem apps rodando no EasyPanel:

- ✅ Elas **continuam funcionando normalmente**
- ✅ Não há conflito
- ✅ Cada app tem seu próprio container Docker
- ✅ Recursos são compartilhados automaticamente

---

## 💡 Dicas

### 1. Organize por Projetos

Crie um "Project" no EasyPanel para cada cliente/projeto:
```
📁 OliConsulting
  └─ 📱 bardoai
  └─ 🗄️ bardoai-db

📁 Pessoal
  └─ 🌐 portfolio
  └─ 🤖 telegram-bot
```

### 2. Use Nomes Descritivos

```
✅ Bom:
- bardoai-backend
- bardoai-db
- bardoai-redis

❌ Ruim:
- app1
- db
- test
```

### 3. Configure Alertas

No EasyPanel:
- "Settings" → "Notifications"
- Receba alertas por email/Telegram se algo cair

### 4. Monitore Recursos

- Veja CPU/RAM de cada app
- Se alguma app consumir muito, aumente recursos da VPS

---

## 📞 Suporte

**EasyPanel:**
- Docs: https://easypanel.io/docs
- Discord: https://discord.gg/easypanel
- GitHub: https://github.com/easypanel-io/easypanel

**Hostinger VPS:**
- hPanel: https://hpanel.hostinger.com
- Chat: https://www.hostinger.com.br/suporte

---

## ✅ Checklist Rápido

- [ ] Acessei EasyPanel
- [ ] Criei serviço PostgreSQL (`bardoai-db`)
- [ ] Anotei credenciais do banco
- [ ] Criei aplicação (`bardoai`)
- [ ] Conectei ao GitHub (ou fiz upload)
- [ ] Configurei variáveis de ambiente
- [ ] Adicionei domínio
- [ ] Configurei DNS
- [ ] Fiz deploy inicial
- [ ] Executei migrações (`npm run db:push`)
- [ ] Testei o site
- [ ] Configurei SSL (automático)
- [ ] Verifiquei que tudo funciona

---

## 🎉 Resultado Final

Após seguir este guia, você terá:

- ✅ Site rodando com HTTPS
- ✅ Deploy automático via Git
- ✅ Interface visual para gerenciar
- ✅ Logs em tempo real
- ✅ SSL renovado automaticamente
- ✅ Zero conflito com outras apps
- ✅ Monitoramento visual
- ✅ Backup fácil

**Tudo isso em 15-20 minutos!** 🚀

---

**Pronto para começar?** Acesse seu EasyPanel e siga os passos! 😊




