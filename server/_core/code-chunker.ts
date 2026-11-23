/**
 * Utilitários puros para indexar código de um repositório git:
 * filtro de arquivos, linguagem e divisão por arquivo/função com faixa de linhas.
 */
import path from "path";

export const CODE_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".vue": "vue", ".svelte": "svelte", ".py": "python", ".java": "java", ".kt": "kotlin", ".kts": "kotlin", ".scala": "scala",
  ".cs": "csharp", ".vb": "vbnet", ".fs": "fsharp", ".go": "go", ".rb": "ruby", ".php": "php", ".rs": "rust", ".swift": "swift",
  ".m": "objectivec", ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp", ".hpp": "cpp", ".dart": "dart", ".lua": "lua",
  ".sql": "sql", ".prisma": "prisma", ".graphql": "graphql", ".gql": "graphql", ".proto": "protobuf",
  ".sh": "shell", ".ps1": "powershell", ".bat": "batch",
  ".html": "html", ".cshtml": "razor", ".razor": "razor", ".css": "css", ".scss": "scss", ".less": "less",
  ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".xml": "xml", ".toml": "toml", ".ini": "ini", ".config": "xml",
  ".csproj": "xml", ".sln": "text", ".gradle": "groovy", ".tf": "terraform",
  ".cls": "apex", ".trigger": "apex", ".apex": "apex", ".soql": "sql", ".page": "visualforce", ".component": "visualforce",
  ".cmp": "aura", ".app": "aura", ".evt": "aura", ".flow": "xml",
  ".md": "markdown", ".mdx": "markdown", ".txt": "text", ".rst": "text",
};

const SPECIAL_FILES = new Set(["dockerfile", "makefile", "readme", "procfile", ".env.example", "docker-compose.yml"]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", "bin", "obj", "target", "vendor", "coverage", ".next", ".nuxt",
  ".cache", ".idea", ".vscode", "__pycache__", ".venv", "venv", "env", "packages", ".gradle", "Pods", "DerivedData",
  "wwwroot/lib", "public/build", ".turbo", ".svelte-kit", "tmp", "temp", "logs",
]);

const SKIP_FILES = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "composer.lock", "gemfile.lock", "poetry.lock", "cargo.lock",
  "packages.lock.json", "go.sum",
]);

export const MAX_FILE_BYTES = 200 * 1024;

/** Decide se um arquivo do repositório deve ser indexado */
export function shouldIndexFile(filePath: string, size?: number): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const base = parts[parts.length - 1].toLowerCase();
  for (let i = 0; i < parts.length - 1; i++) {
    if (SKIP_DIRS.has(parts[i]) || SKIP_DIRS.has(`${parts[i]}/${parts[i + 1]}`)) return false;
  }
  if (SKIP_FILES.has(base)) return false;
  if (/\.min\.(js|css)$/.test(base) || /\.(map|snap)$/.test(base)) return false;
  if (base.startsWith(".env") && base !== ".env.example") return false; // nunca indexar segredos
  if (size !== undefined && size > MAX_FILE_BYTES) return false;
  const ext = path.extname(base);
  return Boolean(CODE_EXTENSIONS[ext]) || SPECIAL_FILES.has(base);
}

export function languageFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS[ext] ?? "text";
}

/**
 * Prioridade para indexar quando o repositório passa do limite de arquivos:
 * código primeiro, depois documentação, por fim configuração e metadados.
 */
export function filePriority(filePath: string): number {
  const base = filePath.toLowerCase();
  if (/-meta\.xml$/.test(base)) return 3;
  const lang = languageFor(base);
  if (["json", "yaml", "xml", "toml", "ini", "text", "css", "scss", "less"].includes(lang)) return 2;
  if (lang === "markdown") return 1;
  return 0;
}

/** Heurística simples para arquivo binário */
export function looksBinary(buf: Buffer): boolean {
  const len = Math.min(buf.length, 8000);
  for (let i = 0; i < len; i++) if (buf[i] === 0) return true;
  return false;
}

/** Linha que começa uma declaração de topo (função, classe, método, rota etc.) */
const DECLARATION_RE =
  /^\s{0,4}(export\s+)?(default\s+)?(public|private|protected|internal|static|async|abstract|sealed|partial|override|virtual|final|\s)*\s*(function\b|class\b|interface\b|enum\b|type\s+\w+\s*=|const\s+\w+\s*=\s*(async\s*)?(\(|function)|def\s|func\s|fn\s|struct\b|impl\b|module\b|namespace\b|record\b|CREATE\s|ALTER\s|[\w<>\[\],\s]+\s+\w+\s*\([^;]*\)\s*(\{|=>|$))/i;

export type CodeChunk = { content: string; startLine: number; endLine: number };

/**
 * Divide um arquivo em blocos, preferindo quebrar em inícios de função/classe.
 * Cada bloco recebe um cabeçalho com o caminho e a faixa de linhas.
 */
export function chunkCodeFile(
  filePath: string,
  text: string,
  opts: { targetLines?: number; maxLines?: number; maxChars?: number } = {}
): CodeChunk[] {
  const targetLines = opts.targetLines ?? 60;
  const maxLines = opts.maxLines ?? 120;
  const maxChars = opts.maxChars ?? 4000;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chunks: CodeChunk[] = [];
  let start = 0;

  const flush = (endExclusive: number) => {
    if (endExclusive <= start) return;
    const body = lines.slice(start, endExclusive).join("\n");
    if (body.trim().length > 0) {
      const startLine = start + 1;
      const endLine = endExclusive;
      chunks.push({
        content: `Arquivo: ${filePath} (linhas ${startLine}-${endLine})\n${body.length > maxChars ? body.slice(0, maxChars) : body}`,
        startLine,
        endLine,
      });
    }
    start = endExclusive;
  };

  let chars = 0;
  for (let i = 0; i < lines.length; i++) {
    const size = i - start;
    chars += lines[i].length + 1;
    const isDecl = i > start && DECLARATION_RE.test(lines[i]);
    if ((size >= targetLines && isDecl) || size >= maxLines || chars > maxChars) {
      flush(i);
      chars = lines[i].length + 1;
    }
  }
  flush(lines.length);
  return chunks;
}

/** Interpreta uma URL de repositório GitHub (https, ssh ou owner/repo) */
export function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const trimmed = url.trim().replace(/\/+$/, "").replace(/\.git$/, "");
  const m =
    trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)(?:\/.*)?$/i) ||
    trimmed.match(/^git@github\.com:([\w.-]+)\/([\w.-]+)$/i) ||
    trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

/** Link para ver um trecho no GitHub */
export function githubBlobUrl(repoUrl: string, ref: string, filePath: string, startLine?: number, endLine?: number): string | null {
  const gh = parseGithubRepo(repoUrl);
  if (!gh) return null;
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const lines = startLine ? `#L${startLine}${endLine && endLine !== startLine ? `-L${endLine}` : ""}` : "";
  return `https://github.com/${gh.owner}/${gh.repo}/blob/${encodeURIComponent(ref)}/${encodedPath}${lines}`;
}
