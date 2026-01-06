# 🌐 Guia Completo - Deploy na Hostinger

## 🎯 Primeiro: Qual plano você tem?

A Hostinger tem diferentes tipos de hospedagem:

### 1. **Hospedagem Compartilhada** (Premium, Business)
- ❌ **NÃO** roda Node.js
- ✅ Hospeda apenas arquivos estáticos (HTML, CSS, JS)
- **Solução:** Frontend na Hostinger + Backend no Render

### 2. **VPS Hostinger**
- ✅ Roda Node.js
- ✅ Pode hospedar tudo junto
- **Solução:** Tudo na Hostinger

### 3. **Cloud Hosting Hostinger**
- ✅ Roda Node.js
- ✅ Pode hospedar tudo junto
- **Solução:** Tudo na Hostinger

## 🔍 Como Descobrir Seu Plano?

1. Faça login no hPanel: https://hpanel.hostinger.com
2. Veja o nome do seu plano no topo da página
3. Se tem acesso SSH → VPS ou Cloud
4. Se só tem File Manager → Hospedagem Compartilhada

---

## 📋 Cenário 1: Hospedagem Compartilhada (Mais Comum)

### Parte A: Criar Banco de Dados na Hostinger

1. **Acessar hPanel:**
   - Entre em: https://hpanel.hostinger.com
   - Clique em "Hospedagem" → Selecione seu domínio

2. **Criar Banco MySQL/PostgreSQL:**
   
   **Se PostgreSQL estiver disponível:**
   - Vá em "Avançado" → "PostgreSQL Databases"
   - Clique em "Create Database"
   - Nome: `bardoai_db`
   - Usuário: `bardoai_user`
   - Senha: (crie uma senha forte)
   - **Anote:** Host, Database Name, Username, Password

   **Se apenas MySQL estiver disponível:**
   - Vá em "Avançado" → "MySQL Databases"
   - Clique em "Create Database"
   - Nome: `u123456_bardoai`
   - Usuário: `u123456_bardo`
   - Senha: (crie uma senha forte)
   - **Anote:** Host, Database Name, Username, Password
   
   ⚠️ **Nota:** O projeto usa PostgreSQL, mas você pode adaptar para MySQL se necessário.

3. **Anotar Informações de Conexão:**
   ```
   Host: localhost (ou mysql.hostinger.com)
   Database: u123456_bardoai
   Username: u123456_bardo
   Password: sua-senha-forte
   Port: 3306 (MySQL) ou 5432 (PostgreSQL)
   ```

### Parte B: Deploy do Backend (Render - Grátis)

Como a Hostinger Compartilhada não roda Node.js, vamos usar o Render:

1. **Criar conta no Render:**
   - Acesse: https://render.com
   - Faça login com GitHub

2. **Criar Web Service:**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub `bardoAi`
   - Nome: `bardoai-backend`

3. **Configurar:**
   ```
   Name: bardoai-backend
   Environment: Node
   Build Command: npm install && npm run build:backend
   Start Command: npm start
   ```

4. **Adicionar Variáveis de Ambiente:**
   Clique em "Environment" e adicione:
   
   **Se você criou PostgreSQL na Hostinger:**
   ```
   DATABASE_URL=postgresql://bardoai_user:SUA-SENHA@SEU-HOST:5432/bardoai_db
   JWT_SECRET=gere-uma-string-aleatoria-de-32-caracteres
   NODE_ENV=production
   PORT=3000
   ```

   **Se você criou MySQL na Hostinger (precisa adaptar o código):**
   ```
   DATABASE_URL=mysql://u123456_bardo:SUA-SENHA@mysql.hostinger.com:3306/u123456_bardoai
   JWT_SECRET=gere-uma-string-aleatoria-de-32-caracteres
   NODE_ENV=production
   PORT=3000
   ```

5. **Deploy e copiar URL:**
   - O Render vai fazer o deploy automaticamente
   - Copie a URL gerada: `https://bardoai-backend.onrender.com`

### Parte C: Upload do Frontend na Hostinger

