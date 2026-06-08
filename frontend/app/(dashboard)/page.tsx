'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Package,
  ClipboardList,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Wrench,
  Clock,
} from 'lucide-react'
import { KPICard, RecentOrders, AssetsSummary } from '@/components/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth, useCurrentUnit, useCurrentUser } from '@/lib/auth'
import { apiRequest, isApiCacheWarm } from '@/lib/api'
import { mapApiAtivoToAsset, mapApiOrdemToServiceOrder, type ApiAtivo, type ApiOrdem } from '@/lib/backend-mappers'
import { usePermissions } from '@/hooks/use-permissions'
import { PageDataLoading } from '@/components/shared'
import { ROUTES } from '@/lib/routes'
import { getFirstName } from '@/lib/user-display'
import { Badge } from '@/components/ui/badge'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_COLORS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { MaintenanceType, ServiceOrder } from '@/types'
import { toast } from 'sonner'

type DashboardExecutivoResponse = {
  periodo: {
    from: string
    to: string
    dias: number
  }
  kpis: {
    mtbfHoras: number
    mttrHoras: number
    oeePercent: number
    disponibilidadePercent: number
    percentualPreventivaCorretiva: number
    custoMensalEstimado: number
  }
  ativos: {
    total: number
    emManutencao: number
    falha: number
  }
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
  recentes: {
    ordens: ApiOrdem[]
    ativos: ApiAtivo[]
  }
}

