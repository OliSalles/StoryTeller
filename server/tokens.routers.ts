import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

/**
 * Token usage routers - relatórios de uso de tokens da LLM
 */
export const tokensRouter = router({
  // Buscar histórico de uso de tokens
  getUsage: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      return await db.getTokenUsageByUserId(ctx.user.id, startDate, endDate);
    }),

  // Buscar estatísticas agregadas
  getStats: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      return await db.getTokenUsageStats(ctx.user.id, input.days);
    }),
});







