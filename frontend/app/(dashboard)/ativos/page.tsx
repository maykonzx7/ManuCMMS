'use client'

import { useState } from 'react'
import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Filter,
  MapPin,
  Package,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
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
  ASSET_STATUS_LABELS, 
  ASSET_STATUS_COLORS,
  ASSET_STATUS_OPTIONS,
} from '@/lib/constants'
import { usePermissions } from '@/hooks/use-permissions'
import { cn } from '@/lib/utils'
import type { AssetStatus } from '@/types'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest, isApiCacheWarm } from '@/lib/api'
import { mapApiAtivoToAsset, type ApiAtivo } from '@/lib/backend-mappers'
import { resolveMediaUrl } from '@/lib/media-url'
import { ROUTES } from '@/lib/routes'
import { toast } from 'sonner'

export default function AssetsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all')
  const [assets, setAssets] = useState<ReturnType<typeof mapApiAtivoToAsset>[]>([])
  const [assetsError, setAssetsError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const { canManageAssets } = usePermissions()
  const { accessToken } = useAuth()
  const currentUnit = useCurrentUnit()

  const loadAssets = async () => {
    if (!accessToken || !currentUnit?.id) return
    const path = `/unidades/${currentUnit.id}/ativos`
    if (!isApiCacheWarm(path, accessToken)) setIsPageLoading(true)
    try {
      const res = await apiRequest<ApiAtivo[]>(path, { accessToken })
      setAssets(res.map((item) => mapApiAtivoToAsset(item, currentUnit.id)))
      setAssetsError(null)
    } catch (error) {
      setAssets([])
      setAssetsError(error instanceof Error ? error.message : 'Falha ao carregar ativos')
    } finally {
      setIsPageLoading(false)
    }
  }

  useEffect(() => {
    void loadAssets()
  }, [accessToken, currentUnit?.id])

  const onDelete = async (assetId: string) => {
    if (!accessToken || !currentUnit?.id) return
    try {
      await apiRequest(`/unidades/${currentUnit.id}/ativos/${assetId}`, {
        method: 'DELETE',
        accessToken,
      })
      toast.success('Ativo excluído com sucesso')
      await loadAssets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao excluir ativo')
    }
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.nome.toLowerCase().includes(search.toLowerCase()) ||
      asset.codigo.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = useMemo(
    () => ({
      total: assets.length,
      ativos: assets.filter((a) => a.status === 'ATIVO').length,
      emManutencao: assets.filter((a) => a.status === 'EM_MANUTENCAO').length,
      inativos: assets.filter((a) => a.status === 'INATIVO' || a.status === 'DESATIVADO').length,
    }),
    [assets],
  )

  if (isPageLoading) {
    return <PageDataLoading variant="table" message="Carregando ativos..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ativos</h1>
          <p className="text-muted-foreground">
            Gerencie os equipamentos e máquinas da sua unidade
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/ativos/mapa">
              <MapPin className="mr-2 h-4 w-4" />
              Mapa
            </Link>
          </Button>
          {canManageAssets && (
            <Button asChild>
              <Link href="/ativos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Ativo
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ativos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emManutencao}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <div className="h-2 w-2 rounded-full bg-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inativos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as AssetStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {ASSET_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-muted-foreground" />}
          title="Nenhum ativo encontrado"
          description={search || statusFilter !== 'all' 
            ? "Tente ajustar os filtros de busca" 
            : "Comece cadastrando seu primeiro ativo"}
          action={canManageAssets ? {
            label: "Cadastrar ativo",
            onClick: () => router.push(ROUTES.novoAtivo),
          } : undefined}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Localização</TableHead>
                <TableHead className="hidden lg:table-cell">Fabricante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">OS</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                      {asset.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(asset.fotoUrl)}
                          alt={asset.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {asset.codigo}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{asset.nome}</p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {asset.localizacao}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {asset.localizacao || '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {asset.fabricante || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', ASSET_STATUS_COLORS[asset.status])}
                    >
                      {ASSET_STATUS_LABELS[asset.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {asset._count?.ordensServico || 0}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/ativos/${asset.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        {canManageAssets && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/ativos/${asset.id}/editar`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => void onDelete(asset.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {assetsError ? (
        <p className="text-xs text-destructive">
          Falha ao carregar ativos da base: {assetsError}
        </p>
      ) : null}
    </div>
  )
}
