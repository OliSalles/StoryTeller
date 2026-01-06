# 🚀 Guia Completo - Deploy na VPS Hostinger

## 🚨 ATENÇÃO: Você tem EasyPanel instalado?

**⚠️ SE VOCÊ TEM EASYPANEL, NÃO SIGA ESTE GUIA!**

**Use:** **[GUIA_EASYPANEL.md](./GUIA_EASYPANEL.md)** ⭐

Este guia é para configuração manual. Se você tem EasyPanel:

- ✅ É **10x mais fácil** via interface visual
- ✅ Leva apenas **15-20 minutos**
- ✅ Deploy automático via Git
- ✅ SSL automático
- ✅ Não conflita com suas outras aplicações

---

## ⚡ Início Rápido (30-40 minutos)

**Este guia é para quem NÃO tem EasyPanel ou quer configurar manualmente.**

Este guia vai te ajudar a colocar o projeto completo no ar na sua VPS Hostinger.

### 📋 O que você vai ter no final:

- ✅ Backend Node.js rodando com PM2
- ✅ Frontend servido pelo Nginx
- ✅ PostgreSQL rodando localmente
- ✅ HTTPS automático com Let's Encrypt
- ✅ Deploy automático via Git
- ✅ Logs e monitoramento

---

## 🎬 Passo a Passo

### Passo 1: Acessar a VPS (2 min)

1. **Obter credenciais SSH:**
   - Entre em: https://hpanel.hostinger.com
   - Clique em "VPS" → Selecione seu servidor
   - Clique em "Acesso" ou "Overview"
   - Anote:
     ```
     IP: ___________________
     Porta SSH: ___________ (geralmente 22)
     Usuário: root
     Senha: _______________
     ```

2. **Conectar via SSH:**

   **Windows (PowerShell):**

   ```powershell
   ssh root@seu-ip-vps
   # Digite a senha quando solicitado
   ```

   **Alternativa: Use o terminal do hPanel**
   - No hPanel → VPS → "Terminal" (mais fácil!)

---

### Passo 2: Preparar o Servidor (10 min)

```bash
# 1. Atualizar sistema
apt update && apt upgrade -y

# 2. Instalar Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar
node -v  # Deve mostrar v20.x.x
npm -v   # Deve mostrar 10.x.x

# 3. Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Iniciar e habilitar
systemctl start postgresql
systemctl enable postgresql

# 4. Instalar outras dependências
apt install -y git nginx certbot python3-certbot-nginx

# 5. Instalar PM2 (gerenciador de processos)
npm install -g pm2
```

---

### Passo 3: Configurar PostgreSQL (5 min)

```bash
# Entrar no PostgreSQL
sudo -u postgres psql

# Executar estes comandos dentro do psql:
CREATE DATABASE bardoai_db;
CREATE USER bardoai_user WITH PASSWORD 'SuaSenhaForteAqui123!';
GRANT ALL PRIVILEGES ON DATABASE bardoai_db TO bardoai_user;

# Sair do psql
\q
```

**⚠️ IMPORTANTE:** Troque `'SuaSenhaForteAqui123!'` por uma senha forte e anote!

---

### Passo 4: Clonar o Projeto (3 min)

```bash
# Ir para o diretório web
cd /var/www

# Clonar repositório
git clone https://github.com/seu-usuario/bardoAi.git
cd bardoAi

# Instalar dependências
npm install
```

**📝 Nota:** Se o repositório for privado, você precisará configurar SSH keys ou usar HTTPS com token.

---

### Passo 5: Configurar Variáveis de Ambiente (5 min)

```bash
# 1. Configurar para produção
npm run env:production

# 2. Editar o .env
nano .env
```

**Cole e ajuste:**

```bash
# Database - PostgreSQL local
DATABASE_URL=postgresql://bardoai_user:SuaSenhaForteAqui123!@localhost:5432/bardoai_db

# JWT Secret - Gere um seguro
JWT_SECRET=cole-aqui-uma-string-de-64-caracteres

# Ambiente
NODE_ENV=production
PORT=3000

# OAuth (opcional)
VITE_APP_ID=bardoai-production
OAUTH_SERVER_URL=https://seu-dominio.com
OWNER_OPEN_ID=seu-owner-id
```

**💡 Para gerar JWT_SECRET:**

```bash
# No seu PC Windows, execute:
npm run generate:jwt:win

# Ou na VPS:
openssl rand -base64 48
```

**Salvar e sair do nano:**

- `Ctrl + O` (salvar)
- `Enter` (confirmar)
- `Ctrl + X` (sair)

---

### Passo 6: Deploy do Projeto (5 min)

```bash
# Executar deploy automático
npm run deploy:prod

# Isso vai:
# - Verificar dependências
# - Aplicar migrações do banco
# - Fazer build do frontend e backend
```

