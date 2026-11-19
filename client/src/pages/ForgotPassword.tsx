import { useState } from "react";
import { Link } from "wouter";
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
import { CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      setSuccess(true);
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    console.log("📧 [FORGOT PASSWORD] Email no state:", email);

    if (!email) {
      setError("Digite seu email");
      return;
    }

    console.log("📧 [FORGOT PASSWORD] Enviando requisição para:", email);
    requestResetMutation.mutate({ email });
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
              Email Enviado!
            </CardTitle>
            <CardDescription className="text-center">
              Se o email existir no sistema, você receberá instruções para resetar sua senha.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {resetLink && (
              <Alert>
                <AlertDescription className="space-y-2">
                  <p className="font-semibold">🔧 Modo Desenvolvimento:</p>
                  <p className="text-xs break-all">
                    <a href={resetLink} className="text-blue-600 hover:underline">
                      {resetLink}
                    </a>
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
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
            Esqueci minha senha
          </CardTitle>
          <CardDescription className="text-center">
            Digite seu email para receber instruções de reset
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={requestResetMutation.isPending}
                autoComplete="email"
                autoFocus
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={requestResetMutation.isPending}
            >
              {requestResetMutation.isPending ? "Enviando..." : "Enviar instruções"}
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
