'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import type { ApiAtivo } from '@/lib/backend-mappers'
import { usePermissions } from '@/hooks/use-permissions'

type BackendStatus = 'OPERACIONAL' | 'MANUTENCAO' | 'FALHA' | 'INATIVO'

const STATUS_OPTIONS: Array<{ value: BackendStatus; label: string }> = [
  { value: 'OPERACIONAL', label: 'Operacional' },
  { value: 'MANUTENCAO', label: 'Em manutenção' },
  { value: 'FALHA', label: 'Falha' },
  { value: 'INATIVO', label: 'Inativo' },
]

function normalizeStatus(status?: string | null): BackendStatus {
  const value = (status ?? '').toUpperCase()
  if (value === 'OPERACIONAL' || value === 'MANUTENCAO' || value === 'FALHA' || value === 'INATIVO') {
    return value
  }
  return 'OPERACIONAL'
}

export default function EditAssetPage() {
  const params = useParams()
  const router = useRouter()
  const { accessToken } = useAuth()
  const { canManageAssets } = usePermissions()
  const unit = useCurrentUnit()

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [tag, setTag] = useState('')
  const [limiteTemp, setLimiteTemp] = useState('0')
  const [status, setStatus] = useState<BackendStatus>('OPERACIONAL')
  const [fabricante, setFabricante] = useState('')
  const [modelo, setModelo] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [custoHoraParada, setCustoHoraParada] = useState('0')
  const [custoManutencaoMensal, setCustoManutencaoMensal] = useState('0')

  useEffect(() => {
    if (canManageAssets) return
    toast.error('Seu perfil não pode editar ativos.')
    router.replace('/ativos')
  }, [canManageAssets, router])

  const load = async () => {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    setIsLoading(true)
    try {
      const res = await apiRequest<ApiAtivo>(`/unidades/${unit.id}/ativos/${params.id}`, { accessToken })
      setNome(res.nome || '')
      setTag(res.tag || '')
      setLimiteTemp(String(res.limiteTemp ?? 0))
      setStatus(normalizeStatus(res.status))
      setFabricante(res.fabricante || '')
      setModelo(res.modelo || '')
      setNumeroSerie(res.numeroSerie || '')
      setObservacoes(res.observacoes || '')
      setCustoHoraParada(String(res.custoHoraParada ?? 0))
      setCustoManutencaoMensal(String(res.custoManutencaoMensal ?? 0))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar ativo')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [accessToken, unit?.id, params.id])

  const onSave = async () => {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    if (!nome.trim()) {
      toast.error('Informe o nome do ativo')
      return
    }

    setIsSaving(true)
    try {
      if (!canManageAssets) throw new Error('Sem permissão para editar ativo')
      await apiRequest(`/unidades/${unit.id}/ativos/${params.id}`, {
        method: 'PATCH',
        accessToken,
        body: {
          nome: nome.trim(),
          tag: tag.trim(),
          limiteTemp: Number(limiteTemp || 0),
          status,
          fabricante: fabricante.trim(),
          modelo: modelo.trim(),
          numeroSerie: numeroSerie.trim(),
          observacoes: observacoes.trim(),
          custoHoraParada: Number(custoHoraParada || 0),
          custoManutencaoMensal: Number(custoManutencaoMensal || 0),
        },
      })
      toast.success('Ativo atualizado com sucesso')
      router.push(`/ativos/${params.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao atualizar ativo')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href={`/ativos/${typeof params.id === 'string' ? params.id : ''}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Ativo</h1>
          <p className="text-sm text-muted-foreground">Atualize os dados com integração real ao backend</p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={isLoading || isSaving} />
          </div>
          <div className="space-y-2">
            <Label>Tag</Label>
            <Input value={tag} onChange={(e) => setTag(e.target.value)} disabled={isLoading || isSaving} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BackendStatus)} disabled={isLoading || isSaving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Limite de temperatura</Label>
            <Input type="number" value={limiteTemp} onChange={(e) => setLimiteTemp(e.target.value)} disabled={isLoading || isSaving} />
          </div>
          <div className="space-y-2">
            <Label>Fabricante</Label>
            <Input value={fabricante} onChange={(e) => setFabricante(e.target.value)} disabled={isLoading || isSaving} />
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={isLoading || isSaving} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Número de Série</Label>
            <Input value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} disabled={isLoading || isSaving} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={4} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={isLoading || isSaving} />
          </div>
          <div className="space-y-2">
            <Label>Custo de parada por hora (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={custoHoraParada}
              onChange={(e) => setCustoHoraParada(e.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label>Custo mensal base (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={custoManutencaoMensal}
              onChange={(e) => setCustoManutencaoMensal(e.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={() => void onSave()} disabled={isLoading || isSaving}>
          {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar alterações'}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/ativos/${typeof params.id === 'string' ? params.id : ''}`}>Cancelar</Link>
        </Button>
      </div>
    </div>
  )
}
