import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, History as HistoryIcon, Eye, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function History() {
  const [, setLocation] = useLocation();
  const { data: features, isLoading } = trpc.features.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm">
          <HistoryIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Features</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todas as features geradas
          </p>
        </div>
      </div>

      {!features || features.length === 0 ? (
        <GlassCard className="p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-4 rounded-full bg-muted/20">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nenhuma feature gerada ainda</h3>
              <p className="text-muted-foreground max-w-md">
                Comece gerando sua primeira feature com IA para vê-la aparecer aqui
              </p>
            </div>
            <Button
              onClick={() => setLocation("/generate")}
              className="mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Gerar Feature
            </Button>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {features.map((feature) => (
            <GlassCard
              key={feature.id}
              className="p-6 hover:border-white/20 transition-all cursor-pointer"
              onClick={() => setLocation(`/features/${feature.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <Badge
                      variant="outline"
                      className={
                        feature.status === "draft"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          : feature.status === "exported"
                          ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                      }
                    >
                      {feature.status === "draft"
                        ? "Rascunho"
                        : feature.status === "exported"
                        ? "Exportado"
                        : "Arquivado"}
                    </Badge>
                  </div>

                  <p className="text-foreground/70 line-clamp-2 leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(feature.createdAt), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {feature.jiraIssueKey && (
                      <Badge variant="outline" className="bg-white/5 border-white/10">
                        {feature.jiraIssueKey}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white/5 border-white/10 hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/features/${feature.id}`);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Visualizar
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
