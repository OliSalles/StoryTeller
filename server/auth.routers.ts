import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { users } from "../drizzle/schema";
import { ENV } from "./_core/env";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret);

async function createJWT(userId: number, email: string) {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(JWT_SECRET);
  
  return token;
}

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
        name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verificar se o usuário já existe
      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) {
        throw new Error("Email já cadastrado");
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Verificar se é o primeiro usuário (será admin)
      const database = await db.getDb();
      const isFirstUser = database ? 
        (await database.select().from(users).limit(1)).length === 0 : 
        false;

      // Criar usuário
      const userId = await db.createUser({
        email: input.email,
        password: hashedPassword,
        name: input.name,
      });

      if (!userId) {
        throw new Error("Erro ao criar usuário");
      }

      // Se for o primeiro usuário, torná-lo admin
      if (isFirstUser) {
        await db.upsertUser({
          email: input.email,
          role: "admin",
        });
      }

      // Criar JWT token
      const token = await createJWT(userId, input.email);

      // Definir cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        success: true,
        message: "Usuário criado com sucesso",
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar usuário
      const user = await db.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Email ou senha inválidos");
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(input.password, user.password);
      if (!isValidPassword) {
        throw new Error("Email ou senha inválidos");
      }

      // Atualizar último login
      await db.upsertUser({
        email: user.email,
        lastSignedIn: new Date(),
      });

      // Criar JWT token
      const token = await createJWT(user.id, user.email);

      // Definir cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        success: true,
        message: "Login realizado com sucesso",
      };
    }),
});

