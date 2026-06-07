'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  ClipboardList,
  ExternalLink,
  Factory,
  Globe,
  Mail,
  Search,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageDataLoading } from '@/components/shared'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ROUTES } from '@/lib/routes'
import { toast } from 'sonner'

type PlatformPainel = {
  resumo: {
    empresasTotal: number
    empresasAtivas: number
    usuariosTotal: number
    usuariosAtivos: number
    unidadesTotal: number
    unidadesAtivas: number
    convitesPendentes: number
    ordensAbertas: number
  }
  clientesTop: Array<{
    empresaId: string
    nomeEmpresa: string
    slug: string
    usuariosAtivos: number
  }>
}

type PlatformCliente = {
  id: string
  nomeEmpresa: string
  slug: string
  status: string
  createdAt: string
  usuariosAtivos: number
  unidadesAtivas: number
  ordensAbertas: number
  linkAcesso?: string | null
}

type PlatformUnidade = {
  id: string
  nome: string
  localizacao: string
  status: string
  cidade: string | null
  estado: string | null
  empresaId: string
  empresaNome: string
  empresaSlug: string
  usuariosAtivos: number
  ativosTotal: number
  linkAcesso?: string | null
}

type PlatformUsuario = {
  id: string
  nome: string
  email: string
  perfil: string
  status: string
  empresaNome: string
  empresaSlug: string
}

