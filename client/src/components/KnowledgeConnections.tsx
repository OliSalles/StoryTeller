import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import { Eye, GitBranch, KeyRound, LayoutDashboard, RefreshCw, Save, Trash2 } from "lucide-react";
import { SOURCE_STATUS_LABELS } from "./KnowledgeSourceViewer";

type Source = {
  id: number;
  name: string;
  type: string;
  status: string;
  sourceUrl: string | null;
  metadata: unknown;
  errorMessage?: string | null;
  processedChunks: number;
  totalChunks: number;
  chunksCount?: number;
  createdAt: string | Date;
};

type Props = {
  sources: Source[];
  canManage: boolean;
  miroServerToken: boolean;
  onView: (source: { id: number; name: string }) => void;
};

const meta = (source: Source) => (source.metadata ?? {}) as Record<string, any>;

export const isGitConnection = (source: Source) => source.type === "code_repo" && meta(source).kind === "git";
export const isMiroConnection = (source: Source) => source.type === "miro_board";

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function StatusLine({ source }: { source: Source }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    processing: "default",
    completed: "secondary",
    failed: "destructive",
  };
  const m = meta(source);
  const details: string[] = [];
  if (isGitConnection(source)) {
    if (m.lastCommit) details.push(`commit ${String(m.lastCommit).slice(0, 7)}`);
    if (m.filesIndexed) details.push(`${m.filesIndexed} arquivos`);
  } else if (m.framesIndexed !== undefined) {
    details.push(`${m.framesIndexed} frames`, `${m.itemsIndexed ?? 0} itens`);
  }
  details.push(`${source.chunksCount ?? source.totalChunks ?? 0} trechos`);
  const lastIndexed = formatDate(m.lastIndexedAt);
  if (lastIndexed) details.push(`indexado em ${lastIndexed}`);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={source.status === "completed" ? "secondary" : variants[source.status] ?? "outline"}>
          {source.status === "completed" ? "Conectado" : SOURCE_STATUS_LABELS[source.status] ?? source.status}
        </Badge>
        <span>{details.join(" · ")}</span>
      </div>
      {source.status === "processing" && (
        <Progress value={source.totalChunks ? Math.round((source.processedChunks / source.totalChunks) * 100) : 0} />
      )}
      {source.status === "failed" && source.errorMessage && (
        <p className="text-xs text-destructive">Erro: {source.errorMessage}</p>
      )}
    </div>
  );
}

