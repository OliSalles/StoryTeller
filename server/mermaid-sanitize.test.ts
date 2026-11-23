import { describe, it, expect } from "vitest";
import { sanitizeMermaid, sanitizeMarkdownMermaid } from "@shared/mermaid-sanitize";

describe("mermaid sanitize", () => {
  it("coloca aspas e corrige setas", () => {
    const out = sanitizeMermaid("flowchart TD\n  A[Pedido (novo)] -> B{Aprovado?};\n  B -->|Sim| C(Pagar: 10%)");
    expect(out).toContain('A["Pedido novo"] --> B{"Aprovado?"}');
    expect(out).toContain('C("Pagar: 10%")');
  });
  it("mantém rótulos já entre aspas", () => {
    expect(sanitizeMermaid('flowchart TD\nA["Início"] --> B["Fim"]')).toBe('flowchart TD\nA["Início"] --> B["Fim"]');
  });
  it("adiciona cabeçalho quando falta", () => {
    expect(sanitizeMermaid("A --> B").startsWith("flowchart TD\n")).toBe(true);
  });
  it("modo agressivo limpa rótulos de seta", () => {
    expect(sanitizeMermaid('flowchart TD\nA -->|Sim (ok)| B', true)).toContain('|"Sim ok"|');
  });
  it("aplica nos blocos do markdown", () => {
    const md = "Texto\n```mermaid\ngraph TD\nA[x (y)] --> B\n```\nfim";
    expect(sanitizeMarkdownMermaid(md)).toContain('A["x y"] --> B');
    expect(sanitizeMarkdownMermaid(md)).toContain("Texto");
  });
  it("não mexe em sequenceDiagram", () => {
    const s = "sequenceDiagram\nA->>B: oi";
    expect(sanitizeMermaid(s)).toBe(s);
  });
});
