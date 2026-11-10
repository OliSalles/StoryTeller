# 🎨 Integração com Miro

## Visão Geral

O StoryTeller suporta importação de boards do Miro como fonte de conhecimento. Isso é especialmente útil para empresas que fazem brainstorming e planejamento no Miro e querem centralizar esse conhecimento na base de RAG.

---

## 🔧 Configuração

### 1. Criar App no Miro

1. Acesse [Miro Developers](https://developers.miro.com/)
2. Faça login com sua conta Miro
3. Clique em **"Create new app"**
4. Preencha:
   - **App name**: StoryTeller Knowledge Base
   - **Description**: Importa boards do Miro para base de conhecimento
   - **Redirect URL**: `http://localhost:3000` (não usado, mas obrigatório)

### 2. Configurar Permissões

No painel do app:

1. Vá em **Permissions**
2. Habilite: `boards:read`
3. Salve as alterações

### 3. Obter Access Token

Existem duas opções:

#### Opção A: Access Token de Desenvolvimento (Recomendado para MVP)

1. No painel do app, vá em **"Install app & get OAuth token"**
2. Clique em **"Install app to get the access token"**
3. Selecione um team do Miro
4. Copie o **Access Token** gerado

#### Opção B: OAuth Flow (Para Produção)

Para produção, implemente OAuth 2.0:
- Redirect users para autorização
- Receba callback com code
- Exchange code por token
- Armazene token por user/company

**Nota**: O MVP usa access token direto (Opção A).

### 4. Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```bash
MIRO_ACCESS_TOKEN=seu-token-aqui
```

---

## 📥 Como Usar

### 1. Via Interface Web

1. Acesse **Base de Conhecimento** → **Upload**
2. Clique na aba **"Importar Miro Board"**
3. Cole a URL do board: `https://miro.com/app/board/uXjVKag..../`
4. (Opcional) Defina um nome personalizado
5. Clique em **"Importar do Miro"**

### 2. Via API

```typescript
const result = await trpc.knowledge.importMiroBoard.mutate({
  boardUrl: "https://miro.com/app/board/uXjVKag..../",
  name: "Board de Planejamento Sprint 10",
  teamId: 1, // opcional
});

console.log(result.boardId); // ID do board extraído
console.log(result.sourceId); // ID da fonte criada
```

---

## 🎯 O que é Importado

### Items Suportados

| Tipo | Conteúdo Extraído | Notas |
|------|------------------|-------|
| **Sticky Notes** | Texto da nota | Cor e tags são metadata |
| **Text Items** | Texto livre | Formatação é preservada |
| **Cards** | Título + Descrição | Ambos os campos |
| **Shapes** | Texto dentro do shape | Formas com texto |
| **App Cards** | Título do embed | Links, arquivos, etc. |

### Estrutura Preservada

- **Frames**: Items são agrupados por frame
- **Context**: Nome do frame é usado como título de seção
- **Hierarchy**: Mantém relação parent-child

### Exemplo de Output

```markdown
# Backlog Sprint 10

[sticky_note] Como usuário, quero fazer login com Google

[card] Implementar OAuth
Integrar com Google OAuth 2.0
Armazenar tokens de forma segura

[text] Prioridade: Alta

# Done

[sticky_note] Migração do banco completa
```

---

## 🔄 Re-sync

Para atualizar um board já importado:

1. Vá em **Fontes** na Base de Conhecimento
2. Encontre o board do Miro
3. Clique no botão **Re-indexar** (ícone de seta circular)

Isso irá:
- Deletar chunks e embeddings antigos
- Re-buscar items do Miro via API
- Re-processar e gerar novos embeddings

---

## 🔒 Segurança e Privacidade

### Access Token

- Token tem acesso a **todos os boards** do team onde foi instalado
- Armazene de forma segura (variável de ambiente, nunca no código)
- Para produção, use OAuth por usuário para limitar escopo

### Isolamento Multi-Tenant

- Cada company vê apenas seus próprios boards importados
- Embeddings são isolados por `companyId`
- Queries RAG respeitam tenant isolation

### Dados Sensíveis

⚠️ **IMPORTANTE**: 
- Boards do Miro podem conter informações sensíveis
- Revise o conteúdo antes de importar
- Considere criar boards específicos para RAG
- Use teams/workspaces separados para dados sensíveis

---

## 🐛 Troubleshooting

### Erro: "MIRO_ACCESS_TOKEN não configurado"

**Solução**: Adicione o token no `.env.local` e reinicie o servidor.

```bash
MIRO_ACCESS_TOKEN=seu-token-aqui
npm run dev
```

### Erro: "Miro API error: 401"

**Causas possíveis**:
1. Token inválido ou expirado
2. Token não tem permissão `boards:read`
3. Board pertence a outro team

**Solução**: 
- Verifique o token no painel do Miro
- Re-gere o token se necessário
- Confirme que o board está no team correto

### Erro: "URL do Miro inválida"

**Formato correto**:
```
https://miro.com/app/board/uXjVKag..../
```

**Formatos aceitos**:
- `https://miro.com/app/board/<id>/`
- `https://miro.com/app/board/<id>`
- `https://miro.com/board/<id>/`

### Board Vazio Após Importação

**Possíveis causas**:
1. Board não tem items com texto
2. Items estão em formatos não suportados (imagens, videos)
3. Erro na API do Miro

**Solução**:
- Verifique logs do servidor para erros
- Confirme que o board tem sticky notes, cards ou text items
- Tente re-indexar

---

## 📊 Limitações e Roadmap

### Limitações Atuais (MVP)

- ❌ Não suporta OAuth por usuário (apenas access token global)
- ❌ Não preserva formatação rich text
- ❌ Não importa imagens ou anexos
- ❌ Não captura relações/connectors entre items
- ❌ Não suporta boards privados de usuários individuais
- ❌ Limite de rate da API não é tratado (padrão: 100 req/min)

### Roadmap Futuro

- [ ] OAuth 2.0 flow completo por usuário
- [ ] Sync automático (webhooks do Miro)
- [ ] Importação de imagens com OCR
- [ ] Captura de relações entre items
- [ ] Suporte para templates do Miro
- [ ] Rate limiting e retry logic
- [ ] Filtros de importação (por tag, frame, etc)

---

## 🎓 Caso de Uso: Empresa Ticket

A primeira empresa a usar essa feature será a **Ticket**, com um board de planejamento no Miro.

### Setup para Ticket

1. Owner da Ticket cria conta/company no StoryTeller
2. Owner adiciona `MIRO_ACCESS_TOKEN` com acesso ao workspace da Ticket
3. Owner importa board principal: `https://miro.com/app/board/[id-do-board-ticket]/`
4. Sistema processa:
   - Sticky notes de backlog
   - Cards de features planejadas
   - Documentação em text items
5. Time da Ticket pode fazer perguntas no Knowledge Chat sobre o planejamento

### Manutenção

- **Semanal**: Re-sync manual do board após planning
- **Futuro**: Webhook automático quando board é atualizado

---

## 📞 Suporte

Para issues com a integração do Miro:

1. Verifique logs do servidor: `docker-compose logs -f`
2. Teste token manualmente: `curl -H "Authorization: Bearer $TOKEN" https://api.miro.com/v2/boards`
3. Consulte [Miro API Docs](https://developers.miro.com/docs/rest-api-reference)

**Happy boarding! 🎨**
