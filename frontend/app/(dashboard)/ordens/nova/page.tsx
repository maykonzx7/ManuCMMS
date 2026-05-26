'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MAINTENANCE_TYPE_OPTIONS, 
  PRIORITY_OPTIONS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { usePermissions } from '@/hooks/use-permissions'
import { apiRequest } from '@/lib/api'
import { mapApiAtivoToAsset, mapApiUsuarioToUser, type ApiAtivo, type ApiUsuario } from '@/lib/backend-mappers'

const orderSchema = z.object({
  titulo: z.string().min(5, 'Título deve ter no mínimo 5 caracteres'),
  descricao: z.string().optional(),
  tipo: z.enum(['CORRETIVA', 'PREVENTIVA', 'PREDITIVA']),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']),
  ativoId: z.string().min(1, 'Selecione um ativo'),
  responsavelId: z.string().optional(),
})

type OrderFormData = z.infer<typeof orderSchema>
const NO_RESPONSAVEL_VALUE = '__NO_RESPONSAVEL__'

export default function NewOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [assets, setAssets] = useState<ReturnType<typeof mapApiAtivoToAsset>[]>([])
  const [users, setUsers] = useState<ReturnType<typeof mapApiUsuarioToUser>[]>([])
  const { accessToken, session } = useAuth()
  const { canCreateOrder } = usePermissions()
  const unit = useCurrentUnit()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      tipo: 'CORRETIVA',
      prioridade: 'MEDIA',
    },
  })

  useEffect(() => {
    if (!canCreateOrder) {
      toast.error('Você não tem permissão para criar ordem de serviço.')
      router.replace('/ordens')
      return
    }
  }, [canCreateOrder, router])

  useEffect(() => {
    if (!accessToken || !unit?.id || !session?.empresa?.id) return
    void Promise.all([
      apiRequest<ApiAtivo[]>(`/unidades/${unit.id}/ativos`, { accessToken }),
      apiRequest<ApiUsuario[]>(`/unidades/${unit.id}/usuarios`, { accessToken }),
    ])
      .then(([ativosRes, usersRes]) => {
        setAssets(ativosRes.map((item) => mapApiAtivoToAsset(item, unit.id)))
        setUsers(usersRes.map((item) => mapApiUsuarioToUser(item, session.empresa.id, unit.id)))
      })
      .catch(() => {
        setAssets([])
        setUsers([])
      })
  }, [accessToken, session?.empresa?.id, unit?.id])

  const tecnicos = users.filter((u) => u.perfil === 'TECNICO')

  const onSubmit = async (data: OrderFormData) => {
    if (!canCreateOrder) {
      toast.error('Você não tem permissão para criar ordem de serviço.')
      return
    }
    setIsLoading(true)
    try {
      if (!accessToken || !unit?.id) {
        throw new Error('Sessão inválida')
      }
      await apiRequest(`/unidades/${unit.id}/ordens-servico`, {
        method: 'POST',
        accessToken,
        body: {
          idAtivo: data.ativoId,
          idTecnico: data.responsavelId || undefined,
          tipo: data.tipo,
          prioridade: data.prioridade,
          descricao: data.descricao || data.titulo,
        },
      })
      
      toast.success('Ordem de serviço criada com sucesso!')
      router.push('/ordens')
    } catch (error) {
      toast.error('Erro ao criar ordem de serviço')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ordens">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Ordem de Serviço</h1>
          <p className="text-muted-foreground">
            Crie uma nova solicitação de manutenção
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Informações da OS */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da OS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Vazamento no sistema pneumático"
                  className={cn(errors.titulo && 'border-destructive')}
                  {...register('titulo')}
                  disabled={isLoading}
                />
                {errors.titulo && (
                  <p className="text-sm text-destructive">{errors.titulo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o problema ou serviço a ser realizado..."
                  rows={4}
                  {...register('descricao')}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de manutenção *</Label>
                  <Select
                    value={watch('tipo')}
                    onValueChange={(value) => setValue('tipo', value as OrderFormData['tipo'])}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade *</Label>
                  <Select
                    value={watch('prioridade')}
                    onValueChange={(value) => setValue('prioridade', value as OrderFormData['prioridade'])}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ativo e Responsável */}
          <Card>
            <CardHeader>
              <CardTitle>Ativo e Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ativoId">Ativo *</Label>
                <Select
                  value={watch('ativoId')}
                  onValueChange={(value) => setValue('ativoId', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={cn(errors.ativoId && 'border-destructive')}>
                    <SelectValue placeholder="Selecione o ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex flex-col">
                          <span>{asset.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            {asset.codigo} - {asset.localizacao}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ativoId && (
                  <p className="text-sm text-destructive">{errors.ativoId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavelId">Responsável (opcional)</Label>
                <Select
                  value={watch('responsavelId') || NO_RESPONSAVEL_VALUE}
                  onValueChange={(value) =>
                    setValue(
                      'responsavelId',
                      value === NO_RESPONSAVEL_VALUE ? undefined : value,
                    )
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Atribuir responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RESPONSAVEL_VALUE}>Não atribuir agora</SelectItem>
                    {tecnicos.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Você pode atribuir um responsável depois
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Ordem de Serviço'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/ordens">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
