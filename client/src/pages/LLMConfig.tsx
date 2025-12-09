import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Sparkles } from "lucide-react";

export default function LLMConfig() {
  const { data: config, isLoading } = trpc.config.llm.get.useQuery();
  const saveMutation = trpc.config.llm.save.useMutation();

  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<string>("0.7");
  const [maxTokens, setMaxTokens] = useState(2000);

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setModel(config.model);
      setApiKey(config.apiKey);
      setTemperature(config.temperature || "0.7");
      setMaxTokens(config.maxTokens || 2000);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        provider,
        model,
        apiKey: apiKey || undefined,
        temperature,
        maxTokens,
      });
      toast.success("Configuração de LLM salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configuração");
    }
  };

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
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração de LLM</h1>
          <p className="text-muted-foreground mt-1">
            Configure o modelo de linguagem para geração de features
          </p>
        </div>
      </div>

      <GlassCard className="p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-base font-semibold">
              Provider
            </Label>
            <Input
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="openai"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
            <p className="text-sm text-muted-foreground">
              Provedor do modelo (ex: openai, anthropic)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model" className="text-base font-semibold">
              Modelo
            </Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
            <p className="text-sm text-muted-foreground">
              Nome do modelo a ser utilizado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-base font-semibold">
              API Key (Opcional)
            </Label>
            <Input
              id="apiKey"
              type="password"
      value={apiKey || ""}
      onChange={(e) => setApiKey(e.target.value || null)}
              placeholder="sk-..."
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
            <p className="text-sm text-muted-foreground">
              Deixe em branco para usar a API key padrão do sistema
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-base font-semibold">
                Temperature
              </Label>
              <Input
                id="temperature"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="0.7"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
              <p className="text-sm text-muted-foreground">
                Criatividade do modelo (0.0 - 1.0)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens" className="text-base font-semibold">
                Max Tokens
              </Label>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                placeholder="2000"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
              <p className="text-sm text-muted-foreground">
                Tamanho máximo da resposta
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
