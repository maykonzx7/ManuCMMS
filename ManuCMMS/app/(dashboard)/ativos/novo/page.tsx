'use client'

import { useState } from 'react'
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

const assetSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  codigo: z.string().min(2, 'Código deve ter no mínimo 2 caracteres'),
  descricao: z.string().optional(),
  localizacao: z.string().optional(),
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  dataAquisicao: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'EM_MANUTENCAO', 'DESATIVADO']),
})

type AssetFormData = z.infer<typeof assetSchema>

export default function NewAssetPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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
      // Simula chamada de API
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
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
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  placeholder="Ex: Setor A - Linha 1"
                  {...register('localizacao')}
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
            </CardContent>
          </Card>
        </div>

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
