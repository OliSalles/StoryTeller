# 📚 Base de Conhecimento e Multi-Tenant

## Visão Geral

O StoryTeller foi evoluído para ser uma **fonte de verdade de conhecimento da empresa**, combinando:

1. **Multi-tenant**: Empresas (companies) e times (teams) para organização
2. **Base de Conhecimento RAG**: Ingestão de código, documentos e stories
3. **Chat com Conhecimento**: Perguntas sobre o negócio com IA + RAG
4. **Análise de Stories**: Detecta duplicatas, reuso e convergências

---

## 🏢 Estrutura Multi-Tenant

### Companies (Empresas)

Cada empresa é isolada e possui:
- Membros com roles: `owner`, `admin`, `member`
- Times (teams) para organizar membros
- Base de conhecimento própria
- Stories e features associadas

### Teams (Times)

Times dentro de uma empresa para:
- Organizar membros por área/projeto
- Associar stories e conhecimento a times específicos
- Identificar convergências entre times

---

## 📥 Ingestão de Conhecimento

### Tipos de Fontes Suportadas

#### 1. Código-Fonte (Code Repository)

**Upload ZIP:**
- Suporta arquivos: `.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.cs`, `.go`, `.rb`, `.php`, `.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.xml`, `.html`, `.css`, `.scss`, `.sql`
- Extrai e processa cada arquivo
- Cria chunks de ~1000 caracteres com overlap de 200

**Futuro - GitHub Integration:**
- Conectar repositório via URL
- Sincronização automática

#### 2. Documentos

**Formatos suportados (MVP):**
- `.txt` - Texto simples
- `.md` - Markdown

**Formatos futuros:**
- `.pdf` - Requer `pdf-parse`
- `.docx` - Requer `mammoth`

#### 3. User Stories Existentes

- Importa todas as stories criadas pelos membros da empresa
- Inclui título, descrição, critérios de aceitação e tasks
- Associa ao time quando disponível

### Processo de Ingestão

1. **Upload/Criação** da fonte de conhecimento
2. **Chunking**: Divide texto em pedaços de ~1000 caracteres
3. **Embeddings**: Gera vetores usando OpenAI (`text-embedding-3-small`)
4. **Armazenamento**: Salva chunks e embeddings no PostgreSQL com pgvector
5. **Status**: `pending` → `processing` → `completed` / `failed`

---

## 💬 Knowledge Chat

### Como Funciona

1. Usuário faz uma pergunta
2. Gera embedding da pergunta
3. Busca chunks similares usando pgvector (cosine similarity)
4. Monta contexto com os top 5 chunks mais relevantes
5. Envia para LLM com contexto + histórico do chat
6. LLM responde usando APENAS as informações da base de conhecimento
7. Retorna resposta com citações das fontes

### Exemplo de Uso

```typescript
// Criar sessão de chat
const { sessionId } = await trpc.knowledgeChat.createSession.mutate({
  title: "Dúvidas sobre arquitetura"
});

// Enviar mensagem
const { response, citations } = await trpc.knowledgeChat.sendMessage.mutate({
  sessionId,
  message: "Como funciona a autenticação no sistema?"
});

// Response: "A autenticação usa JWT com..."
// Citations: [
//   { index: 1, sourceName: "auth.ts", excerpt: "...", similarity: 92 }
// ]
```

---

## 🔍 Análise de Stories

### Tipos de Similaridade

#### 1. **DUPLICATE** (Duplicata)
- Similaridade > 85%
- Story essencialmente idêntica
- **Ação**: Evitar duplicação

#### 2. **REUSABLE** (Reutilizável)
- Similaridade 60-85%
- Código/funcionalidade similar existe
- **Ação**: Reutilizar código existente

#### 3. **CONVERGENT** (Convergente)
- Similaridade < 60% mas relevante
- Sobreposição com outro time/área
- **Ação**: Alinhar com outro time

### Exemplo de Análise

```typescript
const result = await trpc.storyAnalysis.analyzeStory.mutate({
  title: "Como usuário, quero fazer login com Google",
  description: "Permitir autenticação via OAuth do Google..."
});

// Result:
{
  status: "reusable",
  message: "Encontramos código ou funcionalidades similares...",
  similarities: [
    {
      sourceName: "oauth.ts",
      type: "reusable",
      similarityScore: 78,
      explanation: "Já existe implementação de OAuth genérica que...",
      relatedTeamId: 3
    }
  ]
}
```

---

## 🗄️ Schema do Banco de Dados

### Tabelas Principais

**Multi-Tenant:**
- `companies` - Empresas
- `company_members` - Membros de empresas
- `teams` - Times
- `team_members` - Membros de times

**Knowledge Base:**
- `knowledge_sources` - Fontes de conhecimento
- `knowledge_chunks` - Chunks de texto
- `knowledge_embeddings` - Vetores (pgvector)
- `story_similarities` - Análises de similaridade
- `knowledge_chat_sessions` - Sessões de chat
- `knowledge_chat_messages` - Mensagens do chat

### Índices Importantes

```sql
-- Índice vetorial para busca de similaridade
CREATE INDEX idx_knowledge_embeddings_vector_cosine 
  ON knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione ao `.env.local`:

```bash
# OpenAI para LLM e Embeddings
OPENAI_API_KEY=sk-proj-...

