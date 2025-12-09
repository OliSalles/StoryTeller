import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Cloud, Save } from "lucide-react";

export default function AzureDevOpsConfig() {
  const { data: config, isLoading } = trpc.config.azureDevOps.get.useQuery();
  const saveMutation = trpc.config.azureDevOps.save.useMutation();

  const [organization, setOrganization] = useState("");
  const [project, setProject] = useState("");
  const [pat, setPat] = useState("");
  const [defaultArea, setDefaultArea] = useState("");
  const [defaultIteration, setDefaultIteration] = useState("");
  const [defaultState, setDefaultState] = useState("");
  const [defaultBoard, setDefaultBoard] = useState("");
  const [defaultColumn, setDefaultColumn] = useState("");
  const [defaultSwimlane, setDefaultSwimlane] = useState("");

  useEffect(() => {
    if (config) {
      setOrganization(config.organization || "");
      setProject(config.project || "");
      setPat(config.pat || "");
      setDefaultArea(config.defaultArea || "");
      setDefaultIteration(config.defaultIteration || "");
      setDefaultState(config.defaultState || "");
      setDefaultBoard(config.defaultBoard || "");
      setDefaultColumn(config.defaultColumn || "");
      setDefaultSwimlane(config.defaultSwimlane || "");
    }
  }, [config]);

  const handleSave = async () => {
    if (!organization || !project || !pat) {
      toast.error("Preencha os campos obrigatórios: Organização, Projeto e PAT");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        organization,
        project,
        pat,
        defaultArea: defaultArea || undefined,
        defaultIteration: defaultIteration || undefined,
        defaultState: defaultState || undefined,
        defaultBoard: defaultBoard || undefined,
        defaultColumn: defaultColumn || undefined,
        defaultSwimlane: defaultSwimlane || undefined,
      });
      toast.success("Configuração do Azure DevOps salva com sucesso!");
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
          <Cloud className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração Azure DevOps</h1>
          <p className="text-muted-foreground mt-1">
            Configure sua integração com Azure DevOps para exportar features
          </p>
        </div>
      </div>

      <GlassCard className="p-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Credenciais de Acesso</h2>
            
            <div className="space-y-2">
              <Label htmlFor="organization">Organização *</Label>
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="ex: minhaempresa"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
              <p className="text-sm text-muted-foreground">
                Nome da sua organização no Azure DevOps (https://dev.azure.com/[organização])
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Projeto *</Label>
              <Input
                id="project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="ex: MeuProjeto"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
              <p className="text-sm text-muted-foreground">
                Nome do projeto onde as features serão exportadas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat">Personal Access Token (PAT) *</Label>
              <Input
                id="pat"
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="••••••••••••••••••••"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
              <p className="text-sm text-muted-foreground">
                Token de acesso pessoal com permissões de Work Items (Read, Write & Manage)
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 space-y-4">
            <h2 className="text-xl font-semibold">Configurações Padrão</h2>
            <p className="text-sm text-muted-foreground">
              Defina valores padrão que serão usados ao exportar features (opcional)
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultArea">Área Padrão</Label>
                <Input
                  id="defaultArea"
                  value={defaultArea}
                  onChange={(e) => setDefaultArea(e.target.value)}
                  placeholder="ex: MeuProjeto\\Backend"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultIteration">Iteração Padrão</Label>
                <Input
                  id="defaultIteration"
                  value={defaultIteration}
                  onChange={(e) => setDefaultIteration(e.target.value)}
                  placeholder="ex: Sprint 1"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultState">Estado Padrão</Label>
                <Input
                  id="defaultState"
                  value={defaultState}
                  onChange={(e) => setDefaultState(e.target.value)}
                  placeholder="ex: New, Active, Resolved"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultBoard">Board Padrão</Label>
                <Input
                  id="defaultBoard"
                  value={defaultBoard}
                  onChange={(e) => setDefaultBoard(e.target.value)}
                  placeholder="ex: Backlog"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultColumn">Coluna Padrão</Label>
                <Input
                  id="defaultColumn"
                  value={defaultColumn}
                  onChange={(e) => setDefaultColumn(e.target.value)}
                  placeholder="ex: New, In Progress, Done"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultSwimlane">Swimlane Padrão</Label>
                <Input
                  id="defaultSwimlane"
                  value={defaultSwimlane}
                  onChange={(e) => setDefaultSwimlane(e.target.value)}
                  placeholder="ex: Default"
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 bg-blue-500/10 border-blue-500/20">
        <div className="flex gap-3">
          <Cloud className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-300">Como obter um Personal Access Token</h3>
            <ol className="text-sm text-foreground/80 space-y-1 list-decimal list-inside">
              <li>Acesse Azure DevOps e clique no ícone de usuário no canto superior direito</li>
              <li>Selecione "Personal access tokens"</li>
              <li>Clique em "New Token"</li>
              <li>Dê um nome ao token e selecione a organização</li>
              <li>Em "Scopes", selecione "Work Items" com permissões "Read, Write & Manage"</li>
              <li>Clique em "Create" e copie o token gerado</li>
            </ol>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
