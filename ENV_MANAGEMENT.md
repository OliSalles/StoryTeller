# 🔧 Gerenciamento de Ambientes

Este documento explica como funciona o sistema de gerenciamento de variáveis de ambiente do projeto.

## 📁 Estrutura de Arquivos

```
bardoAi/
├── env.local.example       # Template para ambiente local (Docker)
├── env.production.example  # Template para ambiente VPS (Supabase)
├── .env                    # Arquivo ativo (não versionado, criado automaticamente)
├── .env.backup.*           # Backups automáticos (não versionados)
└── scripts/
    ├── setup-env.js        # Script de configuração (Node.js)
    └── setup-env.ps1       # Script de configuração (PowerShell)
```

## 🚀 Uso Rápido

### Para Desenvolvimento Local:

```bash
# Linux/Mac
npm run env:local

# Windows
npm run env:local:win
```

### Para Deploy na VPS:

```bash
# Linux/Mac
npm run env:production

# Windows
npm run env:production:win

# Depois edite o .env com suas credenciais reais
nano .env  # ou code .env
```

## 📝 O que os Scripts Fazem

### 1. Verificam o Ambiente

Os scripts verificam qual ambiente você quer configurar:
- `local` - Desenvolvimento com Docker
- `production` - Deploy na VPS

### 2. Fazem Backup Automático

Se você já tem um arquivo `.env`, o script cria automaticamente um backup:
```
.env.backup.1735599123456
```

O número é o timestamp, então você nunca perde suas configurações!

### 3. Copiam o Template

O script copia o arquivo correto para `.env`:
- `env.local.example` → `.env` (para local)
- `env.production.example` → `.env` (para produção)

### 4. Mostram as Variáveis

Após copiar, o script mostra quais variáveis foram configuradas:
```
📄 Conteúdo do arquivo:
  DATABASE_URL=...
  JWT_SECRET=...
  NODE_ENV=...
  PORT=...
```

### 5. Dão Instruções

O script informa os próximos passos baseado no ambiente escolhido.

## 🔐 Variáveis de Ambiente

### Ambiente Local (`env.local.example`)

```bash
DATABASE_URL=postgresql://bardoai:bardoai123@localhost:5432/bardoai
JWT_SECRET=local-dev-secret-key-change-in-production-32-chars-minimum
NODE_ENV=development
PORT=3000
```

**Características:**
- ✅ Pronto para usar imediatamente
- ✅ Sem necessidade de edição
- ✅ Funciona com `docker-compose up -d`

### Ambiente de Produção (`env.production.example`)

```bash
DATABASE_URL=postgresql://postgres:SENHA@HOST:5432/postgres
JWT_SECRET=GERE-STRING-ALEATORIA-SEGURA
NODE_ENV=production
PORT=3000
```

**Características:**
- ⚠️ Requer edição manual
- ⚠️ Substitua SENHA e HOST pelos valores reais
- ⚠️ Gere um JWT_SECRET seguro

## 🔄 Alternando Entre Ambientes

Você pode alternar facilmente entre ambientes:

### De Local para Produção:

```bash
npm run env:production
nano .env  # Ajuste as credenciais
npm run deploy:prod
npm start
```

### De Produção para Local:

```bash
npm run env:local
docker-compose up -d
npm run dev
```

## 💾 Sistema de Backups

### Backups Automáticos

Sempre que você roda `npm run env:*`, o script:
1. Verifica se existe um `.env` atual
2. Se existir, cria um backup: `.env.backup.TIMESTAMP`
3. Copia o novo template

### Restaurando um Backup

Para restaurar um backup:

```bash
# Liste os backups disponíveis
ls .env.backup.*

# Copie o backup desejado
cp .env.backup.1735599123456 .env
```

## 🛠️ Personalizando os Templates

Você pode editar os templates para adicionar suas próprias variáveis:

### Editando `env.local.example`:

```bash
# Adicione novas variáveis
echo "MINHA_VARIAVEL=valor" >> env.local.example
```

### Editando `env.production.example`:

```bash
nano env.production.example
# Adicione suas variáveis personalizadas
```

## 🔒 Segurança

### ✅ Boas Práticas:

1. **NUNCA** commite arquivos `.env` no Git
2. **SEMPRE** use valores diferentes para `JWT_SECRET` em produção
3. **SEMPRE** use senhas fortes no DATABASE_URL de produção
4. **SEMPRE** mantenha os templates (`.example`) atualizados

### ⚠️ Arquivos Ignorados pelo Git:

```gitignore
.env
.env.*
!env.*.example
```

Isso garante que:
- ✅ Templates são versionados
- ✅ `.env` atual nunca é commitado
- ✅ Backups nunca são commitados

## 🧪 Testando

Para testar se a configuração está correta:

```bash
# Configure o ambiente
npm run env:local

# Verifique se o .env foi criado
cat .env

# Execute o projeto
npm run dev
```

## 📚 Comandos Úteis

```bash
# Ver conteúdo do .env atual
cat .env

# Ver diferenças entre ambientes
diff env.local.example env.production.example

# Verificar se .env existe
test -f .env && echo "Existe" || echo "Não existe"

# Listar todos os backups
ls -la .env.backup.*

# Remover backups antigos (cuidado!)
rm .env.backup.*
```

## 🆘 Troubleshooting

### Problema: "Arquivo não encontrado"

**Solução:** Certifique-se de estar no diretório raiz do projeto:
```bash
cd /caminho/para/bardoAi
npm run env:local
```

### Problema: "Permissão negada"

**Solução:** Dê permissão de execução aos scripts:
```bash
chmod +x scripts/setup-env.js
```

### Problema: ".env não funciona"

**Solução:** Verifique se as variáveis estão corretas:
```bash
cat .env
# Verifique se DATABASE_URL, JWT_SECRET, etc. estão presentes
```

### Problema: "Perdeu o .env anterior"

**Solução:** Restaure do backup:
```bash
ls .env.backup.*
cp .env.backup.TIMESTAMP .env
```

## 📞 Suporte

Se você tiver problemas:
1. Verifique se está no diretório correto
2. Verifique se os templates `.example` existem
3. Verifique os backups em `.env.backup.*`
4. Leia as mensagens de erro dos scripts