# Modelo de embeddings (padrão: text-embedding-3-small)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Diretório para uploads
UPLOAD_DIR=/tmp/storyteller-uploads
```

### 2. Habilitar pgvector no PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Executar Migração

```bash
# Executar migração SQL
node scripts/run-migration.js drizzle/migrations/001_add_knowledge_base_and_multitenant.sql
```

Ou usar Drizzle push (irá criar todas as tabelas):

```bash
npm run db:push
```

### 4. Instalar Dependências

```bash
pnpm install
```

---

## 🚀 Como Usar

### 1. Criar uma Empresa

```typescript
const { companyId } = await trpc.companies.create.mutate({
  name: "Minha Empresa",
  slug: "minha-empresa"
});
```

### 2. Criar Times

```typescript
const { teamId } = await trpc.teams.create.mutate({
  name: "Backend Team",
  description: "Time responsável pela API"
});
```

### 3. Ingerir Conhecimento

**Upload de código (ZIP):**

```typescript
// 1. Criar fonte
const { sourceId } = await trpc.knowledge.createSource.mutate({
  name: "Código do Backend",
  type: "code_repo"
});

// 2. Upload do arquivo
await trpc.knowledge.uploadFile.mutate({
  sourceId,
  fileName: "backend.zip",
  fileContent: base64String
});

// 3. Processar
await trpc.knowledge.processSource.mutate({ sourceId });
```

**Ingerir stories existentes:**

```typescript
await trpc.knowledge.ingestStories.mutate({
  name: "User Stories Existentes",
  teamId: 1 // opcional
});
```

### 4. Chat com Conhecimento

```typescript
// Criar sessão
const { sessionId } = await trpc.knowledgeChat.createSession.mutate({});

// Perguntar
const { response, citations } = await trpc.knowledgeChat.sendMessage.mutate({
  sessionId,
  message: "Como funciona o sistema de pagamentos?"
});
```

### 5. Analisar Story

```typescript
const analysis = await trpc.storyAnalysis.analyzeStory.mutate({
  title: "Nova feature de pagamento",
  description: "Implementar pagamento com cartão..."
});

if (analysis.status === 'duplicate') {
  console.log('ATENÇÃO: Story duplicada!');
}
```

---

## 📊 Monitoramento

### Status de Ingestão

```typescript
// Listar fontes
const sources = await trpc.knowledge.listSources.query();

sources.forEach(source => {
  console.log(`${source.name}: ${source.status}`);
  console.log(`  Chunks: ${source.processedChunks}/${source.totalChunks}`);
});
```

### Re-indexar Fonte

```typescript
await trpc.knowledge.reindexSource.mutate({ sourceId: 1 });
```

---

## 🔒 Isolamento Multi-Tenant

### Automático

Todos os endpoints que usam `tenantProcedure` automaticamente:
- Obtêm o `companyId` do contexto do usuário
- Filtram queries por `companyId`
- Garantem isolamento de dados

### Guards

Para ações administrativas:

```typescript
import { guardCompanyAdmin, guardCompanyOwner } from './_core/tenant-guard';

// Verificar se é admin
await guardCompanyAdmin(userId, companyId);

// Verificar se é owner
await guardCompanyOwner(userId, companyId);
```

---

## 🧪 Testes

### Teste de Isolamento

```typescript
test('Users cannot access other company data', async () => {
  // Criar 2 empresas
  const company1 = await createCompany('Company 1');
  const company2 = await createCompany('Company 2');
  
  // Tentar acessar company2 como membro de company1
  await expect(
    getCompanyData(company2.id, userFromCompany1.id)
  ).rejects.toThrow('Forbidden');
});
```

### Teste de Similaridade

```typescript
test('Duplicate stories are detected', async () => {
  // Ingerir story existente
  await ingestStory('Login com Google');
  
  // Analisar story similar
  const analysis = await analyzeStory('Login com conta Google');
  
  expect(analysis.status).toBe('duplicate');
  expect(analysis.similarities[0].similarityScore).toBeGreaterThan(85);
});
```

---

## 🔮 Melhorias Futuras

### Curto Prazo

- [ ] Upload de PDF e DOCX
- [ ] GitHub integration (conectar repo automaticamente)
- [ ] UI completa para gerenciamento de knowledge base
- [ ] Filtros avançados de busca

### Médio Prazo

- [ ] Sincronização automática de repos conectados
- [ ] Suporte para múltiplas companies por usuário (switch)
- [ ] Webhooks para notificar quando encontrar duplicatas
- [ ] Dashboard de análises e insights

### Longo Prazo

- [ ] Sugestões automáticas de reuso ao criar stories
- [ ] Análise de dependências entre stories
- [ ] Geração automática de documentação técnica
- [ ] Integração com Jira/Azure DevOps para análise de backlog

---

## ❓ Troubleshooting

### Erro: "pgvector extension not found"

```bash
# Instalar pgvector no PostgreSQL
# Ubuntu/Debian:
sudo apt install postgresql-[version]-pgvector

# Mac:
brew install pgvector

# Docker:
# Use imagem: ankane/pgvector
```

### Erro: "OpenAI API key not configured"

Configure `OPENAI_API_KEY` no `.env.local` ou na configuração de LLM (admin).

### Embeddings muito lentos

- Use `text-embedding-3-small` (mais rápido)
- Reduza `CHUNK_SIZE` para processar menos chunks
- Processe uploads em background (já implementado)

### Alto consumo de tokens

- Ajuste `CHUNK_SIZE` e `CHUNK_OVERLAP`
- Reduza número de chunks retornados no RAG (padrão: 5)
- Filtre fontes irrelevantes antes de ingerir

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs: `docker-compose logs -f postgres`
2. Consulte a documentação de APIs nos routers
3. Execute testes de isolamento: `npm run test`

**Boa sorte com a base de conhecimento! 🚀**
