'use client'

import { useEffect, useMemo, useState } from 'react'
import { Package, ClipboardList, Activity } from 'lucide-react'
import { KPICard, RecentOrders, AssetsSummary } from '@/components/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiAtivoToAsset, mapApiOrdemToServiceOrder, type ApiAtivo, type ApiOrdem } from '@/lib/backend-mappers'

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

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const unidadeAtual = useCurrentUnit()
  const [ativos, setAtivos] = useState<ReturnType<typeof mapApiAtivoToAsset>[]>([])
  const [ordens, setOrdens] = useState<ReturnType<typeof mapApiOrdemToServiceOrder>[]>([])
  const [dashboard, setDashboard] = useState<DashboardExecutivoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !unidadeAtual?.id) return
    setIsLoading(true)
    void apiRequest<DashboardExecutivoResponse>(
      `/unidades/${unidadeAtual.id}/dashboard/executivo`,
      {},
    )
      .then((res) => {
        setDashboard(res)
        setAtivos(res.recentes.ativos.map((item) => mapApiAtivoToAsset(item, unidadeAtual.id)))
        setOrdens(res.recentes.ordens.map((item) => mapApiOrdemToServiceOrder(item, unidadeAtual.id)))
      })
      .catch(() => {
        setDashboard(null)
        setAtivos([])
        setOrdens([])
      })
      .finally(() => setIsLoading(false))
  }, [isAuthenticated, unidadeAtual?.id])

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground">Visão geral da manutenção industrial</p>
      </div>

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

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Sincronizando dados</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Atualizando indicadores da unidade selecionada...</CardContent>
        </Card>
      ) : null}
    </div>
  )
}
