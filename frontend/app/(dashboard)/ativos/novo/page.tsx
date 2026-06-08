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
import { ASSET_STATUS_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { usePermissions } from '@/hooks/use-permissions'
import { AssetLocationFormSection } from '@/components/ativos/asset-location-form-section'
import type { AssetMapCoords } from '@/components/ativos/asset-location-picker'

const assetSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  codigo: z.string().min(2, 'Código deve ter no mínimo 2 caracteres'),
  descricao: z.string().optional(),
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  dataAquisicao: z.string().optional(),
  custoHoraParada: z.coerce.number().min(0, 'Custo/hora deve ser >= 0').optional(),
  custoManutencaoMensal: z.coerce.number().min(0, 'Custo mensal deve ser >= 0').optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'EM_MANUTENCAO', 'DESATIVADO']),
})

type AssetFormData = z.infer<typeof assetSchema>

export default function NewAssetPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [localizacao, setLocalizacao] = useState('')
  const [mapCoords, setMapCoords] = useState<AssetMapCoords>({
    latitude: null,
    longitude: null,
  })
  const { accessToken } = useAuth()
  const { canManageAssets } = usePermissions()
  const unit = useCurrentUnit()

  useEffect(() => {
    if (canManageAssets) return
    toast.error('Seu perfil não pode cadastrar ativos.')
    router.replace('/ativos')
  }, [canManageAssets, router])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      status: 'ATIVO',
    },
  })

  const onSubmit = async (data: AssetFormData) => {
    setIsLoading(true)
    try {
      if (!accessToken || !unit?.id) throw new Error('Sessão inválida')
      if (!canManageAssets) throw new Error('Sem permissão para cadastrar ativo')
      await apiRequest(`/unidades/${unit.id}/ativos`, {
        method: 'POST',
        accessToken,
        body: {
          nome: data.nome,
          limiteTemp: 80,
          tag: data.codigo,
          fabricante: data.fabricante || undefined,
          modelo: data.modelo || undefined,
          numeroSerie: data.numeroSerie || undefined,
          custoHoraParada: data.custoHoraParada ?? 0,
          custoManutencaoMensal: data.custoManutencaoMensal ?? 0,
          observacoes: data.descricao || undefined,
          localizacao: localizacao.trim() || undefined,
          latitude: mapCoords.latitude,
          longitude: mapCoords.longitude,
        },
      })
      
      toast.success('Ativo cadastrado com sucesso!')
      router.push('/ativos')
    } catch (error) {
      toast.error('Erro ao cadastrar ativo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ativos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Ativo</h1>
          <p className="text-muted-foreground">
            Cadastre um novo equipamento ou máquina
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do ativo *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Compressor de Ar CA-500"
                  className={cn(errors.nome && 'border-destructive')}
                  {...register('nome')}
                  disabled={isLoading}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  placeholder="Ex: COMP-001"
                  className={cn(errors.codigo && 'border-destructive')}
                  {...register('codigo')}
                  disabled={isLoading}
                />
                {errors.codigo && (
                  <p className="text-sm text-destructive">{errors.codigo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o ativo..."
                  rows={3}
                  {...register('descricao')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as AssetFormData['status'])}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Dados Técnicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Técnicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fabricante">Fabricante</Label>
                <Input
                  id="fabricante"
                  placeholder="Ex: Atlas Copco"
                  {...register('fabricante')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  placeholder="Ex: GA 90"
                  {...register('modelo')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroSerie">Número de Série</Label>
                <Input
                  id="numeroSerie"
                  placeholder="Ex: AC-2024-001234"
                  {...register('numeroSerie')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataAquisicao">Data de Aquisição</Label>
                <Input
                  id="dataAquisicao"
                  type="date"
                  {...register('dataAquisicao')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custoHoraParada">Custo de parada por hora (R$)</Label>
                <Input
                  id="custoHoraParada"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('custoHoraParada')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custoManutencaoMensal">Custo mensal base (R$)</Label>
                <Input
                  id="custoManutencaoMensal"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('custoManutencaoMensal')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <AssetLocationFormSection
          localizacao={localizacao}
          onLocalizacaoChange={setLocalizacao}
          mapCoords={mapCoords}
          onMapCoordsChange={setMapCoords}
          disabled={isLoading}
        />

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Cadastrar Ativo'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/ativos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