function resolveClientAccessLink(slug: string, backendLink?: string | null): string {
  if (backendLink) return backendLink
  return ROUTES.acessoEmpresa(slug)
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function PlatformPage() {
  const router = useRouter()
  const { accessToken, isPlatformOperator } = useAuth()
  const [painel, setPainel] = useState<PlatformPainel | null>(null)
  const [clientes, setClientes] = useState<PlatformCliente[]>([])
  const [unidades, setUnidades] = useState<PlatformUnidade[]>([])
  const [usuarios, setUsuarios] = useState<PlatformUsuario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [unidadeSearch, setUnidadeSearch] = useState('')
  const [usuarioSearch, setUsuarioSearch] = useState('')

  const carregarDados = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [painelData, clientesData, unidadesData, usuariosData] = await Promise.all([
        apiRequest<PlatformPainel>('/platform/painel', { accessToken }),
        apiRequest<PlatformCliente[]>('/platform/clientes', { accessToken }),
        apiRequest<PlatformUnidade[]>('/platform/unidades', { accessToken }),
        apiRequest<PlatformUsuario[]>('/platform/usuarios?limit=100', { accessToken }),
      ])
      setPainel(painelData)
      setClientes(clientesData)
      setUnidades(unidadesData)
      setUsuarios(usuariosData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar painel da plataforma'
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    if (!isPlatformOperator) {
      router.replace(ROUTES.home)
      return
    }
    void carregarDados()
  }, [accessToken, isPlatformOperator, carregarDados, router])

  const buscarUsuarios = useCallback(async () => {
    if (!accessToken) return
    try {
      const params = new URLSearchParams({ limit: '100' })
      const term = usuarioSearch.trim()
      if (term) params.set('q', term)
      const data = await apiRequest<PlatformUsuario[]>(`/platform/usuarios?${params.toString()}`, {
        accessToken,
      })
      setUsuarios(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao buscar usuários')
    }
  }, [accessToken, usuarioSearch])

  const clientesFiltrados = useMemo(() => {
    const term = clienteSearch.trim().toLowerCase()
    if (!term) return clientes
    return clientes.filter(
      (item) =>
        item.nomeEmpresa.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term),
    )
  }, [clientes, clienteSearch])

  const unidadesFiltradas = useMemo(() => {
    const term = unidadeSearch.trim().toLowerCase()
    if (!term) return unidades
    return unidades.filter(
      (item) =>
        item.nome.toLowerCase().includes(term) ||
        item.localizacao.toLowerCase().includes(term) ||
        item.empresaNome.toLowerCase().includes(term) ||
        item.empresaSlug.toLowerCase().includes(term),
    )
  }, [unidades, unidadeSearch])

  if (!isPlatformOperator) {
    return <PageDataLoading variant="dashboard" message="Verificando acesso à plataforma..." />
  }

  if (isLoading && !painel) {
    return <PageDataLoading variant="dashboard" message="Carregando painel da plataforma..." />
  }

  const resumo = painel?.resumo

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Globe className="h-8 w-8" />
            Painel da Plataforma
          </h1>
          <p className="text-muted-foreground">
            Visão global de clientes, usuários e unidades do ManuCMMS.
          </p>
        </div>
        <Button variant="outline" onClick={() => void carregarDados()} disabled={isLoading}>
          Atualizar
        </Button>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.empresasTotal ?? 0}</div>
            <p className="text-xs text-muted-foreground">{resumo?.empresasAtivas ?? 0} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.usuariosTotal ?? 0}</div>
            <p className="text-xs text-muted-foreground">{resumo?.usuariosAtivos ?? 0} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.unidadesTotal ?? 0}</div>
            <p className="text-xs text-muted-foreground">{resumo?.unidadesAtivas ?? 0} ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OS abertas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.ordensAbertas ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {resumo?.convitesPendentes ?? 0} convites pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clientes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clientes">Clientes ({clientes.length})</TabsTrigger>
          <TabsTrigger value="unidades">Unidades ({unidades.length})</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários ({usuarios.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes por nome ou slug..."
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Base de clientes</CardTitle>
              <CardDescription>
                Acesse o workspace de cada cliente pelo link de direcionamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientesFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{cliente.nomeEmpresa}</p>
                        <Badge variant="outline">{cliente.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cliente.slug} • criado em {formatDate(cliente.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cliente.usuariosAtivos} usuários • {cliente.unidadesAtivas} unidades •{' '}
                        {cliente.ordensAbertas} OS abertas
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href={resolveClientAccessLink(cliente.slug, cliente.linkAcesso)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Acessar cliente
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unidades" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar unidades por nome, local ou cliente..."
              value={unidadeSearch}
              onChange={(e) => setUnidadeSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Unidades do sistema</CardTitle>
              <CardDescription>
                Todas as bases operacionais cadastradas, agrupadas por cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unidadesFiltradas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>
              ) : (
                unidadesFiltradas.map((unidade) => (
                  <div key={unidade.id} className="rounded-md border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{unidade.nome}</p>
                          <Badge variant="outline">{unidade.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{unidade.localizacao}</p>
                        <p className="text-xs text-muted-foreground">
                          Cliente: {unidade.empresaNome} ({unidade.empresaSlug})
                          {unidade.cidade || unidade.estado
                            ? ` • ${[unidade.cidade, unidade.estado].filter(Boolean).join('/')}`
                            : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {unidade.usuariosAtivos} usuários • {unidade.ativosTotal} ativos
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={resolveClientAccessLink(unidade.empresaSlug, unidade.linkAcesso)}>
                          Ir para cliente
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou cliente..."
                value={usuarioSearch}
                onChange={(e) => setUsuarioSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void buscarUsuarios()}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => void buscarUsuarios()}>
              Buscar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usuários cadastrados</CardTitle>
              <CardDescription>
                Visão consolidada de todos os colaboradores por cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {usuarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
              ) : (
                usuarios.map((usuario) => (
                  <div
                    key={`${usuario.id}-${usuario.empresaSlug}`}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{usuario.nome}</p>
                        <Badge variant="secondary">{usuario.perfil}</Badge>
                        <Badge variant="outline">{usuario.status}</Badge>
                      </div>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {usuario.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {usuario.empresaNome} ({usuario.empresaSlug})
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={ROUTES.acessoEmpresa(usuario.empresaSlug)}>Ver cliente</Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
