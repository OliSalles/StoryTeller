import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Send } from "lucide-react";
import { useLocation } from "wouter";

export default function GenerateFeature() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [technology, setTechnology] = useState("none");
  const [includeTasks, setIncludeTasks] = useState(true);
  const generateMutation = trpc.features.generate.useMutation();
  const cancelMutation = trpc.features.cancelExecution.useMutation();
  const { data: activeExecution, refetch: refetchActiveExecution } = trpc.features.getActiveExecution.useQuery(
    undefined,
    { refetchInterval: generateMutation.isPending ? 2000 : false } // Poll every 2s while generating
  );

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast.error("Por favor, descreva sua feature com mais detalhes");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({ 
        prompt, 
        language,
        technology: technology && technology !== "none" ? technology : undefined,
        includeTasks
      });
      toast.success("Feature gerada com sucesso!");
      await refetchActiveExecution(); // Refresh active execution status
      setLocation(`/features/${result.featureId}`);
    } catch (error) {
      await refetchActiveExecution(); // Refresh even on error
      toast.error("Erro ao gerar feature. Tente novamente ou entre em contato com o suporte.");
    }
  };

  const handleCancel = async () => {
    if (!activeExecution) return;
    
    try {
      await cancelMutation.mutateAsync({ executionId: activeExecution.id });
      toast.success("Geração cancelada com sucesso!");
      await refetchActiveExecution();
    } catch (error) {
      toast.error("Erro ao cancelar geração.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerar Feature com IA</h1>
          <p className="text-muted-foreground mt-1">
            Descreva sua feature e deixe a IA criar histórias de usuário e critérios de aceite
          </p>
        </div>
      </div>

      <GlassCard className="p-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="language" className="text-base font-semibold">
              Idioma da Geração
            </Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as "pt" | "en")}>
              <SelectTrigger className="bg-white/5 border-white/10 focus:border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Escolha o idioma para gerar a feature, histórias de usuário e critérios de aceite
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="technology" className="text-base font-semibold">
              Tecnologia / Plataforma <span className="text-sm font-normal text-muted-foreground">(Opcional)</span>
            </Label>
            <Select value={technology} onValueChange={setTechnology} disabled={generateMutation.isPending}>
              <SelectTrigger className="bg-white/5 border-white/10 focus:border-primary/50">
                <SelectValue placeholder="Selecione uma tecnologia ou deixe em branco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (Genérico)</SelectItem>
                <SelectItem value="Salesforce">Salesforce (Apex, LWC, Visualforce)</SelectItem>
                <SelectItem value="React">React (Frontend)</SelectItem>
                <SelectItem value="Angular">Angular (Frontend)</SelectItem>
                <SelectItem value="Vue.js">Vue.js (Frontend)</SelectItem>
                <SelectItem value="Node.js">Node.js (Backend)</SelectItem>
                <SelectItem value=".NET">.NET / C# (Backend)</SelectItem>
                <SelectItem value="Java Spring">Java Spring (Backend)</SelectItem>
                <SelectItem value="Python Django">Python Django (Backend)</SelectItem>
                <SelectItem value="Python Flask">Python Flask (Backend)</SelectItem>
                <SelectItem value="React Native">React Native (Mobile)</SelectItem>
                <SelectItem value="Flutter">Flutter (Mobile)</SelectItem>
                <SelectItem value="iOS Native">iOS Native (Swift)</SelectItem>
                <SelectItem value="Android Native">Android Native (Kotlin)</SelectItem>
                <SelectItem value="WordPress">WordPress</SelectItem>
                <SelectItem value="SharePoint">SharePoint</SelectItem>
                <SelectItem value="Power Platform">Power Platform (Power Apps, Power Automate)</SelectItem>
                <SelectItem value="ServiceNow">ServiceNow</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Especifique a tecnologia para receber sugestões técnicas específicas e melhores práticas da plataforma
            </p>
          </div>

          <div className="flex items-center space-x-3 p-4 rounded-lg bg-white/5 border border-white/10">
            <Checkbox 
              id="includeTasks" 
              checked={includeTasks}
              onCheckedChange={(checked) => setIncludeTasks(checked as boolean)}
              disabled={generateMutation.isPending}
              className="border-white/20"
            />
            <Label 
              htmlFor="includeTasks" 
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Incluir tasks técnicas detalhadas para cada história de usuário
            </Label>
          </div>

          <div className="space-y-3">
            <Label htmlFor="prompt" className="text-base font-semibold">
              Descreva sua Feature
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Exemplo: Preciso de um sistema de notificações em tempo real onde os usuários possam receber alertas sobre atividades importantes, configurar preferências de notificação e visualizar histórico de notificações..."
              className="min-h-[300px] bg-white/5 border-white/10 focus:border-primary/50 resize-none text-base leading-relaxed"
              disabled={generateMutation.isPending}
              maxLength={2000}
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Seja específico sobre funcionalidades, usuários e objetivos. Quanto mais detalhes, melhor será o resultado.
              </p>
              <p className={`text-sm font-medium ${
                prompt.length >= 2000 ? 'text-destructive' : 
                prompt.length >= 1800 ? 'text-yellow-500' : 
                'text-muted-foreground'
              }`}>
                {prompt.length}/2000
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground/90">
              A IA irá analisar sua descrição e gerar automaticamente uma estrutura completa com feature, 
              histórias de usuário divididas logicamente, prioridades, story points e critérios de aceite detalhados.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || prompt.trim().length < 10}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando Feature...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Gerar Feature
                </>
              )}
            </Button>
            
            {activeExecution && (
              <Button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                size="lg"
                variant="destructive"
                className="w-full"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Cancelar Geração"
                )}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {generateMutation.isPending && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Processando com IA...</p>
              <p className="text-sm text-muted-foreground">
                Analisando requisitos, criando histórias de usuário e definindo critérios de aceite
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
