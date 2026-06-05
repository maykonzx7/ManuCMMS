'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  Users as UsersIcon,
  MoreHorizontal,
  Mail,
  Shield,
  Trash2,
  KeyRound,
  RefreshCcw,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageDataLoading } from '@/components/shared'
import { USER_ROLE_LABELS, USER_ROLE_OPTIONS } from '@/lib/constants'
import { usePermissions } from '@/hooks/use-permissions'
import type { UserRole } from '@/types'
import { useAuth, useCurrentCompany, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiUsuarioToUser, type ApiUsuario } from '@/lib/backend-mappers'
import {
  ConvitesPanel,
  InviteLinkDialog,
  type ConviteActionResponse,
  type ConviteEmailStatus,
} from '@/components/convites/convites-panel'

type GestaoPainelResponse = {
  usuarios: Array<{
    id: string
    idUnidade: string
    unidadeNome: string
  }>
  cargos: Array<{
    id: string
    codigo: string
    nome: string
  }>
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [users, setUsers] = useState<ReturnType<typeof mapApiUsuarioToUser>[]>([])
  const [cargoCodigo, setCargoCodigo] = useState('')
  const [inviteNome, setInviteNome] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false)
  const [cargos, setCargos] = useState<Array<{ id: string; codigo: string; nome: string }>>([])
  const [unidadesConvite, setUnidadesConvite] = useState<Array<{ id: string; nome: string }>>([])
  const [idUnidadeDestino, setIdUnidadeDestino] = useState('__CURRENT__')
  const [usersError, setUsersError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [convitesRefreshKey, setConvitesRefreshKey] = useState(0)
  const [inviteLinkDialog, setInviteLinkDialog] = useState<{
    emailDestino: string
    link: string
    emailStatus?: ConviteEmailStatus
  } | null>(null)

  const { canManageUsers, isAdmin } = usePermissions()
  const { accessToken } = useAuth()
  const company = useCurrentCompany()
  const unit = useCurrentUnit()

  const loadUsers = async () => {
    if (!accessToken || !unit?.id || !company?.id) return
    setIsPageLoading(true)
    try {
      const res = await apiRequest<ApiUsuario[]>(`/unidades/${unit.id}/usuarios`, { accessToken })
      setUsers(res.map((item) => mapApiUsuarioToUser(item, company.id, unit.id)))
      setUsersError(null)
    } catch (error) {
      setUsers([])
      setUsersError(error instanceof Error ? error.message : 'Falha ao carregar usuários')
    } finally {
      setIsPageLoading(false)
    }
  }

  const patchUsuario = async (userId: string, path: string, body: Record<string, unknown>) => {
    if (!accessToken || !company?.id) return
    await apiRequest(`/empresas/${company.id}/gestao/usuarios/${userId}/${path}`, {
      method: 'PATCH',
      accessToken,
      body,
    })
    await loadUsers()
  }

  const loadPainelGestao = async () => {
    if (!accessToken || !company?.id) return
    try {
      const painel = await apiRequest<GestaoPainelResponse>(`/empresas/${company.id}/gestao/painel`, { accessToken })
      setCargos(painel.cargos)
      const byUnit = new Map<string, string>()
      painel.usuarios.forEach((item) => {
        if (!byUnit.has(item.idUnidade)) byUnit.set(item.idUnidade, item.unidadeNome)
      })
      setUnidadesConvite(Array.from(byUnit.entries()).map(([id, nome]) => ({ id, nome })))
      if (painel.cargos.length > 0) setCargoCodigo(painel.cargos[0].codigo)
    } catch {
      setCargos([])
      setUnidadesConvite([])
      setCargoCodigo('')
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [accessToken, company?.id, unit?.id])

  useEffect(() => {
    if (!canManageUsers) return
    void loadPainelGestao()
  }, [accessToken, company?.id, canManageUsers])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nome.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.perfil === roleFilter
    return matchesSearch && matchesRole
  })

  const stats = useMemo(
    () => ({
      total: users.length,
      ativos: users.filter((u) => u.ativo).length,
      admins: users.filter((u) => u.perfil === 'ADMIN').length,
      tecnicos: users.filter((u) => u.perfil === 'TECNICO').length,
    }),
    [users],
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      GESTOR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      SUPERVISOR: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      TECNICO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      AUDITOR: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return colors[role]
  }

  const onInvite = async () => {
    if (!accessToken || !company?.id) return
    if (!inviteEmail.trim() || !cargoCodigo) {
      toast.error('Informe email e cargo para enviar o convite')
      return
    }

    setIsSubmittingInvite(true)
    try {
      const response = await apiRequest<ConviteActionResponse>(`/empresas/${company.id}/convites`, {
        method: 'POST',
        accessToken,
        body: {
          emailDestino: inviteEmail.trim().toLowerCase(),
          nomeDestino: inviteNome.trim() || undefined,
          cargoCodigo,
          idUnidadeDestino: idUnidadeDestino === '__CURRENT__' ? unit?.id ?? null : idUnidadeDestino,
        },
      })
      toast.success(
        response.entregaEmail?.status === 'ENVIADO'
          ? 'Convite enviado por e-mail'
          : 'Convite registrado — confira o link abaixo',
      )
      if (response.links?.convite) {
        setInviteLinkDialog({
          emailDestino: inviteEmail.trim().toLowerCase(),
          link: response.links.convite,
          emailStatus: response.entregaEmail?.status,
        })
      }
      setInviteEmail('')
      setInviteNome('')
      setIdUnidadeDestino('__CURRENT__')
      setIsInviteOpen(false)
      setConvitesRefreshKey((value) => value + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar convite')
    } finally {
      setIsSubmittingInvite(false)
    }
  }

  if (isPageLoading) {
    return <PageDataLoading variant="table" message="Carregando usuários..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários da sua empresa</p>
        </div>
        {canManageUsers && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Usuário</DialogTitle>
                <DialogDescription>
                  O convite é criado na hora. Se o e-mail não estiver configurado no servidor, copie o link gerado e envie manualmente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Nome</Label>
                  <Input id="invite-name" placeholder="Nome do usuário" value={inviteNome} onChange={(e) => setInviteNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" placeholder="email@empresa.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Cargo</Label>
                  <Select value={cargoCodigo} onValueChange={setCargoCodigo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargos.map((cargo) => (
                        <SelectItem key={cargo.id} value={cargo.codigo}>{cargo.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-unit">Unidade destino</Label>
                  <Select value={idUnidadeDestino} onValueChange={setIdUnidadeDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__CURRENT__">Unidade atual</SelectItem>
                      {unidadesConvite.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
                <Button onClick={() => void onInvite()} disabled={isSubmittingInvite || !cargoCodigo}>
                  {isSubmittingInvite ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {canManageUsers && company?.id && accessToken ? (
        <ConvitesPanel
          empresaId={company.id}
          accessToken={accessToken}
          refreshKey={convitesRefreshKey}
        />
      ) : null}

      <InviteLinkDialog
        open={Boolean(inviteLinkDialog)}
        onOpenChange={(open) => !open && setInviteLinkDialog(null)}
        emailDestino={inviteLinkDialog?.emailDestino ?? ''}
        link={inviteLinkDialog?.link ?? ''}
        emailStatus={inviteLinkDialog?.emailStatus}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><UsersIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ativos</CardTitle><div className="h-2 w-2 rounded-full bg-emerald-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.ativos}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Administradores</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.admins}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Técnicos</CardTitle><div className="h-2 w-2 rounded-full bg-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.tecnicos}</div></CardContent></Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}>
          <SelectTrigger className="w-full sm:w-48"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Filtrar perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            {USER_ROLE_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-8 w-8 text-muted-foreground" />}
          title="Nenhum usuário encontrado"
          description={search || roleFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Comece convidando seu primeiro usuário'}
          action={canManageUsers ? { label: 'Convidar usuário', onClick: () => setIsInviteOpen(true) } : undefined}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback>{getInitials(user.nome)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium">{user.nome}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{user.email}</TableCell>
                  <TableCell><Badge variant="outline" className={getRoleBadgeColor(user.perfil)}>{USER_ROLE_LABELS[user.perfil]}</Badge></TableCell>
                  <TableCell><Badge variant={user.ativo ? 'default' : 'secondary'}>{user.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Mail className="mr-2 h-4 w-4" />Enviar email</DropdownMenuItem>
                        {canManageUsers && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                const proximo = prompt('Novo perfil (TECNICO, SUPERVISOR, GESTOR, AUDITOR, ADMIN):', user.perfil)
                                if (!proximo) return
                                void patchUsuario(user.id, 'perfil', { perfil: proximo.toUpperCase() })
                                  .then(() => toast.success('Perfil atualizado'))
                                  .catch((e) => toast.error(e instanceof Error ? e.message : 'Falha ao atualizar perfil'))
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />Alterar perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const usuarioAcesso = prompt('Usuário de acesso (credencial):')
                                if (!usuarioAcesso) return
                                void patchUsuario(user.id, 'usuario-acesso', { usuarioAcesso })
                                  .then(() => toast.success('Usuário de acesso atualizado'))
                                  .catch((e) => toast.error(e instanceof Error ? e.message : 'Falha ao atualizar usuário de acesso'))
                              }}
                            >
                              <UserCog className="mr-2 h-4 w-4" />Editar usuário de acesso
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const email = prompt('Novo email do usuário:', user.email)
                                if (!email) return
                                void patchUsuario(user.id, 'email', { email })
                                  .then(() => toast.success('Email atualizado'))
                                  .catch((e) => toast.error(e instanceof Error ? e.message : 'Falha ao atualizar email'))
                              }}
                            >
                              <Mail className="mr-2 h-4 w-4" />Alterar email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const novoStatus = user.ativo ? 'INATIVO' : 'ATIVO'
                                void patchUsuario(user.id, 'status', { status: novoStatus })
                                  .then(() => toast.success(`Usuário ${novoStatus === 'ATIVO' ? 'ativado' : 'inativado'}`))
                                  .catch((e) => toast.error(e instanceof Error ? e.message : 'Falha ao atualizar status'))
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />{user.ativo ? 'Inativar usuário' : 'Ativar usuário'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (!company?.id || !accessToken) return
                                void apiRequest(`/empresas/${company.id}/gestao/usuarios/${user.id}/reset-senha`, {
                                  method: 'POST',
                                  accessToken,
                                })
                                  .then(() => toast.success('Reset de senha enviado'))
                                  .catch((e) => toast.error(e instanceof Error ? e.message : 'Falha no reset de senha'))
                              }}
                            >
                              <RefreshCcw className="mr-2 h-4 w-4" />Resetar senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Remover acesso</DropdownMenuItem>
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

      {!isAdmin && canManageUsers && cargos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Não foi possível carregar cargos de gestão; convites podem estar indisponíveis por permissão insuficiente.
        </p>
      ) : null}

      {usersError ? (
        <p className="text-xs text-destructive">
          Falha ao carregar usuários/técnicos: {usersError}
        </p>
      ) : null}
    </div>
  )
}
