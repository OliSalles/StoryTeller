# ⚡ Início Rápido - Hostinger

## 🎯 Qual o seu plano?

### Você tem Hospedagem Compartilhada? (Plano Premium, Business)

**Siga estes passos:**

#### 1️⃣ Criar Banco de Dados (5 minutos)

1. Entre em: https://hpanel.hostinger.com
2. Clique em "Hospedagem" → Seu domínio
3. Vá em "Avançado" → "MySQL Databases" (ou PostgreSQL se disponível)
4. Clique em "Create Database"
5. **Anote tudo:**
   - Host: `localhost` (ou `mysql.hostinger.com`)
   - Database: `u123456_bardoai`
   - Username: `u123456_bardo`
   - Password: sua-senha
   - Port: `3306` (MySQL) ou `5432` (PostgreSQL)

#### 2️⃣ Deploy do Backend no Render (10 minutos)

1. Acesse: https://render.com
2. Faça login com GitHub
3. "New +" → "Web Service"
4. Conecte seu repositório `bardoAi`
5. Configure:
   ```
   Build Command: npm install && npm run build:backend
   Start Command: npm start
   ```
6. Adicione variáveis de ambiente:
   ```
   DATABASE_URL=postgresql://usuario:senha@host:5432/database
   (use as informações do passo 1)
   
   JWT_SECRET=cole-uma-string-aleatoria-de-32-caracteres
   (gere com: npm run generate:jwt:win)
   
   NODE_ENV=production
   PORT=3000
   ```
   
   💡 **Dica:** Para gerar o JWT_SECRET automaticamente:
   ```powershell
   npm run generate:jwt:win
   # Copie a string gerada e cole no Render
   ```
7. Clique em "Create Web Service"
8. **Copie a URL gerada:** `https://bardoai-backend.onrender.com`

#### 3️⃣ Build do Frontend (5 minutos)

No seu computador:

```powershell
# 1. Configure
npm run env:static:win

# 2. Edite o .env
notepad .env
# Cole isto:
VITE_API_URL=https://bardoai-backend.onrender.com
# (use a URL do passo 2)

# 3. Build
npm run deploy:static:win
```

#### 4️⃣ Upload na Hostinger (10 minutos)

1. Entre em: https://hpanel.hostinger.com
2. "Arquivos" → "Gerenciador de Arquivos"
3. Navegue até `public_html/`
4. **Delete tudo** (exceto `.htaccess` se existir)
5. Clique em "Upload"
6. Selecione **TODOS** os arquivos de `dist\public\` do seu PC
7. Arraste para o upload
8. Aguarde terminar

#### 5️⃣ Configurar .htaccess

No File Manager, crie/edite `public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### 6️⃣ Testar!

Acesse: `https://seu-dominio.com`

---

### Você tem VPS Hostinger?

**Comandos rápidos via SSH:**

```bash
# 1. Conectar
ssh root@seu-ip-vps

# 2. Instalar Node.js e PostgreSQL
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql git

# 3. Criar banco
sudo -u postgres psql
CREATE DATABASE bardoai_db;
CREATE USER bardoai_user WITH PASSWORD 'senha-forte';
GRANT ALL PRIVILEGES ON DATABASE bardoai_db TO bardoai_user;
\q

# 4. Clonar projeto
cd /var/www
git clone https://github.com/seu-usuario/bardoAi.git
cd bardoAi

# 5. Configurar e deployar
npm install
npm run env:production
nano .env  # Configure DATABASE_URL e JWT_SECRET
npm run deploy:prod

# 6. Manter rodando
npm install -g pm2
pm2 start npm --name "bardoai" -- start
pm2 startup
pm2 save
```

Veja detalhes completos em: [`GUIA_HOSTINGER.md`](./GUIA_HOSTINGER.md)

---

## 🎬 Vídeo Tutorial

Se preferir, a Hostinger tem tutoriais:
- Como acessar File Manager: https://www.hostinger.com.br/tutoriais/file-manager
- Como criar banco MySQL: https://www.hostinger.com.br/tutoriais/mysql
- Como usar FTP: https://www.hostinger.com.br/tutoriais/ftp

---

## 📞 Precisa de Ajuda?

**Me diga:**
1. Qual é o seu plano da Hostinger? (Premium, Business, VPS, Cloud)
2. Em qual passo você está com dificuldade?
3. Qual erro está aparecendo?

**Suporte Hostinger:**
- Chat: https://www.hostinger.com.br/suporte
- WhatsApp: (11) 4950-6622
- Email: suporte@hostinger.com

---

## 📚 Guias Completos

- **[GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md)** - Tutorial detalhado Hostinger
- **[GUIA_RAPIDO_HOSPEDAGEM.md](./GUIA_RAPIDO_HOSPEDAGEM.md)** - Deploy geral
- **[README_DEPLOY.md](./README_DEPLOY.md)** - Índice de todos os guias

