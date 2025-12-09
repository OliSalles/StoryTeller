import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Send } from "lucide-react";
import { useLocation } from "wouter";

export default function GenerateFeature() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const generateMutation = trpc.features.generate.useMutation();

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast.error("Por favor, descreva sua feature com mais detalhes");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({ prompt });
      toast.success("Feature gerada com sucesso!");
      setLocation(`/features/${result.featureId}`);
    } catch (error) {
      toast.error("Erro ao gerar feature. Verifique suas configurações de LLM.");
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
            <label className="text-base font-semibold block">
              Descreva sua Feature
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Exemplo: Preciso de um sistema de notificações em tempo real onde os usuários possam receber alertas sobre atividades importantes, configurar preferências de notificação e visualizar histórico de notificações..."
              className="min-h-[300px] bg-white/5 border-white/10 focus:border-primary/50 resize-none text-base leading-relaxed"
              disabled={generateMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Seja específico sobre funcionalidades, usuários e objetivos. Quanto mais detalhes, melhor será o resultado.
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground/90">
              A IA irá analisar sua descrição e gerar automaticamente uma estrutura completa com feature, 
              histórias de usuário divididas logicamente, prioridades, story points e critérios de aceite detalhados.
            </p>
          </div>

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
