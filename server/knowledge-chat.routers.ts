import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { generateEmbedding } from "./_core/ingestion";
import { invokeLLM } from "./_core/llm";
import {
  extractKeyTerms,
  normalizeText,
  reciprocalRankFusion,
  selectDiverse,
  extractImageUrls,
} from "./knowledge-retrieval";

const SOURCE_TYPE_NAMES: Record<string, string> = {
  code_repo: "código",
  document: "documento",
  story: "user story",
  miro_board: "Miro",
};

/**
 * Pede para a IA extrair termos de busca e sinônimos da pergunta.
 * Se falhar, segue só com a extração local de termos.
 */
async function planRetrieval(
  question: string,
  history: string,
  userId: number
): Promise<{ terms: string[]; searchQuery: string }> {
  try {
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Você prepara buscas numa base de conhecimento empresarial em português. " +
            "Responda SOMENTE com um JSON no formato {\"terms\": [\"...\"], \"searchQuery\": \"...\"}. " +
            "terms: de 3 a 8 termos curtos (1 a 3 palavras) para busca textual, incluindo o termo principal exatamente como o usuário escreveu, " +
            "variações (singular/plural), siglas e sinônimos de negócio. searchQuery: a pergunta reescrita de forma completa e autocontida, " +
            "resolvendo referências ao histórico.",
        },
        {
          role: "user",
          content: `${history ? `Histórico recente:\n${history}\n\n` : ""}Pergunta: ${question}`,
        },
      ],
      userId,
      operation: "knowledge_chat_query",
    });
    const raw = res.choices[0]?.message?.content;
    const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { terms: [], searchQuery: question };
    const parsed = JSON.parse(match[0]);
    const terms = Array.isArray(parsed.terms)
      ? parsed.terms.filter((t: unknown) => typeof t === "string" && t.trim().length >= 3).slice(0, 8)
      : [];
    const searchQuery = typeof parsed.searchQuery === "string" && parsed.searchQuery.trim() ? parsed.searchQuery.trim() : question;
    return { terms, searchQuery };
  } catch (err) {
    console.warn("[KnowledgeChat] planRetrieval falhou, seguindo sem reescrita:", err);
    return { terms: [], searchQuery: question };
  }
}

function buildAnswerPrompt(context: string, imageUrls: string[]): string {
  const images = imageUrls.length
    ? `\n\nIMAGENS QUE EXISTEM NA BASE (use apenas estas, se ajudarem a explicar, no formato ![descrição](url)):\n${imageUrls.map((u) => `- ${u}`).join("\n")}`
    : "";
  return `Você é um especialista no negócio e nos sistemas desta empresa. Sua missão é explicar o assunto perguntado de forma clara, completa e didática, como um consultor experiente explicaria para um colega.

COMO RESPONDER:
- Responda em português brasileiro, com linguagem simples e profissional.
- Use "para" (nunca "pra") e não use travessões.
- Baseie a resposta SOMENTE no contexto abaixo, que reúne trechos de várias fontes da base. Junte e sintetize as informações de todas as fontes relevantes, sem copiar trechos inteiros e sem repetir a mesma ideia.
- Se as fontes trouxerem visões diferentes ou complementares, explique cada uma e deixe claro de onde vem.
- Cite as fontes ao longo do texto com os números entre colchetes, por exemplo [1] ou [2][5].
- Só diga que não encontrou a informação se NENHUM trecho do contexto tiver relação com a pergunta. Se houver informação parcial, explique o que existe e aponte o que não está documentado.

FORMATO (markdown):
1. Comece com um resumo curto de 2 a 3 frases respondendo direto o que foi perguntado.
2. Depois organize em seções com títulos (## ou ###), por exemplo: o que é, para que serve, regras principais, como funciona passo a passo, quem participa, exceções e pontos de atenção. Use só as seções que fizerem sentido.
3. Use listas e passos numerados para deixar a leitura fácil. Use tabelas quando comparar itens.
4. Quando o assunto for um processo, fluxo, jornada, integração ou sequência de etapas, inclua um diagrama Mermaid em um bloco \`\`\`mermaid usando "flowchart TD". Regras do diagrama: ids simples sem espaço (A, B, C1), textos dos nós entre aspas duplas, por exemplo A["Pedido criado"] --> B{"Aprovado?"}, sem parênteses, dois pontos ou ponto e vírgula fora das aspas, no máximo 15 nós.
5. Termine com uma seção "### Fontes" listando, sem repetir, os nomes das fontes usadas com seus números.${images}

CONTEXTO DA BASE DE CONHECIMENTO:

${context}`;
}

