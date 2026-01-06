// Dotenv agora é carregado automaticamente pelo tsx com --env-file flag
// Log das variáveis importantes
console.log("🔍 Environment Check:");
console.log(`   STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Loaded' : '✗ Missing'}`);

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Stripe webhook needs raw body for signature verification
  // This must come BEFORE the JSON parser
  const stripeWebhook = (await import("../webhooks/stripe")).default;
  app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./serve-static.js");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    console.log('\n🔗 Links úteis:');
    console.log(`   🏠 Home: http://localhost:${port}`);
    console.log(`   🔐 Login: http://localhost:${port}/login`);
    console.log(`   📝 Registro: http://localhost:${port}/register`);
    console.log(`   💰 Planos: http://localhost:${port}/pricing`);
    console.log(`   ✨ Gerar Feature: http://localhost:${port}/generate\n`);
  });
}

startServer().catch(console.error);
