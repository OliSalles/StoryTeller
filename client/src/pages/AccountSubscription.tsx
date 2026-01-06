import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CreditCard,
  TrendingUp,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AccountSubscription() {
  const [, setLocation] = useLocation();

  const { data: subscription, isLoading: subLoading } =
    trpc.subscriptions.getCurrent.useQuery();
  const { data: usage, isLoading: usageLoading } =
    trpc.subscriptions.getUsage.useQuery();
  const createPortal = trpc.subscriptions.createPortal.useMutation();

  const handleManageSubscription = async () => {
    try {
      const result = await createPortal.mutateAsync();
      if (result.url) {
        window.location.href = result.url; // Redirect to Stripe Portal
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao abrir portal de pagamento");
    }
  };

  if (subLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFreePlan = !subscription || !subscription.subscription;
  const plan = subscription?.plan;
  const sub = subscription?.subscription;
  
  // Verificar se é uma assinatura de teste manual (não tem Stripe real)
  const isManualTestSubscription = sub?.stripeCustomerId?.startsWith('cus_test_') || 
                                    sub?.stripeSubscriptionId?.startsWith('manual_test_');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minha Assinatura</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu plano e acompanhe o uso
        </p>
      </div>

      {/* Test Subscription Warning */}
      {!isFreePlan && isManualTestSubscription && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
            🧪 Modo de Teste
          </p>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
            Esta assinatura foi criada manualmente para testes. Os pagamentos automáticos do Stripe serão configurados em breve.
          </p>
        </div>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Plano Atual</span>
            {!isFreePlan && sub && (
              <span
                className={`text-sm px-3 py-1 rounded-full ${
                  sub.status === "active"
                    ? "bg-green-500/10 text-green-500"
                    : sub.status === "trialing"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {sub.status === "active"
                  ? "Ativo"
                  : sub.status === "trialing"
                    ? "Trial"
                    : sub.status === "past_due"
                      ? "Pagamento Pendente"
                      : sub.status}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {isFreePlan ? "Você está no plano gratuito" : plan?.displayName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isFreePlan && sub && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Próxima cobrança</span>
                </div>
                <p className="font-semibold">
                  {format(
                    new Date(sub.currentPeriodEnd),
                    "dd 'de' MMMM 'de' yyyy",
                    { locale: ptBR }
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Ciclo de cobrança</span>
                </div>
                <p className="font-semibold capitalize">
                  {sub.billingCycle === "monthly" ? "Mensal" : "Anual"}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {isFreePlan ? (
              <Button onClick={() => setLocation("/pricing")}>
                Fazer Upgrade
              </Button>
            ) : isManualTestSubscription ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  ℹ️ Esta é uma assinatura de teste criada manualmente.
                  Para gerenciar assinaturas reais do Stripe, faça um pagamento através da página de preços.
                </p>
              </div>
            ) : (
              <Button
                onClick={handleManageSubscription}
                disabled={createPortal.isPending}
              >
                {createPortal.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Gerenciar Assinatura
                  </>
                )}
              </Button>
            )}

            {isFreePlan && (
              <Button variant="outline" onClick={() => setLocation("/pricing")}>
                Ver Planos
              </Button>
            )}
          </div>

          {sub && sub.cancelAtPeriodEnd && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                ⚠️ Sua assinatura será cancelada em{" "}
                {format(new Date(sub.currentPeriodEnd), "dd/MM/yyyy")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Uso do Plano
          </CardTitle>
          <CardDescription>
            Acompanhe seu consumo no período atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tokens usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tokens utilizados</span>
              <span className="text-sm text-muted-foreground">
                {usage?.tokens.limit ? (
                  `${usage.tokens.used.toLocaleString()} / ${usage.tokens.limit.toLocaleString()}`
                ) : (
                  <span className="text-primary font-semibold">Ilimitado</span>
                )}
              </span>
            </div>
            {usage?.tokens.limit && (
              <Progress
                value={usage?.tokens.percentage || 0}
                className={`h-2 ${(usage?.tokens.percentage || 0) > 90 ? "bg-red-500" : ""}`}
              />
            )}
            {usage && usage.tokens.percentage > 80 && (
              <p className="text-sm text-muted-foreground">
                {usage.tokens.percentage > 90
                  ? "⚠️ Você está próximo do limite! Considere fazer upgrade."
                  : "Você está usando mais de 80% do seu limite."}
              </p>
            )}
          </div>

          {isFreePlan && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
              <p className="text-sm font-medium mb-2">💎 Quer mais recursos?</p>
              <p className="text-sm text-muted-foreground mb-3">
                Faça upgrade para ter features ilimitadas e muito mais tokens!
              </p>
              <Button size="sm" onClick={() => setLocation("/pricing")}>
                Ver Planos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
