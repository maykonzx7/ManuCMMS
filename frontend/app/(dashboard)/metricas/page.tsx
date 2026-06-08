'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Package,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { KPICard } from '@/components/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PageDataLoading } from '@/components/shared'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiOrdemToServiceOrder, type ApiOrdem } from '@/lib/backend-mappers'
import { usePermissions } from '@/hooks/use-permissions'
import { ORDER_STATUS_LABELS, MAINTENANCE_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type DashboardExecutivoResponse = {
  periodo: { from: string; to: string; dias: number }
  kpis: {
    mtbfHoras: number
    mttrHoras: number
    oeePercent: number
    disponibilidadePercent: number
    percentualPreventivaCorretiva: number
    custoMensalEstimado: number
  }
  ativos: { total: number; emManutencao: number; falha: number }
  ordens: {
    total: number
    abertas: number
    emExecucao: number
    concluidas: number
    canceladas: number
    corretivas: number
    preventivas: number
    preditivas: number
  }
}

const PERIODOS = [
  { label: '7 dias', dias: 7 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
  { label: '180 dias', dias: 180 },
] as const

const statusChartConfig = {
  abertas: { label: 'Abertas', color: 'hsl(217 91% 60%)' },
  emExecucao: { label: 'Em execução', color: 'hsl(38 92% 50%)' },
  concluidas: { label: 'Concluídas', color: 'hsl(160 84% 39%)' },
  canceladas: { label: 'Canceladas', color: 'hsl(0 72% 51%)' },
} satisfies ChartConfig

const tipoChartConfig = {
  corretivas: { label: 'Corretiva', color: 'hsl(0 72% 51%)' },
  preventivas: { label: 'Preventiva', color: 'hsl(217 91% 60%)' },
  preditivas: { label: 'Preditiva', color: 'hsl(271 81% 56%)' },
} satisfies ChartConfig

function formatDurationHours(hours: number): string {
  if (hours <= 0) return '—'
  if (hours < 24) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} d`
}

export default function MetricasAdminPage() {
  const router = useRouter()
  const { accessToken } = useAuth()
  const unit = useCurrentUnit()
  const { isAdmin } = usePermissions()
  const [periodoDias, setPeriodoDias] = useState(30)
  const [dashboard, setDashboard] = useState<DashboardExecutivoResponse | null>(null)
  const [ordens, setOrdens] = useState<
    Array<
      ReturnType<typeof mapApiOrdemToServiceOrder> & {
        statusSla?: string
      }
    >
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/workspace')
    }
  }, [isAdmin, router])

  useEffect(() => {
    if (!isAdmin || !accessToken || !unit?.id) return
    setIsLoading(true)
    setLoadError(null)

    const to = new Date()
    const from = new Date(to.getTime() - periodoDias * 24 * 60 * 60 * 1000)
    const query = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    })

    void Promise.all([
      apiRequest<DashboardExecutivoResponse>(
        `/unidades/${unit.id}/dashboard/executivo?${query.toString()}`,
        { accessToken },
      ),
      apiRequest<ApiOrdem[]>(
        `/unidades/${unit.id}/ordens-servico?${query.toString()}`,
        { accessToken },
      ),
    ])
      .then(([dashRes, ordensRes]) => {
        setDashboard(dashRes)
        setOrdens(
          ordensRes.map((item) => ({
            ...mapApiOrdemToServiceOrder(item, unit.id),
            statusSla: item.statusSla,
          })),
        )
      })
      .catch((error) => {
        setDashboard(null)
        setOrdens([])
        const message = error instanceof Error ? error.message : 'Falha ao carregar métricas'
        setLoadError(message)
        toast.error(message)
      })
      .finally(() => setIsLoading(false))
  }, [accessToken, isAdmin, periodoDias, unit?.id])

  const analiseOperacional = useMemo(() => {
    const concluidas = ordens.filter((o) => o.status === 'CONCLUIDA' && o.dataFechamento)
    const duracoes = concluidas.map((o) => {
      const ms = new Date(o.dataFechamento!).getTime() - new Date(o.dataAbertura).getTime()
      return ms > 0 ? ms / 3_600_000 : 0
    }).filter((h) => h > 0)

    const tempoMedio = duracoes.length > 0
      ? duracoes.reduce((s, h) => s + h, 0) / duracoes.length
      : 0

    const tempoMediano = duracoes.length > 0
      ? [...duracoes].sort((a, b) => a - b)[Math.floor(duracoes.length / 2)]
      : 0

    const atrasadas = ordens.filter(
      (o) =>
        (o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO') &&
        o.statusSla === 'ATRASADA',
    ).length

    const taxaConclusao =
      ordens.length > 0
        ? Math.round((concluidas.length / ordens.length) * 100)
        : 0

    return { tempoMedio, tempoMediano, atrasadas, taxaConclusao, totalConcluidas: concluidas.length }
  }, [ordens])

  const statusChartData = useMemo(() => {
    if (!dashboard) return []
    return [
      { name: 'abertas', value: dashboard.ordens.abertas, fill: 'var(--color-abertas)' },
      { name: 'emExecucao', value: dashboard.ordens.emExecucao, fill: 'var(--color-emExecucao)' },
      { name: 'concluidas', value: dashboard.ordens.concluidas, fill: 'var(--color-concluidas)' },
      { name: 'canceladas', value: dashboard.ordens.canceladas, fill: 'var(--color-canceladas)' },
    ].filter((item) => item.value > 0)
  }, [dashboard])

  const tipoChartData = useMemo(() => {
    if (!dashboard) return []
    return [
      { tipo: 'Corretiva', quantidade: dashboard.ordens.corretivas, fill: 'var(--color-corretivas)' },
      { tipo: 'Preventiva', quantidade: dashboard.ordens.preventivas, fill: 'var(--color-preventivas)' },
      { tipo: 'Preditiva', quantidade: dashboard.ordens.preditivas, fill: 'var(--color-preditivas)' },
    ]
  }, [dashboard])

  if (!isAdmin) return null

  if (isLoading) {
    return <PageDataLoading variant="dashboard" message="Carregando métricas da unidade..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas & Levantamento</h1>
          <p className="text-muted-foreground">
            Painel analítico da unidade {unit?.nome ?? ''} — indicadores para tomada de decisão.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Button
              key={p.dias}
              variant={periodoDias === p.dias ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoDias(p.dias)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="MTTR (tempo médio reparo)"
          value={formatDurationHours(dashboard?.kpis.mttrHoras ?? 0)}
          description="Média das OS concluídas no período"
          icon={Timer}
        />
        <KPICard
          title="Tempo médio resolução"
          value={formatDurationHours(analiseOperacional.tempoMedio)}
          description={`Mediana: ${formatDurationHours(analiseOperacional.tempoMediano)}`}
          icon={Clock}
        />
        <KPICard
          title="Disponibilidade"
          value={`${Math.round(dashboard?.kpis.disponibilidadePercent ?? 0)}%`}
          description={`OEE ${dashboard?.kpis.oeePercent ?? 0}%`}
          icon={Activity}
        />
        <KPICard
          title="Taxa de conclusão"
          value={`${analiseOperacional.taxaConclusao}%`}
          description={`${analiseOperacional.totalConcluidas} OS concluídas`}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="MTBF (entre falhas)"
          value={formatDurationHours(dashboard?.kpis.mtbfHoras ?? 0)}
          description="Tempo médio entre falhas"
          icon={TrendingUp}
        />
        <KPICard
          title="OS atrasadas (SLA)"
          value={analiseOperacional.atrasadas}
          description="Abertas ou em execução fora do prazo"
          icon={AlertTriangle}
        />
        <KPICard
          title="Ativos em manutenção"
          value={dashboard?.ativos.emManutencao ?? 0}
          description={`${dashboard?.ativos.total ?? 0} ativos · ${dashboard?.ativos.falha ?? 0} em falha`}
          icon={Package}
        />
        <KPICard
          title="% Preventiva"
          value={`${dashboard?.kpis.percentualPreventivaCorretiva ?? 0}%`}
          description={`Custo est.: R$ ${(dashboard?.kpis.custoMensalEstimado ?? 0).toFixed(0)}/mês`}
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>OS por status (período)</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-[280px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={2}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              {Object.entries(statusChartConfig).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                  />
                  {cfg.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OS por tipo de manutenção</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tipoChartConfig} className="min-h-[280px] w-full">
              <BarChart data={tipoChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="tipo" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                  {tipoChartData.map((entry) => (
                    <Cell key={entry.tipo} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do período ({dashboard?.periodo.dias ?? periodoDias} dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total de OS</p>
              <p className="text-2xl font-bold">{dashboard?.ordens.total ?? 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{ORDER_STATUS_LABELS.ABERTA}</p>
              <p className="text-2xl font-bold text-blue-500">{dashboard?.ordens.abertas ?? 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{ORDER_STATUS_LABELS.EM_ANDAMENTO}</p>
              <p className="text-2xl font-bold text-amber-500">{dashboard?.ordens.emExecucao ?? 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{ORDER_STATUS_LABELS.CONCLUIDA}</p>
              <p className="text-2xl font-bold text-emerald-500">{dashboard?.ordens.concluidas ?? 0}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(['CORRETIVA', 'PREVENTIVA', 'PREDITIVA'] as const).map((tipo) => (
              <div key={tipo} className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">{MAINTENANCE_TYPE_LABELS[tipo]}</p>
                <p className="text-xl font-semibold">
                  {tipo === 'CORRETIVA'
                    ? dashboard?.ordens.corretivas
                    : tipo === 'PREVENTIVA'
                      ? dashboard?.ordens.preventivas
                      : dashboard?.ordens.preditivas}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
