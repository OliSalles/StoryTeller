# 🔐 Testar Sistema de Reset de Senha

## 📋 O que foi implementado:

✅ **Schema no banco de dados** (`password_reset_tokens`)  
✅ **Backend com 2 rotas tRPC:**
  - `auth.requestPasswordReset` - Solicitar reset
  - `auth.resetPassword` - Confirmar reset com token

✅ **Frontend com 2 páginas:**
  - `/forgot-password` - Solicitar reset
  - `/reset-password?token=xxx` - Resetar com token

✅ **Botão "Esqueci minha senha"** na página de login

---

## 🚀 Como Testar Localmente:

### 1️⃣ **Criar a tabela no banco:**

```bash
# Certificar que o Docker está rodando
docker ps

# Executar o SQL
Get-Content scripts/create-password-reset-table.sql | docker exec -i storyteller_postgres psql -U postgres -d storyteller
```

### 2️⃣ **Iniciar o servidor de desenvolvimento:**

```bash
npm run dev
```

### 3️⃣ **Testar o fluxo completo:**

1. **Acessar:** http://localhost:5000/login
2. **Clicar em:** "Esqueci minha senha"
3. **Digitar:** um email cadastrado (exemplo: `lucas oliveira`)
4. **Observar:** O console do servidor vai mostrar o link de reset:
   ```
   🔐 [PASSWORD RESET] Link gerado:
      Email: lucas@example.com
      Link: http://localhost:5000/reset-password?token=abc123...
      Expira em: ...
   ```
5. **Copiar e acessar** o link mostrado no console
6. **Digitar** a nova senha (mínimo 6 caracteres)
7. **Confirmar** e verificar se redireciona para login
8. **Fazer login** com a nova senha

---

## 🧪 Cenários de Teste:

### ✅ **Cenário 1: Fluxo completo com sucesso**
- Email existente → Token gerado → Nova senha → Login OK

### ✅ **Cenário 2: Email não cadastrado**
- Email inexistente → Mensagem genérica de sucesso (segurança)
- Console não mostra link

### ✅ **Cenário 3: Token inválido**
- Acessar `/reset-password?token=invalido`
- Deve mostrar erro: "Token inválido ou expirado"

### ✅ **Cenário 4: Token expirado**
- Aguardar 1 hora após gerar o token
- Tentar usar → Erro de token expirado

### ✅ **Cenário 5: Senhas não coincidem**
- Digitar senhas diferentes → Erro de validação

### ✅ **Cenário 6: Senha muito curta**
- Senha com menos de 6 caracteres → Erro de validação

### ✅ **Cenário 7: Token usado duas vezes**
- Usar o mesmo token duas vezes → Segunda tentativa falha

---

## 🔧 Modo Desenvolvimento:

Em desenvolvimento (`NODE_ENV=development`):
- O link de reset é mostrado no **console do servidor**
- O link também é **retornado na resposta** da API
- A página de sucesso mostra o link clicável

Isso facilita o teste sem precisar configurar email.

---

## 📧 Para Produção (TODO):

Para produção, você precisará integrar um serviço de email:
- **Opções:** SendGrid, AWS SES, Mailgun, Resend, etc.
- **Local para adicionar:** `server/auth.routers.ts` na rota `requestPasswordReset`
- **Substituir:** `console.log(resetLink)` por `await sendEmail(user.email, resetLink)`

---

## 📊 Tabela no Banco:

```sql
password_reset_tokens
├── id (serial)
├── user_id (integer, FK users)
├── token (varchar 255, único)
├── expires_at (timestamp)
├── used (boolean)
└── created_at (timestamp)
```

---

## ✅ Pronto para Deploy?

Após testar localmente:

```bash
# Commitar e fazer push
git checkout main
git merge dev
git push origin main
```

**No servidor (produção):**
```sql
-- Conectar ao banco
docker exec -it storyteller_storyteller_db.1.xxx psql -U storyteller_user -d storyteller_db

-- Executar o SQL do arquivo scripts/create-password-reset-table.sql
```

---

## 📝 Arquivos Criados/Modificados:

### **Backend:**
- `drizzle/schema-password-reset.ts` - Schema da tabela
- `drizzle/schema.ts` - Export do novo schema
- `server/db.ts` - Funções de manipulação de tokens
- `server/auth.routers.ts` - Rotas de reset
- `scripts/create-password-reset-table.sql` - SQL de criação

### **Frontend:**
- `client/src/pages/ForgotPassword.tsx` - Página de solicitar reset
- `client/src/pages/ResetPassword.tsx` - Página de resetar senha
- `client/src/pages/Login.tsx` - Adicionado botão de reset
- `client/src/App.tsx` - Adicionadas novas rotas

---

**🎉 Sistema de reset de senha completo e pronto para uso!**
