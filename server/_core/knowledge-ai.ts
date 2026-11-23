/**
 * Chamadas de IA usadas na ingestão da base de conhecimento:
 * mesclar trechos parecidos, descrever imagens e narrar fluxos do Miro.
 */
import { invokeLLM, type InvokeResult } from "./llm";

/** Tamanho máximo de um trecho mesclado; acima disso o trecho novo é gravado separado */
export const MAX_MERGED_CHARS = 2400;

function responseText(result: InvokeResult): string {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function parseJsonObject(text: string): Record<string, any> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export type MergeDecision =
  | { decision: "same" }
  | { decision: "different" }
  | { decision: "merge"; merged: string };

/**
 * Compara um trecho existente com um novo parecido e decide:
 * same (o novo não acrescenta nada), different (assuntos distintos) ou merge (texto único com tudo).
 */
export async function aiMergeChunks(existing: string, incoming: string, userId?: number): Promise<MergeDecision> {
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você organiza uma base de conhecimento e evita informação repetida. " +
          "Compare o TRECHO EXISTENTE com o TRECHO NOVO e responda só com JSON no formato " +
          '{"decision":"same"|"different"|"merge","merged":"..."}.\n' +
          '- "same": o novo não traz nenhuma informação que o existente já não tenha.\n' +
          '- "different": tratam de assuntos diferentes ou se contradizem; devem ficar separados.\n' +
          '- "merge": mesmo assunto e o novo acrescenta informação. Em "merged", escreva um texto único com ' +
          "todas as informações dos dois, sem repetir nada, sem inventar e mantendo nomes, números e termos exatos. " +
          `Use o idioma original dos trechos e no máximo ${MAX_MERGED_CHARS} caracteres.`,
      },
      {
        role: "user",
        content: `TRECHO EXISTENTE:\n${existing}\n\nTRECHO NOVO:\n${incoming}`,
      },
    ],
    responseFormat: { type: "json_object" },
    userId,
    operation: "knowledge_merge",
  });

  const parsed = parseJsonObject(responseText(result));
  const decision = parsed?.decision;
  if (decision === "same") return { decision: "same" };
  if (decision === "merge" && typeof parsed?.merged === "string" && parsed.merged.trim()) {
    return { decision: "merge", merged: parsed.merged.trim() };
  }
  return { decision: "different" };
}

/** Junta vários textos da mesma informação em um só (usado ao refazer um trecho mesclado) */
export async function aiCombineTexts(texts: string[], userId?: number): Promise<string> {
  let combined = texts[0] ?? "";
  for (const next of texts.slice(1)) {
    const decision = await aiMergeChunks(combined, next, userId);
    if (decision.decision === "merge") combined = decision.merged;
    else if (decision.decision === "different") combined = `${combined}\n\n${next}`;
  }
  return combined;
}

/**
 * Descreve uma imagem do board em texto: transcreve o que estiver escrito e explica
 * diagramas, telas, fluxos e tabelas.
 */
export async function aiDescribeImage(
  dataUrl: string,
  context: { boardName: string; frameName: string; title?: string | null },
  userId?: number
): Promise<string> {
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você transforma imagens de um board do Miro em texto para uma base de conhecimento de produto e software. " +
          "Responda em português do Brasil, sem introdução. " +
          "1) Transcreva todo texto legível, mantendo nomes e números exatos. " +
          "2) Se for diagrama, fluxo, arquitetura, tela ou tabela, explique a estrutura e a sequência (quem chama quem, decisões, caminhos). " +
          "3) Se não houver nada relevante (foto decorativa, ícone), responda apenas: SEM CONTEÚDO.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Board: ${context.boardName}\nFrame: ${context.frameName}${context.title ? `\nTítulo da imagem: ${context.title}` : ""}`,
          },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    userId,
    operation: "miro_image_description",
  });
  const text = responseText(result);
  return /^SEM CONTE[UÚ]DO\.?$/i.test(text) ? "" : text;
}

/**
 * Narra em texto corrido um fluxo/diagrama montado com formas e conectores no Miro.
 */
export async function aiDescribeFlow(
  context: { boardName: string; frameName: string },
  nodes: Array<{ id: string; label: string; type: string }>,
  edges: Array<{ from: string; to: string; caption?: string }>,
  userId?: number
): Promise<string> {
  const nodeLines = nodes.map((n) => `${n.id} [${n.type}]: ${n.label}`).join("\n");
  const edgeLines = edges.map((e) => `${e.from} -> ${e.to}${e.caption ? ` (${e.caption})` : ""}`).join("\n");
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você recebe os elementos e as setas de um fluxo desenhado no Miro e escreve, em português do Brasil, " +
          "uma descrição em texto do fluxo para uma base de conhecimento. " +
          "Explique o início, a sequência de passos, as decisões e seus caminhos, os laços e os pontos de fim. " +
          "Use os nomes exatos dos elementos. Não invente passos nem explique o que cada passo faz além do que está escrito. " +
          "Sem introdução nem conclusão; use lista numerada.",
      },
      {
        role: "user",
        content: `Board: ${context.boardName}\nFrame: ${context.frameName}\n\nELEMENTOS:\n${nodeLines}\n\nSETAS:\n${edgeLines}`,
      },
    ],
    userId,
    operation: "miro_flow_description",
  });
  return responseText(result);
}