export const knowledgeChatRouter = router({
  /**
   * Create a new chat session
   */
  createSession: tenantProcedure
    .input(
      z.object({
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sessionId = await knowledgeDb.createKnowledgeChatSession({
        companyId: ctx.tenant.companyId,
        userId: ctx.user.id,
        title: input.title,
      });
      
      return { sessionId };
    }),

  /**
   * List user's chat sessions
   */
  listSessions: tenantProcedure.query(async ({ ctx }) => {
    return knowledgeDb.getKnowledgeChatSessionsByUserId(ctx.user.id, ctx.tenant.companyId);
  }),

  /**
   * Get chat session with messages
   */
  getSession: tenantProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const session = await knowledgeDb.getKnowledgeChatSessionById(input.sessionId);
      
      if (!session || session.companyId !== ctx.tenant.companyId || session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão de chat não encontrada",
        });
      }
      
      const messages = await knowledgeDb.getKnowledgeChatMessagesBySessionId(input.sessionId);
      
      return { ...session, messages };
    }),

  /**
   * Send a message in a chat session (RAG query)
   */
  sendMessage: tenantProcedure
    .input(
      z.object({
        sessionId: z.number(),
        message: z.string().min(1, "Mensagem não pode estar vazia"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await knowledgeDb.getKnowledgeChatSessionById(input.sessionId);
      
      if (!session || session.companyId !== ctx.tenant.companyId || session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão de chat não encontrada",
        });
      }
      
      // Save user message
      await knowledgeDb.createKnowledgeChatMessage({
        sessionId: input.sessionId,
        role: 'user',
        content: input.message,
        citations: null,
      });
      
      // Get chat history for context (inclui a mensagem que acabou de ser salva)
      const previousMessages = await knowledgeDb.getKnowledgeChatMessagesBySessionId(input.sessionId);
      const recentMessages = previousMessages.slice(-7); // Últimas trocas + pergunta atual

      // 1) Reescrita da pergunta com IA: termos chave e sinônimos para a busca
      const historyText = recentMessages
        .slice(0, -1)
        .slice(-4)
        .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content.substring(0, 400)}`)
        .join("\n");
      const plan = await planRetrieval(input.message, historyText, ctx.user.id);

      // 2) Busca híbrida: vetorial (significado) + palavra chave (texto exato, sem acento)
      const keyTerms = Array.from(
        new Set([...extractKeyTerms(input.message), ...plan.terms.map(normalizeText)])
      ).filter((t) => t.length >= 3).slice(0, 14);

      const semanticQuery = plan.searchQuery && plan.searchQuery !== input.message
        ? `${input.message}\n${plan.searchQuery}`
        : input.message;
      const queryEmbedding = await generateEmbedding(semanticQuery);

      const [vectorChunks, keywordChunks] = await Promise.all([
        knowledgeDb.searchVectorChunks(queryEmbedding, ctx.tenant.companyId, 24).catch((err) => {
          console.error("[KnowledgeChat] vector search failed:", err);
          return [] as knowledgeDb.HybridChunkRow[];
        }),
        knowledgeDb.searchKeywordChunks(keyTerms, ctx.tenant.companyId, 30).catch((err) => {
          console.error("[KnowledgeChat] keyword search failed:", err);
          return [] as knowledgeDb.HybridChunkRow[];
        }),
      ]);

      const ranked = reciprocalRankFusion([
        { kind: "vector", items: vectorChunks, weight: 1 },
        { kind: "keyword", items: keywordChunks, weight: 1.2 },
      ]);
      const finalChunks = selectDiverse(ranked, { maxChunks: 14, maxPerSource: 4, tokenBudget: 9000 });

      console.log(
        `[KnowledgeChat] terms=${JSON.stringify(keyTerms)} vector=${vectorChunks.length} keyword=${keywordChunks.length} final=${finalChunks.length} sources=${new Set(finalChunks.map((c) => c.source_id)).size}`
      );

      if (finalChunks.length === 0) {
        // No relevant knowledge found
        const responseContent = "Desculpe, não encontrei informações relevantes na base de conhecimento da empresa para responder sua pergunta. Tente reformular ou adicionar mais contexto.";
        
        await knowledgeDb.createKnowledgeChatMessage({
          sessionId: input.sessionId,
          role: 'assistant',
          content: responseContent,
          citations: null,
        });
        
        return { response: responseContent, citations: [] };
      }

      // 3) Contexto organizado por trecho, com nome e tipo da fonte
      const context = finalChunks
        .map((chunk, i) => {
          const type = chunk.source_type ? ` (${SOURCE_TYPE_NAMES[chunk.source_type] ?? chunk.source_type})` : "";
          const path = chunk.metadata?.filePath || chunk.metadata?.path || chunk.metadata?.fileName;
          return `[${i + 1}] Fonte: ${chunk.source_name}${type}${path ? ` | ${path}` : ""}\n${chunk.content}`;
        })
        .join("\n\n---\n\n");

      const imageUrls = extractImageUrls(finalChunks);

      const systemPrompt = buildAnswerPrompt(context, imageUrls);

      // Build message history
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];
      
      // Call LLM
      const llmResponse = await invokeLLM({
        messages,
        userId: ctx.user.id,
        operation: 'knowledge_chat',
      });
      
      const responseContent = typeof llmResponse.choices[0]?.message?.content === 'string'
        ? llmResponse.choices[0].message.content
        : JSON.stringify(llmResponse.choices[0]?.message?.content);
      
      // Prepare citations (uma por trecho, com a forma como foi encontrado)
      const citations = finalChunks.map((chunk, i) => ({
        index: i + 1,
        sourceId: chunk.source_id,
        sourceName: chunk.source_name,
        sourceType: chunk.source_type,
        excerpt: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
        similarity: Math.round((chunk.similarity || 0) * 100),
        matchedBy: chunk.matchedBy,
      }));
      
      // Save assistant response with citations
      await knowledgeDb.createKnowledgeChatMessage({
        sessionId: input.sessionId,
        role: 'assistant',
        content: responseContent,
        citations: citations as any,
      });
      
      // Update session title if it's the first exchange
      if (previousMessages.length <= 1 && !session.title) {
        const title = input.message.substring(0, 60) + (input.message.length > 60 ? '...' : '');
        await knowledgeDb.updateKnowledgeChatSession(input.sessionId, { title });
      }
      
      return { response: responseContent, citations };
    }),

  /**
   * Delete a chat session
   */
  deleteSession: tenantProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await knowledgeDb.getKnowledgeChatSessionById(input.sessionId);
      
      if (!session || session.companyId !== ctx.tenant.companyId || session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão de chat não encontrada",
        });
      }
      
      await knowledgeDb.deleteKnowledgeChatSession(input.sessionId);
      return { success: true };
    }),
});
