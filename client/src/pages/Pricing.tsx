import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Loader2,
  Sparkles,
  TrendingUp,
  Crown,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [, setLocation] = useLocation();

  const { data: plans, isLoading } = trpc.subscriptions.getPlans.useQuery();
  const { data: currentSubscription } =
    trpc.subscriptions.getCurrent.useQuery();
  const createCheckout = trpc.subscriptions.createCheckout.useMutation();

  const handleSelectPlan = async (planId: number, planName: string) => {
    if (planName === "free") {
      toast.info("Você já está no plano gratuito!");
      return;
    }

    // Verificar se é mudança de ciclo do mesmo plano
    const isCycleChange =
      currentSubscription?.subscription?.planId === planId &&
      currentBillingCycle !== billingCycle;

    if (isCycleChange) {
      toast.info(
        `Mudando para o ciclo ${billingCycle === "yearly" ? "anual" : "mensal"}...`
      );
    }

    try {
      const result = await createCheckout.mutateAsync({
        planId,
        billingCycle,
      });

      if (result.url) {
        window.location.href = result.url; // Redirect to Stripe Checkout
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar pagamento");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const planFeatures = {
    free: [
      "Features ilimitadas",
      "50.000 tokens por mês",
      "1 usuário",
      "Modelo GPT-4o-mini",
    ],
    pro: [
      "Features ilimitadas",
      "500.000 tokens por mês",
      "1 usuário",
      "Exportação Jira/Azure DevOps",
      "PDF sem marca d'água",
      "Suporte por email",
      "7 dias de trial grátis",
    ],
    business: [
      "Features ilimitadas",
      "2.000.000 tokens por mês",
      "1 usuário",
      "Exportação Jira/Azure DevOps",
      "PDF sem marca d'água",
      "API Access",
      "Suporte prioritário",
      "Relatórios personalizados",
    ],
  };

  // Determinar plano atual e próximo plano
  const currentPlanName = currentSubscription?.plan?.name || "free";
  const currentBillingCycle = currentSubscription?.subscription?.billingCycle;

  const getNextPlanName = (current: string) => {
    if (current === "free") return "pro";
    if (current === "pro") return "business";
    return null; // Business não tem upgrade
  };
  const nextPlanName = getNextPlanName(currentPlanName);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Escolha o plano ideal para você
        </h1>

        {/* Mensagem personalizada se já tiver um plano */}
        {currentSubscription?.subscription &&
        currentSubscription?.plan &&
        nextPlanName ? (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium text-primary mb-1">
                Você está no plano {currentSubscription.plan.displayName}
              </p>
              <p className="text-sm text-muted-foreground">
                Faça upgrade para ter mais tokens e recursos avançados! 🚀
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comece grátis e faça upgrade quando precisar de mais recursos
          </p>
        )}

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Label
            htmlFor="billing-cycle"
            className={billingCycle === "monthly" ? "font-semibold" : ""}
          >
            Mensal
          </Label>
          <Switch
            id="billing-cycle"
            checked={billingCycle === "yearly"}
            onCheckedChange={checked =>
              setBillingCycle(checked ? "yearly" : "monthly")
            }
          />
          <Label
            htmlFor="billing-cycle"
            className={billingCycle === "yearly" ? "font-semibold" : ""}
          >
            Anual
            <span className="ml-2 text-primary text-sm">
              Economize 2 meses!
            </span>
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans
          ?.sort((a, b) => {
            // Ordem desejada: free (0), pro (1), business (2)
            const getOrder = (name: string) => {
              if (name === "free") return 0;
              if (name === "pro") return 1;
              if (name === "business") return 2;
              return 999;
            };
            return getOrder(a.name) - getOrder(b.name);
          })
          .map(plan => {
            const isCurrentPlan =
              currentSubscription?.subscription?.planId === plan.id &&
              currentBillingCycle === billingCycle;
            const isSamePlanDifferentCycle =
              currentSubscription?.subscription?.planId === plan.id &&
              currentBillingCycle !== billingCycle &&
              plan.name !== "free";
            const isNextPlan = plan.name === nextPlanName;
            const isPro = plan.name === "pro";
            const price =
              billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
            const displayPrice = price ? (price / 100).toFixed(0) : "0";
            const features =
              planFeatures[plan.name as keyof typeof planFeatures] || [];

            // Calcular diferença de tokens para upgrade
            const getTokensInfo = (planName: string) => {
              if (planName === "free") return { tokens: 50000, display: "50K" };
              if (planName === "pro")
                return { tokens: 500000, display: "500K" };
              if (planName === "business")
                return { tokens: 2000000, display: "2M" };
              return { tokens: 0, display: "0" };
            };

            const currentTokens = getTokensInfo(currentPlanName);
            const planTokens = getTokensInfo(plan.name);
            const tokenDifference = planTokens.tokens - currentTokens.tokens;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  isCurrentPlan
                    ? "border-green-500 shadow-lg ring-2 ring-green-500/20"
                    : isSamePlanDifferentCycle
                      ? "border-blue-500 shadow-lg ring-2 ring-blue-500/20"
                      : isNextPlan
                        ? "border-primary shadow-lg scale-105 ring-2 ring-primary/20"
                        : isPro && !isCurrentPlan && !isNextPlan
                          ? "border-primary shadow-lg scale-105"
                          : ""
                }`}
              >
                {/* Badge para Plano Atual */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Seu Plano Atual
                    </div>
                  </div>
                )}

                {/* Badge para Mesmo Plano com Ciclo Diferente */}
                {isSamePlanDifferentCycle && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      {billingCycle === "yearly" ? (
                        <DollarSign className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {billingCycle === "yearly"
                        ? "Economize"
                        : "Mais Flexibilidade"}
                    </div>
                  </div>
                )}

                {/* Badge para Próximo Plano (Upgrade Recomendado) */}
                {!isCurrentPlan && !isSamePlanDifferentCycle && isNextPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1 shadow-lg">
                      <TrendingUp className="h-3 w-3" />
                      Faça Upgrade
                    </div>
                  </div>
                )}

                {/* Badge Mais Popular (apenas se não for plano atual, próximo ou ciclo diferente) */}
                {isPro &&
                  !isCurrentPlan &&
                  !isNextPlan &&
                  !isSamePlanDifferentCycle && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Mais Popular
                      </div>
                    </div>
                  )}

                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                  <CardDescription>
                    <div className="text-4xl font-bold mt-4">
                      {plan.name === "free" ? (
                        "Grátis"
                      ) : (
                        <>
                          R$ {displayPrice}
                          <span className="text-base font-normal text-muted-foreground">
                            /{billingCycle === "monthly" ? "mês" : "ano"}
                          </span>
                        </>
                      )}
                    </div>
                    {billingCycle === "yearly" && plan.name !== "free" && (
                      <div className="text-sm text-muted-foreground mt-1">
                        ou R$ {((plan.priceMonthly || 0) / 100).toFixed(0)}/mês
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  {/* Mensagem para Mudança de Ciclo */}
                  {isSamePlanDifferentCycle && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        {billingCycle === "yearly" ? (
                          <DollarSign className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          {billingCycle === "yearly" ? (
                            <>
                              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                Economize com o plano anual! 💰
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Pague o equivalente a 10 meses e ganhe 2 meses
                                grátis
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                Prefere mais flexibilidade? 📅
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Mude para o plano mensal e cancele quando quiser
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensagem de Upgrade para o próximo plano */}
                  {!isCurrentPlan &&
                    !isSamePlanDifferentCycle &&
                    isNextPlan &&
                    tokenDifference > 0 && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Crown className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-primary mb-1">
                              Ganhe {planTokens.display} tokens extras!
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Faça upgrade e tenha{" "}
                              {tokenDifference > 1000000
                                ? `${(tokenDifference / 1000000).toFixed(1)}M`
                                : `${(tokenDifference / 1000).toFixed(0)}K`}{" "}
                              tokens a mais por mês 🚀
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="mt-auto">
                  <Button
                    onClick={() => handleSelectPlan(plan.id, plan.name)}
                    disabled={isCurrentPlan || createCheckout.isPending}
                    className="w-full"
                    variant={
                      isNextPlan || isPro || isSamePlanDifferentCycle
                        ? "default"
                        : "outline"
                    }
                    size={
                      isNextPlan || isSamePlanDifferentCycle ? "lg" : "default"
                    }
                  >
                    {createCheckout.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Plano Atual
                      </>
                    ) : isSamePlanDifferentCycle ? (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        {billingCycle === "yearly"
                          ? "Mudar para Anual"
                          : "Mudar para Mensal"}
                      </>
                    ) : isNextPlan ? (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Fazer Upgrade
                      </>
                    ) : plan.name === "free" ? (
                      "Começar Grátis"
                    ) : (
                      "Selecionar Plano"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
      </div>

      <div className="text-center mt-12 text-sm text-muted-foreground">
        <p>Todos os planos incluem acesso completo à plataforma</p>
        <p className="mt-2">
          Dúvidas?{" "}
          <button
            className="text-primary hover:underline"
            onClick={() => setLocation("/")}
          >
            Entre em contato
          </button>
        </p>
      </div>
    </div>
  );
}
