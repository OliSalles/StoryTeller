import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { FileText, Upload, Database, RefreshCw, Trash2, MessageSquare } from "lucide-react";
import { Link } from "wouter";

export function KnowledgeBase() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [miroBoardUrl, setMiroBoardUrl] = useState("");
  const [miroName, setMiroName] = useState("");

  const utils = trpc.useUtils();
  
  // Queries
  const { data: sources, isLoading } = trpc.knowledge.listSources.useQuery();

  // Mutations
  const createSource = trpc.knowledge.createSource.useMutation();
  const uploadFile = trpc.knowledge.uploadFile.useMutation();
  const processSource = trpc.knowledge.processSource.useMutation({
    onSuccess: () => {
      toast.success("Processamento iniciado!");
      utils.knowledge.listSources.invalidate();
    },
  });
  const deleteSource = trpc.knowledge.deleteSource.useMutation({
    onSuccess: () => {
      toast.success("Fonte deletada!");
      utils.knowledge.listSources.invalidate();
    },
  });
  const reindexSource = trpc.knowledge.reindexSource.useMutation({
    onSuccess: () => {
      toast.success("Re-indexação iniciada!");
      utils.knowledge.listSources.invalidate();
    },
  });
  const ingestStories = trpc.knowledge.ingestStories.useMutation({
    onSuccess: () => {
      toast.success("Ingestão de stories iniciada!");
      utils.knowledge.listSources.invalidate();
    },
  });
  const importMiroBoard = trpc.knowledge.importMiroBoard.useMutation({
    onSuccess: () => {
      toast.success("Importação do Miro iniciada!");
      utils.knowledge.listSources.invalidate();
      setMiroBoardUrl("");
      setMiroName("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!sourceName) {
        setSourceName(file.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !sourceName) {
      toast.error("Selecione um arquivo e defina um nome");
      return;
    }

    setIsUploading(true);
    try {
      // Determine type based on file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      const type = ext === 'zip' ? 'code_repo' : 'document';

      // Create source
      const { sourceId } = await createSource.mutateAsync({
        name: sourceName,
        type,
      });

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        // Upload file
        await uploadFile.mutateAsync({
          sourceId,
          fileName: selectedFile.name,
          fileContent: base64,
        });

        // Start processing
        await processSource.mutateAsync({ sourceId });

        toast.success("Upload concluído! Processamento iniciado.");
        setSelectedFile(null);
        setSourceName("");
        utils.knowledge.listSources.invalidate();
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "default",
      completed: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getProgress = (source: any) => {
    if (source.totalChunks === 0) return 0;
    return Math.round((source.processedChunks / source.totalChunks) * 100);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
            <p className="text-muted-foreground">
              Gerencie fontes de conhecimento para análise e chat
            </p>
          </div>
          <Link href="/knowledge/chat">
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" />
              Abrir Chat
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="sources">
              <Database className="mr-2 h-4 w-4" />
              Fontes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload de Arquivo</CardTitle>
                  <CardDescription>
                    Faça upload de código (ZIP) ou documentos (TXT, MD, PDF, DOCX)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="source-name">Nome da Fonte</Label>
                    <Input
                      id="source-name"
                      placeholder="Backend - Código-fonte"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Arquivo</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".zip,.txt,.md,.pdf,.docx"
                      onChange={handleFileSelect}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Arquivo selecionado: {selectedFile.name}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !selectedFile}
                    className="w-full"
                  >
                    {isUploading ? "Enviando..." : "Fazer Upload"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Importar Miro Board</CardTitle>
                  <CardDescription>
                    Conecte um board do Miro via URL
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="miro-name">Nome (opcional)</Label>
                    <Input
                      id="miro-name"
                      placeholder="Board de Planejamento"
                      value={miroName}
                      onChange={(e) => setMiroName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="miro-url">URL do Board</Label>
                    <Input
                      id="miro-url"
                      placeholder="https://miro.com/app/board/..."
                      value={miroBoardUrl}
                      onChange={(e) => setMiroBoardUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!miroBoardUrl) {
                        toast.error("Digite a URL do board do Miro");
                        return;
                      }
                      importMiroBoard.mutate({
                        boardUrl: miroBoardUrl,
                        name: miroName || undefined,
                      });
                    }}
                    disabled={importMiroBoard.isPending}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {importMiroBoard.isPending ? "Importando..." : "Importar do Miro"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Requer MIRO_ACCESS_TOKEN configurado
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingerir User Stories</CardTitle>
                  <CardDescription>
                    Adicione stories existentes à base de conhecimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => ingestStories.mutate({ name: "User Stories Existentes" })}
                    disabled={ingestStories.isPending}
                    className="w-full"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {ingestStories.isPending ? "Processando..." : "Ingerir Stories"}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Isso irá processar todas as stories criadas na empresa
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fontes de Conhecimento</CardTitle>
                <CardDescription>
                  {sources?.length || 0} fonte(s) disponível(is)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : sources && sources.length > 0 ? (
                  <div className="space-y-4">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{source.name}</h3>
                              {getStatusBadge(source.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Tipo: {source.type} • {source.totalChunks} chunks
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {source.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reindexSource.mutate({ sourceId: source.id })}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm("Deseja realmente deletar esta fonte?")) {
                                  deleteSource.mutate({ sourceId: source.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {source.status === 'processing' && (
                          <div className="space-y-1">
                            <Progress value={getProgress(source)} />
                            <p className="text-xs text-muted-foreground">
                              {source.processedChunks} / {source.totalChunks} chunks processados
                            </p>
                          </div>
                        )}
                        
                        {source.status === 'failed' && source.errorMessage && (
                          <p className="text-sm text-destructive">
                            Erro: {source.errorMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhuma fonte de conhecimento ainda. Faça upload de arquivos ou ingira stories.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
