import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import * as db from "./db";

/**
 * Executions router for viewing generation logs (só admins do sistema)
 */
export const executionsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return db.getExecutionLogsByUserId(ctx.user.id);
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const log = await db.getExecutionLogById(input.id);
      if (!log || log.userId !== ctx.user.id) {
        throw new Error("Execution log not found");
      }
      return log;
    }),
});
