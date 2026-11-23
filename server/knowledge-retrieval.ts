/**
 * Busca híbrida da base de conhecimento (vetorial + palavra chave)
 * Funções puras aqui para poderem ser testadas sem banco.
 */

export type RetrievedChunk = {
  chunk_id: number;
  content: string;
  similarity: number;
  source_id: number;
  source_name: string;
  source_type?: string | null;
  metadata: any;
};

export type RankedChunk = RetrievedChunk & {
  score: number;
  matchedBy: Array<"vector" | "keyword">;
};

const STOPWORDS = new Set(
  (
    "a o e é de da do das dos em no na nos nas um uma uns umas para pra por pelo pela pelos pelas com sem " +
    "que qual quais quem como onde quando porque por que se ao aos à às ou mas mais menos muito muita " +
    "me te se nos lhe eu tu ele ela eles elas voce você vocês voces isso isto aquilo esse essa este esta " +
    "seu sua seus suas meu minha meus minhas nosso nossa ser estar ter tem têm há foi são sao é era " +
    "explique explica explicar explicação explicacao fale falar me diga dizer mostre mostrar sobre " +
    "funciona funcionamento oque o que significa significado defina definição definicao " +
    "the of and to in is are what how why which for on with about"
  ).split(/\s+/)
);

/** Remove acentos e baixa caixa */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Extrai termos chave da pergunta: frases entre aspas, bigramas e palavras relevantes.
 * Retorna termos já normalizados (sem acento, minúsculos), do mais específico ao mais genérico.
 */
export function extractKeyTerms(question: string, max = 8): string[] {
  const terms: string[] = [];
  const push = (t: string) => {
    const n = normalizeText(t).replace(/\s+/g, " ").trim();
    if (n.length >= 3 && !terms.includes(n)) terms.push(n);
  };

  // Frases entre aspas
  Array.from(question.matchAll(/["“”']([^"“”']{3,80})["“”']/g)).forEach((m) => push(m[1]));

  const words = normalizeText(question)
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const content = words.filter((w) => !STOPWORDS.has(w) && w.length >= 3);

  // Bigramas de palavras relevantes adjacentes na pergunta original
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (!STOPWORDS.has(a) && !STOPWORDS.has(b) && a.length >= 3 && b.length >= 3) push(`${a} ${b}`);
  }
  // Palavras soltas, mais longas primeiro (mais específicas)
  [...content].sort((x, y) => y.length - x.length).forEach(push);

  return terms.slice(0, max);
}

/**
 * Reciprocal Rank Fusion entre listas ranqueadas.
 */
