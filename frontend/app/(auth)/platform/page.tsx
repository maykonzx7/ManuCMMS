'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  Loader2,
  Building2,
  Mail,
  User,
  Globe,
  Users,
  Factory,
  ClipboardList,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

const platformSchema = z.object({
  empresaNome: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres'),
  empresaSlug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  adminNome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  adminEmail: z.string().email('Email inválido'),
})

type PlatformFormData = z.infer<typeof platformSchema>

type PlatformPainel = {
  resumo: {
    empresasTotal: number
    empresasAtivas: number
    usuariosTotal: number
    usuariosAtivos: number
    convitesPendentes: number
    ordensAbertas: number
  }
}

type PlatformCliente = {
  id: string
  nomeEmpresa: string
  slug: string
  status: string
  usuariosAtivos: number
  unidadesAtivas: number
  ordensAbertas: number
}

export default function PlatformPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [painel, setPainel] = useState<PlatformPainel | null>(null)
  const [clientes, setClientes] = useState<PlatformCliente[]>([])
  const { accessToken, isPlatformOperator } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PlatformFormData>({
    resolver: zodResolver(platformSchema),
  })

  const empresaNome = watch('empresaNome')

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const load = async () => {
    if (!accessToken || !isPlatformOperator) return
    setIsLoading(true)
    try {
      const [painelRes, clientesRes] = await Promise.all([
        apiRequest<PlatformPainel>('/platform/painel', { accessToken }),
        apiRequest<PlatformCliente[]>('/platform/clientes', { accessToken }),
      ])
      setPainel(painelRes)
      setClientes(clientesRes)
    } catch (error) {
      setPainel(null)
      setClientes([])
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar painel')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [accessToken, isPlatformOperator])

  const onSubmit = async (data: PlatformFormData) => {
    setIsSubmitting(true)
    try {
      if (!accessToken) throw new Error('Sessão inválida')
      await apiRequest('/empresas', {
        method: 'POST',
        accessToken,
        body: {
          nomeEmpresa: data.empresaNome,
          slug: data.empresaSlug,
          emailResponsavel: data.adminEmail,
          nomeResponsavel: data.adminNome,
          nomeUnidadeInicial: 'Matriz',
          localizacaoUnidadeInicial: 'Sede',
        },
      })

      toast.success('Empresa criada com sucesso')
      reset()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar empresa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = useMemo(
    () => [
      { label: 'Empresas', value: painel?.resumo.empresasTotal ?? '-', icon: Building2 },
      { label: 'Usuários Ativos', value: painel?.resumo.usuariosAtivos ?? '-', icon: Users },
      { label: 'Convites Pendentes', value: painel?.resumo.convitesPendentes ?? '-', icon: Mail },
      { label: 'OS Abertas', value: painel?.resumo.ordensAbertas ?? '-', icon: ClipboardList },
    ],
    [painel],
  )

  if (!isPlatformOperator) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Acesso restrito</h2>
          <p className="text-muted-foreground">Este painel está disponível apenas para operador da plataforma.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Painel Administrativo da Plataforma</h2>
          <p className="text-muted-foreground">Gestão global de clientes e onboarding de novas empresas</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Nova Empresa</CardTitle>
            <CardDescription>Criação de tenant com administrador inicial</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empresaNome">Nome da empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="empresaNome" className={cn('pl-10', errors.empresaNome && 'border-destructive')} {...register('empresaNome')} disabled={isSubmitting} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresaSlug">Slug</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="empresaSlug" placeholder={empresaNome ? generateSlug(empresaNome) : 'minha-empresa'} className={cn('pl-10', errors.empresaSlug && 'border-destructive')} {...register('empresaSlug')} disabled={isSubmitting} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNome">Nome do administrador</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="adminNome" className={cn('pl-10', errors.adminNome && 'border-destructive')} {...register('adminNome')} disabled={isSubmitting} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email do administrador</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="adminEmail" type="email" className={cn('pl-10', errors.adminEmail && 'border-destructive')} {...register('adminEmail')} disabled={isSubmitting} />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>
                ) : (
                  'Criar empresa'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Clientes da Plataforma</CardTitle>
            <CardDescription>Empresas ativas e indicadores operacionais</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usuários</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>OS abertas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.slice(0, 25).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.nomeEmpresa}</div>
                          <div className="text-xs text-muted-foreground">{item.slug}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.status}</Badge>
                        </TableCell>
                        <TableCell>{item.usuariosAtivos}</TableCell>
                        <TableCell>{item.unidadesAtivas}</TableCell>
                        <TableCell>{item.ordensAbertas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4 text-xs text-muted-foreground">
          Conta super habilitada para painel administrativo via fallback de operador na API.
        </CardContent>
      </Card>
    </div>
  )
}
