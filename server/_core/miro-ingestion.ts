/**
 * Miro board ingestion service
 * Fetches board items from Miro REST API and ingests into knowledge base
 */

import { ingestTextContent } from "./ingestion";
import * as knowledgeDb from "../knowledge-db";

const MIRO_API_BASE = "https://api.miro.com/v2";

interface MiroItem {
  id: string;
  type: string;
  data?: {
    content?: string;
    title?: string;
    shape?: string;
  };
  position?: {
    x: number;
    y: number;
  };
  parentId?: string;
}

interface MiroFrame {
  id: string;
  title?: string;
  items: MiroItem[];
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
 * Get Miro API token from environment
 */
function getMiroToken(): string {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MIRO_ACCESS_TOKEN não configurado. Configure no .env.local');
  }
  return token;
}

/**
 * Fetch all items from a Miro board
 */
async function fetchBoardItems(boardId: string): Promise<MiroItem[]> {
  const token = getMiroToken();
  const items: MiroItem[] = [];
  let cursor: string | undefined;

  console.log(`[Miro] Fetching items from board ${boardId}`);

  do {
    const url = new URL(`${MIRO_API_BASE}/boards/${boardId}/items`);
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }
    url.searchParams.set('limit', '50'); // Max per page

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Miro API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    items.push(...(data.data || []));
    cursor = data.cursor;

    console.log(`[Miro] Fetched ${data.data?.length || 0} items (total: ${items.length})`);
  } while (cursor);

  return items;
}

/**
 * Fetch frames from a Miro board
 */
async function fetchBoardFrames(boardId: string): Promise<MiroFrame[]> {
  const token = getMiroToken();
  const frames: MiroFrame[] = [];
  let cursor: string | undefined;

  console.log(`[Miro] Fetching frames from board ${boardId}`);

  do {
    const url = new URL(`${MIRO_API_BASE}/boards/${boardId}/items`);
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }
    url.searchParams.set('limit', '50');
    url.searchParams.set('type', 'frame'); // Filter by frames

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Miro API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (data.data) {
      for (const frame of data.data) {
        frames.push({
          id: frame.id,
          title: frame.data?.title || `Frame ${frame.id}`,
          items: [],
        });
      }
    }

    cursor = data.cursor;
  } while (cursor);

  console.log(`[Miro] Found ${frames.length} frames`);
  return frames;
}

/**
 * Extract text content from a Miro item
 */
function extractItemText(item: MiroItem): string | null {
  // Sticky notes
  if (item.type === 'sticky_note' && item.data?.content) {
    return item.data.content;
  }
  
  // Text items
  if (item.type === 'text' && item.data?.content) {
    return item.data.content;
  }
  
  // Cards
  if (item.type === 'card') {
    const parts: string[] = [];
    if (item.data?.title) parts.push(item.data.title);
    if (item.data?.content) parts.push(item.data.content);
    return parts.length > 0 ? parts.join('\n\n') : null;
  }
  
  // Shapes with text
  if (item.type === 'shape' && item.data?.content) {
    return item.data.content;
  }
  
  // App cards (embeds)
  if (item.type === 'app_card' && item.data?.title) {
    return item.data.title;
  }
  
  return null;
}

/**
 * Group items by frame
 */
function groupItemsByFrame(items: MiroItem[], frames: MiroFrame[]): Map<string, MiroItem[]> {
  const frameMap = new Map<string, MiroItem[]>();
  
  // Initialize frames
  frames.forEach(frame => {
    frameMap.set(frame.id, []);
  });
  
  // Add "unframed" group
  frameMap.set('__unframed__', []);
  
  // Group items
  items.forEach(item => {
    if (item.parentId && frameMap.has(item.parentId)) {
      frameMap.get(item.parentId)!.push(item);
    } else {
      frameMap.get('__unframed__')!.push(item);
    }
  });
  
  return frameMap;
}

/**
 * Process and ingest a Miro board
 */
export async function ingestMiroBoard(
  sourceId: number,
  companyId: number,
  boardUrl: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`[Miro] Starting ingestion from board URL: ${boardUrl}`);
  
  // Extract board ID
  const boardId = extractBoardId(boardUrl);
  if (!boardId) {
    throw new Error('URL do Miro inválida. Use o formato: https://miro.com/app/board/<id>/');
  }
  
  console.log(`[Miro] Board ID: ${boardId}`);
  
  // Fetch items and frames
  const [items, frames] = await Promise.all([
    fetchBoardItems(boardId),
    fetchBoardFrames(boardId),
  ]);
  
  console.log(`[Miro] Processing ${items.length} items in ${frames.length} frames`);
  
  // Group items by frame
  const frameMap = groupItemsByFrame(items, frames);
  
  // Process each frame
  let processed = 0;
  const totalFrames = frameMap.size;
  
  for (const [frameId, frameItems] of frameMap) {
    const frame = frames.find(f => f.id === frameId);
    const frameName = frame?.title || (frameId === '__unframed__' ? 'Items sem frame' : frameId);
    
    console.log(`[Miro] Processing frame: ${frameName} (${frameItems.length} items)`);
    
    // Extract text from all items in frame
    const texts: string[] = [];
    
    for (const item of frameItems) {
      const text = extractItemText(item);
      if (text) {
        texts.push(`[${item.type}] ${text}`);
      }
    }
    
    if (texts.length > 0) {
      // Combine all texts for this frame
      const frameContent = `
# ${frameName}

${texts.join('\n\n')}
`.trim();
      
      // Ingest frame content
      await ingestTextContent(sourceId, companyId, frameContent, {
        boardId,
        frameId: frameId === '__unframed__' ? null : frameId,
        frameName,
        itemCount: frameItems.length,
        fileType: 'miro_board',
      });
    }
    
    processed++;
    if (onProgress) {
      onProgress(processed, totalFrames);
    }
  }
  
  console.log(`[Miro] Ingestion completed: ${processed} frames processed`);
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
