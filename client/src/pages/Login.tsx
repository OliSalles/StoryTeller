import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";

// Só guardamos a preferência (sim ou não). Email e senha ficam no gerenciador
// de senhas do navegador (Credential Management API), nunca no localStorage.
const REMEMBER_KEY = "st_lembrar_dados";

type PasswordCredentialCtor = new (data: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

function getPasswordCredentialCtor(): PasswordCredentialCtor | null {
  if (typeof window === "undefined" || !navigator.credentials) return null;
  const ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor })
    .PasswordCredential;
  return ctor ?? null;
}

function readRememberPreference(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(readRememberPreference);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  usePageSeo({
    title: "Entrar",
    description: "Acesse sua conta no Story Teller para gerar histórias de usuário com IA.",
    path: "/login",
  });

  // Preenche email e senha salvos no navegador, quando o usuário pediu para lembrar
  useEffect(() => {
    if (!remember || !getPasswordCredentialCtor()) return;
    let cancelled = false;
    navigator.credentials
      .get({ password: true, mediation: "optional" } as CredentialRequestOptions)
      .then(cred => {
        const saved = cred as (Credential & { password?: string }) | null;
        if (cancelled || !saved || saved.type !== "password" || !saved.password) return;
        setEmail(current => current || saved.id);
        setPassword(current => current || saved.password || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Só na abertura da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCredentials = async (loginEmail: string, loginPassword: string) => {
    try {
      localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    } catch {
      // ignorar
    }
    const Ctor = getPasswordCredentialCtor();
    if (!Ctor) return;
    try {
      if (remember) {
        await navigator.credentials.store(
          new Ctor({ id: loginEmail, password: loginPassword, name: loginEmail })
        );
      } else {
        await navigator.credentials.preventSilentAccess();
      }
    } catch {
      // Navegador recusou ou não suporta, segue o login normalmente
    }
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (_data, variables) => {
      // Pedir ao navegador para lembrar email e senha (se marcado)
      await saveCredentials(variables.email, variables.password);
      // Invalidar cache do usuário
      await utils.auth.me.invalidate();
      // Redirecionar com reload para garantir que o cookie seja lido
      window.location.href = "/generate";
    },
    onError: err => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm border">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Story Teller" className="h-40" />
          </div>
          <CardTitle className="text-2xl text-center">
            Bem-vindo ao Story Teller
          </CardTitle>
          <CardDescription className="text-center">
            Entre com sua conta para continuar
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} method="post" action="/login" autoComplete="on">
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loginMutation.isPending}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={checked => setRemember(checked === true)}
                disabled={loginMutation.isPending}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Lembrar meus dados
              </Label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Criar conta
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
