# ✅ Checklist - Deploy na Hostinger

Imprima ou marque conforme for completando!

---

## 📋 Hospedagem Compartilhada (Premium/Business)

### Fase 1: Preparação Local (10 min)

- [ ] **1.1** Clonar/Atualizar repositório
  ```powershell
  git clone https://github.com/seu-usuario/bardoAi.git
  cd bardoAi
  npm install
  ```

- [ ] **1.2** Gerar JWT Secret
  ```powershell
  npm run generate:jwt:win
  ```
  **Anotar aqui:** `JWT_SECRET=_________________________`

### Fase 2: Banco de Dados (5 min)

- [ ] **2.1** Acessar hPanel
  - URL: https://hpanel.hostinger.com
  - Login: `_________________________`

- [ ] **2.2** Criar Banco de Dados
  - Ir em: "Hospedagem" → Seu domínio → "Avançado" → "MySQL Databases"
  - Nome do banco: `_________________________`
  - Usuário: `_________________________`
  - Senha: `_________________________`
  - Host: `_________________________`
  - Porta: `_________________________`

### Fase 3: Backend no Render (10 min)

- [ ] **3.1** Criar conta no Render
  - URL: https://render.com
  - Login com: `[ ] GitHub  [ ] GitLab  [ ] Email`

- [ ] **3.2** Criar Web Service
  - Clicar em "New +" → "Web Service"
  - Repositório: `bardoAi`
  - Nome: `bardoai-backend`

- [ ] **3.3** Configurar Build
  - Build Command: `npm install && npm run build:backend`
  - Start Command: `npm start`

- [ ] **3.4** Adicionar Variáveis de Ambiente
  ```
  DATABASE_URL=_________________________ (do passo 2.2)
  JWT_SECRET=_________________________ (do passo 1.2)
  NODE_ENV=production
  PORT=3000
  ```

- [ ] **3.5** Deploy e anotar URL
  - Aguardar build terminar (~3-5 min)
  - URL gerada: `https://_________________________`

### Fase 4: Build do Frontend (5 min)

- [ ] **4.1** Configurar ambiente estático
  ```powershell
  npm run env:static:win
  ```

- [ ] **4.2** Editar .env
  ```powershell
  notepad .env
  ```
  - Adicionar: `VITE_API_URL=_________________________ (URL do passo 3.5)`

- [ ] **4.3** Build do frontend
  ```powershell
  npm run deploy:static:win
  ```
  - Verificar pasta `dist\public\` foi criada
  - Anotar tamanho: `___________ MB`

### Fase 5: Upload na Hostinger (10 min)

- [ ] **5.1** Abrir File Manager
  - hPanel → "Arquivos" → "Gerenciador de Arquivos"
  - Navegar para: `public_html/`

- [ ] **5.2** Limpar pasta (se necessário)
  - [ ] Backup de arquivos antigos (se existir site)
  - [ ] Deletar arquivos antigos
  - [ ] **Manter:** `.htaccess` (se existir)

- [ ] **5.3** Upload dos arquivos
  - Método: `[ ] File Manager  [ ] FTP (FileZilla)`
  - Upload de **TODOS** os arquivos de `dist\public\`
  - Verificar: `index.html` está na raiz

- [ ] **5.4** Configurar .htaccess
  - Criar/editar: `public_html/.htaccess`
  - Colar conteúdo do guia (ver GUIA_HOSTINGER.md)

### Fase 6: Testes (5 min)

- [ ] **6.1** Acessar site
  - URL: `https://_________________________`
  - [ ] Página carrega sem erros
  - [ ] CSS está funcionando
  - [ ] Imagens aparecem

- [ ] **6.2** Testar funcionalidades
  - [ ] Página de login aparece
  - [ ] Consegue fazer login
  - [ ] Dashboard carrega
  - [ ] Consegue criar feature
  - [ ] Histórico funciona

- [ ] **6.3** Testar em dispositivos
  - [ ] Desktop
  - [ ] Mobile
  - [ ] Tablet

### Fase 7: Monitoramento (Contínuo)

- [ ] **7.1** Verificar backend Render
  - [ ] Acessa: `https://seu-backend.onrender.com/health`
  - [ ] Retorna status OK

- [ ] **7.2** Configurar alertas
  - [ ] Email de notificação no Render
  - [ ] Monitorar logs: https://dashboard.render.com

---

## 📋 VPS Hostinger

### Fase 1: Acesso SSH (5 min)

- [ ] **1.1** Obter credenciais
  - hPanel → "VPS" → Seu servidor → "Acesso SSH"
  - IP: `_________________________`
  - Porta: `_________________________`
  - Usuário: `_________________________`
  - Senha: `_________________________`

