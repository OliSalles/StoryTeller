/**
 * Correções de sintaxe para diagramas Mermaid gerados por IA.
 * Usado no servidor (antes de salvar a resposta) e no cliente (nova tentativa se o desenho falhar).
 */

const DIAGRAM_START =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart)\b/;

/** Limpa o texto de um rótulo para ficar seguro dentro de aspas */
function cleanLabel(text: string): string {
  return text
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/"/g, "'")
    .replace(/[\[\]{}()<>|;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Coloca aspas nos rótulos de nós de flowchart: A[texto] -> A["texto"], B{x?} -> B{"x?"}, C(texto) -> C("texto").
 * aggressive: também limpa rótulos já entre aspas e de setas.
 */
function quoteFlowchartLabels(line: string, aggressive: boolean): string {
  // Formas com delimitadores duplos primeiro: ([..]), [[..]], ((..)), {{..}}, [(..)]
  const shapes: Array<[string, string]> = [
    ["([", "])"], ["[[", "]]"], ["((", "))"], ["{{", "}}"], ["[(", ")]"], ["[/", "/]"], ["[\\", "\\]"],
    ["[", "]"], ["{", "}"], ["(", ")"],
  ];
  let out = "";
  let i = 0;
  while (i < line.length) {
    // procura id de nó seguido de forma
    const idMatch = /^[A-Za-z0-9_]+/.exec(line.slice(i));
    if (idMatch && (i === 0 || /[\s;&>\-=.|]/.test(line[i - 1]))) {
      const id = idMatch[0];
      const after = i + id.length;
      const shape = shapes.find(([open]) => line.startsWith(open, after));
      if (shape) {
        const [open, close] = shape;
        const end = line.indexOf(close, after + open.length);
        if (end > -1) {
          const raw = line.slice(after + open.length, end);
          const isQuoted = /^\s*".*"\s*$/.test(raw);
          const label = isQuoted && !aggressive ? raw.trim() : `"${cleanLabel(raw)}"`;
          out += `${id}${open}${label}${close}`;
          i = end + close.length;
          continue;
        }
      }
      out += id;
      i = after;
      continue;
    }
    out += line[i];
    i++;
  }
  if (aggressive) {
    // rótulos de seta: -->|texto| e -- texto -->
    out = out.replace(/\|([^|]*)\|/g, (_m, t) => `|"${cleanLabel(t)}"|`);
  }
  return out;
}

export function sanitizeMermaid(code: string, aggressive = false): string {
  let lines = code
    .replace(/\r\n/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l, idx, arr) => !(l.trim() === "" && idx > 0 && arr[idx - 1].trim() === ""));

  // remove linhas vazias do começo
  while (lines.length && !lines[0].trim()) lines.shift();
  if (lines.length === 0) return code;

  let first = lines[0].trim();
  if (!DIAGRAM_START.test(first)) {
    lines.unshift("flowchart TD");
    first = "flowchart TD";
  }
  const isFlowchart = /^(flowchart|graph)\b/.test(first);
  if (!isFlowchart) return lines.join("\n");

  lines = lines.map((line, idx) => {
    if (idx === 0) return line.trim().replace(/;$/, "");
    const t = line.trim();
    if (!t || t.startsWith("%%") || /^(subgraph|end|classDef|class|style|linkStyle|click|direction)\b/.test(t)) return line;
    let l = line
      .replace(/;\s*$/, "")
      .replace(/(^|[^-])->(?!>)/g, "$1-->") // seta simples inválida
      .replace(/==>/g, "==>")
      .replace(/—|–/g, "-");
    l = quoteFlowchartLabels(l, aggressive);
    return l;
  });
  return lines.join("\n");
}

/** Aplica a correção em todos os blocos ```mermaid de um markdown */
export function sanitizeMarkdownMermaid(markdown: string): string {
  return markdown.replace(/```mermaid[^\n]*\n([\s\S]*?)```/g, (_m, body: string) => {
    return "```mermaid\n" + sanitizeMermaid(body.replace(/\n$/, "")) + "\n```";
  });
}
