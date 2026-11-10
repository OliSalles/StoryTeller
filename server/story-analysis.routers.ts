import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { generateEmbedding } from "./_core/ingestion";
import { invokeLLM } from "./_core/llm";

export const storyAnalysisRouter = router({
  /**
   * Analyze a user story for duplicates, reusability, and convergence
   */
  analyzeStory: tenantProcedure
    .input(
      z.object({
        storyId: z.number().optional(), // Optional for existing stories
        title: z.string().min(1, "Título é obrigatório"),
        description: z.string().min(1, "Descrição é obrigatória"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log(`[Story Analysis] Analyzing story: ${input.title}`);
      
      // Get company thresholds
      const company = await knowledgeDb.getCompanyById(ctx.tenant.companyId);
      const thresholds = {
        duplicate: company?.similarityThresholdDuplicate || 85,
        reusable: company?.similarityThresholdReusable || 60,
        minimum: company?.similarityThresholdMinimum || 40,
      };
      
      console.log(`[Story Analysis] Using thresholds: duplicate=${thresholds.duplicate}%, reusable=${thresholds.reusable}%, minimum=${thresholds.minimum}%`);
      
      // Create combined text for embedding
      const storyText = `${input.title}\n\n${input.description}`;
      
      // Generate embedding
      const embedding = await generateEmbedding(storyText);
      
      // Search for similar content in knowledge base
      // Use minimum threshold converted to 0-1 scale
      const similarChunks = await knowledgeDb.searchSimilarEmbeddings(
        embedding,
        ctx.tenant.companyId,
        10, // Top 10 matches
        thresholds.minimum / 100 // Convert percentage to 0-1 scale
      );
      
      console.log(`[Story Analysis] Found ${similarChunks.length} similar chunks`);
      
      if (similarChunks.length === 0) {
        return {
          status: 'new',
          message: 'Esta story parece ser completamente nova. Não foram encontrados itens similares na base de conhecimento.',
          similarities: [],
        };
      }
      
      // Group similar chunks by source and analyze with AI
      const chunksBySource = similarChunks.reduce((acc, chunk) => {
        if (!acc[chunk.source_id]) {
          acc[chunk.source_id] = {
            sourceId: chunk.source_id,
            sourceName: chunk.source_name,
            chunks: [],
            maxSimilarity: 0,
          };
        }
        acc[chunk.source_id].chunks.push(chunk);
        acc[chunk.source_id].maxSimilarity = Math.max(
          acc[chunk.source_id].maxSimilarity,
          chunk.similarity
        );
        return acc;
      }, {} as Record<number, { sourceId: number; sourceName: string; chunks: typeof similarChunks; maxSimilarity: number }>);
      
      // Analyze each similar source with LLM
      const analyses: Array<{
        sourceId: number;
        sourceName: string;
        type: 'duplicate' | 'reusable' | 'convergent';
        similarityScore: number;
        explanation: string;
        relatedTeamId?: number;
      }> = [];
      
      for (const source of Object.values(chunksBySource)) {
        // Get team info from metadata if available
        const teamId = source.chunks[0]?.metadata?.teamId || null;
        
        // Build context from chunks
        const context = source.chunks
          .map(c => c.content)
          .join('\n\n');
        
        const analysisPrompt = `Você é um especialista em análise de user stories. Analise a similaridade entre duas stories/features.

STORY NOVA:
Título: ${input.title}
Descrição: ${input.description}

ITEM EXISTENTE NA BASE DE CONHECIMENTO:
Fonte: ${source.sourceName}
${context}

THRESHOLDS CONFIGURADOS PELA EMPRESA:
- DUPLICATE: >${thresholds.duplicate}% de similaridade
- REUSABLE: ${thresholds.reusable}%-${thresholds.duplicate}% de similaridade  
- CONVERGENT: ${thresholds.minimum}%-${thresholds.reusable}% de similaridade
- Abaixo de ${thresholds.minimum}%: não relacionado (ignorar)

INSTRUÇÕES:
1. Avalie a similaridade semântica e funcional (não apenas keywords)
2. Classifique usando os thresholds acima
3. Se o item está em outro time, MENCIONE EXPLICITAMENTE no explanation
4. Explique CONCRETAMENTE o que pode ser reaproveitado ou por que é duplicata

Responda em JSON:
{
  "type": "duplicate" | "reusable" | "convergent",
  "similarityScore": 0-100,
  "explanation": "Explicação breve e objetiva em português brasileiro sobre a similaridade e o que pode ser reaproveitado. Use 'para' (não 'pra') e evite travessões. Se for outro time, mencione isso claramente.",
  "confidence": "high" | "medium" | "low"
}`;
        
        try {
          const llmResponse = await invokeLLM({
            messages: [
              { role: 'user', content: analysisPrompt },
            ],
            userId: ctx.user.id,
            operation: 'story_analysis',
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'story_analysis',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['duplicate', 'reusable', 'convergent'],
                    },
                    similarityScore: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 100,
                    },
                    explanation: {
                      type: 'string',
                    },
                    confidence: {
                      type: 'string',
                      enum: ['high', 'medium', 'low'],
                    },
                  },
                  required: ['type', 'similarityScore', 'explanation', 'confidence'],
                  additionalProperties: false,
                },
              },
            },
          });
          
          const content = llmResponse.choices[0]?.message?.content;
          const analysis = typeof content === 'string' ? JSON.parse(content) : content;
          
          // Validate that similarity score meets minimum threshold
          if (analysis.similarityScore < thresholds.minimum) {
            console.log(`[Story Analysis] Skipping source ${source.sourceId} - below minimum threshold (${analysis.similarityScore}% < ${thresholds.minimum}%)`);
            continue; // Skip items below minimum threshold
          }
          
          // Get team info for cross-team detection
          const isFromOtherTeam = teamId && teamId !== (input as any).teamId;
          
          analyses.push({
            sourceId: source.sourceId,
            sourceName: source.sourceName,
            type: analysis.type,
            similarityScore: analysis.similarityScore,
            explanation: analysis.explanation,
            confidence: analysis.confidence,
            relatedTeamId: teamId,
            isCrossTeam: isFromOtherTeam || false,
          });
          
          // Save similarity analysis to database
          if (input.storyId) {
            await knowledgeDb.createStorySimilarity({
              companyId: ctx.tenant.companyId,
              storyId: input.storyId,
              storyTitle: input.title,
              storyDescription: input.description,
              relatedType: 'code', // or 'document', 'story' based on source type
              relatedId: source.sourceId,
              relatedTitle: source.sourceName,
              relatedTeamId: teamId,
              similarityType: analysis.type,
              similarityScore: analysis.similarityScore,
              explanation: analysis.explanation,
            });
          }
        } catch (error) {
          console.error(`[Story Analysis] Failed to analyze source ${source.sourceId}:`, error);
        }
      }
      
      // Sort by similarity score
      analyses.sort((a, b) => b.similarityScore - a.similarityScore);
      
      // Determine overall status
      const hasDuplicates = analyses.some(a => a.type === 'duplicate');
      const hasReusable = analyses.some(a => a.type === 'reusable');
      const hasConvergent = analyses.some(a => a.type === 'convergent');
      
      let status = 'new';
      let message = 'Esta story parece ser nova.';
      
      if (hasDuplicates) {
        status = 'duplicate';
        message = 'ATENÇÃO: Encontramos uma ou mais stories/features muito similares que podem ser duplicatas!';
      } else if (hasReusable) {
        status = 'reusable';
        message = 'Encontramos código ou funcionalidades similares que podem ser reutilizadas!';
      } else if (hasConvergent) {
        status = 'convergent';
        message = 'Encontramos itens relacionados em outras áreas/times que podem ter sobreposição.';
      }
      
      console.log(`[Story Analysis] Analysis complete: ${status}, ${analyses.length} similarities found`);
      
      return {
        status,
        message,
        similarities: analyses,
      };
    }),

  /**
   * Get previous analysis results for a story
   */
  getStoryAnalysis: tenantProcedure
    .input(z.object({ storyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const similarities = await knowledgeDb.getStorySimilaritiesByStoryId(input.storyId);
      
      // Filter by company (tenant isolation)
      const filtered = similarities.filter(s => s.companyId === ctx.tenant.companyId);
      
      return { similarities: filtered };
    }),

  /**
   * Get all analysis results for company
   */
  listAnalyses: tenantProcedure.query(async ({ ctx }) => {
    return knowledgeDb.getStorySimilaritiesByCompanyId(ctx.tenant.companyId);
  }),
});
