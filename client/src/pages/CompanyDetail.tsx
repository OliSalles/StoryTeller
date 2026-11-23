import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "../lib/trpc";
import { setActiveCompanyId } from "../lib/active-company";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import { AzureDevOpsSettings } from "../components/AzureDevOpsSettings";
import { ArrowLeft, Building2, Cloud, Crown, Database, Loader2, Mail, Save, Send, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

export function CompanyDetail() {
  const params = useParams<{ id: string }>();
  const companyId = Number(params.id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const companyQuery = trpc.companies.getById.useQuery({ id: companyId }, { enabled: Number.isInteger(companyId) });
  const membersQuery = trpc.companies.listMembers.useQuery({ companyId }, { enabled: Number.isInteger(companyId) });
  const { data: me } = trpc.auth.me.useQuery();
  const company = companyQuery.data;
  const invitesQuery = trpc.companies.listInvites.useQuery(
    { companyId },
    { enabled: Boolean(company?.canManage) }
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
    }
  }, [company?.id, company?.name, company?.slug]);

  const refresh = () => {
    utils.companies.getById.invalidate({ id: companyId });
    utils.companies.listMembers.invalidate({ companyId });
    utils.companies.listInvites.invalidate({ companyId });
    utils.companies.list.invalidate();
  };
  const onError = (error: { message: string }) => toast.error(error.message);

  const update = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Dados da empresa salvos");
      refresh();
    },
    onError,
  });
  const invite = trpc.companies.inviteMember.useMutation({
    onSuccess: (res) => {
      if (res.status === "added") {
        toast.success(`${res.name || res.email} já tinha conta e agora faz parte da empresa`);
      } else if (res.emailSent) {
        toast.success(`Convite enviado para ${res.email}. Ao se cadastrar, a pessoa entra na empresa automaticamente.`);
      } else {
        toast.warning(`Convite criado para ${res.email}, mas o email não pôde ser enviado. Use "Reenviar" ou peça para a pessoa se cadastrar com esse email.`);
      }
      setInviteEmail("");
      setInviteRole("member");
      refresh();
    },
    onError,
  });
  const resendInvite = trpc.companies.resendInvite.useMutation({
    onSuccess: (res) =>
      res.emailSent ? toast.success("Convite reenviado") : toast.warning("Não foi possível enviar o email agora"),
    onError,
  });
  const cancelInvite = trpc.companies.cancelInvite.useMutation({
    onSuccess: () => {
      toast.success("Convite cancelado");
      refresh();
    },
    onError,
  });
  const updateRole = trpc.companies.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Nível de acesso atualizado");
      refresh();
    },
    onError,
  });
  const removeMember = trpc.companies.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Funcionário removido da empresa");
      refresh();
    },
    onError,
  });
  const transfer = trpc.companies.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success("Propriedade transferida. Você agora é administrador.");
      refresh();
    },
    onError,
  });

  const useThisCompany = async () => {
    setActiveCompanyId(companyId);
    await utils.invalidate();
    toast.success(`Agora você está usando ${company?.name}`);
  };

  if (companyQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{companyQuery.error?.message ?? "Empresa não encontrada."}</p>
        <Button variant="outline" onClick={() => setLocation("/company/settings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const canManage = company.canManage;
  const stats = company.stats;
  const dirty = name.trim() !== company.name || slug.trim() !== company.slug;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href="/company/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Empresas
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="h-6 w-6 text-primary" />
            {company.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>/{company.slug}</span>
            <Badge variant={company.userRole === "member" ? "secondary" : "default"}>
              Você: {ROLE_LABELS[company.userRole] ?? company.userRole}
            </Badge>
            {company.isActive && <Badge variant="outline">Empresa em uso</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {!company.isActive && (
            <Button variant="outline" onClick={useThisCompany}>
              Usar esta empresa
            </Button>
          )}
          <Button
            onClick={async () => {
              if (!company.isActive) await useThisCompany();
              setLocation("/knowledge");
            }}
          >
            <Database className="mr-2 h-4 w-4" /> Base de conhecimento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Funcionários", value: stats.members },
          { label: "Administradores", value: stats.admins },
          { label: "Fontes na base", value: stats.sources },
          { label: "Trechos indexados", value: stats.chunks },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{s.value.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Funcionários e níveis de acesso
            </CardTitle>
            <CardDescription>
              Somente administradores alteram a base de conhecimento e os funcionários. A empresa precisa ter pelo menos 1 administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="w-[1%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(membersQuery.data ?? []).map((m) => {
                    const isOwner = m.role === "owner";
                    const isMe = m.userId === me?.id;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <span className="font-medium">{m.userName || m.userEmail}</span>
                          {isMe && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}
                          <p className="text-xs text-muted-foreground md:hidden">{m.userEmail}</p>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{m.userEmail}</TableCell>
                        <TableCell>
                          {isOwner || !canManage ? (
                            <Badge variant={m.role === "member" ? "secondary" : "default"}>
                              {isOwner && <Crown className="mr-1 h-3 w-3" />}
                              {ROLE_LABELS[m.role] ?? m.role}
                            </Badge>
                          ) : (
                            <Select
                              value={m.role}
                              disabled={updateRole.isPending}
                              onValueChange={(role) =>
                                updateRole.mutate({ companyId, userId: m.userId, role: role as "member" | "admin" })
                              }
                            >
                              <SelectTrigger className="h-8 w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="member">Membro</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {company.isOwner && !isOwner && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Tornar proprietário"
                                aria-label="Tornar proprietário"
                                disabled={transfer.isPending}
                                onClick={() => {
                                  if (confirm(`Transferir a propriedade para ${m.userName || m.userEmail}? Você passa a ser administrador.`)) {
                                    transfer.mutate({ companyId, userId: m.userId });
                                  }
                                }}
                              >
                                <Crown className="h-4 w-4" />
                              </Button>
                            )}
                            {canManage && !isOwner && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                title="Remover da empresa"
                                aria-label="Remover da empresa"
                                disabled={removeMember.isPending}
                                onClick={() => {
                                  if (confirm(`Remover ${m.userName || m.userEmail} da empresa?`)) {
                                    removeMember.mutate({ companyId, userId: m.userId });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {canManage && (
              <div className="space-y-2 rounded-md border p-3">
                <Label htmlFor="invite-email" className="flex items-center gap-1">
                  <UserPlus className="h-4 w-4" /> Adicionar funcionário
                </Label>
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="email@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
                    <SelectTrigger className="md:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={invite.isPending || !inviteEmail.trim()}
                    onClick={() => invite.mutate({ companyId, email: inviteEmail.trim(), role: inviteRole })}
                  >
                    {invite.isPending ? "Enviando..." : "Adicionar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se a pessoa ainda não tiver conta, ela recebe um convite por email e entra na empresa automaticamente ao se cadastrar.
                  Cada funcionário tem a sua própria assinatura.
                </p>
              </div>
            )}

            {canManage && (invitesQuery.data?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-sm font-medium">
                  <Mail className="h-4 w-4" /> Convites pendentes
                </p>
                <div className="divide-y rounded-md border">
                  {invitesQuery.data!.map((inv) => (
                    <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABELS[inv.role] ?? inv.role} · enviado em{" "}
                          {new Date(inv.lastSentAt).toLocaleDateString("pt-BR")}
                          {inv.invitedByName ? ` por ${inv.invitedByName}` : ""} · aguardando cadastro
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={resendInvite.isPending}
                          onClick={() => resendInvite.mutate({ companyId, inviteId: inv.id })}
                        >
                          <Send className="mr-1 h-4 w-4" /> Reenviar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={cancelInvite.isPending}
                          onClick={() => {
                            if (confirm(`Cancelar o convite para ${inv.email}?`)) {
                              cancelInvite.mutate({ companyId, inviteId: inv.id });
                            }
                          }}
                        >
                          <X className="mr-1 h-4 w-4" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome</Label>
                <Input id="company-name" value={name} disabled={!canManage} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-slug">Slug (URL)</Label>
                <Input id="company-slug" value={slug} disabled={!canManage} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Criada em {new Date(company.createdAt).toLocaleDateString("pt-BR")}
              </p>
              {canManage && (
                <Button
                  className="w-full"
                  disabled={!dirty || update.isPending}
                  onClick={() =>
                    update.mutate({
                      id: companyId,
                      name: name.trim() !== company.name ? name.trim() : undefined,
                      slug: slug.trim() !== company.slug ? slug.trim() : undefined,
                    })
                  }
                >
                  <Save className="mr-2 h-4 w-4" /> Salvar
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Níveis de acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Proprietário:</strong> tudo que o administrador faz, além de transferir a propriedade e excluir a empresa.
              </p>
              <p>
                <strong>Administrador:</strong> altera a base de conhecimento (upload, Git, Miro, reindexar, excluir), a conexão Azure DevOps, os dados da empresa e os funcionários.
              </p>
              <p>
                <strong>Membro:</strong> consulta a base, usa o chat e gera features com ela, sem alterar nada.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {company.isActive ? (
        <AzureDevOpsSettings />
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cloud className="h-4 w-4 shrink-0" />
              Para ver e configurar a conexão Azure DevOps desta empresa, passe a usá-la.
            </p>
            <Button variant="outline" onClick={useThisCompany}>
              Usar esta empresa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
