import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Loader2, ArrowLeft, Upload, CheckCircle2, AlertCircle } from "lucide-react";
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
  const exportMutation = trpc.features.exportToJira.useMutation();
  const utils = trpc.useUtils();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({ featureId });
      toast.success(`Feature exportada com sucesso! Epic: ${result.epicKey}`);
      utils.features.getById.invalidate({ id: featureId });
      utils.features.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao exportar para Jira";
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
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Exportar para Jira
              </>
            )}
          </Button>
        )}

        {feature.status === "exported" && feature.jiraIssueKey && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">
              Exportado: {feature.jiraIssueKey}
            </span>
          </div>
        )}
      </div>

      <GlassCard className="p-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{feature.title}</h1>
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                {feature.status === "draft" ? "Rascunho" : feature.status === "exported" ? "Exportado" : "Arquivado"}
              </Badge>
            </div>
          </div>

          <p className="text-lg text-foreground/80 leading-relaxed">
            {feature.description}
          </p>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Prompt Original:</span> {feature.originalPrompt}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Histórias de Usuário ({userStories.length})
        </h2>

        {userStories.map((story, index) => (
          <GlassCard key={story.id} className="p-6 hover:border-white/20 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
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
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
