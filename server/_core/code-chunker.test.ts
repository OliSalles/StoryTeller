import { describe, it, expect } from "vitest";
import { chunkCodeFile, shouldIndexFile, parseGithubRepo, githubBlobUrl, looksBinary } from "./code-chunker";
import { encryptSecret, decryptSecret } from "./secret-box";

describe("code chunker", () => {
  it("filtra arquivos", () => {
    expect(shouldIndexFile("src/services/incentivo.ts")).toBe(true);
    expect(shouldIndexFile("Ticket.Api/Controllers/IncentivoController.cs")).toBe(true);
    expect(shouldIndexFile("node_modules/x/index.js")).toBe(false);
    expect(shouldIndexFile("bin/Debug/app.dll")).toBe(false);
    expect(shouldIndexFile("package-lock.json")).toBe(false);
    expect(shouldIndexFile("public/app.min.js")).toBe(false);
    expect(shouldIndexFile(".env")).toBe(false);
    expect(shouldIndexFile("logo.png")).toBe(false);
    expect(shouldIndexFile("src/big.ts", 500 * 1024)).toBe(false);
    expect(looksBinary(Buffer.from([1, 0, 2]))).toBe(true);
  });

  it("divide por função com faixa de linhas", () => {
    const fn = (n: number) => [`export function f${n}() {`, ...Array.from({ length: 40 }, (_, i) => `  const x${i} = ${i};`), "}"];
    const text = [...fn(1), ...fn(2), ...fn(3)].join("\n");
    const chunks = chunkCodeFile("src/a.ts", text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].content.startsWith("Arquivo: src/a.ts (linhas 1-")).toBe(true);
    expect(chunks[chunks.length - 1].endLine).toBe(text.split("\n").length);
    // começa um bloco no início de uma função
    expect(chunks[1].content.split("\n")[1]).toMatch(/^export function f\d/);
  });

  it("entende URLs do GitHub", () => {
    expect(parseGithubRepo("https://github.com/OliSalles/TicketDev2.git")).toEqual({ owner: "OliSalles", repo: "TicketDev2" });
    expect(parseGithubRepo("git@github.com:OliSalles/TicketDev2.git")).toEqual({ owner: "OliSalles", repo: "TicketDev2" });
    expect(parseGithubRepo("https://gitlab.com/a/b")).toBeNull();
    expect(githubBlobUrl("https://github.com/o/r", "abc", "src/a b.ts", 10, 20)).toBe("https://github.com/o/r/blob/abc/src/a%20b.ts#L10-L20");
  });

  it("criptografa e descriptografa token", () => {
    process.env.JWT_SECRET = "teste";
    const enc = encryptSecret("ghp_segredo");
    expect(enc).not.toContain("ghp_segredo");
    expect(decryptSecret(enc)).toBe("ghp_segredo");
  });
});

import { filePriority } from "./code-chunker";
describe("apex", () => {
  it("indexa Apex e prioriza código", () => {
    expect(shouldIndexFile("force-app/main/default/classes/IncentivoComercial.cls")).toBe(true);
    expect(shouldIndexFile("force-app/main/default/triggers/Opp.trigger")).toBe(true);
    expect(filePriority("classes/A.cls")).toBeLessThan(filePriority("classes/A.cls-meta.xml"));
  });
});
