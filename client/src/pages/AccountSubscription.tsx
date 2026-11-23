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
  Calendar,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef } from "react";
import { PricingPlans } from "./Pricing";

export default function AccountSubscription() {
  const search = useSearch();
  const plansRef = useRef<HTMLDivElement>(null);

  const scrollToPlans = () =>
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Links antigos (?tab=planos) caem direto na lista de planos
  useEffect(() => {
    if (new URLSearchParams(search).get("tab") === "planos") {
      const timer = setTimeout(scrollToPlans, 300);
      return () => clearTimeout(timer);
    }
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planos e Assinatura</h1>
        <p className="text-muted-foreground mt-1">
          Seu plano atual, o consumo de tokens e os planos disponíveis
        </p>
      </div>

      <CurrentPlan onSeePlans={scrollToPlans} />

      <div ref={plansRef} className="scroll-mt-16">
        <PricingPlans embedded />
      </div>
    </div>
  );
}

function CurrentPlan({ onSeePlans }: { onSeePlans: () => void }) {
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
  const isManualTestSubscription =
    sub?.stripeCustomerId?.startsWith("cus_test_") ||
    sub?.stripeSubscriptionId?.startsWith("manual_test_");

  return (
    <div className="space-y-6">
      {/* Test Subscription Warning */}
      {!isFreePlan && isManualTestSubscription && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
            🧪 Modo de Teste
          </p>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
            Esta assinatura foi criada manualmente para testes. Os pagamentos
            automáticos do Stripe serão configurados em breve.
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
              <Button onClick={onSeePlans}>Fazer Upgrade</Button>
            ) : isManualTestSubscription ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  ℹ️ Esta é uma assinatura de teste criada manualmente. Para
                  gerenciar assinaturas reais do Stripe, faça um pagamento
                  através da página de preços.
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

            {!isFreePlan && (
              <Button variant="outline" onClick={onSeePlans}>
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

          <div className="w-full space-y-3 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-medium">Tokens utilizados</span>
                <Button variant="outline" size="sm" onClick={() => setLocation("/tokens")}>
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Ver detalhes de uso
                </Button>
              </div>
              <span className="tabular-nums">
                {usage?.tokens.limit ? (
                  <>
                    <span className="text-lg font-semibold">{usage.tokens.used.toLocaleString("pt-BR")}</span>
                    <span className="text-muted-foreground"> / {usage.tokens.limit.toLocaleString("pt-BR")}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({Math.round(usage.tokens.percentage || 0)}%)
                    </span>
                  </>
                ) : (
                  <span className="text-primary font-semibold">Ilimitado</span>
                )}
              </span>
            </div>
            {usage?.tokens.limit ? (
              <Progress
                value={Math.min(usage.tokens.percentage || 0, 100)}
                className={`h-3 w-full ${(usage.tokens.percentage || 0) > 90 ? "bg-red-500" : ""}`}
              />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
