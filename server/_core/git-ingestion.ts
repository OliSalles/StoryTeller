/**
 * Indexação de repositórios git como fonte de código da base de conhecimento.
 * GitHub: baixa o zip do commit pela API (token opcional, guardado criptografado).
 * Outros provedores: git clone raso, se o binário git existir no servidor.
 */
import { mkdtemp, rm, writeFile, readFile, readdir, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import unzipper from "unzipper";
import * as knowledgeDb from "../knowledge-db";
import { generateEmbeddings } from "./ingestion";
import { decryptSecret } from "./secret-box";
import { chunkCodeFile, filePriority, languageFor, looksBinary, parseGithubRepo, shouldIndexFile, MAX_FILE_BYTES } from "./code-chunker";

const execFileAsync = promisify(execFile);

const MAX_FILES = parseInt(process.env.KNOWLEDGE_GIT_MAX_FILES || "4000", 10);
const MAX_CHUNKS = parseInt(process.env.KNOWLEDGE_GIT_MAX_CHUNKS || "8000", 10);

export type GitSourceMetadata = {
  kind: "git";
  repoUrl: string;
  branch?: string | null;
  tokenEnc?: string | null;
  hasToken?: boolean;
  resolvedBranch?: string | null;
  lastCommit?: string | null;
  lastIndexedAt?: string | null;
  filesIndexed?: number;
  filesSkipped?: number;
  truncated?: boolean;
};

type RepoFile = { path: string; content: string };

function redact(message: string, token?: string | null): string {
  let m = message;
  if (token) m = m.split(token).join("***");
  return m.replace(/(https?:\/\/)[^@\s/]+@/g, "$1***@");
}

async function githubFetch(url: string, token?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "StoryTeller-Knowledge",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) {
    const hint =
      res.status === 404
        ? "Repositório ou branch não encontrado. Se for privado, informe um token com acesso de leitura."
        : res.status === 401 || res.status === 403
          ? "Sem permissão no GitHub. Verifique o token (precisa de leitura de conteúdo do repositório)."
          : `GitHub respondeu ${res.status}`;
    throw new Error(hint);
  }
  return res;
}

