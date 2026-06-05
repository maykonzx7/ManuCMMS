'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Package, ClipboardList, Activity, ArrowRight } from 'lucide-react'
import { KPICard, RecentOrders, AssetsSummary } from '@/components/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth, useCurrentUnit, useCurrentUser } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiAtivoToAsset, mapApiOrdemToServiceOrder, type ApiAtivo, type ApiOrdem } from '@/lib/backend-mappers'
import { usePermissions } from '@/hooks/use-permissions'
import { PageDataLoading } from '@/components/shared'
import { ROUTES } from '@/lib/routes'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
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
    setIsLoading(true)
    setLoadError(null)
    void apiRequest<DashboardExecutivoResponse>(
      `/unidades/${unidadeAtual.id}/dashboard/executivo`,
      { accessToken },
    )
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

function TechnicianHome() {
  const { accessToken, isAuthenticated } = useAuth()
  const user = useCurrentUser()
  const unidadeAtual = useCurrentUnit()
  const { role } = usePermissions()
  const [ordens, setOrdens] = useState<ReturnType<typeof mapApiOrdemToServiceOrder>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const isTecnico = role === 'TECNICO'

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !unidadeAtual?.id) return
    setIsLoading(true)
    setLoadError(null)
    const query = isTecnico && user?.id
      ? `?${new URLSearchParams({ idTecnico: user.id }).toString()}`
      : ''
    void apiRequest<ApiOrdem[]>(`/unidades/${unidadeAtual.id}/ordens-servico${query}`, { accessToken })
      .then((res) => {
        setOrdens(res.map((item) => mapApiOrdemToServiceOrder(item, unidadeAtual.id)))
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
    const abertas = ordens.filter((o) => o.status === 'ABERTA').length
    const emExecucao = ordens.filter((o) => o.status === 'EM_ANDAMENTO').length
    const concluidas = ordens.filter((o) => o.status === 'CONCLUIDA').length
    return { abertas, emExecucao, concluidas, total: ordens.length }
  }, [ordens])

  const minhasRecentes = ordens
    .filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO')
    .slice(0, 6)

  if (isLoading) {
    return <PageDataLoading variant="dashboard" message="Carregando suas ordens..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isTecnico ? 'Minhas Ordens' : 'Ordens da Unidade'}
          </h1>
          <p className="text-muted-foreground">
            {isTecnico
              ? `Olá, ${user?.nome ?? 'técnico'}. Acompanhe suas OS atribuídas nesta unidade.`
              : `Visão operacional das ordens de serviço em ${unidadeAtual?.nome ?? 'sua unidade'}.`}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={ROUTES.ordens}>
            Ver todas
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

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title="Abertas" value={resumo.abertas} description="Aguardando início" icon={ClipboardList} />
        <KPICard title="Em execução" value={resumo.emExecucao} description="Em andamento agora" icon={Activity} />
        <KPICard title="Concluídas" value={resumo.concluidas} description={`${resumo.total} no total`} icon={Package} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {minhasRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isTecnico
                ? 'Nenhuma OS aberta ou em execução atribuída a você.'
                : 'Nenhuma OS aberta ou em execução nesta unidade.'}
            </p>
          ) : (
            minhasRecentes.map((ordem) => (
              <Link
                key={ordem.id}
                href={`${ROUTES.ordens}/${ordem.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{ordem.numero} — {ordem.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {ORDER_STATUS_LABELS[ordem.status] ?? ordem.status}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
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
