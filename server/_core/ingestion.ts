/**
 * Knowledge ingestion service
 * Processes code, documents, and stories into chunks with embeddings
 */

import OpenAI from "openai";
import { ENV } from "./env";
import * as knowledgeDb from "../knowledge-db";
import { getGlobalLlmConfig } from "../db";
import unzipper from "unzipper";
import { createReadStream } from "fs";
import { readFile } from "fs/promises";
import path from "path";

// Text processing utilities
const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks for context

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}

/**
 * Get OpenAI client for embeddings
 */
async function getOpenAIClient(): Promise<OpenAI> {
  const llmConfig = await getGlobalLlmConfig();
  const apiKey = llmConfig?.apiKey || process.env.OPENAI_API_KEY || ENV.forgeApiKey;
  
  if (!apiKey) {
    throw new Error("OpenAI API key not configured. Configure in LLM settings or OPENAI_API_KEY env var.");
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = await getOpenAIClient();
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  
  console.log(`[Ingestion] Generating embedding for text (${text.length} chars) with model ${model}`);
  
  const response = await openai.embeddings.create({
    model,
    input: text,
  });
  
  return response.data[0].embedding;
}

/**
 * Process a code repository from ZIP file
 */
export async function ingestCodeZip(
  sourceId: number,
  companyId: number,
  zipPath: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`[Ingestion] Starting code ingestion from ZIP: ${zipPath}`);
  
  const files: Array<{ path: string; content: string }> = [];
  
  // Extract files from ZIP
  const directory = await unzipper.Open.file(zipPath);
  
  for (const file of directory.files) {
    // Skip directories and non-text files
    if (file.type === 'Directory') continue;
    
    const ext = path.extname(file.path).toLowerCase();
    const textExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rb', '.php', '.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.sql'];
    
    if (!textExtensions.includes(ext)) continue;
    
    try {
      const buffer = await file.buffer();
      const content = buffer.toString('utf-8');
      files.push({ path: file.path, content });
    } catch (error) {
      console.error(`[Ingestion] Failed to read file ${file.path}:`, error);
    }
  }
  
  console.log(`[Ingestion] Found ${files.length} text files to process`);
  
  // Process each file
  let processed = 0;
  let totalEmbeddings = 0;
  for (const file of files) {
    const result = await ingestTextContent(sourceId, companyId, file.content, {
      filePath: file.path,
      fileType: 'code',
    });
    totalEmbeddings += result.embeddingsCreated;
    
    processed++;
    if (onProgress) {
      onProgress(processed, files.length);
    }
  }
  
  console.log(`[Ingestion] Code ingestion completed: ${processed} files, ${totalEmbeddings} embeddings`);
}

/**
 * Resolve file extension from metadata or file path
 */
export function resolveFileExtension(filePath: string, fileName: string, metadata?: any): string {
  // Try metadata.originalFileName first (from upload)
  if (metadata?.originalFileName) {
    const ext = path.extname(metadata.originalFileName).toLowerCase();
    if (ext) {
      return ext;
    }
  }
  
  // Fall back to filePath (stored file keeps original extension)
  const extFromPath = path.extname(filePath).toLowerCase();
  if (extFromPath) {
    return extFromPath;
  }
  
  // Last resort: try fileName
  return path.extname(fileName).toLowerCase();
}

/**
 * Process a single document file
 */
