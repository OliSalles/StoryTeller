import { useEffect, useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ChevronLeft, ChevronRight, Search, FileText } from "lucide-react";

const PAGE_SIZE = 50;

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  code_repo: "Código",
  document: "Documento",
  story: "User Stories",
  miro_board: "Miro",
};

export const SOURCE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluída",
  failed: "Falhou",
};

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, term }: { text: string; term: string }) {
  const parts = useMemo(() => {
    if (!term) return [text];
    return text.split(new RegExp(`(${escapeRegExp(term)})`, "gi"));
  }, [text, term]);

  if (!term) return <>{text}</>;
  const lower = term.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lower ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function chunkLabel(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  for (const key of ["filePath", "fileName", "path", "title", "storyTitle", "frameTitle"]) {
    const value = m[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function KnowledgeSourceViewer({
  sourceId,
  sourceName,
  open,
  onOpenChange,
}: {
  sourceId: number | null;
  sourceName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebounced(search.trim());

  // Reset when another source is opened or the search changes
  useEffect(() => {
    setSearch("");
    setOffset(0);
  }, [sourceId]);
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching, error } = trpc.knowledge.getSourceChunks.useQuery(
    {
      sourceId: sourceId ?? 0,
      offset,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
    },
    { enabled: open && sourceId !== null, placeholderData: (prev) => prev }
  );

  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b p-4 pr-12">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{data?.source.name ?? sourceName ?? "Fonte"}</span>
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            {data?.source && (
              <>
                <Badge variant="outline">
                  {SOURCE_TYPE_LABELS[data.source.type] ?? data.source.type}
                </Badge>
                <Badge variant="secondary">
                  {SOURCE_STATUS_LABELS[data.source.status] ?? data.source.status}
                </Badge>
                <span>
                  Criada em {new Date(data.source.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </>
            )}
          </SheetDescription>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no conteúdo desta fonte"
              className="pl-8"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando conteúdo...</p>
          ) : data && data.items.length > 0 ? (
            <div className="space-y-3">
              {data.items.map((chunk, i) => {
                const label = chunkLabel(chunk.metadata);
                return (
                  <div key={chunk.id} className="rounded-md border bg-card">
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                      <span className="truncate">
                        Trecho {offset + i + 1}
                        {label ? ` · ${label}` : ""}
                      </span>
                      {chunk.tokenCount ? <span className="shrink-0">~{chunk.tokenCount} tokens</span> : null}
                    </div>
                    <div className="whitespace-pre-wrap break-words px-3 py-2 text-sm leading-relaxed text-foreground">
                      <Highlight text={chunk.content} term={debouncedSearch} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? `Nenhum trecho encontrado com "${debouncedSearch}".`
                : "Esta fonte ainda não tem conteúdo processado."}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t p-3 text-sm">
          <span className="text-muted-foreground">
            {total > 0 ? `Trechos ${from} a ${to} de ${total}` : "Nenhum trecho"}
            {isFetching && !isLoading ? " · atualizando..." : ""}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0 || isFetching}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!data?.hasMore || isFetching}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Próxima
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
