import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Building2, Users, Plus } from "lucide-react";

export function CompanySettings() {
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySlug, setNewCompanySlug] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");

  const utils = trpc.useUtils();
  
  // Queries
  const { data: companies, isLoading: loadingCompanies } = trpc.companies.list.useQuery();
  const { data: teams, isLoading: loadingTeams } = trpc.teams.list.useQuery();

  // Mutations
  const createCompany = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("Empresa criada com sucesso!");
      utils.companies.list.invalidate();
      setNewCompanyName("");
      setNewCompanySlug("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createTeam = trpc.teams.create.useMutation({
    onSuccess: () => {
      toast.success("Time criado com sucesso!");
      utils.teams.list.invalidate();
      setNewTeamName("");
      setNewTeamDesc("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateCompany = () => {
    if (!newCompanyName || !newCompanySlug) {
      toast.error("Preencha nome e slug");
      return;
    }
    createCompany.mutate({ name: newCompanyName, slug: newCompanySlug });
  };

  const handleCreateTeam = () => {
    if (!newTeamName) {
      toast.error("Preencha o nome do time");
      return;
    }
    createTeam.mutate({ name: newTeamName, description: newTeamDesc || undefined });
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
          <p className="text-muted-foreground">
            Gerencie empresas e times para organização multi-tenant
          </p>
        </div>

        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies">
              <Building2 className="mr-2 h-4 w-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Users className="mr-2 h-4 w-4" />
              Times
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Criar Nova Empresa</CardTitle>
                <CardDescription>
                  Crie uma empresa para organizar membros e conhecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input
                      id="company-name"
                      placeholder="Minha Empresa"
                      value={newCompanyName}
                      onChange={(e) => {
                        setNewCompanyName(e.target.value);
                        // Auto-generate slug
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '');
                        setNewCompanySlug(slug);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-slug">Slug (URL)</Label>
                    <Input
                      id="company-slug"
                      placeholder="minha-empresa"
                      value={newCompanySlug}
                      onChange={(e) => setNewCompanySlug(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateCompany}
                  disabled={createCompany.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Empresa
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suas Empresas</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCompanies ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : companies && companies.length > 0 ? (
                  <div className="space-y-2">
                    {companies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-semibold">{company.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            /{company.slug}
                          </p>
                        </div>
                        <Badge variant={company.role === 'owner' ? 'default' : 'secondary'}>
                          {company.role === 'owner' ? 'Proprietário' : 
                           company.role === 'admin' ? 'Admin' : 'Membro'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Você ainda não pertence a nenhuma empresa.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Criar Novo Time</CardTitle>
                <CardDescription>
                  Organize membros em times dentro da empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Nome do Time</Label>
                  <Input
                    id="team-name"
                    placeholder="Backend Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-desc">Descrição (opcional)</Label>
                  <Input
                    id="team-desc"
                    placeholder="Time responsável pela API"
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateTeam}
                  disabled={createTeam.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Time
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Times da Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTeams ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : teams && teams.length > 0 ? (
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="p-3 border rounded-lg"
                      >
                        <h3 className="font-semibold">{team.name}</h3>
                        {team.description && (
                          <p className="text-sm text-muted-foreground">
                            {team.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum time criado ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
