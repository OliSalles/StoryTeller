import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  usePageSeo({
    title: "Nova senha",
    path: "/reset-password",
    noIndex: true,
  });

  // Extrair token da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Token não fornecido na URL");
    }
  }, []);

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token inválido");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword: password });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-center">
              Senha Resetada!
            </CardTitle>
            <CardDescription className="text-center">
              Sua senha foi alterada com sucesso. Você será redirecionado para o login...
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex justify-center">
            <Link href="/login">
              <Button>Ir para o login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-center">
              Token Inválido
            </CardTitle>
            <CardDescription className="text-center">
              O link de reset de senha está incompleto ou inválido.
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col space-y-4">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">
                Solicitar novo reset
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Voltar para o login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Story Teller" className="h-40" />
          </div>
          <CardTitle className="text-2xl text-center">
            Nova Senha
          </CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={resetPasswordMutation.isPending}
                  autoComplete="new-password"
                  autoFocus
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={resetPasswordMutation.isPending}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resetPasswordMutation.isPending}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={resetPasswordMutation.isPending}
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Salvando..." : "Resetar senha"}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Lembrou sua senha?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
