"use client"

import { useState } from 'react'
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  Gauge,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { mockDashboardKPIs, mockOrdersByMonth, mockAssets } from '@/lib/mock-data'

export default function DashboardAnaliticoPage() {
  const [period, setPeriod] = useState('30d')
  const kpis = mockDashboardKPIs

  // Calculate status distribution
  const statusDistribution = mockAssets.reduce((acc, asset) => {
    acc[asset.status] = (acc[asset.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalAssets = mockAssets.length

  // Calculate order type totals
  const orderTypeTotals = mockOrdersByMonth.reduce(
    (acc, month) => ({
      corretiva: acc.corretiva + month.corretiva,
      preventiva: acc.preventiva + month.preventiva,
      preditiva: acc.preditiva + month.preditiva,
    }),
    { corretiva: 0, preventiva: 0, preditiva: 0 }
  )

  const totalOrders = orderTypeTotals.corretiva + orderTypeTotals.preventiva + orderTypeTotals.preditiva

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Analítico</h1>
          <p className="text-muted-foreground">
            Análise detalhada de indicadores e métricas
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="1y">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MTBF</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.mtbf}h</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio entre falhas
            </p>
            <div className="mt-2 flex items-center text-sm text-emerald-500">
              <TrendingUp className="mr-1 h-4 w-4" />
              +8.2% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MTTR</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.mttr}h</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio de reparo
            </p>
            <div className="mt-2 flex items-center text-sm text-emerald-500">
              <TrendingDown className="mr-1 h-4 w-4" />
              -12.5% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disponibilidade</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.taxaDisponibilidade}%</div>
            <p className="text-xs text-muted-foreground">
              Taxa de disponibilidade
            </p>
            <div className="mt-2">
              <Progress value={kpis.taxaDisponibilidade} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Backlog</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.ordensAbertas + kpis.ordensEmAndamento}</div>
            <p className="text-xs text-muted-foreground">
              Ordens pendentes
            </p>
            <div className="mt-2 flex items-center text-sm text-amber-500">
              <AlertTriangle className="mr-1 h-4 w-4" />
              {kpis.ordensAbertas} aguardando início
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="ativos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="ordens">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Status
                </CardTitle>
                <CardDescription>
                  Status atual dos ativos cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="text-sm">Operacional</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{statusDistribution['OPERACIONAL'] || 0}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((statusDistribution['OPERACIONAL'] || 0) / totalAssets * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(statusDistribution['OPERACIONAL'] || 0) / totalAssets * 100} 
                    className="h-2 bg-muted [&>div]:bg-emerald-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="text-sm">Em Manutenção</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{statusDistribution['EM_MANUTENCAO'] || 0}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((statusDistribution['EM_MANUTENCAO'] || 0) / totalAssets * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(statusDistribution['EM_MANUTENCAO'] || 0) / totalAssets * 100} 
                    className="h-2 bg-muted [&>div]:bg-amber-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-500" />
                      <span className="text-sm">Parado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{statusDistribution['PARADO'] || 0}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((statusDistribution['PARADO'] || 0) / totalAssets * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(statusDistribution['PARADO'] || 0) / totalAssets * 100} 
                    className="h-2 bg-muted [&>div]:bg-rose-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-slate-500" />
                      <span className="text-sm">Desativado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{statusDistribution['DESATIVADO'] || 0}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((statusDistribution['DESATIVADO'] || 0) / totalAssets * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(statusDistribution['DESATIVADO'] || 0) / totalAssets * 100} 
                    className="h-2 bg-muted [&>div]:bg-slate-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Assets by Criticality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Criticidade dos Ativos
                </CardTitle>
                <CardDescription>
                  Distribuição por nível de criticidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-rose-500/10">
                      <AlertTriangle className="h-7 w-7 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Crítica</p>
                        <p className="text-2xl font-bold">12</p>
                      </div>
                      <Progress value={24} className="mt-2 h-2 bg-muted [&>div]:bg-rose-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-amber-500/10">
                      <Activity className="h-7 w-7 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Alta</p>
                        <p className="text-2xl font-bold">18</p>
                      </div>
                      <Progress value={36} className="mt-2 h-2 bg-muted [&>div]:bg-amber-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-500/10">
                      <Package className="h-7 w-7 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Média</p>
                        <p className="text-2xl font-bold">15</p>
                      </div>
                      <Progress value={30} className="mt-2 h-2 bg-muted [&>div]:bg-cyan-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-500/10">
                      <CheckCircle2 className="h-7 w-7 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Baixa</p>
                        <p className="text-2xl font-bold">5</p>
                      </div>
                      <Progress value={10} className="mt-2 h-2 bg-muted [&>div]:bg-slate-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ordens" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Order Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>
                  Total de ordens por tipo de manutenção
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-rose-500" />
                      <span className="text-sm">Corretiva</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{orderTypeTotals.corretiva}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(orderTypeTotals.corretiva / totalOrders * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={orderTypeTotals.corretiva / totalOrders * 100} 
                    className="h-2 bg-muted [&>div]:bg-rose-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                      <span className="text-sm">Preventiva</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{orderTypeTotals.preventiva}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(orderTypeTotals.preventiva / totalOrders * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={orderTypeTotals.preventiva / totalOrders * 100} 
                    className="h-2 bg-muted [&>div]:bg-cyan-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Preditiva</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{orderTypeTotals.preditiva}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(orderTypeTotals.preditiva / totalOrders * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={orderTypeTotals.preditiva / totalOrders * 100} 
                    className="h-2 bg-muted [&>div]:bg-amber-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência Mensal</CardTitle>
                <CardDescription>
                  Evolução das ordens nos últimos meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockOrdersByMonth.map((month) => {
                    const total = month.corretiva + month.preventiva + month.preditiva
                    const maxTotal = Math.max(...mockOrdersByMonth.map(m => m.corretiva + m.preventiva + m.preditiva))
                    return (
                      <div key={month.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{month.name}</span>
                          <span className="text-muted-foreground">{total}</span>
                        </div>
                        <div className="flex h-4 gap-0.5 overflow-hidden rounded">
                          <div 
                            className="bg-rose-500 transition-all"
                            style={{ width: `${(month.corretiva / maxTotal) * 100}%` }}
                          />
                          <div 
                            className="bg-cyan-500 transition-all"
                            style={{ width: `${(month.preventiva / maxTotal) * 100}%` }}
                          />
                          <div 
                            className="bg-amber-500 transition-all"
                            style={{ width: `${(month.preditiva / maxTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Custo Total (Mês)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 45.230,00</div>
                <div className="mt-1 flex items-center text-sm text-emerald-500">
                  <TrendingDown className="mr-1 h-4 w-4" />
                  -8.3% vs mês anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Custo por OS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 1.280,00</div>
                <p className="text-xs text-muted-foreground">Média por ordem de serviço</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Economia Preventiva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">R$ 12.450,00</div>
                <p className="text-xs text-muted-foreground">Estimativa de economia</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Custos</CardTitle>
              <CardDescription>Custos por categoria de manutenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mão de obra</span>
                    <span className="font-medium">R$ 22.500,00</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Peças e materiais</span>
                    <span className="font-medium">R$ 15.230,00</span>
                  </div>
                  <Progress value={34} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Serviços terceirizados</span>
                    <span className="font-medium">R$ 5.000,00</span>
                  </div>
                  <Progress value={11} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Outros</span>
                    <span className="font-medium">R$ 2.500,00</span>
                  </div>
                  <Progress value={5} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
