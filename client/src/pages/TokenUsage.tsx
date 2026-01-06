import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, DollarSign, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TokenUsage() {
  const [period, setPeriod] = useState<number>(30);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Buscar estatísticas
  const { data: stats, isLoading: statsLoading } = trpc.tokens.getStats.useQuery({ days: period });
  
  // Buscar histórico
  const { data: usage, isLoading: usageLoading } = trpc.tokens.getUsage.useQuery({});

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
      acc[date] = { totalTokens: 0, requests: 0, cost: 0 };
    }
    acc[date].totalTokens += item.totalTokens;
    acc[date].requests += 1;
    // Estimativa de custo (gpt-4o-mini)
    const inputCost = item.promptTokens * 0.15 / 1000000;
    const outputCost = item.completionTokens * 0.60 / 1000000;
    acc[date].cost += inputCost + outputCost;
    return acc;
  }, {} as Record<string, { totalTokens: number; requests: number; cost: number }>);

  const chartData = Object.entries(usageByDate || {})
    .sort((a, b) => {
      const [dayA, monthA, yearA] = a[0].split('/');
      const [dayB, monthB, yearB] = b[0].split('/');
      return new Date(`${yearA}-${monthA}-${dayA}`).getTime() - new Date(`${yearB}-${monthB}-${dayB}`).getTime();
    })
    .slice(-14); // Últimos 14 dias

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Uso de Tokens</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o consumo de tokens da API de LLM
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

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTokens.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos {period} dias
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.totalCost.toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                USD (gpt-4o-mini)
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requisições</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.requests}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de chamadas à API
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-8 bg-primary/20 rounded"
                      style={{ 
                        width: `${Math.min((data.totalTokens / (stats?.totalTokens || 1)) * 100 * 5, 100)}%`,
                        minWidth: '2px'
                      }}
                    />
                    <span className="text-sm font-medium">
                      {data.totalTokens.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="text-sm text-muted-foreground w-20 text-right">
                    ${data.cost.toFixed(4)}
                  </div>
                )}
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
          <CardDescription>Todas as requisições registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">Data/Hora</th>
                  <th className="text-left p-2 text-sm font-medium">Operação</th>
                  <th className="text-left p-2 text-sm font-medium">Modelo</th>
                  <th className="text-right p-2 text-sm font-medium">Input</th>
                  <th className="text-right p-2 text-sm font-medium">Output</th>
                  <th className="text-right p-2 text-sm font-medium">Total</th>
                  {isAdmin && <th className="text-right p-2 text-sm font-medium">Custo</th>}
                </tr>
              </thead>
              <tbody>
                {usage?.slice(0, 50).map((item) => {
                  const inputCost = item.promptTokens * 0.15 / 1000000;
                  const outputCost = item.completionTokens * 0.60 / 1000000;
                  const totalCost = inputCost + outputCost;
                  
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">
                        {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="p-2 text-sm">{item.operation}</td>
                      <td className="p-2 text-sm font-mono text-xs">{item.model}</td>
                      <td className="p-2 text-sm text-right">{item.promptTokens.toLocaleString()}</td>
                      <td className="p-2 text-sm text-right">{item.completionTokens.toLocaleString()}</td>
                      <td className="p-2 text-sm text-right font-medium">{item.totalTokens.toLocaleString()}</td>
                      {isAdmin && <td className="p-2 text-sm text-right">${totalCost.toFixed(5)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!usage || usage.length === 0 && (
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






