import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Helper function to clean markdown code blocks from JSON responses
 */
function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  let cleaned = content.trim();
  
  // Remove opening code block
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  
  // Remove closing code block
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  
  return cleaned.trim();
}

/**
 * Features router for AI generation and Jira integration
 */
export const featuresRouter = router({
  updateStory: protectedProcedure
    .input(
      z.object({
        storyId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        storyPoints: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { storyId, ...data } = input;
      await db.updateUserStory(storyId, data);
      return { success: true };
    }),

  refine: protectedProcedure
    .input(
      z.object({
        featureId: z.number(),
        refinementPrompt: z.string().min(10),
        language: z.enum(["pt", "en"]).default("pt"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get existing feature and stories
      const feature = await db.getFeatureById(input.featureId);
      if (!feature) {
        throw new Error("Feature not found");
      }

      const existingStories = await db.getUserStoriesByFeatureId(input.featureId);

      
      const languageInstructions = input.language === "pt" 
        ? "Responda em português brasileiro. Use linguagem clara e profissional."
        : "Respond in English. Use clear and professional language.";

      const systemPrompt = `You are an expert product manager refining an existing feature specification.

${languageInstructions}

Current Feature:
Title: ${feature.title}
Description: ${feature.description}

Existing User Stories:
${existingStories.map((s, i) => `${i + 1}. ${s.title}\n   ${s.description}`).join("\n\n")}

User refinement request: ${input.refinementPrompt}

Your task is to refine and improve the feature based on the user's request. You can:
- Update the feature title and description
- Modify existing user stories
- Add new user stories
- Remove unnecessary stories
- Adjust priorities and story points

Return your response in the following JSON format:
{
  "feature": {
    "title": "Updated feature title",
    "description": "Updated detailed feature description"
  },
  "userStories": [
    {
      "title": "Story title",
      "description": "Story description",
      "priority": "low" | "medium" | "high" | "critical",
      "storyPoints": 1 | 2 | 3 | 5 | 8 | 13 | 21,
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "tasks": [
        {
          "title": "Task title",
          "description": "Technical task description",
          "estimatedHours": 2
        }
      ]
    }
  ]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.refinementPrompt },
        ],

      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("Falha ao gerar resposta da IA. Tente novamente.");
      }
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Resposta da IA vazia. Tente novamente.");
      }

      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const cleanedStr = cleanJsonResponse(contentStr);
      const generated = JSON.parse(cleanedStr);

      // Update feature
      await db.updateFeature(input.featureId, {
        title: generated.feature.title,
        description: generated.feature.description,
      });

      // Delete old stories and criteria
      await db.deleteUserStoriesByFeatureId(input.featureId);

      // Create new user stories and acceptance criteria
      for (let i = 0; i < generated.userStories.length; i++) {
        const story = generated.userStories[i];
        const storyId = await db.createUserStory({
          featureId: input.featureId,
          title: story.title,
          description: story.description,
          priority: story.priority,
          storyPoints: story.storyPoints,
          orderIndex: i,
        });

        if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
          for (let j = 0; j < story.acceptanceCriteria.length; j++) {
            await db.createAcceptanceCriterion({
              userStoryId: storyId,
              criterion: story.acceptanceCriteria[j],
              orderIndex: j,
            });
          }
        }

        // Save tasks
        if (story.tasks && Array.isArray(story.tasks)) {
          for (let j = 0; j < story.tasks.length; j++) {
            await db.createTask({
              userStoryId: storyId,
              title: story.tasks[j].title,
              description: story.tasks[j].description,
              estimatedHours: story.tasks[j].estimatedHours,
              orderIndex: j,
            });
          }
        }
      }

      return { featureId: input.featureId, success: true };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(10),
        language: z.enum(["pt", "en"]).default("pt"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = new Date();
      console.log('[GENERATE] Starting feature generation for user:', ctx.user.id);
      console.log('[GENERATE] Prompt length:', input.prompt.length);
      console.log('[GENERATE] Language:', input.language);

      // Create execution log
      const executionLogId = await db.createExecutionLog({
        userId: ctx.user.id,
        status: "started",
        promptLength: input.prompt.length,
        startTime,
      });
      console.log('[GENERATE] Created execution log:', executionLogId);

      try {

      // Check if prompt is large (> 2000 characters) and needs to be split
      const CHUNK_SIZE = 2000;
      const isLargePrompt = input.prompt.length > CHUNK_SIZE;

      if (isLargePrompt) {
        // Split into chunks
        const chunks: string[] = [];
        for (let i = 0; i < input.prompt.length; i += CHUNK_SIZE) {
          chunks.push(input.prompt.substring(i, i + CHUNK_SIZE));
        }
        
        // Update execution log with chunks count
        await db.updateExecutionLog(executionLogId, {
          status: "processing",
          chunksCount: chunks.length,
        });
        console.log(`[CHUNKS] Processing ${chunks.length} chunks`);

        // Process each chunk
        const partialResults: any[] = [];
        
        const languageInstructions = input.language === "pt" 
          ? "Responda em português brasileiro. Use linguagem clara e profissional."
          : "Respond in English. Use clear and professional language.";

        for (let i = 0; i < chunks.length; i++) {
          const chunkPrompt = `You are processing part ${i + 1} of ${chunks.length} of a large feature description.

${languageInstructions}

Part ${i + 1} content:
${chunks[i]}

Generate user stories for this part only. Return JSON format:
{
  "userStories": [
    {
      "title": "Story title",
      "description": "Story description",
      "priority": "low" | "medium" | "high" | "critical",
      "storyPoints": 1 | 2 | 3 | 5 | 8 | 13 | 21,
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "tasks": [
        {
          "title": "Task title",
          "description": "Task description",
          "estimatedHours": 2
        }
      ]
    }
  ]
}`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: chunkPrompt },
              { role: "user", content: chunks[i] },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "user_stories_chunk",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    userStories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                          storyPoints: { type: "integer", enum: [1, 2, 3, 5, 8, 13, 21] },
                          acceptanceCriteria: {
                            type: "array",
                            items: { type: "string" }
                          },
                          tasks: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                estimatedHours: { type: "integer" }
                              },
                              required: ["title", "description", "estimatedHours"],
                              additionalProperties: false
                            }
                          }
                        },
                        required: ["title", "description", "priority", "storyPoints", "acceptanceCriteria", "tasks"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["userStories"],
                  additionalProperties: false
                }
              }
            }
          });

          if (!response || !response.choices || response.choices.length === 0) {
            console.error(`[Chunk ${i + 1}] Resposta da IA vazia ou inválida`);
            continue;
          }
          
          const content = response.choices[0]?.message?.content;
          console.log(`[Chunk ${i + 1}] Content received:`, content ? 'YES' : 'NO');
          if (content) {
            const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
            console.log(`[Chunk ${i + 1}] Content string length:`, contentStr.length);
            const cleanedStr = cleanJsonResponse(contentStr);
            console.log(`[Chunk ${i + 1}] Cleaned string length:`, cleanedStr.length);
            const parsed = JSON.parse(cleanedStr);
            console.log(`[Chunk ${i + 1}] Parsed stories count:`, parsed.userStories?.length || 0);
            console.log(`[Chunk ${i + 1}] Parsed object keys:`, Object.keys(parsed));
            if (parsed.userStories && parsed.userStories.length > 0) {
              console.log(`[Chunk ${i + 1}] First story title:`, parsed.userStories[0]?.title);
            }
            partialResults.push(parsed);
          } else {
            console.error(`[Chunk ${i + 1}] No content in response`);
          }
        }

        // Merge results
        console.log(`[CHUNKS] Total partial results:`, partialResults.length);
        const allStories = partialResults.flatMap(r => r.userStories || []);
        console.log(`[CHUNKS] Total stories after merge:`, allStories.length);

        // Generate consolidated feature title and description
        const consolidationPrompt = `You are consolidating multiple parts of a feature specification.

${languageInstructions}

Original full description:
${input.prompt}

Generated ${allStories.length} user stories from all parts.

Create a comprehensive feature title and description that encompasses all parts. Return JSON:
{
  "feature": {
    "title": "Feature title",
    "description": "Comprehensive feature description"
  }
}`;

        const consolidationResponse = await invokeLLM({
          messages: [
            { role: "system", content: consolidationPrompt },
            { role: "user", content: input.prompt },
          ],

        });

        const consolidationContent = consolidationResponse.choices[0]?.message?.content;
        if (!consolidationContent) {
          throw new Error("Failed to generate consolidated feature");
        }

        const consolidationStr = typeof consolidationContent === 'string' ? consolidationContent : JSON.stringify(consolidationContent);
        const cleanedConsolidation = cleanJsonResponse(consolidationStr);
        const consolidation = JSON.parse(cleanedConsolidation);

        // Save consolidated feature
        const featureId = await db.createFeature({
          userId: ctx.user.id,
          title: consolidation.feature.title,
          description: consolidation.feature.description,
          originalPrompt: input.prompt,
          language: input.language,
        });

        // Save all user stories
        for (let i = 0; i < allStories.length; i++) {
          const story = allStories[i];
          const storyId = await db.createUserStory({
            featureId,
            title: story.title,
            description: story.description,
            priority: story.priority,
            storyPoints: story.storyPoints,
            orderIndex: i,
          });

          if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
            for (let j = 0; j < story.acceptanceCriteria.length; j++) {
              await db.createAcceptanceCriterion({
                userStoryId: storyId,
                criterion: story.acceptanceCriteria[j],
                orderIndex: j,
              });
            }
          }

          if (story.tasks && Array.isArray(story.tasks)) {
            for (let j = 0; j < story.tasks.length; j++) {
              await db.createTask({
                userStoryId: storyId,
                title: story.tasks[j].title,
                description: story.tasks[j].description,
                estimatedHours: story.tasks[j].estimatedHours,
                orderIndex: j,
              });
            }
          }
        }

        return { featureId, processedInChunks: true, chunksCount: chunks.length };
      }

      // Original single-pass logic for normal-sized prompts
      
      // System prompt for feature generation
      const languageInstructions = input.language === "pt" 
        ? "Responda em português brasileiro. Use linguagem clara e profissional."
        : "Respond in English. Use clear and professional language.";

      const systemPrompt = `You are an expert product manager and technical architect. Your task is to analyze user requirements and generate a comprehensive feature specification.

${languageInstructions}

For the given requirement, you must:
1. Create a clear feature title and description
2. Break down the feature into logical user stories
3. For each user story, provide:
   - A clear title following the format "As a [user], I want to [action] so that [benefit]"
   - Detailed description
   - Priority (low, medium, high, or critical)
   - Estimated story points (1, 2, 3, 5, 8, 13, or 21)
   - Acceptance criteria (specific, testable conditions)

Return your response in the following JSON format:
{
  "feature": {
    "title": "Feature title",
    "description": "Detailed feature description"
  },
  "userStories": [
    {
      "title": "User story title",
      "description": "User story description",
      "priority": "medium",
      "storyPoints": 5,
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "tasks": [
        {
          "title": "Task title",
          "description": "Technical task description",
          "estimatedHours": 2
        }
      ]
    }
  ]
}`;

      // Call LLM to generate feature
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "feature_generation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                feature: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["title", "description"],
                  additionalProperties: false,
                },
                userStories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { 
                        type: "string",
                        enum: ["low", "medium", "high", "critical"]
                      },
                      storyPoints: { type: "number" },
                      acceptanceCriteria: {
                        type: "array",
                        items: { type: "string" },
                      },
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            estimatedHours: { type: "number" },
                          },
                          required: ["title", "description", "estimatedHours"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["title", "description", "priority", "storyPoints", "acceptanceCriteria", "tasks"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["feature", "userStories"],
              additionalProperties: false,
            },
          },
        },
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("Falha ao gerar resposta da IA. Tente novamente.");
      }
      
      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error("Resposta da IA inválida. Tente novamente.");
      }

      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const cleanedStr = cleanJsonResponse(contentStr);
      const generated = JSON.parse(cleanedStr);

      // Save to database
      const featureId = await db.createFeature({
        userId: ctx.user.id,
        title: generated.feature.title,
        description: generated.feature.description,
        originalPrompt: input.prompt,
        language: input.language,
        status: "draft",
      });

      // Save user stories and acceptance criteria
      for (let i = 0; i < generated.userStories.length; i++) {
        const story = generated.userStories[i];
        const storyId = await db.createUserStory({
          featureId,
          title: story.title,
          description: story.description,
          priority: story.priority,
          storyPoints: story.storyPoints,
          orderIndex: i,
        });

        // Save acceptance criteria
        for (let j = 0; j < story.acceptanceCriteria.length; j++) {
          await db.createAcceptanceCriterion({
            userStoryId: storyId,
            criterion: story.acceptanceCriteria[j],
            orderIndex: j,
          });
        }

        // Save tasks
        for (let j = 0; j < story.tasks.length; j++) {
          await db.createTask({
            userStoryId: storyId,
            title: story.tasks[j].title,
            description: story.tasks[j].description,
            estimatedHours: story.tasks[j].estimatedHours,
            orderIndex: j,
          });
        }
      }

      // Update execution log with success
      await db.updateExecutionLog(executionLogId, {
        status: "success",
        featureId,
        totalStories: generated.userStories?.length || 0,
        endTime: new Date(),
        aiResponse: JSON.stringify(generated).substring(0, 10000), // Limit to 10KB
      });

      return { featureId, generated };
      } catch (error) {
        // Update execution log with error
        await db.updateExecutionLog(executionLogId, {
          status: "error",
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getFeaturesByUserId(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const feature = await db.getFeatureById(input.id);
      if (!feature || feature.userId !== ctx.user.id) {
        throw new Error("Feature not found");
      }

      const userStories = await db.getUserStoriesByFeatureId(input.id);
      
      // Get acceptance criteria and tasks for each story
      const storiesWithDetails = await Promise.all(
        userStories.map(async (story) => {
          const criteria = await db.getAcceptanceCriteriaByStoryId(story.id);
          const tasks = await db.getTasksByStoryId(story.id);
          return { ...story, acceptanceCriteria: criteria, tasks };
        })
      );

      return { feature, userStories: storiesWithDetails };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "exported", "archived"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await db.getFeatureById(input.id);
      if (!feature || feature.userId !== ctx.user.id) {
        throw new Error("Feature not found");
      }

      const { id, ...data } = input;
      return db.updateFeature(id, data);
    }),

  exportToJira: protectedProcedure
    .input(z.object({ featureId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get feature and stories
      const feature = await db.getFeatureById(input.featureId);
      if (!feature || feature.userId !== ctx.user.id) {
        throw new Error("Feature not found");
      }

      // Get Jira config
      const jiraConfig = await db.getJiraConfigByUserId(ctx.user.id);
      if (!jiraConfig) {
        throw new Error("Jira configuration not found. Please configure Jira integration first.");
      }

      const userStories = await db.getUserStoriesByFeatureId(input.featureId);
      const storiesWithCriteria = await Promise.all(
        userStories.map(async (story) => {
          const criteria = await db.getAcceptanceCriteriaByStoryId(story.id);
          return { ...story, acceptanceCriteria: criteria };
        })
      );

      const auth = Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString('base64');

      try {
        // Create Epic for the feature
        const epicResponse = await fetch(`${jiraConfig.jiraUrl}/rest/api/3/issue`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              project: { key: jiraConfig.defaultProject },
              summary: feature.title,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: feature.description }],
                  },
                ],
              },
              issuetype: { name: 'Epic' },
            },
          }),
        });

        if (!epicResponse.ok) {
          const errorText = await epicResponse.text();
          throw new Error(`Failed to create Epic: ${errorText}`);
        }

        const epicData = await epicResponse.json();
        const epicKey = epicData.key;

        // Update feature with Jira key
        await db.updateFeature(input.featureId, {
          jiraIssueKey: epicKey,
          status: "exported",
        });

        // Create stories as issues linked to the epic
        for (const story of storiesWithCriteria) {
          const criteriaText = story.acceptanceCriteria
            .map((c, i) => `${i + 1}. ${c.criterion}`)
            .join('\n');

          const storyResponse = await fetch(`${jiraConfig.jiraUrl}/rest/api/3/issue`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                project: { key: jiraConfig.defaultProject },
                summary: story.title,
                description: {
                  type: 'doc',
                  version: 1,
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: story.description }],
                    },
                    {
                      type: 'heading',
                      attrs: { level: 3 },
                      content: [{ type: 'text', text: 'Acceptance Criteria' }],
                    },
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: criteriaText }],
                    },
                  ],
                },
                issuetype: { name: 'Story' },
                parent: { key: epicKey },
              },
            }),
          });

          if (storyResponse.ok) {
            const storyData = await storyResponse.json();
            await db.updateUserStory(story.id, { jiraIssueKey: storyData.key });
          }
        }

        return { success: true, epicKey };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to export to Jira"
        );
      }
    }),
});
