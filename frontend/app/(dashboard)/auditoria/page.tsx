"use client"

import { useEffect, useMemo, useState } from 'react'
import { 
  Search,
  Filter,
  Calendar,
  User,
  FileEdit,
  Trash2,
  Plus,
  Eye,
  Settings,
  LogIn,
  LogOut,
  Shield,
  Database,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest, downloadApiFile } from '@/lib/api'
import { PageDataLoading } from '@/components/shared'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'

type ApiAuditLog = {
  idLog: string
  idUsuario?: string | null
  usuarioNome?: string | null
  acao?: 'CREATE' | 'UPDATE' | 'DELETE' | 'SETTINGS_CHANGE' | 'LOGIN' | 'LOGOUT' | 'EXPORT'
  entidadeAfetada: string
  idRegistro: string
  valorAnterior: Record<string, unknown>
  valorNovo: Record<string, unknown>
  dataHora: string
}

type ApiAuditResponse = {
  logs: ApiAuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type ApiAuditSummary = {
  total: number
  intervalo: { from: string | null; to: string | null }
  porAcao: Record<string, number>
  porUsuario: Record<string, number>
  porEntidade: Record<string, number>
  usuarios: Array<{ idUsuario: string; nome: string; total: number }>
}

type ApiUsuario = {
  id?: string
  idUsuario?: string
  nome: string
}

type UiAuditLog = {
  id: string
  userId: string
  userName: string
  action: string
  entityType: string
  description: string
  createdAt: string
  ipAddress?: string
}

function resolveAction(before: Record<string, unknown>, after: Record<string, unknown>) {
  const explicit = String(after.acao ?? '').trim().toUpperCase()
  if (
    explicit === 'CREATE' ||
    explicit === 'UPDATE' ||
    explicit === 'DELETE' ||
    explicit === 'SETTINGS_CHANGE' ||
    explicit === 'LOGIN' ||
    explicit === 'LOGOUT' ||
    explicit === 'EXPORT'
  ) {
    return explicit
  }
  if (Object.keys(before).length === 0) return 'CREATE'
  const statusAfter = String(after.status ?? '')
  if (statusAfter === 'CANCELADA') return 'DELETE'
  if (statusAfter === 'CONCLUIDA') return 'SETTINGS_CHANGE'
  return 'UPDATE'
}

function buildDescription(item: ApiAuditLog, action: string) {
  if (item.entidadeAfetada === 'AuthSession') {
    if (action === 'LOGIN') return 'Usuário autenticado no sistema.'
    if (action === 'LOGOUT') return 'Usuário encerrou a sessão.'
  }
  if (item.entidadeAfetada === 'Auditoria' && action === 'EXPORT') {
    return 'Exportação de logs de auditoria em CSV.'
  }
  if (item.entidadeAfetada === 'Ativo') {
    const acaoFoto = String(item.valorNovo?.acao ?? '')
    if (acaoFoto === 'UPDATE_FOTO') {
      return item.valorNovo?.fotoUrl
        ? 'Foto do ativo atualizada.'
        : 'Foto do ativo removida.'
    }
  }
  if (item.entidadeAfetada === 'OrdemServico') {
    const statusAfter = String(item.valorNovo?.status ?? '')
    const numero = item.idRegistro.slice(0, 8).toUpperCase()
    if (statusAfter === 'CONCLUIDA') {
      const hasFoto =
        Boolean(item.valorNovo?.fotoAnexo) ||
        Boolean(item.valorNovo?.fotoProblema) ||
        Boolean(item.valorNovo?.fotoSolucao)
      return `OS ${numero} concluída${hasFoto ? ' com evidências fotográficas' : ''}.`
    }
    if (statusAfter === 'EM_EXECUCAO') return `OS ${numero} iniciada.`
    if (statusAfter === 'CANCELADA') return `OS ${numero} cancelada.`
    if (action === 'CREATE') return `OS ${numero} criada.`
  }
  return `Registro ${item.idRegistro} alterado`
}

const actionIcons: Record<string, typeof FileEdit> = {
  CREATE: Plus,
  UPDATE: FileEdit,
  DELETE: Trash2,
  VIEW: Eye,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  PERMISSION_CHANGE: Shield,
  EXPORT: Download,
  SETTINGS_CHANGE: Settings,
}

const actionLabels: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  VIEW: 'Visualização',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  PERMISSION_CHANGE: 'Permissão',
  EXPORT: 'Exportação',
  SETTINGS_CHANGE: 'Configuração',
}

