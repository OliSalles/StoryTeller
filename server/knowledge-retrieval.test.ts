import { describe, it, expect } from "vitest";
import {
  extractKeyTerms,
  normalizeText,
  reciprocalRankFusion,
  selectDiverse,
  extractImageUrls,
  type RetrievedChunk,
} from "./knowledge-retrieval";

const chunk = (id: number, source: number, content = `trecho ${id}`): RetrievedChunk => ({
  chunk_id: id,
  content,
  similarity: 0.5,
  source_id: source,
  source_name: `Fonte ${source}`,
  metadata: null,
});

describe("knowledge retrieval", () => {
  it("normaliza acentos", () => {
    expect(normalizeText("Incentivo Comercial ÇÃO")).toBe("incentivo comercial cao");
  });

  it("extrai termos chave da pergunta", () => {
    const terms = extractKeyTerms("me explique o que é incentivo comercial");
    expect(terms[0]).toBe("incentivo comercial");
    expect(terms).toContain("incentivo");
    expect(terms).toContain("comercial");
    expect(terms).not.toContain("explique");
  });

  it("respeita frases entre aspas", () => {
    expect(extractKeyTerms('o que é "fluxo de aprovação"?')).toContain("fluxo de aprovacao");
  });

  it("RRF junta e prioriza trechos encontrados pelas duas buscas", () => {
    const ranked = reciprocalRankFusion([
      { kind: "vector", items: [chunk(1, 1), chunk(2, 1), chunk(3, 2)] },
      { kind: "keyword", items: [chunk(3, 2), chunk(4, 3)] },
    ]);
    expect(ranked[0].chunk_id).toBe(3);
    expect(ranked[0].matchedBy.sort()).toEqual(["keyword", "vector"]);
    expect(ranked.map((r) => r.chunk_id).sort()).toEqual([1, 2, 3, 4]);
  });

  it("seleção garante diversidade de fontes e limite por fonte", () => {
    const items = [
      ...Array.from({ length: 10 }, (_, i) => chunk(i + 1, 1)),
      chunk(100, 2),
      chunk(200, 3),
    ];
    const ranked = reciprocalRankFusion([{ kind: "vector", items }]);
    const selected = selectDiverse(ranked, { maxChunks: 6, maxPerSource: 3 });
    const sources = new Set(selected.map((s) => s.source_id));
    expect(sources.size).toBe(3);
    expect(selected.filter((s) => s.source_id === 1).length).toBeLessThanOrEqual(3);
    expect(selected.length).toBe(5);
  });

  it("respeita orçamento de tokens", () => {
    const big = "x".repeat(4000); // ~1000 tokens
    const ranked = reciprocalRankFusion([
      { kind: "vector", items: [chunk(1, 1, big), chunk(2, 2, big), chunk(3, 3, big)] },
    ]);
    expect(selectDiverse(ranked, { tokenBudget: 2100 }).length).toBe(2);
  });

  it("extrai somente imagens que existem nos trechos", () => {
    const urls = extractImageUrls([{ content: "veja https://x.com/a.png e https://x.com/doc.pdf" }]);
    expect(urls).toEqual(["https://x.com/a.png"]);
  });
});

import { selectCodeChunks, mergeWithCode } from "./knowledge-retrieval";

describe("code retrieval", () => {
  it("limita trechos por arquivo e junta sem duplicar", () => {
    const mk = (id: number, file: string) => ({ ...chunk(id, 9), metadata: { filePath: file } });
    const ranked = reciprocalRankFusion([{ kind: "vector", items: [mk(1, "a.ts"), mk(2, "a.ts"), mk(3, "a.ts"), mk(4, "b.ts")] }]);
    const code = selectCodeChunks(ranked, { maxPerFile: 2 });
    expect(code.map((c) => c.chunk_id)).toEqual([1, 2, 4]);
    const merged = mergeWithCode([ranked[0]], code);
    expect(merged.length).toBe(3);
  });
});
