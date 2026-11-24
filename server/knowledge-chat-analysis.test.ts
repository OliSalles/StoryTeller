import { describe, expect, it } from "vitest";
import { analysisHeuristic, buildAnswerPrompt } from "./knowledge-chat.routers";

describe("analysisHeuristic", () => {
  it.each([
    "tem alguma melhoria para ser feita nesse processo?",
    "o que pode ser melhorado no incentivo comercial?",
    "quais os riscos dessa integração?",
    "o que falta nesse fluxo?",
    "me dê sugestões para otimizar a renegociação",
    "quais seriam os próximos passos?",
  ])("detecta pedido de análise: %s", (q) => {
    expect(analysisHeuristic(q)).toBe(true);
  });

  it.each([
    "o que é incentivo comercial?",
    "como funciona a renegociação?",
    "quais objetos estão ligados ao contrato ERP?",
  ])("não marca pergunta factual: %s", (q) => {
    expect(analysisHeuristic(q)).toBe(false);
  });
});

describe("buildAnswerPrompt em modo análise", () => {
  it("pede análise própria e proíbe responder só que não há menção", () => {
    const p = buildAnswerPrompt("[1] Fonte: x\nconteúdo", [], false, [], true);
    expect(p).toContain("Oportunidades de melhoria");
    expect(p).toContain("NUNCA responda apenas que a documentação não menciona melhorias");
    expect(p).toContain("[1] Fonte: x");
  });

  it("sem trechos novos, manda usar o que já foi explicado na conversa", () => {
    expect(buildAnswerPrompt("", [], false, [], true)).toContain("use o que já foi explicado nesta conversa");
  });

  it("modo normal continua igual", () => {
    expect(buildAnswerPrompt("ctx", [], false, [], false)).toBe(buildAnswerPrompt("ctx", [], false));
    expect(buildAnswerPrompt("ctx", [], false)).not.toContain("Oportunidades de melhoria");
  });
});
