import { useState, useRef, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Send, Bot, User, FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";
import { KnowledgeSourceViewer } from "../components/KnowledgeSourceViewer";

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

export function KnowledgeChat() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{
    role: string;
    content: string;
    citations?: Array<any>;
  }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);

  const utils = trpc.useUtils();

  // Create session on mount
  useEffect(() => {
    createNewSession();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [sessionError, setSessionError] = useState("");

  const createSession = trpc.knowledgeChat.createSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setSessionError("");
    },
    onError: (error) => {
      setSessionError(error.message);
      toast.error(error.message);
    },
  });

  const sendMessage = trpc.knowledgeChat.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          citations: data.citations,
        },
      ]);
    },
    onError: (error) => {
      toast.error(error.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem.",
        },
      ]);
    },
  });

  const createNewSession = () => {
    createSession.mutate({ title: undefined });
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !sessionId) return;

    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    // Send to backend
    sendMessage.mutate({
      sessionId,
      message,
    });

    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
        {/* Azure DevOps style header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat com Conhecimento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faça perguntas sobre a base de conhecimento da empresa
          </p>
        </div>

        {/* Command bar */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Button size="sm" variant="outline" onClick={createNewSession}>
            Nova Conversa
          </Button>
          <Link href="/knowledge">
            <Button size="sm" variant="outline">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Voltar
            </Button>
          </Link>
        </div>

        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Conversa</CardTitle>
            <CardDescription>
              Pergunte qualquer coisa sobre o negócio, código, documentos ou stories
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Bot className="h-12 w-12 mx-auto opacity-50" />
                    <p>Faça sua primeira pergunta para começar!</p>
                    <p className="text-sm">
                      Exemplos: "Como funciona a autenticação?", "Quais são as principais features?"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                      <div
                        className={`flex gap-3 ${
                          msg.role === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`flex-1 p-3 rounded-lg ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="knowledge-answer prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5 prose-img:rounded-md">
                              <Streamdown>{msg.content}</Streamdown>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="ml-11 space-y-1">
                          <p className="text-xs text-muted-foreground">Fontes consultadas (clique para ver os trechos):</p>
                          <div className="flex flex-wrap gap-2">
                            {groupCitations(msg.citations as Citation[]).map((group) => (
                              <button
                                key={group.sourceId}
                                type="button"
                                onClick={() => setViewing({ id: group.sourceId, name: group.sourceName })}
                                title="Ver os trechos desta fonte"
                              >
                                <Badge
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-accent"
                                >
                                  <FileText className="mr-1 h-3 w-3" />
                                  {group.sourceName} [{group.indexes.join(", ")}]
                                </Badge>
                              </button>
                            ))}
                          </div>
                          {codeFiles(msg.citations as Citation[]).length > 0 && (
                            <div className="pt-1 space-y-0.5">
                              <p className="text-xs text-muted-foreground">Arquivos de código:</p>
                              <ul className="text-xs space-y-0.5">
                                {codeFiles(msg.citations as Citation[]).map((c) => (
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
                  ))}
                  
                  {sendMessage.isPending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-muted">
                        <p className="text-muted-foreground">Buscando nas fontes e montando a explicação...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {sessionError && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {sessionError}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={createNewSession} disabled={createSession.isPending}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {!sessionId && !sessionError && createSession.isPending && (
              <p className="mt-4 text-sm text-muted-foreground">Preparando conversa...</p>
            )}

            <div className="mt-4 flex gap-2">
              <Input
                placeholder={sessionId ? "Digite sua pergunta..." : "Aguarde a sessão iniciar..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!sessionId || sendMessage.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || !sessionId || sendMessage.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
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
