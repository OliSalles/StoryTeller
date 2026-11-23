import { describe, it, expect } from "vitest";
import { selectTechDebtChunks, type RankedChunk } from "./knowledge-retrieval";
import { buildAnswerPrompt, techDebtInstruction, TECH_DEBT_SECTION_TITLE } from "./knowledge-chat.routers";
import { parseCompanySettings, techDebtGloballyDisabled, DEFAULT_COMPANY_SETTINGS } from "./_core/company-settings";

const ranked = (id: number, source: number, similarity: number, matchedBy: Array<"vector" | "keyword">, score = 1): RankedChunk => ({
  chunk_id: id,
  content: `débito ${id}`,
  similarity,
  source_id: source,
  source_name: `Débitos ${source}`,
  source_type: "document",
  metadata: null,
  score,
  matchedBy,
});

describe("seção de débitos técnicos", () => {
  it("flag começa desligada e só liga com true explícito", () => {
    expect(DEFAULT_COMPANY_SETTINGS.techDebtSection).toBe(false);
    expect(parseCompanySettings(null).techDebtSection).toBe(false);
    expect(parseCompanySettings({ techDebtSection: "true" }).techDebtSection).toBe(false);
    expect(parseCompanySettings({ techDebtSection: true }).techDebtSection).toBe(true);
  });

  it("chave global desliga o recurso", () => {
    expect(techDebtGloballyDisabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(techDebtGloballyDisabled({ KNOWLEDGE_TECH_DEBT_DISABLED: "true" } as NodeJS.ProcessEnv)).toBe(true);
    expect(techDebtGloballyDisabled({ KNOWLEDGE_TECH_DEBT_DISABLED: "0" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("só aproveita trechos do assunto (texto exato ou similaridade suficiente)", () => {
    const out = selectTechDebtChunks([
      ranked(1, 1, 0.1, ["keyword"], 3),
      ranked(2, 1, 0.55, ["vector"], 2),
      ranked(3, 2, 0.2, ["vector"], 1),
    ]);
    expect(out.map((c) => c.chunk_id).sort()).toEqual([1, 2]);
  });

  it("sem trechos relevantes não devolve nada", () => {
    expect(selectTechDebtChunks([ranked(1, 1, 0.1, ["vector"])])).toEqual([]);
    expect(selectTechDebtChunks([])).toEqual([]);
  });

  it("respeita o limite de trechos", () => {
    const many = Array.from({ length: 12 }, (_, i) => ranked(i + 1, i, 0.8, ["vector"], 12 - i));
    expect(selectTechDebtChunks(many).length).toBe(5);
  });

  it("prompt sem trechos de débito fica igual ao de antes", () => {
    expect(techDebtInstruction([])).toBe("");
    const base = buildAnswerPrompt("ctx", [], false);
    expect(buildAnswerPrompt("ctx", [], false, [])).toBe(base);
    expect(base).not.toContain(TECH_DEBT_SECTION_TITLE);
  });

  it("prompt com trechos de débito pede a seção antes das Fontes, sem inventar", () => {
    const p = buildAnswerPrompt("ctx", [], false, [4, 5]);
    expect(p).toContain(TECH_DEBT_SECTION_TITLE);
    expect(p).toContain("[4], [5]");
    expect(p).toContain("Logo antes da seção \"### Fontes\"");
    expect(p).toContain("Não invente");
    expect(p.indexOf(TECH_DEBT_SECTION_TITLE)).toBeLessThan(p.indexOf("CONTEXTO DA BASE"));
  });
});