export async function ingestDocument(
  sourceId: number,
  companyId: number,
  filePath: string,
  fileName: string,
  metadata?: any,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`[Ingestion] Starting document ingestion: ${fileName}`);
  
  const ext = resolveFileExtension(filePath, fileName, metadata);
  let text = '';
  
  try {
    if (ext === '.txt' || ext === '.md') {
      // Plain text files
      text = await readFile(filePath, 'utf-8');
    } else if (ext === '.csv') {
      // CSV files - convert to readable text format
      console.log(`[Ingestion] Parsing CSV: ${fileName}`);
      const csvContent = await readFile(filePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return headers.map((header, idx) => `${header}: ${values[idx] || ''}`).join('\n');
        });
        
        text = `Tabela CSV: ${fileName}\n\n` + rows.join('\n\n---\n\n');
      } else {
        text = 'CSV vazio';
      }
      
      console.log(`[Ingestion] Extracted ${text.length} characters from CSV (${lines.length - 1} rows)`);
    } else if (ext === '.pdf') {
      // PDF files using pdf-parse
      console.log(`[Ingestion] Parsing PDF: ${fileName}`);
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = await readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
      console.log(`[Ingestion] Extracted ${text.length} characters from PDF`);
    } else if (ext === '.docx') {
      // DOCX files using mammoth
      console.log(`[Ingestion] Parsing DOCX: ${fileName}`);
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
      console.log(`[Ingestion] Extracted ${text.length} characters from DOCX`);
      
      if (result.messages.length > 0) {
        console.warn(`[Ingestion] DOCX parsing warnings:`, result.messages);
      }
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
    
    const result = await ingestTextContent(sourceId, companyId, text, {
      fileName,
      fileType: 'document',
    });
    
    if (onProgress) {
      onProgress(1, 1);
    }
    
    console.log(`[Ingestion] Document ingestion completed: ${fileName}, ${result.embeddingsCreated} embeddings`);
  } catch (error) {
    console.error(`[Ingestion] Failed to ingest document ${fileName}:`, error);
    throw error;
  }
}

/**
 * Process existing user stories from the database
 */
export async function ingestUserStories(
  sourceId: number,
  companyId: number,
  teamId: number | null,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`[Ingestion] Starting user stories ingestion for company ${companyId}, team ${teamId}`);
  
  // Import dynamically to avoid circular dependency
  const { getUserStoriesByFeatureId } = await import("../db");
  const { getFeaturesByUserId } = await import("../db");
  const { getCompanyMembers } = await import("../knowledge-db");
  
  // Get all company members
  const members = await getCompanyMembers(companyId);
  const userIds = members.map(m => m.userId);
  
  // Get all features for company members
  const allFeatures = await Promise.all(
    userIds.map(userId => getFeaturesByUserId(userId))
  );
  
  const features = allFeatures.flat();
  console.log(`[Ingestion] Found ${features.length} features`);
  
  // Get all stories for these features
  const allStories = await Promise.all(
    features.map(f => getUserStoriesByFeatureId(f.id))
  );
  
  const stories = allStories.flat();
  console.log(`[Ingestion] Found ${stories.length} user stories`);
  
  // Process each story
  let processed = 0;
  let totalEmbeddings = 0;
  for (const story of stories) {
    const text = `
Title: ${story.title}

Description: ${story.description}

Priority: ${story.priority}
Story Points: ${story.storyPoints || 'N/A'}

Acceptance Criteria:
${story.acceptanceCriteria?.map((c, i) => `${i + 1}. ${c.criterion}`).join('\n') || 'None'}

Tasks:
${story.tasks?.map((t, i) => `${i + 1}. ${t.title}\n   ${t.description || ''}\n   Estimated: ${t.estimatedHours || 0}h`).join('\n\n') || 'None'}
`.trim();
    
    const result = await ingestTextContent(sourceId, companyId, text, {
      storyId: story.id,
      featureId: story.featureId,
      storyTitle: story.title,
      fileType: 'story',
    });
    totalEmbeddings += result.embeddingsCreated;
    
    processed++;
    if (onProgress) {
      onProgress(processed, stories.length);
    }
  }
  
  console.log(`[Ingestion] User stories ingestion completed: ${processed} stories, ${totalEmbeddings} embeddings`);
}

/**
 * Core function to ingest text content: chunk, embed, and store
 * Returns the number of embeddings successfully created
 */