async function readGithubRepo(
  owner: string,
  repo: string,
  branch: string | null | undefined,
  token: string | null
): Promise<{ files: RepoFile[]; commit: string; branch: string; skipped: number }> {
  const api = `https://api.github.com/repos/${owner}/${repo}`;
  let ref = branch?.trim();
  if (!ref) {
    const info = (await (await githubFetch(api, token)).json()) as { default_branch?: string };
    ref = info.default_branch || "main";
  }
  const commitInfo = (await (await githubFetch(`${api}/commits/${encodeURIComponent(ref)}`, token)).json()) as { sha: string };
  const sha = commitInfo.sha;

  const zipRes = await githubFetch(`${api}/zipball/${sha}`, token);
  const dir = await mkdtemp(path.join(tmpdir(), "st-git-"));
  const zipPath = path.join(dir, "repo.zip");
  try {
    await writeFile(zipPath, Buffer.from(await zipRes.arrayBuffer()));
    const archive = await unzipper.Open.file(zipPath);
    const files: RepoFile[] = [];
    let skipped = 0;
    const candidates: Array<{ rel: string; entry: (typeof archive.files)[number] }> = [];
    for (const entry of archive.files) {
      if (entry.type === "Directory") continue;
      // remove a pasta raiz "owner-repo-sha/"
      const rel = entry.path.split("/").slice(1).join("/");
      if (!rel || !shouldIndexFile(rel, entry.uncompressedSize)) {
        skipped++;
        continue;
      }
      candidates.push({ rel, entry });
    }
    candidates.sort((a, b) => filePriority(a.rel) - filePriority(b.rel) || a.rel.localeCompare(b.rel));
    for (const { rel, entry } of candidates) {
      if (files.length >= MAX_FILES) {
        skipped++;
        continue;
      }
      const buf = await entry.buffer();
      if (looksBinary(buf)) {
        skipped++;
        continue;
      }
      files.push({ path: rel, content: buf.toString("utf-8") });
    }
    return { files, commit: sha, branch: ref, skipped };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function walk(dir: string, base: string, out: string[]) {
  for (const name of await readdir(dir)) {
    if (name === ".git") continue;
    const full = path.join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) await walk(full, base, out);
    else out.push(path.relative(base, full).replace(/\\/g, "/"));
  }
}

async function readClonedRepo(
  repoUrl: string,
  branch: string | null | undefined,
  token: string | null
): Promise<{ files: RepoFile[]; commit: string; branch: string; skipped: number }> {
  const dir = await mkdtemp(path.join(tmpdir(), "st-git-"));
  try {
    let url = repoUrl.trim();
    if (token && url.startsWith("https://")) {
      url = url.replace("https://", `https://oauth2:${encodeURIComponent(token)}@`);
    }
    const args = ["clone", "--depth", "1", "--single-branch"];
    if (branch?.trim()) args.push("--branch", branch.trim());
    args.push(url, dir);
    try {
      await execFileAsync("git", args, { timeout: 5 * 60 * 1000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    } catch (err: any) {
      if (err?.code === "ENOENT") throw new Error("Este servidor não tem git instalado. Use um repositório do GitHub.");
      throw new Error(`Falha ao clonar: ${redact(String(err?.stderr || err?.message || err), token)}`);
    }
    const { stdout: sha } = await execFileAsync("git", ["-C", dir, "rev-parse", "HEAD"]);
    const { stdout: br } = await execFileAsync("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"]);
    const all: string[] = [];
    await walk(dir, dir, all);
    all.sort((a, b) => filePriority(a) - filePriority(b) || a.localeCompare(b));
    const files: RepoFile[] = [];
    let skipped = 0;
    for (const rel of all) {
      const full = path.join(dir, rel);
      const size = (await stat(full)).size;
      if (!shouldIndexFile(rel, size) || files.length >= MAX_FILES || size > MAX_FILE_BYTES) {
        skipped++;
        continue;
      }
      const buf = await readFile(full);
      if (looksBinary(buf)) {
        skipped++;
        continue;
      }
      files.push({ path: rel, content: buf.toString("utf-8") });
    }
    return { files, commit: sha.trim(), branch: br.trim(), skipped };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Baixa o repositório, divide os arquivos por função/bloco e grava trechos + embeddings.
 */
export async function ingestGitRepo(
  sourceId: number,
  companyId: number,
  metadata: GitSourceMetadata,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!metadata?.repoUrl) throw new Error("URL do repositório não informada");
  let token: string | null = null;
  if (metadata.tokenEnc) {
    try {
      token = decryptSecret(metadata.tokenEnc);
    } catch {
      throw new Error("Não foi possível ler o token salvo. Conecte o repositório de novo com o token.");
    }
  }

  const gh = parseGithubRepo(metadata.repoUrl);
  console.log(`[GitIngestion] Source ${sourceId}: lendo ${gh ? `${gh.owner}/${gh.repo}` : "repositório"} (branch ${metadata.branch || "padrão"})`);

  let repo;
  try {
    repo = gh
      ? await readGithubRepo(gh.owner, gh.repo, metadata.branch, token)
      : await readClonedRepo(metadata.repoUrl, metadata.branch, token);
  } catch (err) {
    throw new Error(redact(err instanceof Error ? err.message : String(err), token));
  }

  // Divide em trechos com faixa de linhas
  type Pending = { content: string; meta: Record<string, any> };
  const pending: Pending[] = [];
  let truncated = false;
  for (const file of repo.files) {
    for (const c of chunkCodeFile(file.path, file.content)) {
      if (pending.length >= MAX_CHUNKS) {
        truncated = true;
        break;
      }
      pending.push({
        content: c.content,
        meta: {
          fileType: "code",
          repo: metadata.repoUrl,
          branch: repo.branch,
          commit: repo.commit,
          filePath: file.path,
          startLine: c.startLine,
          endLine: c.endLine,
          language: languageFor(file.path),
        },
      });
    }
    if (truncated) break;
  }
  console.log(`[GitIngestion] Source ${sourceId}: ${repo.files.length} arquivos, ${pending.length} trechos (ignorados ${repo.skipped})`);

  await knowledgeDb.updateKnowledgeSource(sourceId, { totalChunks: pending.length, processedChunks: 0 });

  const BATCH = 64;
  let processed = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    let vectors: number[][] = [];
    try {
      vectors = await generateEmbeddings(batch.map((b) => b.content), BATCH);
    } catch (err) {
      console.error(`[GitIngestion] Falha ao gerar embeddings do lote ${i / BATCH}:`, err);
    }
    for (let j = 0; j < batch.length; j++) {
      const chunkIndex = i + j;
      const chunkId = await knowledgeDb.createKnowledgeChunk({
        sourceId,
        companyId,
        content: batch[j].content,
        metadata: { ...batch[j].meta, chunkIndex, totalChunks: pending.length },
        chunkIndex,
        tokenCount: Math.ceil(batch[j].content.length / 4),
      });
      if (vectors[j]) {
        await knowledgeDb.createKnowledgeEmbedding({
          chunkId,
          companyId,
          embedding: vectors[j] as any,
          model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
        });
      }
    }
    processed += batch.length;
    await knowledgeDb.updateKnowledgeSource(sourceId, { processedChunks: processed });
    onProgress?.(processed, pending.length);
  }

  const fresh = await knowledgeDb.getKnowledgeSourceById(sourceId);
  await knowledgeDb.updateKnowledgeSource(sourceId, {
    metadata: {
      ...((fresh?.metadata as any) ?? metadata),
      branch: metadata.branch || null,
      resolvedBranch: repo.branch,
      lastCommit: repo.commit,
      lastIndexedAt: new Date().toISOString(),
      filesIndexed: repo.files.length,
      filesSkipped: repo.skipped,
      truncated,
    },
  });
}
