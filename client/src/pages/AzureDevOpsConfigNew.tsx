import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AzureDevOpsConfigNew() {
  const { data: fullConfig, isLoading, refetch } = trpc.azureDevOpsImproved.getFullConfig.useQuery();
  
  // Mutations
  const saveCredentialsMutation = trpc.azureDevOpsImproved.credentials.save.useMutation();
  const createProjectMutation = trpc.azureDevOpsImproved.projects.create.useMutation();
  const updateProjectMutation = trpc.azureDevOpsImproved.projects.update.useMutation();
  const deleteProjectMutation = trpc.azureDevOpsImproved.projects.delete.useMutation();

  // Estados - Credenciais
  const [organization, setOrganization] = useState("");
  const [pat, setPat] = useState("");
  const [showPat, setShowPat] = useState(false);

  // Estados - Novo Projeto
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newDefaultArea, setNewDefaultArea] = useState("");
  const [newDefaultIteration, setNewDefaultIteration] = useState("");
  const [newDefaultState, setNewDefaultState] = useState("");

  // Estados - Editar Projeto
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editDefaultArea, setEditDefaultArea] = useState("");
  const [editDefaultIteration, setEditDefaultIteration] = useState("");
  const [editDefaultState, setEditDefaultState] = useState("");

  // Carregar dados quando disponíveis
  useState(() => {
    if (fullConfig?.credentials) {
      setOrganization(fullConfig.credentials.organization || "");
      setPat(fullConfig.credentials.pat || "");
    }
  });

  const handleSaveCredentials = async () => {
    if (!organization || !pat) {
      toast.error("Preencha Organização e Token");
      return;
    }

    try {
      await saveCredentialsMutation.mutateAsync({
        organization,
        pat,
      });
      toast.success("Credenciais salvas com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar credenciais");
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName) {
      toast.error("Preencha o nome do projeto");
      return;
    }

    try {
      await createProjectMutation.mutateAsync({
        name: newProjectName,
        defaultArea: newDefaultArea || undefined,
        defaultIteration: newDefaultIteration || undefined,
        defaultState: newDefaultState || undefined,
      });
      
      toast.success("Projeto adicionado com sucesso!");
      setIsAddingProject(false);
      setNewProjectName("");
      setNewDefaultArea("");
      setNewDefaultIteration("");
      setNewDefaultState("");
      refetch();
    } catch (error) {
      toast.error("Erro ao adicionar projeto");
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setEditDefaultArea(project.defaultArea || "");
    setEditDefaultIteration(project.defaultIteration || "");
    setEditDefaultState(project.defaultState || "");
  };

  const handleSaveEdit = async () => {
    if (!editingProjectId) return;

    try {
      await updateProjectMutation.mutateAsync({
        id: editingProjectId,
        name: editProjectName,
        defaultArea: editDefaultArea || undefined,
        defaultIteration: editDefaultIteration || undefined,
        defaultState: editDefaultState || undefined,
      });
      
      toast.success("Projeto atualizado!");
      setEditingProjectId(null);
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar projeto");
    }
  };

  const handleDeleteProject = async (id: number, name: string) => {
    if (!confirm(`Deseja realmente deletar o projeto "${name}"?`)) return;

    try {
      await deleteProjectMutation.mutateAsync({ id });
      toast.success("Projeto deletado!");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar projeto");
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
      <div>
        <h1 className="text-3xl font-bold">Azure DevOps</h1>
        <p className="text-muted-foreground mt-2">
          Configure suas credenciais e gerencie múltiplos projetos
        </p>
      </div>

      {/* SEÇÃO 1: CREDENCIAIS */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🔑 Credenciais
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organização e token de acesso (único para todos os projetos)
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organização *</Label>
              <Input
                id="organization"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                placeholder="MinhaOrganização"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
              <p className="text-sm text-muted-foreground">
                Nome da sua organização no Azure DevOps
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat">Personal Access Token (PAT) *</Label>
              <div className="relative">
                <Input
                  id="pat"
                  type={showPat ? "text" : "password"}
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  placeholder="••••••••••••••••••••"
                  className="bg-white/5 border-white/10 focus:border-primary/50 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPat(!showPat)}
                  disabled={!pat}
                >
                  {showPat ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Token com permissões de Work Items (Read, Write & Manage)
              </p>
            </div>

            <Button
              onClick={handleSaveCredentials}
              disabled={saveCredentialsMutation.isPending}
              className="w-full sm:w-auto"
            >
              {saveCredentialsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Credenciais
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* SEÇÃO 2: PROJETOS */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                📦 Projetos
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie os projetos do Azure DevOps
              </p>
            </div>
            
            <Dialog open={isAddingProject} onOpenChange={setIsAddingProject}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Projeto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Projeto</DialogTitle>
                  <DialogDescription>
                    Configure um novo projeto do Azure DevOps
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="newName">Nome do Projeto *</Label>
                    <Input
                      id="newName"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      placeholder="Nome do projeto no Azure DevOps"
                      className="bg-white/5 border-white/10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use o nome exato do projeto conforme está no Azure DevOps
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newArea">Área Padrão</Label>
                    <Input
                      id="newArea"
                      value={newDefaultArea}
                      onChange={e => setNewDefaultArea(e.target.value)}
                      placeholder="/Frontend"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newIteration">Iteração Padrão</Label>
                    <Input
                      id="newIteration"
                      value={newDefaultIteration}
                      onChange={e => setNewDefaultIteration(e.target.value)}
                      placeholder="Sprint 1"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newState">Estado Padrão</Label>
                    <Input
                      id="newState"
                      value={newDefaultState}
                      onChange={e => setNewDefaultState(e.target.value)}
                      placeholder="New, Active..."
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingProject(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddProject}
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      "Adicionar"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de Projetos */}
          <div className="space-y-3">
            {fullConfig?.projects && fullConfig.projects.length > 0 ? (
              fullConfig.projects.map((project: any) => (
                <div
                  key={project.id}
                  className="border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
                >
                  {editingProjectId === project.id ? (
                    // Modo de Edição
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Nome do Projeto</Label>
                        <Input
                          value={editProjectName}
                          onChange={e => setEditProjectName(e.target.value)}
                          className="bg-white/5 border-white/10 h-9"
                          placeholder="Nome do projeto no Azure DevOps"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Área</Label>
                          <Input
                            value={editDefaultArea}
                            onChange={e => setEditDefaultArea(e.target.value)}
                            className="bg-white/5 border-white/10 h-8 text-sm"
                            placeholder="/"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Iteração</Label>
                          <Input
                            value={editDefaultIteration}
                            onChange={e => setEditDefaultIteration(e.target.value)}
                            className="bg-white/5 border-white/10 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Estado</Label>
                          <Input
                            value={editDefaultState}
                            onChange={e => setEditDefaultState(e.target.value)}
                            className="bg-white/5 border-white/10 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProjectId(null)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={updateProjectMutation.isPending}
                        >
                          {updateProjectMutation.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Modo de Visualização
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          {project.defaultArea && (
                            <div>📍 Área: {project.defaultArea}</div>
                          )}
                          {project.defaultIteration && (
                            <div>🔄 Iteração: {project.defaultIteration}</div>
                          )}
                          {project.defaultState && (
                            <div>📊 Estado: {project.defaultState}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditProject(project)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum projeto configurado ainda.</p>
                <p className="text-sm mt-2">
                  Clique em "Adicionar Projeto" para começar.
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

