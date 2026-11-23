/**
 * Miro board ingestion service
 * Lê tudo o que a API REST v2 do Miro expõe com texto (itens, frames, conectores,
 * mind maps e dados do board) e grava na base de conhecimento, agrupado por frame.
 */

import { ingestTextContent } from "./ingestion";
import * as knowledgeDb from "../knowledge-db";

const MIRO_API_BASE = "https://api.miro.com/v2";
const MIRO_API_EXPERIMENTAL = "https://api.miro.com/v2-experimental";

interface MiroItem {
  id: string;
  type: string;
  data?: Record<string, any>;
  position?: { x: number; y: number };
  parent?: { id?: string } | null;
  parentId?: string;
  tagIds?: string[];
}

interface MiroConnector {
  id: string;
  startItem?: { id?: string };
  endItem?: { id?: string };
  captions?: Array<{ content?: string }>;
}

interface MiroMindmapNode {
  id: string;
  parent?: { id?: string } | null;
  data?: { nodeView?: { data?: { content?: string } }; content?: string };
}

/**
 * Extract board ID from Miro URL
 * Formats: 
 * - https://miro.com/app/board/<boardId>/
 * - https://miro.com/app/board/<boardId>
 */
export function extractBoardId(url: string): string | null {
  const patterns = [
    /miro\.com\/app\/board\/([^\/\?]+)/,
    /miro\.com\/board\/([^\/\?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Token da conexão (salvo na fonte) ou, se não houver, MIRO_ACCESS_TOKEN do servidor
 */
function getMiroToken(sourceToken?: string | null): string {
  const token = sourceToken || process.env.MIRO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Informe o token de acesso do Miro na conexão (ou configure MIRO_ACCESS_TOKEN no servidor).');
  }
  return token;
}

async function miroGet(url: string, token: string): Promise<any> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) throw new Error("Token do Miro inválido ou expirado.");
    if (response.status === 403 || response.status === 404) {
      throw new Error(`O token do Miro não tem acesso a este board (${response.status}). Verifique o escopo boards:read e se o app foi instalado na equipe do board.`);
    }
    throw new Error(`Miro API error: ${response.status} - ${error}`);
  }
  return response.json();
}

/** Percorre todas as páginas de um endpoint paginado por cursor */
async function miroGetAll<T>(baseUrl: string, token: string, label: string): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(baseUrl);
    url.searchParams.set("limit", "50");
    if (cursor) url.searchParams.set("cursor", cursor);
    const data = await miroGet(url.toString(), token);
    out.push(...(data.data || []));
    cursor = data.cursor || undefined;
  } while (cursor);
  console.log(`[Miro] ${label}: ${out.length}`);
  return out;
}

/** Remove HTML do conteúdo do Miro mantendo quebras de linha */
export function htmlToText(html: unknown): string {
  if (typeof html !== "string") return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const TYPE_LABELS: Record<string, string> = {
  sticky_note: "post-it",
  text: "texto",
  shape: "forma",
  card: "card",
  app_card: "app card",
  image: "imagem",
  document: "documento",
  embed: "embed",
  frame: "frame",
};

/**
 * Extrai o texto de um item do Miro, qualquer que seja o tipo
 */
export function extractItemText(item: MiroItem): string | null {
  const d = item.data ?? {};
  const parts: string[] = [];
  const push = (v: unknown, prefix = "") => {
    const t = htmlToText(v);
    if (t) parts.push(prefix + t);
  };

  switch (item.type) {
    case "card":
      push(d.title);
      push(d.description);
      if (d.dueDate) parts.push(`Prazo: ${String(d.dueDate).slice(0, 10)}`);
      break;
    case "app_card":
      push(d.title);
      push(d.description);
      if (d.status) parts.push(`Status: ${d.status}`);
      for (const f of Array.isArray(d.fields) ? d.fields : []) {
        const value = htmlToText(f?.value);
        const label = htmlToText(f?.tooltip);
        if (value) parts.push(label ? `${label}: ${value}` : value);
      }
      break;
    case "image":
    case "document":
      push(d.title);
      push(d.altText);
      break;
    case "embed":
      push(d.title);
      push(d.description);
      if (d.url) parts.push(`${d.providerName ? `${d.providerName}: ` : ""}${d.url}`);
      break;
    case "frame":
      push(d.title);
      break;
    default:
      push(d.content);
      push(d.title);
      push(d.description);
      push(d.text);
  }

  const text = parts.join("\n").trim();
  return text || null;
}

function parentOf(item: { parent?: { id?: string } | null; parentId?: string }): string | null {
  return item.parent?.id ?? item.parentId ?? null;
}

function byPosition(a: MiroItem, b: MiroItem) {
  const ay = a.position?.y ?? 0;
  const by = b.position?.y ?? 0;
  if (Math.abs(ay - by) > 20) return ay - by;
  return (a.position?.x ?? 0) - (b.position?.x ?? 0);
}

function shortLabel(text: string | null | undefined, max = 80): string | null {
  if (!text) return null;
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function envFlag(name: string, fallback: boolean): boolean {
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return !["0", "false", "off", "no", "nao", "não"].includes(raw);
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Baixa a imagem de um item do Miro e devolve como data URL (para mandar à IA) */
async function fetchImageDataUrl(imageUrl: string, token: string): Promise<string | null> {
  for (const format of ["original", "preview"]) {
    const resourceUrl = new URL(imageUrl);
    resourceUrl.searchParams.set("format", format);
    resourceUrl.searchParams.set("redirect", "false");
    const meta = await miroGet(resourceUrl.toString(), token).catch(() => null);
    const fileUrl: string | undefined = meta?.url;
    if (!fileUrl) continue;
    const res = await fetch(fileUrl);
    if (!res.ok) continue;
    const type = (res.headers.get("content-type") ?? "image/png").split(";")[0];
    if (!type.startsWith("image/") || type.includes("svg")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) continue;
    return `data:${type};base64,${buf.toString("base64")}`;
  }
  return null;
}

/** Roda tarefas com no máximo `limit` ao mesmo tempo */
async function runPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await task(items[next++]);
  });
  await Promise.all(workers);
}

