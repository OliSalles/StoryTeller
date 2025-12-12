import { trpc } from "@/lib/trpc";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Executions() {
  const { data: executions, isLoading } = trpc.executions.list.useQuery();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      success: "bg-green-500/20 text-green-300 border-green-500/30",
      error: "bg-red-500/20 text-red-300 border-red-500/30",
      processing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      started: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    };
    return (
      <Badge className={`${variants[status] || ""} border`}>
        {status === "success" ? "Sucesso" : status === "error" ? "Erro" : status === "processing" ? "Processando" : "Iniciado"}
      </Badge>
    );
  };

  const formatDuration = (start: Date, end?: Date | null) => {
    if (!end) return "Em andamento...";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-purple-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Execuções</h1>
          <p className="text-gray-400">Logs detalhados de cada geração de feature</p>
        </div>
      </div>

      {!executions || executions.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Nenhuma execução registrada ainda</p>
          <p className="text-gray-500 text-sm mt-2">Gere uma feature para ver os logs aqui</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {executions.map((execution) => (
            <GlassCard key={execution.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getStatusIcon(execution.status)}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(execution.status)}
                      <span className="text-gray-400 text-sm">
                        {format(new Date(execution.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-gray-500 text-sm">
                        Duração: {formatDuration(execution.startTime, execution.endTime)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Prompt:</span>
                        <span className="ml-2 text-white font-medium">{execution.promptLength} caracteres</span>
                      </div>
                      {execution.chunksCount && execution.chunksCount > 0 && (
                        <div>
                          <span className="text-gray-500">Chunks:</span>
                          <span className="ml-2 text-white font-medium">{execution.chunksCount}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Histórias:</span>
                        <span className="ml-2 text-white font-medium">{execution.totalStories || 0}</span>
                      </div>
                      {execution.featureId && (
                        <div>
                          <span className="text-gray-500">Feature ID:</span>
                          <span className="ml-2 text-white font-medium">#{execution.featureId}</span>
                        </div>
                      )}
                    </div>

                    {execution.errorMessage && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-300 text-sm font-medium">Erro:</p>
                        <p className="text-red-200 text-sm mt-1">{execution.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900/95 backdrop-blur-xl border-purple-500/30">
                    <DialogHeader>
                      <DialogTitle className="text-white">Detalhes da Execução #{execution.id}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-2">Informações Gerais</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Status:</span>
                              <span className="text-white">{getStatusBadge(execution.status)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Início:</span>
                              <span className="text-white">
                                {format(new Date(execution.startTime), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                              </span>
                            </div>
                            {execution.endTime && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Fim:</span>
                                <span className="text-white">
                                  {format(new Date(execution.endTime), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-500">Duração:</span>
                              <span className="text-white">{formatDuration(execution.startTime, execution.endTime)}</span>
                            </div>
                          </div>
                        </div>

                        {execution.aiResponse && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">Resposta da IA</h3>
                            <pre className="bg-black/40 p-4 rounded-lg text-xs text-gray-300 overflow-x-auto border border-gray-700">
                              {execution.aiResponse}
                            </pre>
                          </div>
                        )}

                        {execution.errorMessage && (
                          <div>
                            <h3 className="text-sm font-medium text-red-400 mb-2">Mensagem de Erro</h3>
                            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                              <p className="text-red-200 text-sm">{execution.errorMessage}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
