# 🌳 Fluxo de Trabalho com Branches

## 📋 Estrutura de Branches

```
main (PRODUÇÃO)     ← Código estável, deployado no EasyPanel
  └─ dev            ← Desenvolvimento, testes
```

---

## 🔄 Fluxo de Trabalho Diário

### **1️⃣ Trabalhando em Desenvolvimento**

```bash
# Mudar para branch dev
git checkout dev

# Fazer suas alterações normalmente
# ... editar arquivos ...

# Commit e push
git add .
git commit -m "Descrição da mudança"
git push origin dev
```

### **2️⃣ Quando estiver pronto para Produção**

```bash
# 1. Voltar para main
git checkout main

# 2. Atualizar main com o código mais recente
git pull origin main

# 3. Fazer merge da branch dev
git merge dev

# 4. Enviar para produção
git push origin main
```

**🚀 O push para `main` vai disparar deploy automático no EasyPanel!**

---

## 🎯 Comandos Úteis

### **Ver em qual branch você está**
```bash
git branch
# * dev     ← O asterisco mostra a branch atual
#   main
```

### **Ver todas as branches (locais e remotas)**
```bash
git branch -a
```

### **Trocar de branch**
```bash
git checkout main    # Vai para main (produção)
git checkout dev     # Vai para dev (desenvolvimento)
```

### **Atualizar branch dev com código de main**
```bash
# Se main recebeu hotfix e você quer atualizar dev
git checkout dev
git merge main
git push origin dev
```

---

## 🛡️ Boas Práticas

### **✅ SEMPRE trabalhe na branch dev:**
```bash
git checkout dev
# ... faça suas mudanças ...
git push origin dev
```

### **✅ Só faça merge para main quando:**
- O código foi testado
- Está funcionando corretamente
- Você quer fazer deploy em produção

### **❌ NUNCA faça commit direto na main:**
```bash
# ❌ EVITE ISSO:
git checkout main
git add .
git commit -m "mudança rápida"
git push origin main
```

### **✅ Use main apenas para merge:**
```bash
# ✅ FAÇA ASSIM:
git checkout dev
# ... trabalho ...
git push origin dev

# Quando pronto:
git checkout main
git merge dev
git push origin main
```

---

## 🔧 Configuração no EasyPanel

### **Opção 1: Um app apontando para main (recomendado inicialmente)**

```
App: bardoAi
Branch: main
URL: seu-dominio.com
```

Quando você faz `git push origin main`, o app atualiza automaticamente.

### **Opção 2: Dois apps (dev e prod)**

```
App 1: bardoAi-Dev
Branch: dev
URL: dev.seu-dominio.com

App 2: bardoAi-Prod
Branch: main
URL: seu-dominio.com
```

Você pode testar em dev antes de fazer merge para main!

---

## 🆘 Resolução de Problemas

### **Conflito ao fazer merge**

```bash
git checkout main
git merge dev

# Se houver conflito:
# 1. Abra os arquivos marcados com conflito
# 2. Resolva manualmente (escolha qual código manter)
# 3. Depois:
git add .
git commit -m "Resolvido conflito de merge"
git push origin main
```

### **Cancelar merge**

```bash
git merge --abort
```

### **Desfazer último commit (sem perder alterações)**

```bash
git reset --soft HEAD~1
```

---

## 📊 Resumo Visual

```
VOCÊ (local)                  GITHUB                 EASYPANEL
    |                            |                        |
    |-- git checkout dev ------->|                        |
    |-- git commit + push ------>| branch dev             |
    |                            |                        |
    |   [Testes OK!]             |                        |
    |                            |                        |
    |-- git checkout main ------>|                        |
    |-- git merge dev ---------->|                        |
    |-- git push origin main --->| branch main            |
    |                            |                        |
    |                            |--[webhook]------------>|
    |                            |                   [Deploy!]
    |                            |                   [App atualizado]
```

---

## 🎯 Seu Workflow a partir de agora:

1. **Desenvolvimento diário:**
   ```bash
   git checkout dev
   # ... código, teste, commit, push ...
   ```

2. **Quando funcionar:**
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

3. **EasyPanel faz deploy automático da main!** 🚀

---

**Agora você tem um workflow profissional de Git! 🎉**

