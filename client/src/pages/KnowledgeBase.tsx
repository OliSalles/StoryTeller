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
import { ArrowLeft, FileText, Upload, Database, RefreshCw, Trash2, Eye, Search, Wrench, Plug, Lock } from "lucide-react";
import { Link } from "wouter";
import { KnowledgeConnections } from "../components/KnowledgeConnections";
import { Switch } from "../components/ui/switch";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  KnowledgeSourceViewer,
  SOURCE_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
} from "../components/KnowledgeSourceViewer";

export function KnowledgeBase() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);
  const [uploadTechDebt, setUploadTechDebt] = useState(false);

  const utils = trpc.useUtils();
  
  // Queries
  const { data: sources, isLoading } = trpc.knowledge.listSources.useQuery();
  const { data: settings } = trpc.knowledge.getSettings.useQuery();
  const canManage = settings?.canManage ?? false;
  const { data: currentCompany } = trpc.companies.current.useQuery();
  const isTechDebtSource = (source: { metadata?: unknown }) =>
    (source.metadata as any)?.category === "tech_debt";

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
  const setTechDebtSection = trpc.knowledge.setTechDebtSection.useMutation({
    onSuccess: (res) => {
      toast.success(res.techDebtSection ? "Seção de débitos técnicos ligada no chat" : "Seção de débitos técnicos desligada no chat");
      utils.knowledge.getSettings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
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
        techDebt: canManage && type === 'document' && uploadTechDebt ? true : undefined,
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
        setUploadTechDebt(false);
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
          <Link
            href={currentCompany ? `/company/${currentCompany.id}` : "/company/settings"}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {currentCompany?.name ?? "Empresas"}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Base de Conhecimento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentCompany ? (
              <>
                Fontes de conhecimento da empresa{" "}
                <Link href={`/company/${currentCompany.id}`} className="font-medium text-foreground hover:underline">
                  {currentCompany.name}
                </Link>
              </>
            ) : (
              "Gerencie as fontes de conhecimento da empresa"
            )}
          </p>
        </div>

        {settings && !canManage && (
          <Card>
            <CardContent className="flex items-start gap-3 py-4">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Você pode consultar a base, mas só administradores da empresa podem adicionar, reindexar ou excluir fontes e conexões.
              </p>
            </CardContent>
          </Card>
        )}

        {canManage && (
          <Card>
            <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Débitos técnicos e propostas de melhoria no chat</p>
                  <p className="text-xs text-muted-foreground">
                    Quando ligado, as respostas ganham uma seção no final com os débitos técnicos e as propostas de melhoria do assunto,
                    usando só as fontes marcadas como débitos técnicos.
                    {settings && !settings.available && " Recurso ainda não disponível neste ambiente."}
                    {settings?.globallyDisabled && " Desligado pelo administrador do sistema."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="tech-debt-toggle" className="text-sm">
                  {settings?.techDebtSection ? "Ligado" : "Desligado"}
                </Label>
                <Switch
                  id="tech-debt-toggle"
                  checked={settings?.techDebtStored ?? false}
                  disabled={!settings?.available || settings?.globallyDisabled || setTechDebtSection.isPending}
                  onCheckedChange={(enabled) => setTechDebtSection.mutate({ enabled })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sources">
              <Database className="mr-2 h-4 w-4" />
              Fontes
            </TabsTrigger>
            <TabsTrigger value="connections">
              <Plug className="mr-2 h-4 w-4" />
              Conexões
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="connections">
            <KnowledgeConnections
              sources={(sources ?? []) as any}
              canManage={canManage}
              miroServerToken={settings?.miroServerToken ?? false}
              onView={setViewing}
            />
          </TabsContent>

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
                  {canManage && (
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="upload-tech-debt"
                        checked={uploadTechDebt}
                        onCheckedChange={(v) => setUploadTechDebt(v === true)}
                      />
                      <Label htmlFor="upload-tech-debt" className="text-sm font-normal leading-snug">
                        Este documento traz débitos técnicos e propostas de melhoria
                        <span className="block text-xs text-muted-foreground">
                          Usado na seção de débitos técnicos do chat, quando ela estiver ligada.
                        </span>
                      </Label>
                    </div>
                  )}
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
                                  {isTechDebtSource(source) && (
                                    <Badge variant="outline" className="shrink-0 text-xs">Débitos e melhorias</Badge>
                                  )}
                                </div>
                                {(source.metadata as any)?.kind === "git" && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground" title={source.sourceUrl ?? ""}>
                                    Git{((source.metadata as any)?.branch || (source.metadata as any)?.resolvedBranch) ? ` · ${(source.metadata as any).branch || (source.metadata as any).resolvedBranch}` : ""}
                                    {(source.metadata as any)?.lastCommit ? ` · ${String((source.metadata as any).lastCommit).slice(0, 7)}` : ""}
                                    {(source.metadata as any)?.filesIndexed ? ` · ${(source.metadata as any).filesIndexed} arquivos` : ""}
                                  </p>
                                )}
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
                                  {canManage && (source.status === 'completed' ||
                                    (source.status === 'failed' && (source.metadata as any)?.kind === "git")) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title={(source.metadata as any)?.kind === "git" ? "Reindexar (buscar versão mais nova do repositório)" : "Reindexar"}
                                      aria-label="Reindexar"
                                      onClick={() => reindexSource.mutate({ sourceId: source.id })}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canManage && (
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
                                  )}
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
