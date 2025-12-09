import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

/**
 * Configuration routers for LLM and Jira settings
 */
export const configRouter = router({
  azureDevOps: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAzureDevOpsConfigByUserId(ctx.user.id);
    }),
    save: protectedProcedure
      .input(
        z.object({
          organization: z.string().min(1),
          project: z.string().min(1),
          pat: z.string().min(1),
          defaultArea: z.string().optional(),
          defaultIteration: z.string().optional(),
          defaultState: z.string().optional(),
          defaultBoard: z.string().optional(),
          defaultColumn: z.string().optional(),
          defaultSwimlane: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.upsertAzureDevOpsConfig({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),
  llm: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getLlmConfigByUserId(ctx.user.id);
    }),
    
    save: protectedProcedure
      .input(
        z.object({
          provider: z.string().default("openai"),
          model: z.string().default("gpt-4"),
          apiKey: z.string().optional(),
          temperature: z.string().default("0.7"),
          maxTokens: z.number().default(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.upsertLlmConfig({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  jira: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getJiraConfigByUserId(ctx.user.id);
    }),
    
    save: protectedProcedure
      .input(
        z.object({
          jiraUrl: z.string().url(),
          email: z.string().email(),
          apiToken: z.string(),
          defaultProject: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.upsertJiraConfig({
          userId: ctx.user.id,
          ...input,
        });
      }),
      
    test: protectedProcedure.mutation(async ({ ctx }) => {
      const config = await db.getJiraConfigByUserId(ctx.user.id);
      if (!config) {
        throw new Error("Jira configuration not found");
      }
      
      // Test Jira connection
      try {
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        const response = await fetch(`${config.jiraUrl}/rest/api/3/myself`, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Jira API returned ${response.status}`);
        }
        
        return { success: true, message: "Connection successful" };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : "Connection failed" 
        };
      }
    }),
  }),
});