- [ ] **1.2** Conectar
  ```bash
  ssh root@seu-ip -p porta
  ```

### Fase 2: Instalar Dependências (10 min)

- [ ] **2.1** Atualizar sistema
  ```bash
  apt update && apt upgrade -y
  ```

- [ ] **2.2** Instalar Node.js
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  node -v  # Verificar
  ```

- [ ] **2.3** Instalar PostgreSQL
  ```bash
  apt install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
  ```

- [ ] **2.4** Instalar outros
  ```bash
  apt install -y git nginx
  ```

### Fase 3: Configurar Banco (5 min)

- [ ] **3.1** Criar banco e usuário
  ```bash
  sudo -u postgres psql
  CREATE DATABASE bardoai_db;
  CREATE USER bardoai_user WITH PASSWORD 'senha-forte-aqui';
  GRANT ALL PRIVILEGES ON DATABASE bardoai_db TO bardoai_user;
  \q
  ```
  - Senha criada: `_________________________`

### Fase 4: Clonar Projeto (5 min)

- [ ] **4.1** Clonar repositório
  ```bash
  cd /var/www
  git clone https://github.com/seu-usuario/bardoAi.git
  cd bardoAi
  ```

- [ ] **4.2** Instalar dependências
  ```bash
  npm install
  ```

### Fase 5: Configurar e Deploy (10 min)

- [ ] **5.1** Gerar JWT Secret
  ```bash
  npm run generate:jwt
  ```
  - Anotar: `_________________________`

- [ ] **5.2** Configurar ambiente
  ```bash
  npm run env:production
  nano .env
  ```
  - Configurar DATABASE_URL
  - Configurar JWT_SECRET

- [ ] **5.3** Deploy
  ```bash
  npm run deploy:prod
  ```

### Fase 6: PM2 (5 min)

- [ ] **6.1** Instalar e configurar
  ```bash
  npm install -g pm2
  pm2 start npm --name "bardoai" -- start
  pm2 startup
  pm2 save
  ```

- [ ] **6.2** Verificar
  ```bash
  pm2 status
  pm2 logs bardoai
  ```

### Fase 7: Nginx (10 min)

- [ ] **7.1** Criar configuração
  ```bash
  nano /etc/nginx/sites-available/bardoai
  ```
  - Colar configuração do guia

- [ ] **7.2** Ativar
  ```bash
  ln -s /etc/nginx/sites-available/bardoai /etc/nginx/sites-enabled/
  nginx -t
  systemctl restart nginx
  ```

### Fase 8: SSL (5 min)

- [ ] **8.1** Instalar Certbot
  ```bash
  apt install -y certbot python3-certbot-nginx
  ```

- [ ] **8.2** Obter certificado
  ```bash
  certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
  ```

### Fase 9: Testes (5 min)

- [ ] **9.1** Acessar site
  - URL: `https://_________________________`

- [ ] **9.2** Testar funcionalidades
  - [ ] Login funciona
  - [ ] Dashboard carrega
  - [ ] Gera features
  - [ ] Exporta PDF

---

## 📊 Informações Úteis

### Credenciais (Mantenha Seguro!)

**Hostinger:**
- Email: `_________________________`
- Senha: `_________________________`

**Render:**
- Email: `_________________________`
- Senha: `_________________________`

**Banco de Dados:**
- Host: `_________________________`
- Database: `_________________________`
- User: `_________________________`
- Password: `_________________________`

**VPS (se aplicável):**
- IP: `_________________________`
- Usuário: `_________________________`
- Senha: `_________________________`

### URLs Importantes

- Site: `https://_________________________`
- Backend: `https://_________________________`
- hPanel: `https://hpanel.hostinger.com`
- Render: `https://dashboard.render.com`
- GitHub: `https://github.com/_________________________`

### Contatos Suporte

**Hostinger:**
- Chat: https://www.hostinger.com.br/suporte
- WhatsApp: (11) 4950-6622
- Email: suporte@hostinger.com

**Render:**
- Docs: https://render.com/docs
- Discord: https://render.com/discord
- Email: support@render.com

---

## 🎉 Parabéns!

Se você marcou tudo, seu projeto está no ar! 🚀

**Próximos passos:**
- [ ] Monitorar logs regularmente
- [ ] Fazer backups do banco de dados
- [ ] Configurar domínio customizado (se aplicável)
- [ ] Adicionar analytics
- [ ] Configurar emails transacionais

---

**Data do Deploy:** `___/___/______`  
**Versão:** `_________________________`  
**Responsável:** `_________________________`












