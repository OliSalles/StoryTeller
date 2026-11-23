import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { ChevronRight, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { setActiveCompanyId } from "../lib/active-company";

export function CompanySettings() {
  const [, setLocation] = useLocation();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySlug, setNewCompanySlug] = useState("");

  const utils = trpc.useUtils();
  
  // Queries
  const { data: companies, isLoading: loadingCompanies } = trpc.companies.list.useQuery();
  const { data: currentCompany } = trpc.companies.current.useQuery();

  // Mutations
  const createCompany = trpc.companies.create.useMutation({
    onSuccess: async (res) => {
      setActiveCompanyId(res.companyId);
      await utils.invalidate();
      toast.success(`Empresa ${res.name} criada e em uso agora`);
      setNewCompanyName("");
      setNewCompanySlug("");
      setLocation(`/company/${res.companyId}`);
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

  return (
    <div className="space-y-4">
        {/* Azure DevOps style header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suas empresas, funcionários e níveis de acesso
          </p>
        </div>

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
                  <Link
                    key={company.id}
                    href={`/company/${company.id}`}
                    className="flex items-center justify-between gap-3 p-3 border rounded-lg transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        /{company.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentCompany?.id === company.id && (
                        <Badge variant="outline">Em uso</Badge>
                      )}
                      <Badge variant={company.role === 'member' ? 'secondary' : 'default'}>
                        {company.role === 'owner' ? 'Proprietário' : 
                         company.role === 'admin' ? 'Admin' : 'Membro'}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Você ainda não pertence a nenhuma empresa.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
