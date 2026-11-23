import { useEffect, useId, useState } from "react";
import { sanitizeMermaid } from "@shared/mermaid-sanitize";

/**
 * Usado quando o Streamdown não consegue desenhar um diagrama Mermaid.
 * Tenta uma vez com a sintaxe corrigida (modo agressivo); se ainda falhar, mostra o código do fluxo.
 */
export function MermaidFallback({ chart }: { error: string; chart: string; retry: () => void }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const id = `mmd-fix-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        const fixed = sanitizeMermaid(chart, true);
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
        await mermaid.parse(fixed);
        const { svg } = await mermaid.render(id, fixed);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (svg) {
    return (
      <div
        className="my-4 flex justify-center overflow-x-auto rounded-md border bg-background p-3"
        // SVG gerado pelo próprio mermaid com securityLevel strict
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  if (failed) {
    return (
      <div className="my-4 rounded-md border bg-background p-3">
        <p className="mb-2 text-xs text-muted-foreground">Não foi possível desenhar o fluxo, segue a descrição dele:</p>
        <pre className="overflow-x-auto text-xs">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }
  return <p className="my-4 text-xs text-muted-foreground">Desenhando o fluxo...</p>;
}