function renderMindmap(nodes: MiroMindmapNode[]): string[] {
  const children = new Map<string | null, MiroMindmapNode[]>();
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    const p = parentOf(n);
    const key = p && ids.has(p) ? p : null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(n);
  }
  const lines: string[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const n of children.get(parent) ?? []) {
      const text = htmlToText(n.data?.nodeView?.data?.content ?? n.data?.content);
      if (text) lines.push(`${"  ".repeat(depth)}- ${text.replace(/\n/g, " ")}`);
      walk(n.id, depth + 1);
    }
  };
  walk(null, 0);
  return lines;
}

/**
 * Process and ingest a Miro board
 */
export async function ingestMiroBoard(
  sourceId: number,
  companyId: number,
  boardUrl: string,
  onProgress?: (current: number, total: number) => void,
  sourceToken?: string | null
): Promise<void> {
  console.log(`[Miro] Starting ingestion from board URL: ${boardUrl}`);
  
  const boardId = extractBoardId(boardUrl);
  if (!boardId) {
    throw new Error('URL do Miro inválida. Use o formato: https://miro.com/app/board/<id>/');
  }
  
  console.log(`[Miro] Board ID: ${boardId}`);
  
  const token = getMiroToken(sourceToken);
  const boardPath = `${MIRO_API_BASE}/boards/${encodeURIComponent(boardId)}`;

  const [board, items, connectors, tags, mindmapNodes] = await Promise.all([
    miroGet(boardPath, token).catch((err) => {
      console.warn(`[Miro] Não foi possível ler os dados do board: ${err.message}`);
      return null;
    }),
    miroGetAll<MiroItem>(`${boardPath}/items`, token, "Itens"),
    miroGetAll<MiroConnector>(`${boardPath}/connectors`, token, "Conectores").catch((err) => {
      console.warn(`[Miro] Conectores indisponíveis: ${err.message}`);
      return [] as MiroConnector[];
    }),
    miroGetAll<{ id: string; title?: string }>(`${boardPath}/tags`, token, "Tags").catch(() => []),
    miroGetAll<MiroMindmapNode>(
      `${MIRO_API_EXPERIMENTAL}/boards/${encodeURIComponent(boardId)}/mindmap_nodes`,
      token,
      "Nós de mind map"
    ).catch(() => [] as MiroMindmapNode[]),
  ]);

  const boardName = htmlToText(board?.name) || `Board ${boardId}`;
  const boardDescription = htmlToText(board?.description);
  const tagTitles = new Map(tags.map((t) => [t.id, htmlToText(t.title)]));

  const textById = new Map<string, string>();
  for (const item of items) {
    const text = extractItemText(item);
    if (text) textById.set(item.id, text);
  }

  // Agrupa por frame (itens fora de frame ficam juntos)
  const frames = items.filter((i) => i.type === "frame");
  const frameIds = new Set(frames.map((f) => f.id));
  const groups = new Map<string, MiroItem[]>();
  for (const f of frames) groups.set(f.id, []);
  groups.set("__unframed__", []);
  for (const item of items) {
    if (item.type === "frame") continue;
    const p = parentOf(item);
    groups.get(p && frameIds.has(p) ? p : "__unframed__")!.push(item);
  }

  const frameOf = new Map<string, string>();
  for (const [frameId, groupItems] of Array.from(groups)) for (const i of groupItems) frameOf.set(i.id, frameId);
  const frameNameOf = (frameId: string) => {
    const frame = frames.find((f) => f.id === frameId);
    return frame ? extractItemText(frame) || `Frame ${frameId}` : "Itens sem frame";
  };

  const userId = (await knowledgeDb.getKnowledgeSourceById(sourceId))?.createdBy;
  const knowledgeAi = await import("./knowledge-ai");

  // Imagens viram texto com IA (transcrição + explicação de diagramas e telas)
  let imagesDescribed = 0;
  const images = items.filter((i) => i.type === "image" && typeof i.data?.imageUrl === "string");
  if (images.length > 0 && envFlag("KNOWLEDGE_MIRO_IMAGES", true)) {
    const maxImages = parseInt(process.env.KNOWLEDGE_MIRO_MAX_IMAGES || "40", 10);
    const selected = images.slice(0, maxImages);
    if (images.length > selected.length) {
      console.warn(`[Miro] ${images.length} imagens no board; descrevendo só as ${selected.length} primeiras (KNOWLEDGE_MIRO_MAX_IMAGES)`);
    }
    await runPool(selected, 3, async (img) => {
      try {
        const dataUrl = await fetchImageDataUrl(img.data!.imageUrl, token);
        if (!dataUrl) return;
        const title = htmlToText(img.data?.title);
        const description = await knowledgeAi.aiDescribeImage(
          dataUrl,
          { boardName, frameName: frameNameOf(frameOf.get(img.id) ?? "__unframed__"), title: title || null },
          userId
        );
        if (!description) return;
        textById.set(img.id, title ? `${title}\n${description}` : description);
        imagesDescribed++;
      } catch (err) {
        console.warn(`[Miro] Não foi possível descrever a imagem ${img.id}:`, err instanceof Error ? err.message : err);
      }
    });
    console.log(`[Miro] Imagens descritas com IA: ${imagesDescribed}/${selected.length}`);
  }

  const typeCounts = items.reduce<Record<string, number>>((acc, item) => {
    const key = `${item.type}${textById.has(item.id) ? "" : " (sem texto)"}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[Miro] Tipos de item: ${JSON.stringify(typeCounts)}`);

  // Conectores viram relações "A → B (legenda)", no frame do item de origem
  const relationsByGroup = new Map<string, string[]>();
  const edgesByGroup = new Map<string, MiroConnector[]>();
  for (const c of connectors) {
    const from = shortLabel(c.startItem?.id ? textById.get(c.startItem.id) : null);
    const to = shortLabel(c.endItem?.id ? textById.get(c.endItem.id) : null);
    const caption = (c.captions ?? []).map((cap) => htmlToText(cap.content)).filter(Boolean).join(" / ");
    if (!from && !to && !caption) continue;
    const line = `- ${from ?? "(item sem texto)"} → ${to ?? "(item sem texto)"}${caption ? ` (${caption})` : ""}`;
    const group = (c.startItem?.id && frameOf.get(c.startItem.id)) || "__unframed__";
    if (!relationsByGroup.has(group)) relationsByGroup.set(group, []);
    relationsByGroup.get(group)!.push(line);
    if (!edgesByGroup.has(group)) edgesByGroup.set(group, []);
    edgesByGroup.get(group)!.push(c);
  }

  const itemById = new Map(items.map((i) => [i.id, i]));
  const describeFlows = envFlag("KNOWLEDGE_MIRO_FLOWS", true);
  let flowsDescribed = 0;

  /** Fluxo do frame (formas + setas) narrado pela IA */
  const describeFlow = async (groupId: string, frameName: string): Promise<string> => {
    const edges = (edgesByGroup.get(groupId) ?? []).slice(0, 250);
    if (!describeFlows || edges.length < 2) return "";
    const shortIds = new Map<string, string>();
    const idFor = (miroId?: string) => {
      const key = miroId ?? `?${shortIds.size}`;
      if (!shortIds.has(key)) shortIds.set(key, `n${shortIds.size + 1}`);
      return shortIds.get(key)!;
    };
    const flowEdges = edges.map((c) => ({
      from: idFor(c.startItem?.id),
      to: idFor(c.endItem?.id),
      caption: (c.captions ?? []).map((cap) => htmlToText(cap.content)).filter(Boolean).join(" / ") || undefined,
    }));
    const nodes = Array.from(shortIds).map(([miroId, id]) => {
      const item = itemById.get(miroId);
      return {
        id,
        type: item ? TYPE_LABELS[item.type] ?? item.type : "item",
        label: shortLabel(textById.get(miroId), 240) ?? "(sem texto)",
      };
    });
    try {
      const text = await knowledgeAi.aiDescribeFlow({ boardName, frameName }, nodes, flowEdges, userId);
      if (text) flowsDescribed++;
      return text;
    } catch (err) {
      console.warn(`[Miro] Não foi possível descrever o fluxo de "${frameName}":`, err instanceof Error ? err.message : err);
      return "";
    }
  };

  const mindmapLines = renderMindmap(mindmapNodes);
  const totalSteps = groups.size + (mindmapLines.length ? 1 : 0) + (boardDescription ? 1 : 0);
  let processed = 0;
  let framesWithContent = 0;

  if (boardDescription) {
    await ingestTextContent(sourceId, companyId, `# Board: ${boardName}\n\n${boardDescription}`, {
      boardId,
      frameName: "Descrição do board",
      fileType: "miro_board",
    });
    onProgress?.(++processed, totalSteps);
  }

  for (const [frameId, frameItems] of Array.from(groups)) {
    const frame = frames.find((f) => f.id === frameId);
    const frameName = frame ? extractItemText(frame) || `Frame ${frameId}` : "Itens sem frame";

    const lines: string[] = [];
    for (const item of [...frameItems].sort(byPosition)) {
      const text = textById.get(item.id);
      if (!text) continue;
      const itemTags = (item.tagIds ?? item.data?.tagIds ?? [])
        .map((id: string) => tagTitles.get(id))
        .filter(Boolean);
      const label = TYPE_LABELS[item.type] ?? item.type;
      lines.push(`[${label}${itemTags.length ? ` · tags: ${itemTags.join(", ")}` : ""}] ${text}`);
    }
    const relations = relationsByGroup.get(frameId) ?? [];

    if (lines.length > 0 || relations.length > 0) {
      framesWithContent++;
      const flow = await describeFlow(frameId, frameName);
      const content = [
        `# Board: ${boardName}`,
        `## ${frameName}`,
        flow ? `### Descrição do fluxo\n${flow}` : "",
        lines.join("\n\n"),
        relations.length ? `### Conexões entre itens\n${relations.join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      console.log(`[Miro] Frame "${frameName}": ${lines.length} itens com texto, ${relations.length} conexões`);
      await ingestTextContent(sourceId, companyId, content, {
        boardId,
        frameId: frameId === "__unframed__" ? null : frameId,
        frameName,
        itemCount: frameItems.length,
        fileType: "miro_board",
      });
    }

    onProgress?.(++processed, totalSteps);
  }

  if (mindmapLines.length) {
    await ingestTextContent(sourceId, companyId, `# Board: ${boardName}\n## Mind map\n\n${mindmapLines.join("\n")}`, {
      boardId,
      frameName: "Mind map",
      fileType: "miro_board",
    });
    onProgress?.(++processed, totalSteps);
  }

  console.log(
    `[Miro] Ingestion completed: ${framesWithContent} frames com conteúdo, ${textById.size}/${items.length} itens com texto, ` +
      `${connectors.length} conectores, ${mindmapNodes.length} nós de mind map, ` +
      `${imagesDescribed}/${images.length} imagens e ${flowsDescribed} fluxos descritos com IA`
  );

  const fresh = await knowledgeDb.getKnowledgeSourceById(sourceId);
  await knowledgeDb.updateKnowledgeSource(sourceId, {
    metadata: {
      ...((fresh?.metadata as Record<string, unknown>) ?? {}),
      boardId,
      boardName,
      lastIndexedAt: new Date().toISOString(),
      framesIndexed: frames.length,
      itemsIndexed: items.length,
      itemsWithText: textById.size,
      connectorsIndexed: connectors.length,
      mindmapNodesIndexed: mindmapNodes.length,
      imagesTotal: images.length,
      imagesDescribed,
      flowsDescribed,
    },
  });
}

/**
 * Re-sync a Miro board (delete old data and re-ingest)
 */
export async function resyncMiroBoard(
  sourceId: number,
  companyId: number,
  boardUrl: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`[Miro] Re-syncing board from: ${boardUrl}`);
  
  // Delete existing chunks and embeddings
  await knowledgeDb.deleteKnowledgeEmbeddingsBySourceId(sourceId);
  await knowledgeDb.deleteKnowledgeChunksBySourceId(sourceId);
  
  // Re-ingest
  await ingestMiroBoard(sourceId, companyId, boardUrl, onProgress);
}
