import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { generateEmbedding } from "./_core/ingestion";
import { invokeLLM } from "./_core/llm";

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
      
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(input.message);
      
      // Search for similar chunks
      const similarChunks = await knowledgeDb.searchSimilarEmbeddings(
        queryEmbedding,
        ctx.tenant.companyId,
        5, // Top 5 matches
        0.7 // 70% similarity threshold
      );
      
      if (similarChunks.length === 0) {
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
      
      // Build context from similar chunks
      const context = similarChunks
        .map((chunk, i) => `[${i + 1}] Fonte: ${chunk.source_name}\n${chunk.content}`)
        .join('\n\n---\n\n');
      
      // Get chat history for context
      const previousMessages = await knowledgeDb.getKnowledgeChatMessagesBySessionId(input.sessionId);
      const recentMessages = previousMessages.slice(-6); // Last 6 messages (3 exchanges)
      
      // Create prompt for LLM
      const systemPrompt = `Você é um assistente especializado em responder perguntas sobre a empresa usando a base de conhecimento disponível.

IMPORTANTE:
- Responda em português brasileiro
- Use APENAS as informações fornecidas no contexto abaixo
- Se a resposta não estiver no contexto, diga que não encontrou a informação
- Cite as fontes usando os números entre colchetes [1], [2], etc.
- Seja objetivo e profissional
- Use "para" (nunca "pra") e evite travessões

CONTEXTO DA BASE DE CONHECIMENTO:

${context}`;
      
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
      
      // Prepare citations
      const citations = similarChunks.map((chunk, i) => ({
        index: i + 1,
        sourceId: chunk.source_id,
        sourceName: chunk.source_name,
        excerpt: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
        similarity: Math.round(chunk.similarity * 100),
      }));
      
      // Save assistant response with citations
      await knowledgeDb.createKnowledgeChatMessage({
        sessionId: input.sessionId,
        role: 'assistant',
        content: responseContent,
        citations: citations as any,
      });
      
      // Update session title if it's the first exchange
      if (previousMessages.length === 0 && !session.title) {
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
