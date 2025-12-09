import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, CheckCircle2, XCircle, GitBranch } from "lucide-react";

export default function JiraConfig() {
  const { data: config, isLoading } = trpc.config.jira.get.useQuery();
  const saveMutation = trpc.config.jira.save.useMutation();
  const testMutation = trpc.config.jira.test.useMutation();

  const [jiraUrl, setJiraUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [defaultProject, setDefaultProject] = useState("");

  useEffect(() => {
    if (config) {
      setJiraUrl(config.jiraUrl);
      setEmail(config.email);
      setApiToken(config.apiToken);
      setDefaultProject(config.defaultProject || "");
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        jiraUrl,
        email,
        apiToken,
        defaultProject: defaultProject || undefined,
      });
      toast.success("Configuração do Jira salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleTest = async () => {
    try {
      const result = await testMutation.mutateAsync();
      if (result.success) {
        toast.success("Conexão com Jira estabelecida com sucesso!");
      } else {
        toast.error(`Falha na conexão: ${result.message}`);
      }
    } catch (error) {
      toast.error("Erro ao testar conexão");
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
          <GitBranch className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integração com Jira</h1>
          <p className="text-muted-foreground mt-1">
            Configure a conexão com seu projeto Jira
          </p>
        </div>
      </div>

      <GlassCard className="p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="jiraUrl" className="text-base font-semibold">
              URL do Jira
            </Label>
            <Input
              id="jiraUrl"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              placeholder="https://sua-empresa.atlassian.net"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
            <p className="text-sm text-muted-foreground">
              URL completa da sua instância Jira
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-email@empresa.com"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
            <p className="text-sm text-muted-foreground">
              Email da conta Jira para autenticação
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiToken" className="text-base font-semibold">
              API Token
            </Label>
            <Input
              id="apiToken"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="••••••••••••••••"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
            <p className="text-sm text-muted-foreground">
              Token de API gerado nas configurações do Jira
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultProject" className="text-base font-semibold">
              Projeto Padrão
            </Label>
            <Input
              id="defaultProject"
              value={defaultProject}
              onChange={(e) => setDefaultProject(e.target.value)}
              placeholder="PROJ"
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
            <p className="text-sm text-muted-foreground">
              Chave do projeto padrão para exportação (ex: PROJ, DEV)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="lg"
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
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

            {config && (
              <Button
                onClick={handleTest}
                disabled={testMutation.isPending}
                variant="outline"
                size="lg"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : testMutation.data?.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    Conexão OK
                  </>
                ) : testMutation.data ? (
                  <>
                    <XCircle className="w-4 h-4 mr-2 text-red-500" />
                    Falhou
                  </>
                ) : (
                  <>
                    Testar Conexão
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