export async function ingestTextContent(
  sourceId: number,
  companyId: number,
  text: string,
  metadata: Record<string, any>
): Promise<{ chunksCreated: number; embeddingsCreated: number }> {
  console.log(`[Ingestion] Processing text content: ${text.length} chars`);
  
  // Split into chunks
  const chunks = chunkText(text);
  console.log(`[Ingestion] Created ${chunks.length} chunks`);
  
  let embeddingsCreated = 0;
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Store chunk
    const chunkId = await knowledgeDb.createKnowledgeChunk({
      sourceId,
      companyId,
      content: chunk,
      metadata: {
        ...metadata,
        chunkIndex: i,
        totalChunks: chunks.length,
      },
      chunkIndex: i,
      tokenCount: Math.ceil(chunk.length / 4), // Rough estimate: 1 token ≈ 4 chars
    });
    
    // Generate and store embedding
    try {
      const embedding = await generateEmbedding(chunk);
      
      await knowledgeDb.createKnowledgeEmbedding({
        chunkId,
        companyId,
        embedding: embedding as any, // pgvector will handle the array
        model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      });
      
      embeddingsCreated++;
      console.log(`[Ingestion] Processed chunk ${i + 1}/${chunks.length} (embeddings: ${embeddingsCreated})`);
    } catch (error) {
      console.error(`[Ingestion] Failed to generate embedding for chunk ${i}:`, error);
      // Continue processing remaining chunks instead of throwing
      // This allows partial success (some embeddings created)
    }
  }
  
  console.log(`[Ingestion] Text content ingestion completed: ${chunks.length} chunks, ${embeddingsCreated} embeddings`);
  
  return { chunksCreated: chunks.length, embeddingsCreated };
}

/**
 * Main ingestion orchestrator
 */
export async function processKnowledgeSource(
  sourceId: number,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  console.log(`[Ingestion] Starting processing for source ${sourceId}`);
  
  // Get source details
  const source = await knowledgeDb.getKnowledgeSourceById(sourceId);
  if (!source) {
    throw new Error(`Knowledge source ${sourceId} not found`);
  }
  
  // Update status to processing
  await knowledgeDb.updateKnowledgeSource(sourceId, {
    status: 'processing',
    processedChunks: 0,
  });
  
  try {
    if (source.type === 'code_repo') {
      // Process code repository
      if (!source.sourceUrl) {
        throw new Error('Source URL is required for code repository');
      }
      
      await ingestCodeZip(sourceId, source.companyId, source.sourceUrl, onProgress);
    } else if (source.type === 'document') {
      // Process document
      if (!source.sourceUrl) {
        throw new Error('Source URL is required for document');
      }
      
      await ingestDocument(
        sourceId,
        source.companyId,
        source.sourceUrl,
        source.name,
        source.metadata,
        onProgress
      );
    } else if (source.type === 'story') {
      // Process user stories
      await ingestUserStories(
        sourceId,
        source.companyId,
        source.teamId,
        onProgress
      );
    } else if (source.type === 'miro_board') {
      // Process Miro board
      if (!source.sourceUrl) {
        throw new Error('Board URL is required for Miro board');
      }
      
      const { ingestMiroBoard } = await import('./miro-ingestion');
      await ingestMiroBoard(sourceId, source.companyId, source.sourceUrl, onProgress);
    }
    
    // Get final chunk count
    const chunks = await knowledgeDb.getKnowledgeChunksBySourceId(sourceId);
    
    // Count embeddings created
    const embeddingsCount = await knowledgeDb.countEmbeddingsBySourceId(sourceId);
    
    console.log(`[Ingestion] Source ${sourceId} completed: ${chunks.length} chunks, ${embeddingsCount} embeddings`);
    
    // If no embeddings were created, mark as failed
    if (chunks.length > 0 && embeddingsCount === 0) {
      await knowledgeDb.updateKnowledgeSource(sourceId, {
        status: 'failed',
        totalChunks: chunks.length,
        processedChunks: chunks.length,
        errorMessage: 'No embeddings were created. Check OPENAI_API_KEY configuration or embedding service logs.',
      });
      
      throw new Error(`Source ${sourceId} completed with 0 embeddings (${chunks.length} chunks created)`);
    }
    
    // Update status to completed
    await knowledgeDb.updateKnowledgeSource(sourceId, {
      status: 'completed',
      totalChunks: chunks.length,
      processedChunks: chunks.length,
    });
    
    console.log(`[Ingestion] Source ${sourceId} processing completed successfully`);
  } catch (error) {
    console.error(`[Ingestion] Source ${sourceId} processing failed:`, error);
    
    // Update status to failed
    await knowledgeDb.updateKnowledgeSource(sourceId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    
    throw error;
  }
}