function ExecutiveHome() {
  const { accessToken, isAuthenticated } = useAuth()
  const unidadeAtual = useCurrentUnit()
  const [ativos, setAtivos] = useState<ReturnType<typeof mapApiAtivoToAsset>[]>([])
  const [ordens, setOrdens] = useState<ReturnType<typeof mapApiOrdemToServiceOrder>[]>([])
  const [dashboard, setDashboard] = useState<DashboardExecutivoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !unidadeAtual?.id) return
    const path = `/unidades/${unidadeAtual.id}/dashboard/executivo`
    if (!isApiCacheWarm(path, accessToken)) {
      setIsLoading(true)
    }
    setLoadError(null)
    void apiRequest<DashboardExecutivoResponse>(path, { accessToken })
      .then((res) => {
        setDashboard(res)
        setAtivos(res.recentes.ativos.map((item) => mapApiAtivoToAsset(item, unidadeAtual.id)))
        setOrdens(res.recentes.ordens.map((item) => mapApiOrdemToServiceOrder(item, unidadeAtual.id)))
      })
      .catch((error) => {
        setDashboard(null)
        setAtivos([])
        setOrdens([])
        const message = error instanceof Error ? error.message : 'Falha ao carregar painel executivo'
        setLoadError(message)
        toast.error(message)
      })
      .finally(() => setIsLoading(false))
  }, [accessToken, isAuthenticated, unidadeAtual?.id])

  const kpis = useMemo(() => {
    const ordensAbertas = dashboard?.ordens.abertas ?? 0
    const ordensEmAndamento = dashboard?.ordens.emExecucao ?? 0
    const ordensConcluidas = dashboard?.ordens.concluidas ?? 0
    const ativosEmManutencao = dashboard?.ativos.emManutencao ?? 0
    const totalAtivos = dashboard?.ativos.total ?? 0
    const taxaDisponibilidade = Math.round(dashboard?.kpis.disponibilidadePercent ?? 0)

    return {
      totalAtivos,
      ativosEmManutencao,
      ordensAbertas,
      ordensEmAndamento,
      ordensConcluidas,
      taxaDisponibilidade,
    }
  }, [dashboard])

  const recentOrders = ordens.slice(0, 5).map((order) => ({
    id: order.id,
    numero: order.numero,
    titulo: order.titulo,
    status: order.status,
    prioridade: 'MEDIA',
    tipo: order.tipo,
    dataAbertura: order.dataAbertura,
    unidadeId: unidadeAtual?.id ?? '',
    ativoId: order.ativoId,
    solicitanteId: '',
    createdAt: order.dataAbertura,
    updatedAt: order.dataAbertura,
  }))

  const recentAssets = ativos.slice(0, 4).map((asset) => ({
    id: asset.id,
    nome: asset.nome,
    codigo: asset.codigo,
    status: asset.status,
    unidadeId: unidadeAtual?.id ?? '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  if (isLoading) {
    return <PageDataLoading variant="dashboard" message="Carregando painel executivo..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Executivo</h1>
        <p className="text-muted-foreground">Indicadores e visão geral da manutenção industrial</p>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total de Ativos" value={kpis.totalAtivos} description={`${kpis.ativosEmManutencao} em manutenção`} icon={Package} />
        <KPICard title="Ordens Abertas" value={kpis.ordensAbertas} description={`${kpis.ordensEmAndamento} em andamento`} icon={ClipboardList} />
        <KPICard title="Ordens Concluídas" value={kpis.ordensConcluidas} description="Total concluído" icon={Activity} />
        <KPICard title="Disponibilidade" value={`${kpis.taxaDisponibilidade}%`} description={`OEE ${dashboard?.kpis.oeePercent ?? 0}%`} icon={Activity} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentOrders orders={recentOrders as never[]} />
        <AssetsSummary assets={recentAssets as never[]} totalAssets={kpis.totalAtivos} assetsInMaintenance={kpis.ativosEmManutencao} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="MTBF (h)" value={dashboard?.kpis.mtbfHoras ?? 0} description="Tempo médio entre falhas" icon={Activity} />
        <KPICard title="MTTR (h)" value={dashboard?.kpis.mttrHoras ?? 0} description="Tempo médio de reparo" icon={Activity} />
        <KPICard title="OEE (%)" value={dashboard?.kpis.oeePercent ?? 0} description="Eficiência global do equipamento" icon={Activity} />
        <KPICard title="% Preventiva" value={`${dashboard?.kpis.percentualPreventivaCorretiva ?? 0}%`} description="Preventiva vs corretiva" icon={ClipboardList} />
        <KPICard title="Custo Mensal" value={`R$ ${(dashboard?.kpis.custoMensalEstimado ?? 0).toFixed(2)}`} description="Estimativa operacional" icon={Package} />
      </div>

    </div>
  )
}

type TechnicianOrder = ServiceOrder & {
  statusSla?: ApiOrdem['statusSla']
  dataLimiteSla?: string | null
}

function formatDurationHours(hours: number): string {
  if (hours <= 0) return '—'
  if (hours < 1) {
    const mins = Math.round(hours * 60)
    return mins <= 1 ? '< 1 min' : `${mins} min`
  }
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }
  const days = Math.floor(hours / 24)
  const remH = Math.round(hours % 24)
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`
}

function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getOrderDurationHours(ordem: TechnicianOrder): number | null {
  if (!ordem.dataFechamento) return null
  const ms = new Date(ordem.dataFechamento).getTime() - new Date(ordem.dataAbertura).getTime()
  return ms > 0 ? ms / 3_600_000 : null
}

function wasClosedWithinSla(ordem: TechnicianOrder): boolean | null {
  if (!ordem.dataFechamento || !ordem.dataLimiteSla) return null
  return new Date(ordem.dataFechamento).getTime() <= new Date(ordem.dataLimiteSla).getTime()
}

function TechnicianOrderRow({
  ordem,
  subtitle,
}: {
  ordem: TechnicianOrder
  subtitle?: string
}) {
  return (
    <Link
      href={`${ROUTES.ordens}/${ordem.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{ordem.numero}</span>
          <Badge variant="outline" className={cn('text-xs', MAINTENANCE_TYPE_COLORS[ordem.tipo])}>
            {MAINTENANCE_TYPE_LABELS[ordem.tipo]}
          </Badge>
          {ordem.statusSla === 'ATRASADA' ? (
            <Badge variant="outline" className="text-xs border-red-500/30 bg-red-500/20 text-red-400">
              SLA atrasado
            </Badge>
          ) : null}
        </div>
        <p className="truncate font-medium">{ordem.titulo}</p>
        <p className="truncate text-sm text-muted-foreground">
          {subtitle ?? `${ordem.ativo?.nome ?? 'Ativo'} · ${ORDER_STATUS_LABELS[ordem.status]}`}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

function TechnicianHome() {
  const { accessToken, isAuthenticated } = useAuth()
  const user = useCurrentUser()
  const unidadeAtual = useCurrentUnit()
  const { role } = usePermissions()
  const [ordens, setOrdens] = useState<TechnicianOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const isTecnico = role === 'TECNICO'

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !unidadeAtual?.id) return
    const query = isTecnico && user?.id
      ? `?${new URLSearchParams({ idTecnico: user.id }).toString()}`
      : ''
    const path = `/unidades/${unidadeAtual.id}/ordens-servico${query}`
    if (!isApiCacheWarm(path, accessToken)) {
      setIsLoading(true)
    }
    setLoadError(null)
    void apiRequest<ApiOrdem[]>(path, { accessToken })
      .then((res) => {
        setOrdens(
          res.map((item) => ({
            ...mapApiOrdemToServiceOrder(item, unidadeAtual.id),
            statusSla: item.statusSla,
            dataLimiteSla: item.dataLimiteSla ?? null,
          })),
        )
      })
      .catch((error) => {
        setOrdens([])
        const message = error instanceof Error ? error.message : 'Falha ao carregar ordens'
        setLoadError(message)
        toast.error(message)
      })
      .finally(() => setIsLoading(false))
  }, [accessToken, isAuthenticated, isTecnico, unidadeAtual?.id, user?.id])

  const resumo = useMemo(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const abertas = ordens.filter((o) => o.status === 'ABERTA')
    const emExecucao = ordens.filter((o) => o.status === 'EM_ANDAMENTO')
    const concluidas = ordens.filter((o) => o.status === 'CONCLUIDA')
    const concluidasMes = concluidas.filter(
      (o) => o.dataFechamento && new Date(o.dataFechamento) >= monthStart,
    )
    const atrasadas = ordens.filter(
      (o) =>
        (o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO') && o.statusSla === 'ATRASADA',
    )

    const duracoes = concluidas
      .map(getOrderDurationHours)
      .filter((h): h is number => h !== null)
    const tempoMedioHoras =
      duracoes.length > 0 ? duracoes.reduce((sum, h) => sum + h, 0) / duracoes.length : 0

    const concluidasComSla = concluidas
      .map(wasClosedWithinSla)
      .filter((v): v is boolean => v !== null)
    const taxaNoPrazo =
      concluidasComSla.length > 0
        ? Math.round(
            (concluidasComSla.filter(Boolean).length / concluidasComSla.length) * 100,
          )
        : null

    const porTipo: Record<MaintenanceType, number> = {
      CORRETIVA: ordens.filter((o) => o.tipo === 'CORRETIVA').length,
      PREVENTIVA: ordens.filter((o) => o.tipo === 'PREVENTIVA').length,
      PREDITIVA: ordens.filter((o) => o.tipo === 'PREDITIVA').length,
    }

    const ativosAtendidos = new Set(ordens.map((o) => o.ativoId).filter(Boolean)).size

    return {
      abertas: abertas.length,
      emExecucao: emExecucao.length,
      concluidas: concluidas.length,
      concluidasMes: concluidasMes.length,
      atrasadas: atrasadas.length,
      tempoMedioHoras,
      taxaNoPrazo,
      porTipo,
      ativosAtendidos,
      total: ordens.length,
    }
  }, [ordens])

  const proximasAcoes = useMemo(
    () =>
      ordens
        .filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO')
        .sort((a, b) => {
          const aAtrasada = a.statusSla === 'ATRASADA' ? 0 : 1
          const bAtrasada = b.statusSla === 'ATRASADA' ? 0 : 1
          if (aAtrasada !== bAtrasada) return aAtrasada - bAtrasada
          return new Date(a.dataAbertura).getTime() - new Date(b.dataAbertura).getTime()
        })
        .slice(0, 6),
    [ordens],
  )

  const concluidasRecentes = useMemo(
    () =>
      ordens
        .filter((o) => o.status === 'CONCLUIDA' && o.dataFechamento)
        .sort(
          (a, b) =>
            new Date(b.dataFechamento!).getTime() - new Date(a.dataFechamento!).getTime(),
        )
        .slice(0, 6),
    [ordens],
  )

  if (isLoading) {
    return <PageDataLoading variant="dashboard" message="Carregando seu painel..." />
  }

  const escopoLabel = isTecnico ? 'suas OS atribuídas' : 'as OS da unidade'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isTecnico ? 'Início' : 'Painel Operacional'}
          </h1>
          <p className="text-muted-foreground">
            {isTecnico
              ? `Olá, ${getFirstName(user?.nome, 'técnico')}. Resumo de ${escopoLabel} em ${unidadeAtual?.nome ?? 'sua unidade'}.`
              : `Visão operacional das ordens de serviço em ${unidadeAtual?.nome ?? 'sua unidade'}.`}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={ROUTES.ordens}>
            Ver todas as OS
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      {resumo.atrasadas > 0 ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-400">
                {resumo.atrasadas} {resumo.atrasadas === 1 ? 'OS com SLA atrasado' : 'OS com SLA atrasado'}
              </p>
              <p className="text-sm text-muted-foreground">
                Priorize {isTecnico ? 'suas ordens' : 'as ordens'} em atraso para evitar escalonamento.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Abertas"
          value={resumo.abertas}
          description="Aguardando início"
          icon={ClipboardList}
        />
        <KPICard
          title="Em execução"
          value={resumo.emExecucao}
          description={resumo.atrasadas > 0 ? `${resumo.atrasadas} com SLA atrasado` : 'Em andamento agora'}
          icon={Activity}
        />
        <KPICard
          title="Concluídas no mês"
          value={resumo.concluidasMes}
          description={`${resumo.concluidas} no total`}
          icon={CheckCircle2}
        />
        <KPICard
          title="Tempo médio"
          value={formatDurationHours(resumo.tempoMedioHoras)}
          description="Duração média das OS concluídas"
          icon={Timer}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="No prazo (SLA)"
          value={resumo.taxaNoPrazo !== null ? `${resumo.taxaNoPrazo}%` : '—'}
          description={
            resumo.taxaNoPrazo !== null
              ? 'Das concluídas com prazo definido'
              : 'Sem dados de SLA suficientes'
          }
          icon={CheckCircle2}
        />
        <KPICard
          title="Ativos atendidos"
          value={resumo.ativosAtendidos}
          description={isTecnico ? 'Equipamentos que você já interveio' : 'Equipamentos com OS registradas'}
          icon={Wrench}
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por tipo de manutenção
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {(['CORRETIVA', 'PREVENTIVA', 'PREDITIVA'] as MaintenanceType[]).map((tipo) => (
              <div key={tipo} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{MAINTENANCE_TYPE_LABELS[tipo]}</span>
                <Badge variant="outline" className={cn(MAINTENANCE_TYPE_COLORS[tipo])}>
                  {resumo.porTipo[tipo]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proximasAcoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isTecnico
                  ? 'Nenhuma OS aberta ou em execução atribuída a você.'
                  : 'Nenhuma OS aberta ou em execução nesta unidade.'}
              </p>
            ) : (
              proximasAcoes.map((ordem) => (
                <TechnicianOrderRow key={ordem.id} ordem={ordem} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isTecnico ? 'Suas conclusões recentes' : 'Conclusões recentes'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {concluidasRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isTecnico
                  ? 'Você ainda não concluiu nenhuma OS nesta unidade.'
                  : 'Nenhuma OS concluída registrada nesta unidade.'}
              </p>
            ) : (
              concluidasRecentes.map((ordem) => {
                const duracao = getOrderDurationHours(ordem)
                const noPrazo = wasClosedWithinSla(ordem)
                const slaLabel =
                  noPrazo === null ? null : noPrazo ? 'Concluída no prazo' : 'Concluída fora do prazo'
                return (
                  <Link
                    key={ordem.id}
                    href={`${ROUTES.ordens}/${ordem.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{ordem.numero}</span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', ORDER_STATUS_COLORS.CONCLUIDA)}
                        >
                          Concluída
                        </Badge>
                        {slaLabel ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              noPrazo
                                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                                : 'border-amber-500/30 bg-amber-500/20 text-amber-400',
                            )}
                          >
                            {slaLabel}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate font-medium">{ordem.titulo}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {ordem.ativo?.nome ?? 'Ativo'}
                        {duracao !== null ? ` · ${formatDurationHours(duracao)}` : ''}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Encerrada em {formatOrderDate(ordem.dataFechamento!)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { canViewExecutiveDashboard } = usePermissions()

  if (canViewExecutiveDashboard) {
    return <ExecutiveHome />
  }

  return <TechnicianHome />
}
