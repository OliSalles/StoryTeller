import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { FileText, Upload, Database, RefreshCw, Trash2, MessageSquare, Eye, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  KnowledgeSourceViewer,
  SOURCE_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
} from "../components/KnowledgeSourceViewer";
import { Link } from "wouter";

export function KnowledgeBase() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [miroBoardUrl, setMiroBoardUrl] = useState("");
  const [miroName, setMiroName] = useState("");
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);

  const utils = trpc.useUtils();
  
  // Queries
  const { data: sources, isLoading } = trpc.knowledge.listSources.useQuery();

  const filteredSources = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    return (sources ?? []).filter((source) => {
      if (filterType !== "all" && source.type !== filterType) return false;
      if (filterStatus !== "all" && source.status !== filterStatus) return false;
      if (term && !source.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [sources, filterText, filterType, filterStatus]);

  const totalChunks = useMemo(
    () => (sources ?? []).reduce((sum, source) => sum + (source.chunksCount ?? 0), 0),
    [sources]
  );

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
      toast.success("Fonte excluída!");
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
    return <Badge variant={variants[status] || "outline"}>{SOURCE_STATUS_LABELS[status] ?? status}</Badge>;
  };

  const getProgress = (source: any) => {
    if (source.totalChunks === 0) return 0;
    return Math.round((source.processedChunks / source.totalChunks) * 100);
  };

  return (
    <div className="space-y-4">
        {/* Azure DevOps style header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Base de Conhecimento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie fontes de conhecimento para análise e chat
          </p>
        </div>

        {/* Command bar */}
        <div className="flex items-center gap-2 pb-4 border-b">
          <Link href="/knowledge/chat">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              Abrir Chat
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sources">
              <Database className="mr-2 h-4 w-4" />
              Fontes
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload
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
                      accept=".zip,.txt,.md,.pdf,.docx,.csv"
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
                  {sources?.length || 0} fonte(s) na base · {totalChunks} trecho(s) indexado(s). Clique em uma fonte para ver o conteúdo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="Filtrar por nome"
                      className="pl-8"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {Object.entries(SOURCE_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : sources && sources.length > 0 ? (
                  filteredSources.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead className="hidden md:table-cell">Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Trechos</TableHead>
                            <TableHead className="hidden md:table-cell">Criada em</TableHead>
                            <TableHead className="w-[1%] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSources.map((source) => (
                            <TableRow
                              key={source.id}
                              className="cursor-pointer"
                              onClick={() => setViewing({ id: source.id, name: source.name })}
                            >
                              <TableCell className="max-w-[320px]">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                                  <span className="truncate font-medium" title={source.name}>{source.name}</span>
                                </div>
                                {source.status === 'processing' && (
                                  <div className="mt-2 space-y-1">
                                    <Progress value={getProgress(source)} />
                                    <p className="text-xs text-muted-foreground">
                                      {source.processedChunks} / {source.totalChunks} trechos processados
                                    </p>
                                  </div>
                                )}
                                {source.status === 'failed' && source.errorMessage && (
                                  <p className="mt-1 truncate text-xs text-destructive" title={source.errorMessage}>
                                    Erro: {source.errorMessage}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {SOURCE_TYPE_LABELS[source.type] ?? source.type}
                              </TableCell>
                              <TableCell>{getStatusBadge(source.status)}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {source.chunksCount ?? source.totalChunks ?? 0}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground">
                                {new Date(source.createdAt).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Ver conteúdo"
                                    aria-label="Ver conteúdo"
                                    onClick={() => setViewing({ id: source.id, name: source.name })}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {source.status === 'completed' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Reindexar"
                                      aria-label="Reindexar"
                                      onClick={() => reindexSource.mutate({ sourceId: source.id })}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    title="Excluir"
                                    aria-label="Excluir"
                                    onClick={() => {
                                      if (confirm("Deseja realmente excluir esta fonte?")) {
                                        deleteSource.mutate({ sourceId: source.id });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma fonte encontrada com esses filtros.</p>
                  )
                ) : (
                  <p className="text-muted-foreground">
                    Nenhuma fonte de conhecimento ainda. Faça upload de arquivos ou ingira stories.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
