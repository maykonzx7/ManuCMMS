'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Filter,
  ClipboardList,
  MoreHorizontal,
  Pencil,
  Eye,
  Play,
  XCircle,
  CheckCircle,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageDataLoading } from '@/components/shared'
import { 
  ORDER_STATUS_LABELS, 
  ORDER_STATUS_COLORS,
  ORDER_STATUS_OPTIONS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/constants'
import { usePermissions } from '@/hooks/use-permissions'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { useAuth, useCurrentCompany, useCurrentUnit, useCurrentUser } from '@/lib/auth'
import { OsAtivasPainel } from '@/components/ordens/os-ativas-painel'
import {
  OsIniciarWizard,
  OsConcluirWizard,
  OsFluxoContinuoPrompt,
} from '@/components/ordens/os-execution-wizard'
import { getPodeConcluirOrdem } from '@/lib/os-flow-utils'
import { apiRequest, downloadApiFile, peekApiCache } from '@/lib/api'
import { buildApiCacheKey } from '@/lib/api-cache'
import { mapApiOrdemToServiceOrder, type ApiOrdem } from '@/lib/backend-mappers'
import { useRealtimeConnection } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ApiUsuario = {
  id?: string
  idUsuario?: string
  nome: string
  perfil?: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ATRASADA' | 'all'>('all')
  const [orders, setOrders] = useState<Array<ReturnType<typeof mapApiOrdemToServiceOrder> & {
    statusSla?: string
    dataLimiteSla?: string | null
    fotoProblema?: string | null
    descricaoProblema?: string | null
  }>>([])
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([])
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferOrderId, setTransferOrderId] = useState('')
  const [transferCurrentTecnicoId, setTransferCurrentTecnicoId] = useState('')
  const [transferTecnicoId, setTransferTecnicoId] = useState('')
  const [transferMotivo, setTransferMotivo] = useState('')
  const [exportandoLista, setExportandoLista] = useState(false)
  const [iniciarWizardOpen, setIniciarWizardOpen] = useState(false)
  const [concluirWizardOpen, setConcluirWizardOpen] = useState(false)
  const [fluxoContinuoOpen, setFluxoContinuoOpen] = useState(false)
  const [wizardOrderId, setWizardOrderId] = useState('')
  const [pecasCatalog, setPecasCatalog] = useState<Array<{ id: string; codigo: string; nome: string; quantidadeEstoque: number; quantidadeMinima: number }>>([])
  const [wizardSubmitting, setWizardSubmitting] = useState(false)
  const { canCreateOrder, canManageOrderStatus, canEditOrder, role } = usePermissions()
  const { accessToken } = useAuth()
  const company = useCurrentCompany()
  const currentUnit = useCurrentUnit()
  const currentUser = useCurrentUser()

  const loadOrders = async () => {
    if (!accessToken || !currentUnit?.id) return
    const path = `/unidades/${currentUnit.id}/ordens-servico`
    const cacheKey = buildApiCacheKey('GET', path, company?.slug ?? null)
    const hasCached = peekApiCache<ApiOrdem[]>(cacheKey) !== undefined
    if (!hasCached) setIsPageLoading(true)
    try {
      const res = await apiRequest<ApiOrdem[]>(path, { accessToken })
      setOrders(res.map((item) => ({
        ...mapApiOrdemToServiceOrder(item, currentUnit.id),
        statusSla: item.statusSla,
        dataLimiteSla: item.dataLimiteSla ?? null,
        fotoProblema: item.fotoProblema ?? null,
        descricaoProblema: item.descricaoProblema ?? null,
      })))
      setOrdersError(null)
    } catch (error) {
      setOrders([])
      setOrdersError(error instanceof Error ? error.message : 'Falha ao carregar ordens')
    } finally {
      setIsPageLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [accessToken, currentUnit?.id])

  useRealtimeConnection(accessToken, company?.slug, {
    onOrdemStatus: (payload) => {
      if (payload.idUnidade !== currentUnit?.id) return
      setOrders((prev) =>
        prev.map((order) =>
          order.id === payload.id
            ? { ...order, status: payload.status as OrderStatus }
            : order,
        ),
      )
    },
  })

  useEffect(() => {
    if (!accessToken || !currentUnit?.id || !canEditOrder) return
    void apiRequest<ApiUsuario[]>(`/unidades/${currentUnit.id}/usuarios`, { accessToken })
      .then((res) => {
        setTecnicos(
          res
            .map((u) => ({
              id: u.id ?? u.idUsuario ?? '',
              nome: u.nome,
              perfil: (u.perfil ?? '').toUpperCase(),
            }))
            .filter((u) => u.id && u.perfil === 'TECNICO')
            .map((u) => ({ id: u.id, nome: u.nome })),
        )
      })
      .catch(() => setTecnicos([]))
  }, [accessToken, currentUnit?.id, canEditOrder])

  const wizardOrder = orders.find((o) => o.id === wizardOrderId)

  const openIniciarWizard = (orderId: string) => {
    setWizardOrderId(orderId)
    setIniciarWizardOpen(true)
  }

  const openConcluirWizard = async (orderId: string) => {
    const selected = orders.find((o) => o.id === orderId)
    const bloqueio = selected
      ? getPodeConcluirOrdem({
          status: selected.status,
          tipo: selected.tipo,
          fotoProblema: selected.fotoProblema,
          descricaoProblema: selected.descricaoProblema,
        })
      : { ok: true, motivo: null }
    if (!bloqueio.ok) {
      toast.error(bloqueio.motivo ?? 'Não é possível concluir esta OS agora.')
      return
    }
    setWizardOrderId(orderId)
    if (accessToken && currentUnit?.id) {
      try {
        const res = await apiRequest<Array<{ id: string; codigo: string; nome: string; quantidadeEstoque: number; quantidadeMinima: number }>>(
          `/unidades/${currentUnit.id}/pecas`,
          { accessToken },
        )
        setPecasCatalog(res)
      } catch {
        setPecasCatalog([])
      }
    }
    setConcluirWizardOpen(true)
  }

  const handleIniciarWizard = async (data: { fotoProblema?: File; descricaoProblema?: string }) => {
    if (!accessToken || !currentUnit?.id || !wizardOrderId) return
    setWizardSubmitting(true)
    try {
      if (wizardOrder?.tipo === 'CORRETIVA') {
        const formData = new FormData()
        formData.append('fotoProblema', data.fotoProblema!)
        formData.append('descricaoProblema', data.descricaoProblema!)
        await apiRequest(`/unidades/${currentUnit.id}/ordens-servico/${wizardOrderId}/iniciar`, {
          method: 'PATCH',
          accessToken,
          body: formData,
        })
      } else {
        await apiRequest(`/unidades/${currentUnit.id}/ordens-servico/${wizardOrderId}/iniciar`, {
          method: 'PATCH',
          accessToken,
        })
      }
      toast.success('Ordem iniciada com sucesso')
      setIniciarWizardOpen(false)
      await loadOrders()
      setFluxoContinuoOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao iniciar ordem')
    } finally {
      setWizardSubmitting(false)
    }
  }

  const handleConcluirWizard = async (data: {
    descricaoSolucao: string
    fotoSolucao?: File
    fotoAnexo?: File
    confirmacaoConclusao: boolean
    pecasConsumidas: Array<{ pecaId: string; quantidade: number }>
  }) => {
    if (!accessToken || !currentUnit?.id || !wizardOrderId) return
    setWizardSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('descricaoSolucao', data.descricaoSolucao)
      formData.append('confirmacaoConclusao', 'true')
      if (data.fotoSolucao) formData.append('fotoSolucao', data.fotoSolucao)
      if (data.fotoAnexo) formData.append('fotoAnexo', data.fotoAnexo)
      if (data.pecasConsumidas.length > 0) {
        formData.append('pecasConsumidas', JSON.stringify(data.pecasConsumidas))
      }
      await apiRequest(`/unidades/${currentUnit.id}/ordens-servico/${wizardOrderId}/fechar`, {
        method: 'PATCH',
        accessToken,
        body: formData,
      })
      toast.success('Ordem concluída com sucesso')
      setConcluirWizardOpen(false)
      await loadOrders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao concluir ordem')
    } finally {
      setWizardSubmitting(false)
    }
  }

  const onCancelar = async (orderId: string) => {
    if (!accessToken || !currentUnit?.id) return
    try {
      await apiRequest(`/unidades/${currentUnit.id}/ordens-servico/${orderId}/cancelar`, {
        method: 'PATCH',
        accessToken,
        body: { observacaoCancelamento: 'Cancelada pela operação.' },
      })
      toast.success('Ordem cancelada com sucesso')
      await loadOrders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao cancelar ordem')
    }
  }

  const openTransfer = (orderId: string, currentTecnicoId?: string) => {
    if (!canEditOrder) {
      toast.error('Transferência disponível apenas para Supervisor, Gestor ou Admin.')
      return
    }
    setTransferOrderId(orderId)
    setTransferCurrentTecnicoId(currentTecnicoId ?? '')
    setTransferTecnicoId('')
    setTransferMotivo('')
    setTransferOpen(true)
  }

  const onTransferir = async () => {
    if (!accessToken || !currentUnit?.id || !transferOrderId) return
    if (!transferTecnicoId) {
      toast.error('Selecione o técnico de destino.')
      return
    }
    if (transferTecnicoId === transferCurrentTecnicoId) {
      toast.error('Selecione um técnico diferente do responsável atual.')
      return
    }
    if (transferMotivo.trim().length < 10) {
      toast.error('Informe um motivo com no mínimo 10 caracteres.')
      return
    }
    try {
      await apiRequest(`/unidades/${currentUnit.id}/ordens-servico/${transferOrderId}`, {
        method: 'PATCH',
        accessToken,
        body: {
          idTecnico: transferTecnicoId,
          motivoTransferencia: transferMotivo.trim(),
        },
      })
      toast.success('OS transferida com sucesso.')
      setTransferOpen(false)
      setTransferOrderId('')
      setTransferCurrentTecnicoId('')
      setTransferTecnicoId('')
      setTransferMotivo('')
      await loadOrders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao transferir OS')
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.titulo.toLowerCase().includes(search.toLowerCase()) ||
      order.numero.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ATRASADA'
        ? order.statusSla === 'ATRASADA'
        : order.status === statusFilter)
    return matchesSearch && matchesStatus
  })

  const stats = useMemo(
    () => ({
      total: orders.length,
      abertas: orders.filter((o) => o.status === 'ABERTA').length,
      emAndamento: orders.filter((o) => o.status === 'EM_ANDAMENTO').length,
      concluidas: orders.filter((o) => o.status === 'CONCLUIDA').length,
      atrasadas: orders.filter((o) => o.statusSla === 'ATRASADA').length,
    }),
    [orders],
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  async function baixarLista(formato: 'csv' | 'json' | 'pdf') {
    if (!currentUnit?.id) return
    setExportandoLista(true)
    try {
      const query = new URLSearchParams({ formato })
      if (statusFilter !== 'all' && statusFilter !== 'ATRASADA') {
        query.set('status', statusFilter === 'EM_ANDAMENTO' ? 'EM_EXECUCAO' : statusFilter)
      }
      const ext = formato
      await downloadApiFile(
        `/unidades/${currentUnit.id}/ordens-servico/export?${query.toString()}`,
        `ordens_${currentUnit.nome.replace(/\s+/g, '_').toLowerCase()}.${ext}`,
        { accessToken },
      )
      toast.success(`Lista exportada em ${ext.toUpperCase()}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao exportar ordens')
    } finally {
      setExportandoLista(false)
    }
  }

  if (isPageLoading) {
    return <PageDataLoading variant="table" message="Carregando ordens de serviço..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-muted-foreground">
            Gerencie as ordens de manutenção da sua unidade
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role !== 'TECNICO' ? (
            <>
              <Button variant="outline" disabled={exportandoLista} onClick={() => void baixarLista('csv')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <Button variant="outline" disabled={exportandoLista} onClick={() => void baixarLista('json')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar JSON
              </Button>
              <Button variant="outline" disabled={exportandoLista} onClick={() => void baixarLista('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </>
          ) : null}
          {canCreateOrder && (
            <Button asChild>
              <Link href="/ordens/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova OS
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.abertas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emAndamento}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.concluidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atrasadas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as OrderStatus | 'ATRASADA' | 'all')}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ATRASADA">Atrasadas (SLA)</SelectItem>
            {ORDER_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OsAtivasPainel
        orders={orders}
        canManageOrderStatus={canManageOrderStatus}
        onIniciar={openIniciarWizard}
        onConcluir={openConcluirWizard}
      />

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
          title="Nenhuma ordem de serviço encontrada"
          description={search || statusFilter !== 'all' 
            ? "Tente ajustar os filtros de busca" 
            : "Comece criando sua primeira ordem de serviço"}
          action={canCreateOrder ? {
            label: "Criar ordem de serviço",
            onClick: () => window.location.href = '/ordens/nova',
          } : undefined}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Data</TableHead>
                <TableHead className="w-[180px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/ordens/${order.id}`)}
                >
                  <TableCell className="font-mono text-sm">
                    {order.numero}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">
                        {order.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.ativo?.nome}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {MAINTENANCE_TYPE_LABELS[order.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', PRIORITY_COLORS[order.prioridade])}
                    >
                      {PRIORITY_LABELS[order.prioridade]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', ORDER_STATUS_COLORS[order.status])}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                      {order.statusSla === 'ATRASADA' ? (
                        <Badge variant="destructive" className="text-xs">Atrasada</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {formatDate(order.dataAbertura)}
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden h-8 sm:inline-flex"
                        asChild
                      >
                        <Link href={`/ordens/${order.id}`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Abrir
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:hidden"
                        asChild
                      >
                        <Link href={`/ordens/${order.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Abrir OS</span>
                        </Link>
                      </Button>
                      {canManageOrderStatus && order.status === 'ABERTA' ? (
                        <Button
                          size="sm"
                          className="hidden h-8 md:inline-flex"
                          onClick={() => openIniciarWizard(order.id)}
                        >
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          Iniciar
                        </Button>
                      ) : null}
                      {canManageOrderStatus && order.status === 'EM_ANDAMENTO' ? (
                        <Button
                          size="sm"
                          className="hidden h-8 md:inline-flex"
                          onClick={() => void openConcluirWizard(order.id)}
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          Concluir
                        </Button>
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Mais ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/ordens/${order.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          {canManageOrderStatus && order.status === 'ABERTA' ? (
                            <DropdownMenuItem onClick={() => openIniciarWizard(order.id)}>
                              <Play className="mr-2 h-4 w-4" />
                              Iniciar
                            </DropdownMenuItem>
                          ) : null}
                          {canManageOrderStatus && order.status === 'EM_ANDAMENTO' ? (
                            <DropdownMenuItem onClick={() => void openConcluirWizard(order.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Concluir
                            </DropdownMenuItem>
                          ) : null}
                          {canEditOrder &&
                          ['ABERTA', 'EM_ANDAMENTO'].includes(order.status) ? (
                            <DropdownMenuItem
                              onClick={() => openTransfer(order.id, order.responsavelId)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Transferir
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          {canManageOrderStatus &&
                          order.status !== 'CONCLUIDA' &&
                          order.status !== 'CANCELADA' ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => void onCancelar(order.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {ordersError ? (
        <p className="text-xs text-destructive">
          Falha ao carregar OS da base: {ordersError}
        </p>
      ) : null}

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Técnico de destino</Label>
              <Select value={transferTecnicoId} onValueChange={setTransferTecnicoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos
                    .filter((t) => t.id !== transferCurrentTecnicoId)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo da transferência</Label>
              <Textarea
                rows={4}
                value={transferMotivo}
                onChange={(e) => setTransferMotivo(e.target.value)}
                placeholder="Explique por que a OS está sendo transferida..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void onTransferir()}>
                Confirmar transferência
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {wizardOrder ? (
        <>
          <OsIniciarWizard
            open={iniciarWizardOpen}
            onOpenChange={setIniciarWizardOpen}
            orderNumero={wizardOrder.numero}
            orderTipo={wizardOrder.tipo}
            submitting={wizardSubmitting}
            onConfirm={handleIniciarWizard}
          />
          <OsFluxoContinuoPrompt
            open={fluxoContinuoOpen}
            onOpenChange={setFluxoContinuoOpen}
            orderNumero={wizardOrder.numero}
            onConcluirAgora={() => void openConcluirWizard(wizardOrder.id)}
          />
          <OsConcluirWizard
            open={concluirWizardOpen}
            onOpenChange={setConcluirWizardOpen}
            orderNumero={wizardOrder.numero}
            orderTipo={wizardOrder.tipo}
            tecnico={{
              nome: currentUser?.nome ?? wizardOrder.responsavel?.nome ?? 'Técnico',
              avatar: currentUser?.avatar ?? null,
              perfil: currentUser?.perfil,
              cargo: currentUser?.cargoNome ?? null,
            }}
            pecasCatalog={pecasCatalog}
            submitting={wizardSubmitting}
            onConfirm={handleConcluirWizard}
          />
        </>
      ) : null}
    </div>
  )
}
