import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import { Search, AlertTriangle, Lightbulb, GitMerge, ExternalLink } from "lucide-react";

interface StoryAnalysisPanelProps {
  storyId?: number;
  title: string;
  description: string;
  onAnalysisComplete?: (result: any) => void;
}

export function StoryAnalysisPanel({ storyId, title, description, onAnalysisComplete }: StoryAnalysisPanelProps) {
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const analyzeStory = trpc.storyAnalysis.analyzeStory.useMutation({
    onSuccess: (data) => {
      setHasAnalyzed(true);
      onAnalysisComplete?.(data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAnalyze = () => {
    if (!title || !description) {
      toast.error("Preencha título e descrição para analisar");
      return;
    }

    analyzeStory.mutate({
      storyId,
      title,
      description,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'duplicate':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'reusable':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'convergent':
        return <GitMerge className="h-5 w-5 text-blue-500" />;
      default:
        return <Search className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      duplicate: { variant: "destructive", label: "DUPLICATA" },
      reusable: { variant: "default", label: "REUTILIZÁVEL" },
      convergent: { variant: "secondary", label: "CONVERGENTE" },
    };
    const config = variants[type] || { variant: "outline", label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Análise de Similaridade</CardTitle>
            <CardDescription>
              Detecta duplicatas, oportunidades de reuso e convergências
            </CardDescription>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={analyzeStory.isPending || !title || !description}
            variant={hasAnalyzed ? "outline" : "default"}
          >
            <Search className="mr-2 h-4 w-4" />
            {analyzeStory.isPending ? "Analisando..." : hasAnalyzed ? "Analisar Novamente" : "Analisar Story"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {analyzeStory.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Analisando contra a base de conhecimento...
              </p>
            </div>
          </div>
        )}

        {analyzeStory.data && !analyzeStory.isPending && (
          <div className="space-y-4">
            <Alert variant={analyzeStory.data.status === 'duplicate' ? 'destructive' : 'default'}>
              <div className="flex items-start gap-2">
                {getStatusIcon(analyzeStory.data.status)}
                <div className="flex-1">
                  <AlertTitle>{analyzeStory.data.message}</AlertTitle>
                  {analyzeStory.data.status === 'duplicate' && (
                    <AlertDescription className="mt-2">
                      Revise as duplicatas abaixo antes de prosseguir. Você pode estar replicando trabalho já existente.
                    </AlertDescription>
                  )}
                </div>
              </div>
            </Alert>

            {analyzeStory.data.similarities && analyzeStory.data.similarities.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Itens Similares Encontrados:</h4>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {analyzeStory.data.similarities.map((sim: any, idx: number) => (
                      <Card key={idx} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusBadge(sim.type)}
                                <Badge variant="outline">{sim.similarityScore}% similar</Badge>
                              </div>
                              <h5 className="font-semibold">{sim.sourceName}</h5>
                              {sim.relatedTeamId && (
                                <p className="text-xs text-muted-foreground">
                                  Time ID: {sim.relatedTeamId}
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {sim.explanation}
                          </p>

                          {sim.type === 'duplicate' && (
                            <Alert variant="destructive" className="text-xs">
                              <AlertDescription>
                                <strong>Ação Recomendada:</strong> Verifique se esta story é realmente necessária. 
                                Considere reutilizar ou expandir a existente.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {sim.type === 'reusable' && (
                            <Alert className="text-xs">
                              <AlertDescription>
                                <strong>Ação Recomendada:</strong> Revise o código/feature existente antes de implementar. 
                                Você pode economizar tempo reutilizando componentes.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {sim.type === 'convergent' && (
                            <Alert className="text-xs">
                              <AlertDescription>
                                <strong>Ação Recomendada:</strong> Alinhe com o time responsável para evitar 
                                conflitos ou duplicação de esforços.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {analyzeStory.data.status === 'new' && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Story Nova</AlertTitle>
                <AlertDescription>
                  Esta story parece ser completamente nova! Não foram encontrados itens similares na base de conhecimento.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!analyzeStory.data && !analyzeStory.isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Clique em "Analisar Story" para verificar similaridades</p>
            <p className="text-sm mt-2">
              Iremos buscar na base de conhecimento por duplicatas, código reutilizável e convergências
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
