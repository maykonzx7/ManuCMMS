"use client"

import { 
  Package, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Wrench,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { KPICard, RecentOrders, AssetsSummary } from '@/components/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockOrders, mockAssets, mockDashboardKPIs, mockOrdersByMonth } from '@/lib/mock-data'

export default function HomePage() {
  const kpis = mockDashboardKPIs
  const recentOrders = mockOrders.slice(0, 5)
  const recentAssets = mockAssets.slice(0, 4)

  // Calculate max value for chart scaling
  const maxValue = Math.max(
    ...mockOrdersByMonth.map(d => Math.max(d.corretiva, d.preventiva, d.preditiva))
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground">
          Visão geral da manutenção industrial
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Ativos"
          value={kpis.totalAtivos}
          description={`${kpis.ativosEmManutencao} em manutenção`}
          icon={Package}
          trend={{ value: 5, isPositive: true }}
        />
        <KPICard
          title="Ordens Abertas"
          value={kpis.ordensAbertas}
          description={`${kpis.ordensEmAndamento} em andamento`}
          icon={ClipboardList}
          trend={{ value: 12, isPositive: false }}
        />
        <KPICard
          title="MTTR"
          value={`${kpis.mttr}h`}
          description="Tempo médio de reparo"
          icon={Clock}
        />
        <KPICard
          title="Disponibilidade"
          value={`${kpis.taxaDisponibilidade}%`}
          description="Taxa de disponibilidade"
          icon={Activity}
          trend={{ value: 2.5, isPositive: true }}
        />
      </div>

      {/* Charts and Content */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Orders Chart - Simple Bar Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Ordens de Serviço por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-rose-500" />
                  <span className="text-muted-foreground">Corretiva</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-cyan-500" />
                  <span className="text-muted-foreground">Preventiva</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-amber-500" />
                  <span className="text-muted-foreground">Preditiva</span>
                </div>
              </div>
              
              {/* Chart Bars */}
              <div className="space-y-3">
                {mockOrdersByMonth.map((month) => (
                  <div key={month.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{month.name}</span>
                      <span className="text-muted-foreground">
                        {month.corretiva + month.preventiva + month.preditiva} total
                      </span>
                    </div>
                    <div className="flex h-6 gap-0.5 overflow-hidden rounded-md">
                      <div 
                        className="bg-rose-500 transition-all"
                        style={{ width: `${(month.corretiva / maxValue) * 100}%` }}
                      />
                      <div 
                        className="bg-cyan-500 transition-all"
                        style={{ width: `${(month.preventiva / maxValue) * 100}%` }}
                      />
                      <div 
                        className="bg-amber-500 transition-all"
                        style={{ width: `${(month.preditiva / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Métricas de Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.ordensConcluidas}</p>
                <p className="text-sm text-muted-foreground">OS Concluídas</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.ordensAbertas + kpis.ordensEmAndamento}</p>
                <p className="text-sm text-muted-foreground">OS Pendentes</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Wrench className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.mtbf}h</p>
                <p className="text-sm text-muted-foreground">MTBF (Tempo médio entre falhas)</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.taxaDisponibilidade}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Disponibilidade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Assets Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentOrders orders={recentOrders} />
        <AssetsSummary
          assets={recentAssets}
          totalAssets={kpis.totalAtivos}
          assetsInMaintenance={kpis.ativosEmManutencao}
        />
      </div>
    </div>
  )
}