const actionColors: Record<string, string> = {
  CREATE: 'border-emerald-500 text-emerald-500',
  UPDATE: 'border-cyan-500 text-cyan-500',
  DELETE: 'border-rose-500 text-rose-500',
  VIEW: 'border-slate-500 text-slate-500',
  LOGIN: 'border-blue-500 text-blue-500',
  LOGOUT: 'border-amber-500 text-amber-500',
  PERMISSION_CHANGE: 'border-purple-500 text-purple-500',
  EXPORT: 'border-indigo-500 text-indigo-500',
  SETTINGS_CHANGE: 'border-orange-500 text-orange-500',
}

const entityLabels: Record<string, string> = {
  ASSET: 'Ativo',
  ORDER: 'Ordem de Serviço',
  USER: 'Usuário',
  UNIT: 'Unidade',
  COMPANY: 'Empresa',
  PERMISSION: 'Permissão',
  SETTINGS: 'Configurações',
  REPORT: 'Relatório',
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

function defaultDateFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseDateRange(from: string, to: string): { from: Date; to: Date } {
  return {
    from: new Date(`${from}T00:00:00.000`),
    to: new Date(`${to}T23:59:59.999`),
  }
}

function buildAuditQueryParams(input: {
  from: Date
  to: Date
  page?: number
  limit?: number
  actionFilter: string
  entityFilter: string
  userFilter: string
  unidadeId?: string
}) {
  const query = new URLSearchParams({
    from: input.from.toISOString(),
    to: input.to.toISOString(),
  })
  if (input.page != null) query.set('page', String(input.page))
  if (input.limit != null) query.set('limit', String(input.limit))
  if (input.unidadeId) query.set('unidadeId', input.unidadeId)
  if (input.actionFilter !== 'all') query.set('acao', input.actionFilter)
  if (input.entityFilter !== 'all') {
    const apiEntity = mapEntityFilterToApi(input.entityFilter)
    if (apiEntity) query.set('entidade', apiEntity)
  }
  if (input.userFilter !== 'all') query.set('idUsuario', input.userFilter)
  return query
}

function getVisiblePages(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 1) return [1]
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }
  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('ellipsis')
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  if (end < total - 1) pages.push('ellipsis')
  pages.push(total)
  return pages
}

function mapEntityFilterToApi(value: string): string | null {
  if (value === 'ORDER') return 'OrdemServico'
  if (value === 'ASSET') return 'Ativo'
  if (value === 'USER') return 'Usuario'
  if (value === 'UNIT') return 'Unidade'
  if (value === 'COMPANY') return 'Empresa'
  return null
}