**Se der erro de tipos TypeScript, não se preocupe, o build vai continuar.**

---

### Passo 7: Iniciar com PM2 (3 min)

```bash
# Iniciar aplicação
pm2 start npm --name "bardoai" -- start

# Configurar para iniciar automaticamente no boot
pm2 startup
# Copie e execute o comando que aparecer

pm2 save

# Verificar status
pm2 status

# Ver logs (Ctrl+C para sair)
pm2 logs bardoai
```

**Teste:**

```bash
curl http://localhost:3000
# Deve retornar o HTML do site
```

---

### Passo 8: Configurar Nginx (10 min)

```bash
# 1. Criar configuração do Nginx
nano /etc/nginx/sites-available/bardoai
```

**Cole esta configuração:**

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Logs
    access_log /var/log/nginx/bardoai_access.log;
    error_log /var/log/nginx/bardoai_error.log;

    # Root para arquivos estáticos
    root /var/www/bardoAi/dist/public;
    index index.html;

    # Comprimir respostas
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Arquivos estáticos (frontend)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API (backend Node.js)
    location /api {
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

    # Cache de assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**⚠️ IMPORTANTE:** Troque `seu-dominio.com` pelo seu domínio real!

**Salvar e sair:** `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# 2. Ativar site
ln -s /etc/nginx/sites-available/bardoai /etc/nginx/sites-enabled/

# 3. Remover site padrão (se existir)
rm /etc/nginx/sites-enabled/default

# 4. Testar configuração
nginx -t

# 5. Reiniciar Nginx
systemctl restart nginx
```

---

### Passo 9: Configurar DNS (5 min)

**No seu provedor de domínio (GoDaddy, Registro.br, etc.):**

Crie um registro A apontando para o IP da VPS:

```
Tipo: A
Nome: @ (ou deixe em branco)
Valor: IP-DA-SUA-VPS
TTL: 3600 (1 hora)

Tipo: A
Nome: www
Valor: IP-DA-SUA-VPS
TTL: 3600
```

**⏰ Aguarde:** Pode demorar até 24h para propagar (geralmente 5-15 min).

**Teste:**

```bash
# No seu PC
ping seu-dominio.com
# Deve retornar o IP da VPS
```

---

### Passo 10: Configurar HTTPS (5 min)

```bash
# Obter certificado SSL (GRÁTIS com Let's Encrypt)
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Responda as perguntas:
# Email: seu-email@exemplo.com
# Terms: Y (sim)
# Share email: N (não)
# Redirect HTTP to HTTPS: 2 (sim, redirecionar)

# Verificar renovação automática
certbot renew --dry-run
```

**✅ Pronto! Seu site agora está com HTTPS!**

---

### Passo 11: Testar! (5 min)

1. **Acessar site:**
   - URL: `https://seu-dominio.com`
   - Deve carregar o site com cadeado verde (HTTPS)

2. **Testar funcionalidades:**
   - [ ] Página de login aparece
   - [ ] Consegue fazer login
   - [ ] Dashboard carrega
   - [ ] Consegue gerar feature
   - [ ] Exporta PDF
   - [ ] Histórico funciona

3. **Verificar logs:**

   ```bash
   # Logs do PM2
   pm2 logs bardoai

   # Logs do Nginx
   tail -f /var/log/nginx/bardoai_error.log
   ```

---

## 🔄 Atualizações Futuras

Quando você atualizar o código:

```bash
# 1. SSH na VPS
ssh root@seu-ip-vps

# 2. Ir para o projeto
cd /var/www/bardoAi

# 3. Atualizar código
git pull

# 4. Instalar novas dependências (se houver)
npm install

# 5. Aplicar migrações (se houver)
npm run db:push

# 6. Rebuild
npm run build

# 7. Reiniciar aplicação
pm2 restart bardoai

# 8. Verificar
pm2 status
pm2 logs bardoai
```

**💡 Automatize com Git Hooks (avançado):**
Você pode configurar deploy automático quando fizer `git push`. Veja a seção "Deploy Automático" abaixo.

---

## 📊 Monitoramento

### PM2 Plus (Grátis)

```bash
# Monitoramento online grátis
pm2 plus

# Seguir instruções no terminal
# Você terá um dashboard web em: https://app.pm2.io
```

### Comandos Úteis PM2

```bash
# Status
pm2 status

# Logs em tempo real
pm2 logs bardoai

# Logs antigos
pm2 logs bardoai --lines 100

# Reiniciar
pm2 restart bardoai

# Parar
pm2 stop bardoai

# Remover
pm2 delete bardoai

# Informações detalhadas
pm2 show bardoai
```

### Verificar Recursos

```bash
# CPU e RAM
htop  # ou: top

# Espaço em disco
df -h

# Uso de memória
free -h

# Conexões ativas
netstat -tuln | grep :3000
```

---

## 🔐 Segurança

### Firewall UFW

```bash
# Instalar e configurar
apt install -y ufw

# Permitir SSH
ufw allow 22/tcp

# Permitir HTTP e HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Ativar
ufw enable

# Verificar status
ufw status
```

### Fail2Ban (Proteção contra ataques)

```bash
# Instalar
apt install -y fail2ban

# Iniciar
systemctl start fail2ban
systemctl enable fail2ban

# Verificar
fail2ban-client status
```

### Atualizações Automáticas

```bash
# Instalar
apt install -y unattended-upgrades

# Configurar
dpkg-reconfigure --priority=low unattended-upgrades
# Selecione "Yes"
```

---

## 💾 Backup

### Backup do Banco de Dados

```bash
# Criar script de backup
nano /root/backup-db.sh
```

**Cole:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/bardoai"
mkdir -p $BACKUP_DIR

# Backup do PostgreSQL
pg_dump -U bardoai_user -h localhost bardoai_db > $BACKUP_DIR/backup_$DATE.sql

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup criado: backup_$DATE.sql"
```

```bash
# Dar permissão
chmod +x /root/backup-db.sh

# Testar
/root/backup-db.sh

# Automatizar (cron diário às 3h)
crontab -e
# Adicione esta linha:
0 3 * * * /root/backup-db.sh
```

### Restaurar Backup

```bash
# Listar backups
ls -lh /var/backups/bardoai/

# Restaurar
sudo -u postgres psql bardoai_db < /var/backups/bardoai/backup_20241230_030000.sql
```

---

## 🚀 Deploy Automático (Avançado)

Configure para fazer deploy automaticamente quando você der `git push`:

### Na VPS:

```bash
# 1. Criar script de deploy
nano /var/www/deploy-bardoai.sh
```

**Cole:**

```bash
#!/bin/bash
cd /var/www/bardoAi
git pull
npm install
npm run db:push
npm run build
pm2 restart bardoai
echo "Deploy concluído: $(date)"
```

```bash
# 2. Dar permissão
chmod +x /var/www/deploy-bardoai.sh

# 3. Configurar webhook (use um serviço como webhook.site)
# Ou configure GitHub Actions (mais avançado)
```

---

## 🆘 Troubleshooting

### Site não carrega

**1. Verificar se a aplicação está rodando:**

```bash
pm2 status
curl http://localhost:3000
```

**2. Verificar Nginx:**

```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/bardoai_error.log
```

**3. Verificar DNS:**

```bash
nslookup seu-dominio.com
```

### Erro de conexão com banco

```bash
# Verificar se PostgreSQL está rodando
systemctl status postgresql

# Testar conexão
psql -U bardoai_user -h localhost -d bardoai_db

# Ver logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

### PM2 não inicia no boot

```bash
# Reconfigurar
pm2 unstartup
pm2 startup
# Execute o comando que aparecer
pm2 save
```

### Certificado SSL expirou

```bash
# Renovar manualmente
certbot renew

# Verificar renovação automática
systemctl status certbot.timer
```

---

## 📞 Suporte

**Hostinger VPS:**

- hPanel: https://hpanel.hostinger.com
- Chat: https://www.hostinger.com.br/suporte
- Email: suporte@hostinger.com
- Telefone: 0800 878 9399

**Documentação Útil:**

- Nginx: https://nginx.org/en/docs/
- PM2: https://pm2.keymetrics.io/docs/
- PostgreSQL: https://www.postgresql.org/docs/
- Certbot: https://certbot.eff.org/docs/

---

## ✅ Checklist Final

- [ ] SSH funcionando
- [ ] Node.js instalado (v20.x)
- [ ] PostgreSQL instalado e configurado
- [ ] Banco de dados criado
- [ ] Projeto clonado em `/var/www/bardoAi`
- [ ] Dependências instaladas
- [ ] `.env` configurado
- [ ] Migrações aplicadas
- [ ] Build concluído
- [ ] PM2 rodando aplicação
- [ ] PM2 configurado para auto-start
- [ ] Nginx configurado
- [ ] DNS apontando para VPS
- [ ] HTTPS configurado
- [ ] Site acessível via HTTPS
- [ ] Todas as funcionalidades testadas
- [ ] Backups configurados
- [ ] Firewall ativado
- [ ] Logs sendo monitorados

---

**🎉 Parabéns! Seu projeto está completamente no ar na VPS Hostinger!**

**Custos:**

- VPS Hostinger: Seu plano atual (já paga)
- Total extra: R$ 0 🎊
