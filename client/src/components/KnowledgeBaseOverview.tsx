import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { BookOpen, Code2, FileText, GitBranch, LayoutGrid, Layers, Search } from "lucide-react";
import { KnowledgeSourceViewer, SOURCE_STATUS_LABELS } from "./KnowledgeSourceViewer";

type SourceRow = {
  id: number;
  name: string;
  type: string;
  status: string;
  sourceUrl?: string | null;
  metadata?: any;
  chunksCount?: number;
  totalChunks?: number | null;
  createdAt: string | Date;
};

const GROUPS: Array<{ key: string; label: string; description: string; icon: typeof FileText }> = [
  { key: "document", label: "Documentos", description: "Arquivos enviados (PDF, Word, textos, planilhas)", icon: FileText },
  { key: "code_repo", label: "Código", description: "Repositórios git e pacotes de código", icon: Code2 },
  { key: "story", label: "User Stories", description: "Stories criadas na plataforma", icon: BookOpen },
  { key: "miro_board", label: "Miro", description: "Boards importados do Miro", icon: LayoutGrid },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "default",
  completed: "secondary",
  failed: "destructive",
};

/**
 * Painel somente leitura que mostra como a base de conhecimento está organizada:
 * fontes agrupadas por tipo, com quantidade de trechos e status. Clicar abre os trechos da fonte.
 */
export function KnowledgeBaseOverview({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [filter, setFilter] = useState("");
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);
  const { data, isLoading, error } = trpc.knowledge.listSources.useQuery(undefined, { enabled: open });

  const sources = (data ?? []) as SourceRow[];
  const term = filter.trim().toLowerCase();

  const grouped = useMemo(() => {
    const filtered = sources.filter((s) => !term || s.name.toLowerCase().includes(term));
    const known = new Set(GROUPS.map((g) => g.key));
    const groups = GROUPS.map((g) => ({ ...g, items: filtered.filter((s) => s.type === g.key) }));
    const others = filtered.filter((s) => !known.has(s.type));
    if (others.length) groups.push({ key: "other", label: "Outros", description: "", icon: Layers, items: others });
    return groups.filter((g) => g.items.length > 0);
  }, [sources, term]);

  const totalChunks = sources.reduce((sum, s) => sum + (s.chunksCount ?? s.totalChunks ?? 0), 0);
  const ready = sources.filter((s) => s.status === "completed").length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Base de conhecimento</SheetTitle>
            <SheetDescription>
              Veja como a base está organizada e o que o chat consulta para responder. Clique em uma fonte para ver os trechos.
            </SheetDescription>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="rounded-md border p-2">
                <p className="text-lg font-semibold tabular-nums">{sources.length}</p>
                <p className="text-xs text-muted-foreground">fontes</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-lg font-semibold tabular-nums">{ready}</p>
                <p className="text-xs text-muted-foreground">prontas</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-lg font-semibold tabular-nums">{totalChunks.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">trechos</p>
              </div>
            </div>
            <div className="relative pt-2">
              <Search className="absolute left-2.5 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Filtrar fontes pelo nome"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-5 p-4">
              {isLoading && <p className="text-sm text-muted-foreground">Carregando a base...</p>}
              {error && <p className="text-sm text-destructive">{error.message}</p>}
              {!isLoading && !error && grouped.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {term ? "Nenhuma fonte com esse nome." : "A base ainda não tem fontes."}
                </p>
              )}
              {grouped.map((group) => {
                const Icon = group.icon;
                const groupChunks = group.items.reduce((sum, s) => sum + (s.chunksCount ?? s.totalChunks ?? 0), 0);
                return (
                  <section key={group.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">{group.label}</h3>
                        <Badge variant="outline" className="text-xs">
                          {group.items.length}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {groupChunks.toLocaleString("pt-BR")} trechos
                      </span>
                    </div>
                    {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                    <ul className="divide-y rounded-md border">
                      {group.items.map((s) => {
                        const git = s.metadata?.kind === "git";
                        const branch = s.metadata?.branch || s.metadata?.resolvedBranch;
                        return (
                          <li key={s.id}>
                            <button
                              type="button"
                              className="flex w-full items-start gap-3 p-3 text-left hover:bg-accent"
                              onClick={() => setViewing({ id: s.id, name: s.name })}
                            >
                              {git ? (
                                <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium" title={s.name}>
                                  {s.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(s.chunksCount ?? s.totalChunks ?? 0).toLocaleString("pt-BR")} trechos
                                  {git && branch ? ` · branch ${branch}` : ""}
                                  {git && s.metadata?.filesIndexed ? ` · ${s.metadata.filesIndexed} arquivos` : ""}
                                  {" · "}
                                  {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                              <Badge variant={STATUS_VARIANT[s.status] ?? "outline"} className="shrink-0 text-xs">
                                {SOURCE_STATUS_LABELS[s.status] ?? s.status}
                              </Badge>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <KnowledgeSourceViewer
        sourceId={viewing?.id ?? null}
        sourceName={viewing?.name}
        open={viewing !== null}
        onOpenChange={(o) => {
          if (!o) setViewing(null);
        }}
      />
    </>
  );
}
