import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Loader2, ArrowLeft, Upload, CheckCircle2, AlertCircle, Globe, ChevronDown, Edit, Sparkles } from "lucide-react";
import { useState } from "react";
import { EditStoryDialog } from "@/components/EditStoryDialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { UpgradeModal } from "@/components/UpgradeModal";

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
  const [editingStory, setEditingStory] = useState<any>(null);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const updateStoryMutation = trpc.features.updateStory.useMutation();
  const refineMutation = trpc.features.refine.useMutation();
  
  // ✅ Get subscription status
  const { data: status } = trpc.subscriptions.getStatus.useQuery();

  const handleExportJira = async () => {
    // ✅ Check if user has permission
    if (!status?.canExportJira) {
      setShowUpgradeModal(true);
      toast.error("A exportação para Jira está disponível apenas nos planos Pro e Business.");
      return;
    }

    try {
      const result = await exportJiraMutation.mutateAsync({ featureId });
      toast.success(`Feature exportada para Jira! Epic: ${result.epicKey}`);
      utils.features.getById.invalidate({ id: featureId });
      utils.features.list.invalidate();
    } catch (error: any) {
      const message = error?.message || "Erro ao exportar para Jira";
      toast.error(message);
      
      // Show upgrade modal if error is subscription-related
      if (message.includes("plano") || message.includes("Upgrade")) {
        setShowUpgradeModal(true);
      }
    }
  };

  const handleExportAzure = async () => {
    // ✅ Check if user has permission
    if (!status?.canExportAzure) {
      setShowUpgradeModal(true);
      toast.error("A exportação para Azure DevOps está disponível apenas nos planos Pro e Business.");
      return;
    }

    try {
      const result = await exportAzureMutation.mutateAsync({ featureId });
      toast.success(`Feature exportada para Azure DevOps! Epic ID: ${result.epicId}`);
      utils.features.getById.invalidate({ id: featureId });
      utils.features.list.invalidate();
    } catch (error: any) {
      const message = error?.message || "Erro ao exportar para Azure DevOps";
      toast.error(message);
      
      // Show upgrade modal if error is subscription-related
      if (message.includes("plano") || message.includes("Upgrade")) {
        setShowUpgradeModal(true);
      }
    }
  };

  const handleSaveStory = async (storyId: number, data: any) => {
    try {
      await updateStoryMutation.mutateAsync({ storyId, ...data });
      toast.success("História atualizada com sucesso!");
      utils.features.getById.invalidate({ id: featureId });
    } catch (error) {
      toast.error("Erro ao atualizar história");
    }
  };

  const handleRefine = async () => {
    if (!refinementPrompt.trim()) {
      toast.error("Digite um prompt de refinamento");
      return;
    }

    try {
      await refineMutation.mutateAsync({
        featureId,
        refinementPrompt,
        language: feature?.language || "pt",
      });
      toast.success("Feature refinada com sucesso!");
      setShowRefineDialog(false);
      setRefinementPrompt("");
      utils.features.getById.invalidate({ id: featureId });
      utils.features.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao refinar feature";
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

        <Button
          variant="outline"
          onClick={() => setShowRefineDialog(true)}
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <Sparkles className="w-4 h-4" />
          Refinar com IA
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
              <DropdownMenuItem 
                onClick={handleExportJira} 
                className="cursor-pointer"
                disabled={!status?.canExportJira}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Exportar para Jira</span>
                  {!status?.canExportJira && (
                    <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary/30">
                      Pro
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleExportAzure} 
                className="cursor-pointer"
                disabled={!status?.canExportAzure}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Exportar para Azure DevOps</span>
                  {!status?.canExportAzure && (
                    <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary/30">
                      Pro
                    </Badge>
                  )}
                </div>
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
                      <div className="flex items-center gap-3 justify-between">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </span>
                        <h3 className="text-xl font-semibold flex-1">{story.title}</h3>
                        {feature.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingStory(story)}
                            className="h-8 w-8 p-0 hover:bg-white/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
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

                  {story.tasks && story.tasks.length > 0 && (
                    <div className="pl-11 space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Tasks Técnicas
                      </p>
                      <div className="space-y-2">
                        {story.tasks.map((task: any, taskIndex: number) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 text-sm p-3 rounded bg-white/[0.02] border border-white/5"
                          >
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs flex-shrink-0">
                              {taskIndex + 1}
                            </span>
                            <div className="flex-1 space-y-1">
                              <p className="font-medium text-foreground">{task.title}</p>
                              {task.description && (
                                <p className="text-muted-foreground text-xs">{task.description}</p>
                              )}
                            </div>
                            {task.estimatedHours && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 flex-shrink-0">
                                {task.estimatedHours}h
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        limitType="export"
      />
    </div>
  );
}