1. **Build do Frontend Localmente:**
   ```powershell
   # 1. Configure o ambiente
   npm run env:static:win

   # 2. Edite o .env
   notepad .env
   # Adicione a URL do backend:
   # VITE_API_URL=https://bardoai-backend.onrender.com

   # 3. Faça o build
   npm run deploy:static:win
   ```

2. **Acessar File Manager da Hostinger:**
   - Entre no hPanel: https://hpanel.hostinger.com
   - Clique em "Arquivos" → "Gerenciador de Arquivos"
   - Navegue até a pasta `public_html` (ou `www` ou `htdocs`)

3. **Limpar Pasta (se necessário):**
   - Se houver arquivos antigos, delete-os
   - **Mantenha:** `.htaccess` (se existir)

4. **Upload dos Arquivos:**
   
   **Opção A: Upload pelo File Manager (Mais Fácil)**
   - Clique em "Upload" no File Manager
   - Selecione TODOS os arquivos de `dist\public\`
   - Arraste para a área de upload
   - Aguarde o upload terminar
   
   **Opção B: Upload via FTP (Mais Rápido)**
   - Baixe FileZilla: https://filezilla-project.org
   - Credenciais FTP no hPanel → "Arquivos" → "Contas FTP"
   - Conecte via FTP
   - Arraste TUDO de `dist\public\` para `public_html\`

5. **Estrutura Final na Hostinger:**
   ```
   public_html/
   ├── index.html          ← Na raiz!
   ├── assets/
   │   ├── index-*.css
   │   └── index-*.js
   └── .htaccess (se existir)
   ```

6. **Configurar .htaccess (Importante!):**
   
   Crie ou edite o arquivo `.htaccess` em `public_html/`:
   
   ```apache
   # Redirecionar todas as rotas para index.html (SPA)
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>

   # Habilitar CORS (se necessário)
   <IfModule mod_headers.c>
     Header set Access-Control-Allow-Origin "*"
   </IfModule>

   # Compressão GZIP
   <IfModule mod_deflate.c>
     AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
   </IfModule>

   # Cache de arquivos estáticos
   <IfModule mod_expires.c>
     ExpiresActive On
     ExpiresByType image/jpg "access plus 1 year"
     ExpiresByType image/jpeg "access plus 1 year"
     ExpiresByType image/gif "access plus 1 year"
     ExpiresByType image/png "access plus 1 year"
     ExpiresByType text/css "access plus 1 month"
     ExpiresByType application/javascript "access plus 1 month"
   </IfModule>
   ```

7. **Testar:**
   - Acesse: `https://seu-dominio.com`
   - O site deve carregar!

---

## 📋 Cenário 2: VPS ou Cloud Hostinger

Se você tem VPS ou Cloud, pode rodar Node.js diretamente:

### Passo 1: Acessar VPS via SSH

1. **Obter credenciais SSH:**
   - hPanel → "VPS" → Seu servidor
   - Clique em "Acesso SSH"
   - Anote: IP, Porta, Usuário, Senha

2. **Conectar via SSH:**
   ```bash
   ssh root@seu-ip-vps -p porta
   # Digite a senha quando solicitado
   ```

### Passo 2: Instalar Node.js

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
node -v
npm -v
```

### Passo 3: Instalar PostgreSQL

```bash
# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Iniciar PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Criar banco e usuário
sudo -u postgres psql << EOF
CREATE DATABASE bardoai_db;
CREATE USER bardoai_user WITH PASSWORD 'sua-senha-forte';
GRANT ALL PRIVILEGES ON DATABASE bardoai_db TO bardoai_user;
\q
EOF
```

### Passo 4: Clonar e Configurar Projeto

```bash
# Instalar Git
apt install -y git

# Clonar repositório
cd /var/www
git clone https://github.com/seu-usuario/bardoAi.git
cd bardoAi

# Instalar dependências
npm install

# Configurar ambiente
npm run env:production

