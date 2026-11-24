import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Em produção com tsx, o arquivo está em /workspace/server/_core/serve-static.ts
  // E o dist/public está em /workspace/dist/public
  const distPath = path.resolve(import.meta.dirname, "../..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Arquivos em /assets têm hash no nome: podem ficar em cache para sempre
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), { immutable: true, maxAge: "1y", fallthrough: false })
  );

  // index.html não pode ficar em cache, senão aponta para assets de um build que já não existe
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