export default function AuditoriaPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [logs, setLogs] = useState<UiAuditLog[]>([])
  const [usersFilter, setUsersFilter] = useState<Array<{ id: string; nome: string }>>([])
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})
  const [userFilter, setUserFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [summary, setSummary] = useState<ApiAuditSummary | null>(null)
  const [todayTotal, setTodayTotal] = useState(0)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [filterByUnit, setFilterByUnit] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const { accessToken } = useAuth()
  const unit = useCurrentUnit()

  const dateRange = useMemo(
    () => parseDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  )

  const exportCsv = async () => {
    if (!accessToken) return
    const query = buildAuditQueryParams({
      from: dateRange.from,
      to: dateRange.to,
      actionFilter,
      entityFilter,
      userFilter,
      unidadeId: filterByUnit ? unit?.id : undefined,
    })
    query.set('limit', '2000')
    await downloadApiFile(
      `/auditoria/export?${query.toString()}`,
      `auditoria-${dateFrom}_${dateTo}.csv`,
      { accessToken },
    )
  }

  useEffect(() => {
    setPage(1)
  }, [unit?.id, dateFrom, dateTo, filterByUnit])

  useEffect(() => {
    if (!accessToken) return
    setIsPageLoading(true)
    const today = defaultDateTo()
    const todayRange = parseDateRange(today, today)
    const filterBase = {
      from: dateRange.from,
      to: dateRange.to,
      actionFilter,
      entityFilter,
      userFilter,
      unidadeId: filterByUnit ? unit?.id : undefined,
    }
    const listQuery = buildAuditQueryParams({
      ...filterBase,
      page,
      limit: pageSize,
    })
    const summaryQuery = buildAuditQueryParams(filterBase)
    const todaySummaryQuery = buildAuditQueryParams({
      from: todayRange.from,
      to: todayRange.to,
      actionFilter: 'all',
      entityFilter: 'all',
      userFilter: 'all',
      unidadeId: filterByUnit ? unit?.id : undefined,
    })

    void Promise.allSettled([
      apiRequest<ApiAuditResponse>(
        `/auditoria?${listQuery.toString()}`,
        { accessToken },
      ),
      apiRequest<ApiAuditSummary>(
        `/auditoria/resumo?${summaryQuery.toString()}`,
        { accessToken },
      ),
      apiRequest<ApiAuditSummary>(
        `/auditoria/resumo?${todaySummaryQuery.toString()}`,
        { accessToken },
      ),
      unit?.id
        ? apiRequest<ApiUsuario[]>(`/unidades/${unit.id}/usuarios`, { accessToken })
        : Promise.resolve([] as ApiUsuario[]),
    ])
      .then((results) => {
        const [auditResult, summaryResult, todaySummaryResult, usersResult] = results
        if (auditResult.status !== 'fulfilled') {
          throw auditResult.reason
        }
        if (summaryResult.status !== 'fulfilled') {
          throw summaryResult.reason
        }

        const auditRes = auditResult.value
        const summaryRes = summaryResult.value
        const todaySummaryRes =
          todaySummaryResult.status === 'fulfilled' ? todaySummaryResult.value : null
        const usersRes = usersResult.status === 'fulfilled' ? usersResult.value : []
        const userMap = new Map<string, string>()
        const mappedUsers: Array<{ id: string; nome: string }> = []
        for (const user of usersRes) {
          const userId = user.id ?? user.idUsuario
          if (userId) {
            userMap.set(userId, user.nome)
            mappedUsers.push({ id: userId, nome: user.nome })
          }
        }
        setUsersFilter(mappedUsers)
        setUsersMap(Object.fromEntries(mappedUsers.map((u) => [u.id, u.nome])))
        setSummary(summaryRes)
        setTodayTotal(todaySummaryRes?.total ?? 0)

        setLogs(
          auditRes.logs.map((item) => {
            const action = item.acao ?? resolveAction(item.valorAnterior ?? {}, item.valorNovo ?? {})
            return {
              id: item.idLog,
              userId: item.idUsuario || 'sistema',
              userName: item.idUsuario
                ? (item.usuarioNome ?? userMap.get(item.idUsuario) ?? 'Usuário')
                : 'Sistema',
              action,
              entityType:
                item.entidadeAfetada === 'OrdemServico'
                  ? 'ORDER'
                  : item.entidadeAfetada === 'Ativo'
                    ? 'ASSET'
                    : item.entidadeAfetada === 'AuthSession'
                      ? 'USER'
                      : item.entidadeAfetada === 'Auditoria'
                        ? 'REPORT'
                        : item.entidadeAfetada?.toUpperCase() || 'ORDER',
              description: buildDescription(item, action),
              createdAt: item.dataHora,
            }
          }),
        )
        setTotalPages(auditRes.totalPages)
        setTotalLogs(auditRes.total)
      })
      .then(() => setLoadError(null))
      .catch((error) => {
        setLogs([])
        setUsersMap({})
        setSummary(null)
        setTodayTotal(0)
        setTotalPages(1)
        setTotalLogs(0)
        setLoadError(error instanceof Error ? error.message : 'Falha ao carregar auditoria')
      })
      .finally(() => setIsPageLoading(false))
  }, [
    accessToken,
    unit?.id,
    page,
    pageSize,
    actionFilter,
    entityFilter,
    userFilter,
    dateRange,
    filterByUnit,
  ])

  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])
  const rangeStart = totalLogs === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, totalLogs)

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const openLogDetail = async (idLog: string) => {
    if (!accessToken) return
    try {
      const detail = await apiRequest<ApiAuditLog>(`/auditoria/${idLog}`, { accessToken })
      setSelectedLog(detail)
      setIsDetailOpen(true)
    } catch {
      // noop
    }
  }

  const uniqueUsers = summary?.usuarios?.length ?? new Set(logs.map((log) => log.userId)).size
  
  const actionCounts = useMemo(() => logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {} as Record<string, number>), [logs])
  const effectiveActionCounts = summary?.porAcao ?? actionCounts

  if (isPageLoading && logs.length === 0) {
    return <PageDataLoading variant="table" message="Carregando auditoria..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground">
            Histórico de ações e alterações no sistema
          </p>
        </div>
        <Button variant="outline" onClick={() => void exportCsv()}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ações Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTotal}</div>
            <p className="text-xs text-muted-foreground">registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">com atividade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alterações</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(effectiveActionCounts['CREATE'] || 0) + (effectiveActionCounts['UPDATE'] || 0)}
            </div>
            <p className="text-xs text-muted-foreground">criações e edições</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLogs}</div>
            <p className="text-xs text-muted-foreground">registros no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre os logs de auditoria por diferentes critérios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex flex-col gap-1.5 md:w-[180px]">
                <Label htmlFor="audit-date-from">Data inicial</Label>
                <Input
                  id="audit-date-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:w-[180px]">
                <Label htmlFor="audit-date-to">Data final</Label>
                <Input
                  id="audit-date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              {unit?.id ? (
                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    id="audit-filter-unit"
                    checked={filterByUnit}
                    onCheckedChange={(checked) => setFilterByUnit(checked === true)}
                  />
                  <Label htmlFor="audit-filter-unit" className="text-sm font-normal">
                    Somente unidade atual
                  </Label>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="CREATE">Criação</SelectItem>
                <SelectItem value="UPDATE">Atualização</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="EXPORT">Exportação</SelectItem>
                <SelectItem value="SETTINGS_CHANGE">Configuração</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={entityFilter}
              onValueChange={(value) => {
                setEntityFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                <SelectItem value="ASSET">Ativo</SelectItem>
                <SelectItem value="ORDER">Ordem de Serviço</SelectItem>
                <SelectItem value="USER">Usuário</SelectItem>
                <SelectItem value="UNIT">Unidade</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={userFilter}
              onValueChange={(value) => {
                setUserFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <User className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {usersFilter.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Por página" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} por página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      {summary?.usuarios?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Top Usuários (Período)</CardTitle>
            <CardDescription>Usuários com maior volume de ações auditadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              {summary.usuarios.slice(0, 6).map((usuario) => (
                <div key={usuario.idUsuario} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{usuario.nome}</p>
                  <p className="text-xs text-muted-foreground">{usuario.idUsuario}</p>
                  <p className="mt-1 text-sm">{usuario.total} ação(ões)</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
          <CardDescription>
            Exibindo {rangeStart}–{rangeEnd} de {totalLogs} registro(s)
            {searchTerm ? ` • ${filteredLogs.length} após busca local` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="mb-3 text-xs text-destructive">{loadError}</p>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>IP</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhum log encontrado para os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : filteredLogs.map((log) => {
                const ActionIcon = actionIcons[log.action] || FileEdit
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{log.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={actionColors[log.action]}>
                        <ActionIcon className="mr-1 h-3 w-3" />
                        {actionLabels[log.action]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {entityLabels[log.entityType] || log.entityType}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {log.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => void openLogDetail(log.id)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {totalPages > 1 ? (
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isPageLoading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Anterior
                    </Button>
                  </PaginationItem>
                  {visiblePages.map((pageNumber, index) =>
                    pageNumber === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === page}
                          onClick={(event) => {
                            event.preventDefault()
                            setPage(pageNumber)
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isPageLoading}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      Próxima
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhe do Log</DialogTitle>
          </DialogHeader>
          {selectedLog ? (
            <div className="space-y-4 text-sm">
              <p><strong>ID:</strong> {selectedLog.idLog}</p>
              <p>
                <strong>Usuário:</strong>{' '}
                {selectedLog.idUsuario
                  ? `${selectedLog.usuarioNome ?? usersMap[selectedLog.idUsuario] ?? 'Usuário'} (${selectedLog.idUsuario})`
                  : 'Sistema'}
              </p>
              <p><strong>Entidade:</strong> {selectedLog.entidadeAfetada}</p>
              <p><strong>Registro:</strong> {selectedLog.idRegistro}</p>
              <p><strong>Data:</strong> {new Date(selectedLog.dataHora).toLocaleString('pt-BR')}</p>
              <div>
                <p className="mb-1"><strong>Valor anterior</strong></p>
                <pre className="max-h-48 overflow-auto rounded border bg-muted p-2">{JSON.stringify(selectedLog.valorAnterior ?? {}, null, 2)}</pre>
              </div>
              <div>
                <p className="mb-1"><strong>Valor novo</strong></p>
                <pre className="max-h-48 overflow-auto rounded border bg-muted p-2">{JSON.stringify(selectedLog.valorNovo ?? {}, null, 2)}</pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
