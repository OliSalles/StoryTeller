import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Brain, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LLMConfig() {
  const { user } = useAuth();
  const { data: config, isLoading } = trpc.config.llm.get.useQuery();
  const saveMutation = trpc.config.llm.save.useMutation();
  
  const isAdmin = user?.role === "admin";

  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("2000");
  const [showApiKey, setShowApiKey] = useState(false);

  // Atualizar modelo padrão quando o provider mudar
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    
    // Definir modelo padrão para cada provider
    const defaultModels: Record<string, string> = {
      openai: "gpt-4o-mini",
      anthropic: "claude-3-5-sonnet-20241022",
      google: "gemini-1.5-flash",
      azure: "gpt-4o",
      ollama: "llama3.2:latest",
    };
    
    setModel(defaultModels[newProvider] || "gpt-4o-mini");
  };

  useEffect(() => {
    if (config) {
      setProvider(config.provider || "openai");
      setModel(config.model || "gpt-4o-mini");
      setApiKey(config.apiKey || "");
      setTemperature(config.temperature || "0.7");
      setMaxTokens(config.maxTokens?.toString() || "2000");
    }
  }, [config]);

  const handleSave = async () => {
    if (!provider || !model) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        provider,
        model,
        apiKey: apiKey || undefined,
        temperature,
        maxTokens: parseInt(maxTokens),
      });
      toast.success("Configuração da LLM salva com sucesso!");
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
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração da LLM</h1>
          <p className="text-muted-foreground mt-1">
            Configure o modelo de linguagem (LLM) para geração de features
          </p>
        </div>
      </div>

      {!isAdmin && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem editar a configuração da LLM. Esta é uma configuração global usada por todos os usuários.
          </AlertDescription>
        </Alert>
      )}

      <GlassCard className="p-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Provedor e Modelo</h2>
            
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor *</Label>
              <Select value={provider} onValueChange={handleProviderChange} disabled={!isAdmin}>
                <SelectTrigger className="bg-white/5 border-white/10 focus:border-primary/50">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                  <SelectItem value="azure">Azure OpenAI</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Provedor do modelo de IA
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo *</Label>
              <Select value={model} onValueChange={setModel} disabled={!isAdmin}>
                <SelectTrigger className="bg-white/5 border-white/10 focus:border-primary/50">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {provider === "openai" && (
                    <>
                      <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Mais rápido e econômico)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="o1-preview">O1 Preview (Raciocínio avançado)</SelectItem>
                      <SelectItem value="o1-mini">O1 Mini (Raciocínio rápido)</SelectItem>
                    </>
                  )}
                  {provider === "anthropic" && (
                    <>
                      <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recomendado)</SelectItem>
                      <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                    </>
                  )}
                  {provider === "google" && (
                    <>
                      <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</SelectItem>
                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                    </>
                  )}
                  {provider === "azure" && (
                    <>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-35-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                  {provider === "ollama" && (
                    <>
                      <SelectItem value="llama3.2:latest">Llama 3.2</SelectItem>
                      <SelectItem value="mistral:latest">Mistral</SelectItem>
                      <SelectItem value="codellama:latest">Code Llama</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Modelo de IA para geração de conteúdo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-white/5 border-white/10 focus:border-primary/50 pr-10"
                  disabled={!isAdmin}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={!apiKey}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Chave de API do provedor (opcional se usar variável de ambiente)
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <h2 className="text-xl font-semibold">Parâmetros Avançados</h2>
            
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperatura</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary/50"
                disabled={!isAdmin}
              />
              <p className="text-sm text-muted-foreground">
                Controla a criatividade (0 = mais conservador, 2 = mais criativo)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                step="100"
                min="100"
                max="32000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary/50"
                disabled={!isAdmin}
              />
              <p className="text-sm text-muted-foreground">
                Número máximo de tokens na resposta
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !isAdmin}
              className="flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 bg-blue-500/5 border-blue-500/20">
        <div className="space-y-2">
          <h3 className="font-semibold text-blue-400">💡 Dicas</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>GPT-4o</strong>: Melhor custo-benefício, suporta Structured Outputs</li>
            <li><strong>GPT-4o Mini</strong>: Mais rápido e 60% mais barato que GPT-4o</li>
            <li><strong>O1 Preview/Mini</strong>: Modelos com raciocínio avançado para problemas complexos</li>
            <li><strong>Claude 3.5 Sonnet</strong>: Excelente para código e análise técnica</li>
            <li>Temperatura mais baixa (0-0.5) = respostas mais consistentes</li>
            <li>Temperatura mais alta (0.7-2) = respostas mais criativas</li>
          </ul>
        </div>
      </GlassCard>
    </div>
  );
}

