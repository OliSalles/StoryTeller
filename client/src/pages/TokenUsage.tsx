import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Activity, ArrowLeft, Info } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPERATION_LABELS: Record<string, string> = {
  knowledge_chat: "Knowledge Chat",
  knowledge_chat_query: "Knowledge Chat (preparo da busca)",
  knowledge_chat_title: "Knowledge Chat (título da conversa)",
  feature_generation_simple: "Geração de feature",
  feature_generation_consolidation: "Geração de feature",
  feature_refinement: "Refinamento de feature",
  story_analysis: "Análise de história",
  knowledge_merge: "Base de conhecimento (organização dos trechos)",
  miro_image_description: "Importação do Miro (imagens)",
  miro_flow_description: "Importação do Miro (fluxos)",
};

function operationLabel(operation: string) {
  if (operation.startsWith("feature_generation")) return "Geração de feature";
  return OPERATION_LABELS[operation] ?? "Outros";
}

export default function TokenUsage({ embedded = false }: { embedded?: boolean }) {
  const [period, setPeriod] = useState<number>(30);

  const { data: stats, isLoading: statsLoading } = trpc.tokens.getStats.useQuery({ days: period });
  const { data: usage, isLoading: usageLoading } = trpc.tokens.getUsage.useQuery({});
  const { data: planUsage } = trpc.subscriptions.getUsage.useQuery();

  if (statsLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Agrupar por data
  const usageByDate = usage?.reduce((acc, item) => {
    const date = format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR });
    if (!acc[date]) {
      acc[date] = { totalTokens: 0, requests: 0 };
    }
    acc[date].totalTokens += item.totalTokens;
    acc[date].requests += 1;
    return acc;
  }, {} as Record<string, { totalTokens: number; requests: number }>);

  const chartData = Object.entries(usageByDate || {})
    .sort((a, b) => {
      const [dayA, monthA, yearA] = a[0].split('/');
      const [dayB, monthB, yearB] = b[0].split('/');
      return new Date(`${yearA}-${monthA}-${dayA}`).getTime() - new Date(`${yearB}-${monthB}-${dayB}`).getTime();
    })
    .slice(-14); // Últimos 14 dias
  const maxDay = Math.max(1, ...chartData.map(([, d]) => d.totalTokens));

  const planTokens = planUsage?.tokens;
  const percentage = Math.min(planTokens?.percentage || 0, 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          {embedded ? (
            <h2 className="text-lg font-semibold">Uso de tokens</h2>
          ) : (
            <>
              <Link
                href="/account/subscription"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Planos e Assinatura
              </Link>
              <h1 className="text-3xl font-bold">Uso de Tokens</h1>
            </>
          )}
          <p className={`text-muted-foreground ${embedded ? "text-sm" : "mt-1"}`}>
            Acompanhe o consumo de tokens do seu plano
          </p>
        </div>

        <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Consumo do plano */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Consumo do seu plano</CardTitle>
          <CardDescription>Tokens usados no período atual da assinatura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="tabular-nums">
            {planTokens?.limit ? (
              <>
                <span className="text-2xl font-semibold">{planTokens.used.toLocaleString("pt-BR")}</span>
                <span className="text-muted-foreground"> / {planTokens.limit.toLocaleString("pt-BR")} tokens</span>
                <span className="ml-2 text-sm text-muted-foreground">({Math.round(planTokens.percentage || 0)}%)</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-semibold">{(planTokens?.used ?? 0).toLocaleString("pt-BR")}</span>
                <span className="text-muted-foreground"> tokens</span>
                <span className="ml-2 font-semibold text-primary">Ilimitado</span>
              </>
            )}
          </div>
          {planTokens?.limit ? (
            <Progress value={percentage} className={`h-3 ${percentage > 90 ? "bg-red-500" : ""}`} />
          ) : null}
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              <strong>Importar um board do Miro consome tokens do seu plano.</strong> As imagens e os fluxos do board são
              lidos pela IA para entrarem na base de conhecimento, e boards grandes podem gastar uma parte relevante do limite.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.totalTokens ?? 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos {period} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usos da IA</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.requests ?? 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos {period} dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Simples */}
      <Card>
        <CardHeader>
          <CardTitle>Uso Diário (Últimos 14 dias)</CardTitle>
          <CardDescription>Tokens consumidos por dia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {chartData.map(([date, data]) => (
              <div key={date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-muted-foreground">{date}</div>
                <div className="flex flex-1 items-center gap-2">
                  <div
                    className="h-8 rounded bg-primary/20"
                    style={{ width: `${(data.totalTokens / maxDay) * 100}%`, minWidth: "2px" }}
                  />
                  <span className="text-sm font-medium">
                    {data.totalTokens.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
            {chartData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum uso registrado no período selecionado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Histórico Detalhado */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
          <CardDescription>Cada uso da IA e os tokens consumidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">Data/Hora</th>
                  <th className="text-left p-2 text-sm font-medium">Uso</th>
                  <th className="text-right p-2 text-sm font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {usage?.slice(0, 50).map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-sm">
                      {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="p-2 text-sm">{operationLabel(item.operation)}</td>
                    <td className="p-2 text-sm text-right font-medium tabular-nums">
                      {item.totalTokens.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!usage || usage.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum registro encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
