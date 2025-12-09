import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Loader2, ArrowLeft, Upload, CheckCircle2, AlertCircle, Globe, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const priorityColors = {
  low: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function FeatureDetail() {
  const [, params] = useRoute("/features/:id");
  const [, setLocation] = useLocation();
  const featureId = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading } = trpc.features.getById.useQuery({ id: featureId });
  const exportJiraMutation = trpc.features.exportToJira.useMutation();
  const exportAzureMutation = trpc.azureDevOps.exportFeature.useMutation();
  const utils = trpc.useUtils();

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportJira = async () => {
    try {
      const result = await exportJiraMutation.mutateAsync({ featureId });
      toast.success(`Feature exportada para Jira! Epic: ${result.epicKey}`);
      utils.features.getById.invalidate({ id: featureId });
      utils.features.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao exportar para Jira";
      toast.error(message);
    }
  };

  const handleExportAzure = async () => {
    try {
      const result = await exportAzureMutation.mutateAsync({ featureId });
      toast.success(`Feature exportada para Azure DevOps! Epic ID: ${result.epicId}`);
      utils.features.getById.invalidate({ id: featureId });
      utils.features.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao exportar para Azure DevOps";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Feature não encontrada</p>
        <Button onClick={() => setLocation("/history")} variant="outline">
          Voltar ao Histórico
        </Button>
      </div>
    );
  }

  const { feature, userStories } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setLocation("/history")}
          className="gap-2 hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        {feature.status === "draft" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={exportJiraMutation.isPending || exportAzureMutation.isPending}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {exportJiraMutation.isPending || exportAzureMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Exportar
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm border-white/10">
              <DropdownMenuItem onClick={handleExportJira} className="cursor-pointer">
                Exportar para Jira
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAzure} className="cursor-pointer">
                Exportar para Azure DevOps
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {feature.status === "exported" && (feature.jiraIssueKey || feature.azureDevOpsWorkItemId) && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">
              {feature.jiraIssueKey ? `Jira: ${feature.jiraIssueKey}` : `Azure DevOps: ${feature.azureDevOpsWorkItemId}`}
            </span>
          </div>
        )}
      </div>

      {/* Feature Principal */}
      <GlassCard className="p-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight">{feature.title}</h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                  {feature.status === "draft" ? "Rascunho" : feature.status === "exported" ? "Exportado" : "Arquivado"}
                </Badge>
                <Badge variant="outline" className="bg-white/5 border-white/10 gap-1.5">
                  <Globe className="w-3 h-3" />
                  {feature.language === "pt" ? "Português" : "English"}
                </Badge>
                {feature.jiraIssueKey && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                    {feature.jiraIssueKey}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Descrição
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed">
                {feature.description}
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Prompt Original
              </h2>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {feature.originalPrompt}
              </p>
            </div>
          </div>

          {/* Histórias de Usuário dentro do card da feature */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                Histórias de Usuário
              </h2>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-lg px-3 py-1">
                {userStories.length} {userStories.length === 1 ? "história" : "histórias"}
              </Badge>
            </div>

            <div className="space-y-4">
              {userStories.map((story, index) => (
                <div
                  key={story.id}
                  className="p-6 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </span>
                        <h3 className="text-xl font-semibold">{story.title}</h3>
                      </div>
                      <p className="text-foreground/80 leading-relaxed pl-11">
                        {story.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={priorityColors[story.priority]}>
                        {story.priority}
                      </Badge>
                      {story.storyPoints && (
                        <Badge variant="outline" className="bg-white/5 border-white/10">
                          {story.storyPoints} pts
                        </Badge>
                      )}
                    </div>
                  </div>

                  {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                    <div className="pl-11 space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Critérios de Aceite
                      </p>
                      <ul className="space-y-2">
                        {story.acceptanceCriteria.map((criterion) => (
                          <li
                            key={criterion.id}
                            className="flex items-start gap-2 text-sm text-foreground/80"
                          >
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{criterion.criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {story.jiraIssueKey && (
                    <div className="pl-11">
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        Jira: {story.jiraIssueKey}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
