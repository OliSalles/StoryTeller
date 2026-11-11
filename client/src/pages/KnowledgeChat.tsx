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

export function KnowledgeChat() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{
    role: string;
    content: string;
    citations?: Array<any>;
  }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const createSession = trpc.knowledgeChat.createSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
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
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                      
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="ml-11 space-y-1">
                          <p className="text-xs text-muted-foreground">Fontes:</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((citation) => (
                              <Badge
                                key={citation.index}
                                variant="outline"
                                className="text-xs"
                              >
                                <FileText className="mr-1 h-3 w-3" />
                                [{citation.index}] {citation.sourceName} ({citation.similarity}%)
                              </Badge>
                            ))}
                          </div>
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
                        <p className="text-muted-foreground">Pensando...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Digite sua pergunta..."
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
      </div>
  );
}
