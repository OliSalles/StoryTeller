import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { azureDevOpsRouter } from "./azureDevOps.routers";
import { configRouter } from "./config.routers";
import { featuresRouter } from "./features.routers";
import { executionsRouter } from "./executions.routers";
import { authRouter } from "./auth.routers";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  azureDevOps: azureDevOpsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // Adiciona rotas de register e login
    ...authRouter._def.procedures,
  }),

  config: configRouter,
  features: featuresRouter,
  executions: executionsRouter,

  // Feature routers added
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
