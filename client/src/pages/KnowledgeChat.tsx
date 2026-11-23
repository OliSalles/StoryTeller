import { useState, useRef, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Send, Bot, User, FileText, Plus, MessageSquare, Pencil, Trash2, Check, X, History } from "lucide-react";
import { Streamdown } from "streamdown";
import { KnowledgeSourceViewer } from "../components/KnowledgeSourceViewer";
import { MermaidFallback } from "../components/MermaidFallback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";

const MERMAID_OPTIONS = {
  config: { theme: "default" as const, securityLevel: "strict" as const, flowchart: { htmlLabels: true } },
  errorComponent: MermaidFallback,
};

type Citation = {
  index: number;
  sourceId: number;
  sourceName: string;
  sourceType?: string | null;
  excerpt?: string;
  similarity?: number;
  matchedBy?: string[];
  filePath?: string | null;
  startLine?: number | null;
  endLine?: number | null;
  url?: string | null;
};

/** Arquivos de código citados, sem repetir */
function codeFiles(citations: Citation[]) {
  const seen = new Set<string>();
  return citations.filter((c) => {
    if (!c.filePath) return false;
    const key = `${c.sourceId}:${c.filePath}:${c.startLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Agrupa as citações por fonte, mantendo os números dos trechos */
function groupCitations(citations: Citation[]) {
  const map = new Map<number, { sourceId: number; sourceName: string; indexes: number[] }>();
  for (const c of citations) {
    const g = map.get(c.sourceId) ?? { sourceId: c.sourceId, sourceName: c.sourceName, indexes: [] };
    g.indexes.push(c.index);
    map.set(c.sourceId, g);
  }
  return Array.from(map.values());
}

type ChatMessage = { role: string; content: string; citations?: Citation[] | null };

type SessionItem = { id: number; title: string | null; updatedAt: string | Date; createdAt: string | Date };

function formatWhen(date: string | Date) {
  const d = new Date(date);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Lista de conversas: nova, abrir, renomear e excluir */
function ConversationHistory({
  sessions,
  loading,
  activeId,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: {
  sessions: SessionItem[];
  loading: boolean;
  activeId: number | null;
  onNew: () => void;
  onSelect: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-3">
        <Button className="w-full" onClick={onNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova conversa
        </Button>
      </div>
      <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Histórico</p>
      <ScrollArea className="flex-1 min-h-0">
        <ul className="space-y-0.5 p-2">
          {loading && <li className="px-2 py-1 text-sm text-muted-foreground">Carregando...</li>}
          {!loading && sessions.length === 0 && (
            <li className="px-2 py-1 text-sm text-muted-foreground">Nenhuma conversa ainda.</li>
          )}
          {sessions.map((s) => {
            const active = s.id === activeId;
            if (editingId === s.id) {
              return (
                <li key={s.id} className="flex items-center gap-1 rounded-md bg-accent px-1 py-1">
                  <Input
                    autoFocus
                    className="h-7 text-sm"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && draft.trim()) {
                        onRename(s.id, draft.trim());
                        setEditingId(null);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Salvar nome"
                    onClick={() => {
                      if (draft.trim()) onRename(s.id, draft.trim());
                      setEditingId(null);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Cancelar" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            }
            return (
              <li key={s.id} className={`flex items-center gap-0.5 rounded-md pr-1 ${active ? "bg-accent" : ""}`}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate" title={s.title ?? "Nova conversa"}>
                    {s.title || "Nova conversa"}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatWhen(s.updatedAt)}</span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  aria-label="Renomear"
                  title="Renomear"
                  onClick={() => {
                    setDraft(s.title ?? "");
                    setEditingId(s.id);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                  aria-label="Excluir conversa"
                  title="Excluir conversa"
                  onClick={() => {
                    if (confirm("Excluir esta conversa? As mensagens serão apagadas.")) onDelete(s.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}

export function KnowledgeChat() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const sessionsQuery = trpc.knowledgeChat.listSessions.useQuery();
  const sessions = (sessionsQuery.data ?? []) as SessionItem[];

  // Rolar até a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const createSession = trpc.knowledgeChat.createSession.useMutation({
    onError: (error) => toast.error(error.message),
  });
  const renameSession = trpc.knowledgeChat.renameSession.useMutation({
    onSuccess: () => utils.knowledgeChat.listSessions.invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const deleteSession = trpc.knowledgeChat.deleteSession.useMutation({
    onSuccess: () => utils.knowledgeChat.listSessions.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  const sendMessage = trpc.knowledgeChat.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.response, citations: data.citations as Citation[] }]);
      utils.knowledgeChat.listSessions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro ao processar sua mensagem." }]);
    },
  });

  const startNewConversation = () => {
    setSessionId(null);
    setMessages([]);
    setHistoryOpen(false);
    setEditingTitle(false);
  };

  const beginEditTitle = () => {
    if (!sessionId) return;
    setTitleDraft(activeTitle || "");
    setEditingTitle(true);
  };

  const saveTitle = () => {
    const next = titleDraft.trim();
    if (sessionId && next) {
      renameSession.mutate({ sessionId, title: next });
    }
    setEditingTitle(false);
  };

  const openSession = async (id: number) => {
    setHistoryOpen(false);
    setEditingTitle(false);
    if (id === sessionId) return;
    setLoadingSession(true);
    try {
      const data = await utils.knowledgeChat.getSession.fetch({ sessionId: id });
      setSessionId(id);
      setMessages(
        (data.messages ?? []).map((m: any) => ({
          role: m.role,
          content: m.content,
          citations: (m.citations as Citation[] | null) ?? undefined,
        }))
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível abrir a conversa");
    } finally {
      setLoadingSession(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteSession.mutate({ sessionId: id });
    if (id === sessionId) startNewConversation();
  };

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || sendMessage.isPending) return;
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    let id = sessionId;
    if (!id) {
      try {
        const created = await createSession.mutateAsync({ title: undefined });
        id = created.sessionId;
        setSessionId(id);
      } catch {
        return;
      }
    }
    sendMessage.mutate({ sessionId: id, message: text });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const busy = sendMessage.isPending || createSession.isPending;
  const activeTitle = sessions.find((s) => s.id === sessionId)?.title;

  const history = (
    <ConversationHistory
      sessions={sessions}
      loading={sessionsQuery.isLoading}
      activeId={sessionId}
      onNew={startNewConversation}
      onSelect={openSession}
      onRename={(id, title) => renameSession.mutate({ sessionId: id, title })}
      onDelete={handleDelete}
    />
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-0 flex-col gap-3">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="md:hidden" onClick={() => setHistoryOpen(true)}>
          <History className="mr-2 h-3.5 w-3.5" />
          Histórico
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Chat com Conhecimento</h1>
          <p className="text-sm text-muted-foreground">Pergunte sobre o negócio, os processos, o código e as stories da empresa</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Esquerda: histórico de conversas */}
        <aside className="hidden w-64 shrink-0 flex-col rounded-lg border bg-card md:flex">{history}</aside>

        {/* Conversa */}
        <section className="flex min-w-0 flex-1 flex-col rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
            {editingTitle ? (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Input
                  autoFocus
                  className="h-8 text-sm"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Salvar título" onClick={saveTitle}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Cancelar" onClick={() => setEditingTitle(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 text-left text-sm font-medium disabled:cursor-default"
                onClick={beginEditTitle}
                disabled={!sessionId}
                title={sessionId ? "Editar título" : undefined}
              >
                <span className="truncate">{sessionId ? activeTitle || "Conversa" : "Nova conversa"}</span>
                {sessionId && <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </button>
            )}
            {sessionId && !editingTitle && (
              <div className="flex shrink-0 items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Excluir esta conversa? As mensagens serão apagadas.")) handleDelete(sessionId);
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Excluir
                </Button>
                <Button size="sm" variant="ghost" onClick={startNewConversation}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nova
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 p-4">
              {loadingSession ? (
                <p className="text-sm text-muted-foreground">Abrindo conversa...</p>
              ) : messages.length === 0 ? (
                <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
                  <div className="space-y-2 text-center">
                    <Bot className="mx-auto h-12 w-12 opacity-50" />
                    <p>Faça sua primeira pergunta para começar!</p>
                    <p className="text-sm">Exemplos: "O que é incentivo comercial?", "Como funciona a aprovação de um pedido?"</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div
                        className={`min-w-0 rounded-lg p-3 ${
                          msg.role === "user" ? "max-w-[85%] bg-primary text-primary-foreground" : "flex-1 bg-muted"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="knowledge-answer prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5 prose-img:rounded-md">
                            <Streamdown
                              mermaid={MERMAID_OPTIONS}
                              controls={{ mermaid: { fullscreen: true, download: true, copy: true, panZoom: true } }}
                            >
                              {msg.content}
                            </Streamdown>
                          </div>
                        )}
                      </div>
                    </div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="ml-11 space-y-1">
                        <p className="text-xs text-muted-foreground">Fontes consultadas (clique para ver os trechos):</p>
                        <div className="flex flex-wrap gap-2">
                          {groupCitations(msg.citations).map((group) => (
                            <button
                              key={group.sourceId}
                              type="button"
                              onClick={() => setViewing({ id: group.sourceId, name: group.sourceName })}
                              title="Ver os trechos desta fonte"
                            >
                              <Badge variant="outline" className="cursor-pointer text-xs hover:bg-accent">
                                <FileText className="mr-1 h-3 w-3" />
                                {group.sourceName} [{group.indexes.join(", ")}]
                              </Badge>
                            </button>
                          ))}
                        </div>
                        {codeFiles(msg.citations).length > 0 && (
                          <div className="space-y-0.5 pt-1">
                            <p className="text-xs text-muted-foreground">Arquivos de código:</p>
                            <ul className="space-y-0.5 text-xs">
                              {codeFiles(msg.citations).map((c) => (
                                <li key={`${c.sourceId}-${c.filePath}-${c.startLine}`} className="font-mono">
                                  [{c.index}]{" "}
                                  {c.url ? (
                                    <a href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                      {c.filePath}
                                      {c.startLine ? `:${c.startLine}-${c.endLine}` : ""}
                                    </a>
                                  ) : (
                                    <span>
                                      {c.filePath}
                                      {c.startLine ? `:${c.startLine}-${c.endLine}` : ""}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {busy && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 rounded-lg bg-muted p-3">
                    <p className="text-muted-foreground">Buscando nas fontes e montando a explicação...</p>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="flex items-end gap-2 border-t p-3">
            <Textarea
              placeholder="Digite sua pergunta... (Enter envia, Shift+Enter quebra linha)"
              value={message}
              rows={3}
              className="max-h-64 min-h-[5rem] resize-none"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy || loadingSession}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handleSendMessage}
              disabled={!message.trim() || busy || loadingSession}
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>

      {/* Histórico no celular */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Conversas</SheetTitle>
            <SheetDescription>Abra uma conversa anterior ou comece outra.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">{history}</div>
        </SheetContent>
      </Sheet>

      <KnowledgeSourceViewer
        sourceId={viewing?.id ?? null}
        sourceName={viewing?.name}
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />
    </div>
  );
}
