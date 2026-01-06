import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    // Get session_id from URL query params
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session_id");
    
    if (!id) {
      toast.error("Session ID não encontrado na URL");
      setLocation("/pricing");
      return;
    }
    
    setSessionId(id);
    console.log('[SubscriptionSuccess] Session ID:', id);
  }, [setLocation]);

  // Mutation para sincronizar checkout
  const syncCheckout = trpc.checkoutSync.syncFromSession.useMutation();

  // Query subscription status to check if it's been processed
  const { data: subscription, isLoading, refetch } = trpc.subscriptions.getCurrent.useQuery(
    undefined,
    {
      enabled: !!sessionId,
      refetchInterval: synced ? false : 2000, // Poll every 2 seconds until synced
      refetchIntervalInBackground: true,
    }
  );

  // Tentar sincronizar se ainda não tiver assinatura após 3 segundos
  useEffect(() => {
    if (!sessionId || synced || syncError) return;
    
    const timer = setTimeout(async () => {
      if (!subscription?.subscription && sessionId) {
        console.log('[SubscriptionSuccess] No subscription found after 3s, syncing...');
        toast.info("Sincronizando sua assinatura...");
        
        try {
          const result = await syncCheckout.mutateAsync({ sessionId });
          console.log('[SubscriptionSuccess] Sync result:', result);
          setSynced(true);
          toast.success("Assinatura ativada com sucesso!");
          // Refetch subscription after sync
          await refetch();
        } catch (error: any) {
          console.error('[SubscriptionSuccess] Sync error:', error.message);
          setSyncError(error.message);
          toast.error("Erro ao ativar assinatura. Tente recarregar a página.");
        }
      } else if (subscription?.subscription) {
        console.log('[SubscriptionSuccess] Subscription already exists');
        setSynced(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [sessionId, subscription, synced, syncError, syncCheckout, refetch]);

  const handleGoToDashboard = () => {
    setLocation("/generate");
  };

  const handleViewSubscription = () => {
    setLocation("/account/subscription");
  };

  // Mostrar erro se houver
  if (syncError) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-red-500/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Erro ao Processar Assinatura</CardTitle>
            <CardDescription>
              {syncError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Não se preocupe! Seu pagamento foi processado com sucesso pelo Stripe. 
              A ativação da assinatura pode levar alguns minutos.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Recarregar Página
              </Button>
              <Button variant="outline" onClick={() => setLocation("/account/subscription")} className="w-full">
                Ver Minhas Assinaturas
              </Button>
              <Button variant="outline" onClick={() => setLocation("/pricing")} className="w-full">
                Voltar para Preços
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !synced) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              Processando sua assinatura...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Aguarde alguns instantes
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado! 🎉</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {subscription && (
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plano:</span>
                <span className="font-medium">{subscription.plan.displayName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-500">
                  {subscription.subscription.status === "active" ? "Ativo" : 
                   subscription.subscription.status === "trialing" ? "Em período de teste" :
                   subscription.subscription.status}
                </span>
              </div>
              {subscription.subscription.currentPeriodEnd && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Próxima renovação:</span>
                  <span className="font-medium">
                    {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">O que você pode fazer agora:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Gerar features ilimitadas com IA</li>
              <li>Exportar para Jira e Azure DevOps</li>
              <li>Acesso a tokens extras</li>
              <li>Suporte prioritário</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleGoToDashboard} className="w-full">
              Começar a Usar
            </Button>
            <Button onClick={handleViewSubscription} variant="outline" className="w-full">
              Ver Detalhes da Assinatura
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Você receberá um email de confirmação com os detalhes da sua assinatura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