# Editar .env
nano .env
```

**Configuração do .env:**
```bash
DATABASE_URL=postgresql://bardoai_user:sua-senha-forte@localhost:5432/bardoai_db
JWT_SECRET=gere-uma-string-aleatoria-de-32-caracteres
NODE_ENV=production
PORT=3000
```

### Passo 5: Deploy

```bash
# Deploy automático
npm run deploy:prod

# Ou manual:
npm run db:push
npm run build
```

### Passo 6: Configurar PM2 (Manter Rodando)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start npm --name "bardoai" -- start

# Configurar para iniciar automaticamente
pm2 startup
pm2 save

# Verificar status
pm2 status
pm2 logs bardoai
```

### Passo 7: Configurar Nginx (Proxy Reverso)

```bash
# Instalar Nginx
apt install -y nginx

# Criar configuração
nano /etc/nginx/sites-available/bardoai
```

**Conteúdo do arquivo:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

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

**Ativar e reiniciar:**
```bash
# Criar link simbólico
ln -s /etc/nginx/sites-available/bardoai /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

### Passo 8: Configurar SSL (HTTPS Grátis)

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Renovação automática já está configurada!
```

---

## 🔄 Atualizar o Projeto

### Hospedagem Compartilhada:

```powershell
# 1. Build local
npm run deploy:static:win

# 2. Upload via File Manager ou FTP
# Substitua os arquivos em public_html/
```

### VPS:

```bash
# SSH no servidor
ssh root@seu-ip-vps

# Ir para o projeto
cd /var/www/bardoAi

# Atualizar código
git pull

# Instalar dependências (se houver novas)
npm install

# Build
npm run build

# Reiniciar aplicação
pm2 restart bardoai
```

---

## 💰 Custos

### Hospedagem Compartilhada:
- **Hostinger:** Seu plano atual
- **Backend (Render):** Grátis
- **Total:** Seu plano atual

### VPS/Cloud:
- **Hostinger VPS:** A partir de R$ 19,99/mês
- **Tudo incluído** (hosting + backend + banco)

---

## 🆘 Troubleshooting Hostinger

### "Erro 500" ao acessar o site

**Causa:** Problema no .htaccess ou permissões

**Solução:**
1. Verifique o .htaccess (veja exemplo acima)
2. Permissões corretas:
   ```bash
   # Via SSH (VPS)
   chmod 644 index.html
   chmod 755 public_html
   ```

### "Não consigo fazer login"

**Causa:** Backend não está rodando ou CORS

**Solução:**
1. Verifique se o backend no Render está ativo
2. Acesse: `https://seu-backend.onrender.com/health`
3. Verifique se a URL está correta no `.env`

### "Upload muito lento via File Manager"

**Solução:** Use FTP (FileZilla)
1. hPanel → "Arquivos" → "Contas FTP"
2. Crie uma conta FTP
3. Use FileZilla para upload mais rápido

### "Banco de dados não conecta"

**Solução:**
1. Verifique as credenciais em hPanel → "Databases"
2. Certifique-se de usar o host correto (geralmente `localhost`)
3. Se usar banco remoto, adicione seu IP à whitelist

---

## 📞 Suporte Hostinger

- **Chat:** https://www.hostinger.com.br/suporte
- **Email:** suporte@hostinger.com
- **Telefone:** 0800 878 9399

---

## ✅ Checklist Completo

### Hospedagem Compartilhada:

- [ ] Criar banco de dados no hPanel
- [ ] Fazer deploy do backend no Render
- [ ] Configurar variáveis de ambiente no Render
- [ ] Build do frontend localmente
- [ ] Upload dos arquivos para `public_html/`
- [ ] Criar/editar `.htaccess`
- [ ] Testar no domínio

### VPS/Cloud:

- [ ] Conectar via SSH
- [ ] Instalar Node.js
- [ ] Instalar PostgreSQL
- [ ] Criar banco e usuário
- [ ] Clonar repositório
- [ ] Configurar `.env`
- [ ] Executar deploy
- [ ] Configurar PM2
- [ ] Configurar Nginx
- [ ] Configurar SSL

---

**Qual é o seu plano da Hostinger?** Me diga para eu te ajudar com os passos específicos! 😊