export function reciprocalRankFusion(
  lists: Array<{ kind: "vector" | "keyword"; items: RetrievedChunk[]; weight?: number }>,
  k = 60
): RankedChunk[] {
  const map = new Map<number, RankedChunk>();
  for (const list of lists) {
    const w = list.weight ?? 1;
    list.items.forEach((item, rank) => {
      const existing = map.get(item.chunk_id);
      const add = w / (k + rank + 1);
      if (existing) {
        existing.score += add;
        if (!existing.matchedBy.includes(list.kind)) existing.matchedBy.push(list.kind);
        existing.similarity = Math.max(existing.similarity ?? 0, item.similarity ?? 0);
      } else {
        map.set(item.chunk_id, { ...item, score: add, matchedBy: [list.kind] });
      }
    });
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

/** Estimativa simples de tokens (aprox. 4 caracteres por token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Seleciona os trechos finais com diversidade de fontes:
 * primeiro o melhor trecho de cada fonte (round robin), depois completa,
 * respeitando limite por fonte, total e orçamento de tokens.
 */
export function selectDiverse(
  ranked: RankedChunk[],
  opts: { maxChunks?: number; maxPerSource?: number; tokenBudget?: number } = {}
): RankedChunk[] {
  const maxChunks = opts.maxChunks ?? 14;
  const maxPerSource = opts.maxPerSource ?? 4;
  const tokenBudget = opts.tokenBudget ?? 9000;

  const bySource = new Map<number, RankedChunk[]>();
  for (const c of ranked) {
    const arr = bySource.get(c.source_id) ?? [];
    arr.push(c);
    bySource.set(c.source_id, arr);
  }
  // Ordem das fontes pelo melhor trecho
  const sources = Array.from(bySource.entries()).sort((a, b) => b[1][0].score - a[1][0].score);

  const selected: RankedChunk[] = [];
  let tokens = 0;
  const perSource = new Map<number, number>();
  let round = 0;
  let added = true;
  while (selected.length < maxChunks && added) {
    added = false;
    for (const [sourceId, chunks] of sources) {
      if (selected.length >= maxChunks) break;
      const used = perSource.get(sourceId) ?? 0;
      if (used >= maxPerSource || round >= chunks.length) continue;
      const chunk = chunks[round];
      const t = estimateTokens(chunk.content);
      if (tokens + t > tokenBudget && selected.length > 0) continue;
      selected.push(chunk);
      tokens += t;
      perSource.set(sourceId, used + 1);
      added = true;
    }
    round++;
  }
  // Mantém a ordem por relevância
  return selected.sort((a, b) => b.score - a.score);
}

/** URLs de imagem presentes nos trechos (não inventa nada, só repassa o que existe) */
export function extractImageUrls(chunks: Array<{ content: string; metadata?: any }>, max = 6): string[] {
  const urls: string[] = [];
  const re = /https?:\/\/[^\s)"'<>]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s)"'<>]*)?/gi;
  for (const c of chunks) {
    const text = `${c.content} ${c.metadata ? JSON.stringify(c.metadata) : ""}`;
    for (const m of Array.from(text.matchAll(re))) {
      if (!urls.includes(m[0])) urls.push(m[0]);
      if (urls.length >= max) return urls;
    }
  }
  return urls;
}

/**
 * Seleciona trechos de código variando os arquivos (limite por arquivo) dentro do orçamento.
 */
export function selectCodeChunks(
  ranked: RankedChunk[],
  opts: { maxChunks?: number; maxPerFile?: number; tokenBudget?: number } = {}
): RankedChunk[] {
  const maxChunks = opts.maxChunks ?? 6;
  const maxPerFile = opts.maxPerFile ?? 2;
  const tokenBudget = opts.tokenBudget ?? 4500;
  const perFile = new Map<string, number>();
  const out: RankedChunk[] = [];
  let tokens = 0;
  for (const c of ranked) {
    if (out.length >= maxChunks) break;
    const file = `${c.source_id}:${c.metadata?.filePath ?? c.chunk_id}`;
    const used = perFile.get(file) ?? 0;
    if (used >= maxPerFile) continue;
    const t = estimateTokens(c.content);
    if (tokens + t > tokenBudget && out.length > 0) continue;
    out.push(c);
    tokens += t;
    perFile.set(file, used + 1);
  }
  return out;
}

/** Junta trechos de documentos e de código, sem duplicar, mantendo a ordem por relevância */
export function mergeWithCode(docs: RankedChunk[], code: RankedChunk[]): RankedChunk[] {
  const seen = new Set<number>();
  const out: RankedChunk[] = [];
  for (const c of [...docs, ...code]) {
    if (seen.has(c.chunk_id)) continue;
    seen.add(c.chunk_id);
    out.push(c);
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Trechos de débitos técnicos e propostas de melhoria que falam do assunto da pergunta.
 * Só entra o que foi achado pelo texto exato ou com similaridade suficiente, para não
 * trazer débitos de outros assuntos. Se nada passar, a resposta não ganha a seção.
 */
export function selectTechDebtChunks(
  ranked: RankedChunk[],
  opts: { minSimilarity?: number; maxChunks?: number; maxPerSource?: number; tokenBudget?: number } = {}
): RankedChunk[] {
  const minSimilarity = opts.minSimilarity ?? 0.4;
  const relevant = ranked.filter(
    (c) => c.matchedBy.includes("keyword") || (c.similarity ?? 0) >= minSimilarity
  );
  return selectDiverse(relevant, {
    maxChunks: opts.maxChunks ?? 5,
    maxPerSource: opts.maxPerSource ?? 3,
    tokenBudget: opts.tokenBudget ?? 2500,
  });
}
