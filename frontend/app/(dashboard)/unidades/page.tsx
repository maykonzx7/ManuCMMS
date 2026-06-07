'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Package,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth, useCurrentCompany } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiUnidadeToUnit, type ApiUnidade } from '@/lib/backend-mappers'
import { TenantHierarchyHelp } from '@/components/gestao/tenant-hierarchy-guide'
import { PageDataLoading } from '@/components/shared'

type UnidadeStatus = 'ATIVA' | 'INATIVA'

export default function UnitsPage() {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [units, setUnits] = useState<ReturnType<typeof mapApiUnidadeToUnit>[]>([])

  const [createNome, setCreateNome] = useState('')
  const [createLocalizacao, setCreateLocalizacao] = useState('')
  const [createStatus, setCreateStatus] = useState<UnidadeStatus>('ATIVA')

  const [editId, setEditId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editLocalizacao, setEditLocalizacao] = useState('')
  const [editStatus, setEditStatus] = useState<UnidadeStatus>('ATIVA')

  const { canManageUsers } = usePermissions()
  const { accessToken } = useAuth()
  const company = useCurrentCompany()

  const loadUnits = async () => {
    if (!accessToken || !company?.id) return
    setIsLoading(true)
    try {
      const res = await apiRequest<ApiUnidade[]>('/unidades', { accessToken })
      setUnits(res.map((item) => mapApiUnidadeToUnit(item, company.id)).filter((item) => Boolean(item.id)))
      setLoadError(null)
    } catch (error) {
      setUnits([])
      setLoadError(error instanceof Error ? error.message : 'Falha ao carregar unidades')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUnits()
  }, [accessToken, company?.id])

  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.nome.toLowerCase().includes(search.toLowerCase()) ||
      unit.codigo.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const totalStats = useMemo(
    () => ({
      unidades: filteredUnits.length,
      ativos: filteredUnits.reduce((acc, unit) => acc + (unit._count?.ativos || 0), 0),
      usuarios: filteredUnits.reduce((acc, unit) => acc + (unit._count?.usuarios || 0), 0),
    }),
    [filteredUnits],
  )

  const onCreate = async () => {
    if (!accessToken) return
    if (!createNome.trim() || !createLocalizacao.trim()) {
      toast.error('Informe nome e localização da unidade')
      return
    }
    try {
      await apiRequest('/unidades', {
        method: 'POST',
        accessToken,
        body: {
          nome: createNome.trim(),
          localizacao: createLocalizacao.trim(),
          status: createStatus,
        },
      })
      toast.success('Unidade criada com sucesso')
      setCreateNome('')
      setCreateLocalizacao('')
      setCreateStatus('ATIVA')
      setIsCreateOpen(false)
      await loadUnits()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar unidade')
    }
  }

  const openEdit = (unit: ReturnType<typeof mapApiUnidadeToUnit>) => {
    setEditId(unit.id)
    setEditNome(unit.nome)
    setEditLocalizacao(unit.endereco || '')
    setEditStatus(unit.ativo ? 'ATIVA' : 'INATIVA')
    setIsEditOpen(true)
  }

  const onEdit = async () => {
    if (!accessToken || !editId) return
    if (!editNome.trim() || !editLocalizacao.trim()) {
      toast.error('Informe nome e localização da unidade')
      return
    }
    try {
      await apiRequest(`/unidades/${editId}`, {
        method: 'PATCH',
        accessToken,
        body: {
          nome: editNome.trim(),
          localizacao: editLocalizacao.trim(),
          status: editStatus,
        },
      })
      toast.success('Unidade atualizada com sucesso')
      setIsEditOpen(false)
      await loadUnits()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar unidade')
    }
  }

  const onDelete = async (unitId: string) => {
    if (!accessToken) return
    const confirm = window.confirm('Deseja realmente excluir esta unidade?')
    if (!confirm) return
    try {
      await apiRequest(`/unidades/${unitId}`, {
        method: 'DELETE',
        accessToken,
      })
      toast.success('Unidade removida com sucesso')
      await loadUnits()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover unidade')
    }
  }

  if (isLoading && units.length === 0) {
    return <PageDataLoading variant="table" message="Carregando unidades..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            Unidades
            <TenantHierarchyHelp variant="empresa" empresaNome={company?.nome} />
          </h1>
          <p className="text-muted-foreground">Gerencie as unidades operacionais da empresa</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadUnits()} disabled={isLoading || !accessToken}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>

          {canManageUsers && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Unidade</DialogTitle>
                  <DialogDescription>Crie uma nova unidade operacional com persistência real</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={createNome} onChange={(e) => setCreateNome(e.target.value)} placeholder="Ex: Planta Principal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Localização</Label>
                    <Input value={createLocalizacao} onChange={(e) => setCreateLocalizacao(e.target.value)} placeholder="Ex: Recife - PE" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={createStatus} onValueChange={(v) => setCreateStatus(v as UnidadeStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ATIVA">Ativa</SelectItem>
                        <SelectItem value="INATIVA">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={() => void onCreate()}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
            <DialogDescription>Atualize os dados da unidade</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input value={editLocalizacao} onChange={(e) => setEditLocalizacao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as UnidadeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVA">Ativa</SelectItem>
                  <SelectItem value="INATIVA">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={() => void onEdit()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.unidades}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.ativos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.usuarios}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar unidades..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loadError ? <p className="text-xs text-destructive">{loadError}</p> : null}

      {filteredUnits.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
          title="Nenhuma unidade encontrada"
          description={search ? 'Tente ajustar a busca' : 'Comece criando sua primeira unidade'}
          action={canManageUsers ? { label: 'Criar unidade', onClick: () => setIsCreateOpen(true) } : undefined}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => (
            <Card key={`${unit.id}-${unit.codigo}-${unit.nome}`} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{unit.nome}</CardTitle>
                      <CardDescription className="font-mono text-xs">{unit.codigo}</CardDescription>
                    </div>
                  </div>

                  {canManageUsers && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(unit)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => void onDelete(unit.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {unit.endereco ? (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{unit.endereco}</span>
                  </div>
                ) : null}

                <div className="flex items-center gap-4 border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold">{unit._count?.ativos || 0}</span>
                      <span className="text-muted-foreground"> ativos</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold">{unit._count?.usuarios || 0}</span>
                      <span className="text-muted-foreground"> usuários</span>
                    </span>
                  </div>
                </div>

                <Badge variant={unit.ativo ? 'default' : 'secondary'} className="w-fit">
                  {unit.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
