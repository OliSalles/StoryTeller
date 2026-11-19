import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Eye, Calendar, FileText, Trash2, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function History() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: features, isLoading } = trpc.features.list.useQuery();
  
  const deleteFeature = trpc.features.deleteFeature.useMutation({
    onSuccess: () => {
      utils.features.list.invalidate();
    },
    onError: (error) => {
      alert(`Erro ao excluir: ${error.message}`);
    },
  });

  const exportPdf = trpc.features.exportToPdf.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      alert(`Erro ao exportar PDF: ${error.message}`);
    },
  });

  const handleExportPdf = (featureId: number) => {
    exportPdf.mutate({ featureId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Azure DevOps style page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico de Features</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize e gerencie todas as features geradas
        </p>
      </div>

      {/* Command bar */}
      <div className="flex items-center gap-2 pb-4 border-b">
        <Button
          onClick={() => setLocation("/generate")}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          Nova Feature
        </Button>
      </div>

      {!features || features.length === 0 ? (
        <div className="bg-card border rounded p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Nenhuma feature gerada ainda</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Comece gerando sua primeira feature com IA para vê-la aparecer aqui
              </p>
            </div>
            <Button
              onClick={() => setLocation("/generate")}
              size="sm"
            >
              Gerar Feature
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded">
          {/* Azure DevOps style table/list */}
          <div className="divide-y">
            {features.map((feature, idx) => (
              <div
                key={feature.id}
                className={`px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer flex items-center gap-4 ${idx === 0 ? 'rounded-t' : ''} ${idx === features.length - 1 ? 'rounded-b' : ''}`}
                onClick={() => setLocation(`/features/${feature.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">#{feature.id}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        feature.status === "draft"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                          : feature.status === "exported"
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                          : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800"
                      }`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                        feature.status === "draft" ? "bg-blue-500" : feature.status === "exported" ? "bg-green-500" : "bg-gray-500"
                      }`} />
                      {feature.status === "draft"
                        ? "Rascunho"
                        : feature.status === "exported"
                        ? "Exportado"
                        : "Arquivado"}
                    </Badge>
                  </div>
                  
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {feature.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(feature.createdAt), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {feature.jiraIssueKey && (
                    <span className="text-xs">{feature.jiraIssueKey}</span>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/features/${feature.id}`);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportPdf(feature.id);
                    }}
                    disabled={exportPdf.isPending}
                  >
                    {exportPdf.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Tem certeza que deseja excluir a feature "${feature.title}"? Esta ação não pode ser desfeita.`)) {
                        deleteFeature.mutate({ featureId: feature.id });
                      }
                    }}
                    disabled={deleteFeature.isPending}
                  >
                    {deleteFeature.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
