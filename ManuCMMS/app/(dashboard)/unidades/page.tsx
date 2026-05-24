'use client'

import { useState } from 'react'
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
} from 'lucide-react'
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
import { EmptyState } from '@/components/shared'
import { mockUnits } from '@/lib/mock-data'
import { usePermissions } from '@/hooks/use-permissions'

export default function UnitsPage() {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { canManageUsers } = usePermissions()

  const filteredUnits = mockUnits.filter((unit) => {
    const matchesSearch = 
      unit.nome.toLowerCase().includes(search.toLowerCase()) ||
      unit.codigo.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const totalStats = filteredUnits.reduce(
    (acc, unit) => ({
      ativos: acc.ativos + (unit._count?.ativos || 0),
      usuarios: acc.usuarios + (unit._count?.usuarios || 0),
      ordensServico: acc.ordensServico + (unit._count?.ordensServico || 0),
    }),
    { ativos: 0, usuarios: 0, ordensServico: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">
            Gerencie as unidades operacionais da empresa
          </p>
        </div>
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
                <DialogDescription>
                  Crie uma nova unidade operacional
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="unit-name">Nome da unidade</Label>
                  <Input id="unit-name" placeholder="Ex: Planta Principal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-code">Código</Label>
                  <Input id="unit-code" placeholder="Ex: PP-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-address">Endereço</Label>
                  <Input id="unit-address" placeholder="Rua, número" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unit-city">Cidade</Label>
                    <Input id="unit-city" placeholder="Cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit-state">Estado</Label>
                    <Input id="unit-state" placeholder="UF" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsCreateOpen(false)}>
                  Criar Unidade
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredUnits.length}</div>
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar unidades..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Units Grid */}
      {filteredUnits.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
          title="Nenhuma unidade encontrada"
          description={search 
            ? "Tente ajustar a busca" 
            : "Comece criando sua primeira unidade"}
          action={canManageUsers ? {
            label: "Criar unidade",
            onClick: () => setIsCreateOpen(true),
          } : undefined}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => (
            <Card key={unit.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{unit.nome}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {unit.codigo}
                      </CardDescription>
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
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(unit.endereco || unit.cidade) && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {unit.endereco}
                      {unit.cidade && `, ${unit.cidade}`}
                      {unit.estado && ` - ${unit.estado}`}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-4 pt-2 border-t">
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
