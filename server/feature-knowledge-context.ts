import * as knowledgeDb from "./knowledge-db";
import { generateEmbedding } from "./_core/ingestion";
import { getUserCompanyId } from "./_core/tenant-guard";
import {
  extractKeyTerms,
  reciprocalRankFusion,
  selectDiverse,
  selectCodeChunks,
  mergeWithCode,
  type RankedChunk,
} from "./knowledge-retrieval";

const SOURCE_TYPE_NAMES: Record<string, string> = {
  code_repo: "código",
  document: "documento",
  story: "user story",
  miro_board: "Miro",
};

/** Trechos só por significado abaixo disso costumam não ter relação com a feature */
const MIN_VECTOR_SIMILARITY = 0.35;

export type FeatureKnowledgeContext = {
  context: string;
  sources: number;
  docChunks: number;
  codeChunks: number;
};

function isRelevant(chunk: RankedChunk) {
  return chunk.matchedBy.includes("keyword") || (chunk.similarity ?? 0) >= MIN_VECTOR_SIMILARITY;
}

function formatChunk(chunk: RankedChunk, index: number) {
  const type = chunk.source_type ? ` (${SOURCE_TYPE_NAMES[chunk.source_type] ?? chunk.source_type})` : "";
  const path = chunk.metadata?.filePath || chunk.metadata?.path || chunk.metadata?.fileName;
  const lines = chunk.metadata?.startLine ? ` (linhas ${chunk.metadata.startLine}-${chunk.metadata.endLine})` : "";
  return `[${index + 1}] Fonte: ${chunk.source_name}${type}${path ? ` | ${path}${lines}` : ""}\n${chunk.content}`;
}

/**
 * Busca na base de conhecimento da empresa (documentos, stories, Miro) e no código
 * dos repositórios git os trechos relacionados ao pedido da feature.
 * Retorna null quando o usuário não tem empresa ou nada relevante é encontrado.
 */
export async function buildFeatureKnowledgeContext(
  prompt: string,
  userId: number
): Promise<FeatureKnowledgeContext | null> {
  let companyId: number;
  try {
    companyId = await getUserCompanyId(userId);
  } catch {
    return null;
  }

  const query = prompt.slice(0, 6000);
  const keyTerms = extractKeyTerms(query, 12);

  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(query);
  } catch (err) {
    console.warn("[FeatureKnowledge] embedding failed, using keyword search only:", err);
  }

  const empty = [] as knowledgeDb.HybridChunkRow[];
  const safe = (p: Promise<knowledgeDb.HybridChunkRow[]>) => p.catch(() => empty);

  const [vectorAll, keywordAll, vectorCode, keywordCode] = await Promise.all([
    embedding ? safe(knowledgeDb.searchVectorChunks(embedding, companyId, 24, undefined, "exclude_tech_debt")) : empty,
    safe(knowledgeDb.searchKeywordChunks(keyTerms, companyId, 30, undefined, "exclude_tech_debt")),
    embedding ? safe(knowledgeDb.searchVectorChunks(embedding, companyId, 12, ["code_repo"])) : empty,
    safe(knowledgeDb.searchKeywordChunks(keyTerms, companyId, 15, ["code_repo"])),
  ]);

  const ranked = reciprocalRankFusion([
    { kind: "vector", items: vectorAll, weight: 1 },
    { kind: "keyword", items: keywordAll, weight: 1.2 },
    { kind: "vector", items: vectorCode, weight: 0.8 },
    { kind: "keyword", items: keywordCode, weight: 1 },
  ]).filter(isRelevant);

  const docs = selectDiverse(
    ranked.filter((c) => c.source_type !== "code_repo"),
    { maxChunks: 8, maxPerSource: 3, tokenBudget: 4500 }
  );
  const code = selectCodeChunks(
    ranked.filter((c) => c.source_type === "code_repo"),
    { maxChunks: 6, maxPerFile: 2, tokenBudget: 3500 }
  );
  const chunks = mergeWithCode(docs, code);

  console.log(
    `[FeatureKnowledge] company=${companyId} terms=${JSON.stringify(keyTerms)} docs=${docs.length} code=${code.length} sources=${new Set(chunks.map((c) => c.source_id)).size}`
  );

  if (chunks.length === 0) return null;

  return {
    context: chunks.map(formatChunk).join("\n\n---\n\n"),
    sources: new Set(chunks.map((c) => c.source_id)).size,
    docChunks: docs.length,
    codeChunks: code.length,
  };
}

/** Instruções para a IA usar o contexto encontrado ao montar a feature */
export function featureKnowledgeInstructions(knowledge: FeatureKnowledgeContext, language: "pt" | "en") {
  if (language === "pt") {
    return `

CONTEXTO DA EMPRESA (base de conhecimento e código dos repositórios git):
Use estes trechos para:
- Usar os mesmos termos de negócio, regras e processos já documentados
- Reaproveitar e citar o que já existe no sistema (telas, entidades, serviços, endpoints, arquivos) nas descrições${knowledge.codeChunks > 0 ? " e nas tasks técnicas" : ""}
- Apontar nas stories e critérios de aceite as integrações e regras existentes que a feature precisa respeitar
- Não invente nomes de arquivos, classes ou regras que não estejam no contexto ou no pedido
- Ignore trechos que não tenham relação com o pedido

${knowledge.context}`;
  }
  return `

COMPANY CONTEXT (knowledge base and code from the git repositories):
Use these excerpts to:
- Use the same business terms, rules and processes already documented
- Reuse and reference what already exists in the system (screens, entities, services, endpoints, files) in the descriptions${knowledge.codeChunks > 0 ? " and technical tasks" : ""}
- Point out in stories and acceptance criteria the existing integrations and rules the feature must respect
- Do not invent file, class or rule names that are not in the context or the request
- Ignore excerpts unrelated to the request

${knowledge.context}`;
}