function TokenField({
  id,
  hasToken,
  value,
  onChange,
  removing,
  onToggleRemove,
  disabled,
  placeholder,
}: {
  id: string;
  hasToken: boolean;
  value: string;
  onChange: (v: string) => void;
  removing: boolean;
  onToggleRemove: () => void;
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1">
        <KeyRound className="h-3.5 w-3.5" /> Token de acesso
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="password"
          autoComplete="off"
          disabled={disabled || removing}
          placeholder={removing ? "Token será removido" : hasToken ? "•••••••• salvo (digite para trocar)" : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {hasToken && !disabled && (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onToggleRemove}>
            {removing ? "Manter" : "Remover"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ConnectionCard({ source, canManage, miroServerToken, onView }: { source: Source } & Omit<Props, "sources">) {
  const utils = trpc.useUtils();
  const isGit = isGitConnection(source);
  const m = meta(source);
  const editable = isGit ? canManage : true;

  const initialUrl = (isGit ? m.repoUrl : source.sourceUrl) ?? source.sourceUrl ?? "";
  const initialBranch = m.branch ?? "";
  const [name, setName] = useState(source.name);
  const [url, setUrl] = useState(initialUrl);
  const [branch, setBranch] = useState(initialBranch);
  const [token, setToken] = useState("");
  const [removeToken, setRemoveToken] = useState(false);

  useEffect(() => {
    setName(source.name);
    setUrl(initialUrl);
    setBranch(initialBranch);
    setToken("");
    setRemoveToken(false);
  }, [source.id, source.name, initialUrl, initialBranch, m.hasToken]);

  const dirty =
    name.trim() !== source.name ||
    url.trim() !== initialUrl ||
    (isGit && branch.trim() !== initialBranch) ||
    token.trim() !== "" ||
    removeToken;

  const onDone = () => {
    toast.success("Conexão salva. A reindexação começou.");
    utils.knowledge.listSources.invalidate();
  };
  const updateGit = trpc.knowledge.updateGitRepo.useMutation({ onSuccess: onDone, onError: (e) => toast.error(e.message) });
  const updateMiro = trpc.knowledge.updateMiroBoard.useMutation({ onSuccess: onDone, onError: (e) => toast.error(e.message) });
  const reindex = trpc.knowledge.reindexSource.useMutation({
    onSuccess: () => {
      toast.success("Reindexação iniciada!");
      utils.knowledge.listSources.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.knowledge.deleteSource.useMutation({
    onSuccess: () => {
      toast.success("Conexão removida");
      utils.knowledge.listSources.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const save = () => {
    if (!name.trim() || !url.trim()) {
      toast.error("Nome e URL são obrigatórios");
      return;
    }
    const tokenPatch = removeToken ? "" : token.trim() || undefined;
    const common = {
      sourceId: source.id,
      name: name.trim() !== source.name ? name.trim() : undefined,
      token: tokenPatch,
    };
    if (isGit) {
      updateGit.mutate({
        ...common,
        repoUrl: url.trim() !== initialUrl ? url.trim() : undefined,
        branch: branch.trim() !== initialBranch ? branch.trim() : undefined,
      });
    } else {
      updateMiro.mutate({ ...common, boardUrl: url.trim() !== initialUrl ? url.trim() : undefined });
    }
  };

  const saving = updateGit.isPending || updateMiro.isPending;
  const busy = source.status === "processing" || source.status === "pending";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isGit ? <GitBranch className="h-4 w-4 text-primary" /> : <LayoutDashboard className="h-4 w-4 text-primary" />}
          <span className="truncate">{source.name}</span>
          <Badge variant="outline" className="ml-auto shrink-0 text-xs">{isGit ? "Git" : "Miro"}</Badge>
        </CardTitle>
        <StatusLine source={source} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`conn-name-${source.id}`}>Nome</Label>
            <Input id={`conn-name-${source.id}`} value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`conn-url-${source.id}`}>{isGit ? "URL do repositório" : "URL do board"}</Label>
            <Input id={`conn-url-${source.id}`} value={url} disabled={!editable} onChange={(e) => setUrl(e.target.value)} />
          </div>
          {isGit && (
            <div className="space-y-2">
              <Label htmlFor={`conn-branch-${source.id}`}>Branch</Label>
              <Input
                id={`conn-branch-${source.id}`}
                value={branch}
                disabled={!editable}
                placeholder={m.resolvedBranch ? `${m.resolvedBranch} (padrão)` : "padrão do repositório"}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
          )}
          <TokenField
            id={`conn-token-${source.id}`}
            hasToken={Boolean(m.hasToken)}
            value={token}
            onChange={setToken}
            removing={removeToken}
            onToggleRemove={() => {
              setRemoveToken((v) => !v);
              setToken("");
            }}
            disabled={!editable}
            placeholder={isGit ? "Sem token (repositório público)" : miroServerToken ? "Usando o token do servidor" : "Token do Miro"}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onView({ id: source.id, name: source.name })}>
            <Eye className="mr-1 h-4 w-4" /> Ver conteúdo
          </Button>
          {editable && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={busy || reindex.isPending}
                onClick={() => reindex.mutate({ sourceId: source.id })}
                title={isGit ? "Buscar a versão mais nova do repositório" : "Importar de novo o board"}
              >
                <RefreshCw className="mr-1 h-4 w-4" /> Reindexar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Remover a conexão "${source.name}" e todo o conteúdo indexado dela?`)) {
                    remove.mutate({ sourceId: source.id });
                  }
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
              <Button size="sm" disabled={!dirty || saving} onClick={save}>
                <Save className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Salvar e reindexar"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewGitConnection() {
  const utils = trpc.useUtils();
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const connect = trpc.knowledge.connectGitRepo.useMutation({
    onSuccess: () => {
      toast.success("Repositório conectado! A indexação do código começou.");
      utils.knowledge.listSources.invalidate();
      setUrl("");
      setBranch("");
      setName("");
      setToken("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" /> Conectar repositório Git
        </CardTitle>
        <CardDescription>
          O chat e a geração de features passam a consultar o código. A conexão fica salva aqui e pode ser editada depois.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="git-url">URL do repositório</Label>
          <Input id="git-url" placeholder="https://github.com/empresa/projeto" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="git-branch">Branch (opcional)</Label>
            <Input id="git-branch" placeholder="main" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="git-name">Nome (opcional)</Label>
            <Input id="git-name" placeholder="Backend" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="git-token">Token de acesso (para repositório privado)</Label>
          <Input
            id="git-token"
            type="password"
            autoComplete="off"
            placeholder="ghp_... ou github_pat_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Fica guardado criptografado no servidor e nunca é mostrado de novo. Basta permissão de leitura do conteúdo.
          </p>
        </div>
        <Button
          className="w-full"
          disabled={connect.isPending}
          onClick={() => {
            if (!url.trim()) {
              toast.error("Digite a URL do repositório");
              return;
            }
            connect.mutate({
              repoUrl: url.trim(),
              branch: branch.trim() || undefined,
              name: name.trim() || undefined,
              token: token.trim() || undefined,
            });
          }}
        >
          <GitBranch className="mr-2 h-4 w-4" />
          {connect.isPending ? "Conectando..." : "Conectar e indexar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NewMiroConnection({ miroServerToken }: { miroServerToken: boolean }) {
  const utils = trpc.useUtils();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const connect = trpc.knowledge.importMiroBoard.useMutation({
    onSuccess: () => {
      toast.success("Board do Miro conectado! A importação começou.");
      utils.knowledge.listSources.invalidate();
      setUrl("");
      setName("");
      setToken("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" /> Conectar board do Miro
        </CardTitle>
        <CardDescription>A conexão fica salva aqui e pode ser editada ou reimportada depois.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="miro-url">URL do board</Label>
          <Input id="miro-url" placeholder="https://miro.com/app/board/..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="miro-name">Nome (opcional)</Label>
          <Input id="miro-name" placeholder="Board de Planejamento" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="miro-token">Token de acesso do Miro{miroServerToken ? " (opcional)" : ""}</Label>
          <Input
            id="miro-token"
            type="password"
            autoComplete="off"
            placeholder={miroServerToken ? "Em branco usa o token do servidor" : "Token do app do Miro"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Fica guardado criptografado no servidor e nunca é mostrado de novo.</p>
        </div>
        <Button
          className="w-full"
          disabled={connect.isPending}
          onClick={() => {
            if (!url.trim()) {
              toast.error("Digite a URL do board do Miro");
              return;
            }
            if (!token.trim() && !miroServerToken) {
              toast.error("Informe o token de acesso do Miro");
              return;
            }
            connect.mutate({ boardUrl: url.trim(), name: name.trim() || undefined, token: token.trim() || undefined });
          }}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {connect.isPending ? "Conectando..." : "Conectar e importar"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function KnowledgeConnections({ sources, canManage, miroServerToken, onView }: Props) {
  const connections = sources.filter((s) => isGitConnection(s) || isMiroConnection(s));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {canManage && <NewGitConnection />}
        <NewMiroConnection miroServerToken={miroServerToken} />
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {connections.length > 0 ? `${connections.length} conexão(ões) ativa(s)` : "Nenhuma conexão ativa ainda"}
        </h2>
        {connections.map((source) => (
          <ConnectionCard
            key={source.id}
            source={source}
            canManage={canManage}
            miroServerToken={miroServerToken}
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
}
