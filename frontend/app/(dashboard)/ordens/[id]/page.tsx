'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Package,
  Calendar,
  Play,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_COLORS,
} from '@/lib/constants'
import { usePermissions } from '@/hooks/use-permissions'
import { cn } from '@/lib/utils'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiOrdemToServiceOrder, type ApiOrdem } from '@/lib/backend-mappers'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ApiUsuario = {
  id?: string
  idUsuario?: string
  nome: string
  perfil?: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const { canManageOrderStatus, canEditOrder } = usePermissions()
  const { accessToken } = useAuth()
  const unit = useCurrentUnit()
  const [order, setOrder] = useState<ReturnType<typeof mapApiOrdemToServiceOrder> | null>(null)
  const [rawOrder, setRawOrder] = useState<ApiOrdem | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTecnicoId, setTransferTecnicoId] = useState('')
  const [transferMotivo, setTransferMotivo] = useState('')
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([])
  const [closeOpen, setCloseOpen] = useState(false)
  const [assinaturaNome, setAssinaturaNome] = useState('')
  const [descricaoSolucao, setDescricaoSolucao] = useState('')
  const [fotoSolucaoFile, setFotoSolucaoFile] = useState<File | null>(null)
  const assinaturaCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)

  const loadOrder = async () => {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    await apiRequest<ApiOrdem>(`/unidades/${unit.id}/ordens-servico/${params.id}`, { accessToken })
      .then((res) => {
        setRawOrder(res)
        setOrder(mapApiOrdemToServiceOrder(res, unit.id))
      })
      .catch(() => {
        setRawOrder(null)
        setOrder(null)
      })
  }

  useEffect(() => {
    void loadOrder()
  }, [accessToken, params.id, unit?.id])

  useEffect(() => {
    if (!accessToken || !unit?.id || !canEditOrder) return
    void apiRequest<ApiUsuario[]>(`/unidades/${unit.id}/usuarios`, { accessToken })
      .then((res) => {
        const list = res
          .map((u) => ({
            id: u.id ?? u.idUsuario ?? '',
            nome: u.nome,
            perfil: (u.perfil ?? '').toUpperCase(),
          }))
          .filter((u) => u.id && u.perfil === 'TECNICO')
          .map((u) => ({ id: u.id, nome: u.nome }))
        setTecnicos(list)
      })
      .catch(() => setTecnicos([]))
  }, [accessToken, unit?.id, canEditOrder])

  async function iniciarOrdem() {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    if (order?.tipo === 'CORRETIVA') {
      const fotoProblema = await requestInterventionPhotoFile('Selecione a foto do problema')
      if (!fotoProblema) {
        toast.error('Para iniciar OS corretiva, envie a foto do problema.')
        return
      }
      const descricaoProblema = window.prompt('Descreva o problema identificado:')
      const descricaoProblemaNormalizada = descricaoProblema?.trim()
      if (!descricaoProblemaNormalizada) {
        toast.error('Descrição do problema é obrigatória para iniciar OS corretiva.')
        return
      }
      const formData = new FormData()
      formData.append('fotoProblema', fotoProblema)
      formData.append('descricaoProblema', descricaoProblemaNormalizada)
      await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/iniciar`, {
        method: 'PATCH',
        accessToken,
        body: formData,
      })
    } else {
      await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/iniciar`, {
        method: 'PATCH',
        accessToken,
      })
    }
    await loadOrder()
  }

  async function concluirOrdem() {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    const isCorretiva = order?.tipo === 'CORRETIVA'
    const formData = new FormData()
    const descricaoSolucaoNormalizada = descricaoSolucao.trim()
    if (!descricaoSolucaoNormalizada) {
      toast.error('Descrição da solução é obrigatória para concluir a OS.')
      return
    }
    formData.append('descricaoSolucao', descricaoSolucaoNormalizada)
    if (isCorretiva) {
      const fotoSolucao = fotoSolucaoFile
      if (!fotoSolucao) {
        toast.error('OS corretiva exige foto da solução para concluir.')
        return
      }
      formData.append('fotoSolucao', fotoSolucao)
    } else {
      const fotoAnexo = await requestInterventionPhotoFile('Selecione a foto da intervenção')
      if (!fotoAnexo) {
        toast.error('É obrigatório anexar a foto da intervenção para concluir a OS')
        return
      }
      formData.append('fotoAnexo', fotoAnexo)
    }
    await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/fechar`, {
      method: 'PATCH',
      accessToken,
      body: formData,
    })
    await loadOrder()
    setCloseOpen(false)
    setDescricaoSolucao('')
    setFotoSolucaoFile(null)
  }

  async function cancelarOrdem() {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/cancelar`, {
      method: 'PATCH',
      accessToken,
      body: { observacaoCancelamento: 'Cancelada pelo usuário.' },
    })
    await loadOrder()
  }

  async function escalarOrdem() {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    const motivo = window.prompt('Descreva o motivo do escalonamento para supervisão:')
    if (!motivo || motivo.trim().length < 10) {
      toast.error('Informe um motivo com pelo menos 10 caracteres.')
      return
    }
    await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/escalar`, {
      method: 'PATCH',
      accessToken,
      body: {
        motivo: motivo.trim(),
        statusAtivoSugerido: 'FALHA',
      },
    })
    toast.success('Escalonamento enviado para supervisão.')
    await loadOrder()
  }

  async function transferirOrdem() {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    if (!transferTecnicoId) {
      toast.error('Selecione o técnico de destino.')
      return
    }
    if (transferMotivo.trim().length < 10) {
      toast.error('Informe um motivo com no mínimo 10 caracteres.')
      return
    }
    await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}`, {
      method: 'PATCH',
      accessToken,
      body: {
        idTecnico: transferTecnicoId,
        motivoTransferencia: transferMotivo.trim(),
      },
    })
    toast.success('OS transferida com sucesso.')
    setTransferOpen(false)
    setTransferTecnicoId('')
    setTransferMotivo('')
    await loadOrder()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const timeline = useMemo(() => {
    if (!order) return []
    const base = [
      {
        id: 1,
        action: 'Ordem criada',
        user: order.solicitante?.nome || 'Sistema',
        date: order.dataAbertura,
      },
      ...(order.dataInicio
        ? [{
            id: 2,
            action: 'Trabalho iniciado',
            user: order.responsavel?.nome || 'Técnico',
            date: order.dataInicio,
          }]
        : []),
      ...(order.dataFechamento
        ? [{
            id: 3,
            action: 'Ordem concluída',
            user: order.responsavel?.nome || 'Técnico',
            date: order.dataFechamento,
          }]
        : []),
    ]
    const transferencias = (order.historico ?? []).map((h, index) => ({
      id: 1000 + index,
      action: 'OS transferida',
      user: h.descricao || 'Transferência registrada',
      date: h.createdAt,
    }))
    return [...transferencias, ...base].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
    )
  }, [order])

  const requestInterventionPhotoFile = (title?: string) =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      if (title) {
        input.setAttribute('aria-label', title)
      }
      input.onchange = () => {
        const file = input.files?.[0] ?? null
        resolve(file)
      }
      input.oncancel = () => resolve(null)
      input.click()
    })

  const clearSignature = () => {
    const canvas = assinaturaCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getSignatureDataUrl = (): string | null => {
    const canvas = assinaturaCanvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const hasStroke = pixels.some((v, i) => (i + 1) % 4 === 0 ? false : v !== 0)
    if (!hasStroke) return null
    return canvas.toDataURL('image/jpeg', 0.7)
  }

  const drawAt = (clientX: number, clientY: number) => {
    const canvas = assinaturaCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvas.width
    const y = ((clientY - rect.top) / rect.height) * canvas.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!drawingRef.current) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      drawingRef.current = true
      return
    }
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  if (!order) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Ordem não encontrada</h2>
          <p className="mt-2 text-muted-foreground">
            A ordem de serviço solicitada não existe ou foi removida.
          </p>
          <Button asChild className="mt-4">
            <Link href="/ordens">Voltar para lista</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ordens">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.numero}</h1>
              <Badge
                variant="outline"
                className={cn(ORDER_STATUS_COLORS[order.status])}
              >
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
              {rawOrder?.statusSla === 'ATRASADA' ? (
                <Badge variant="destructive">Atrasada</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-lg text-muted-foreground">{order.titulo}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canManageOrderStatus && order.status === 'ABERTA' && (
            <Button onClick={() => void iniciarOrdem()}>
              <Play className="mr-2 h-4 w-4" />
              Iniciar
            </Button>
          )}
          {canManageOrderStatus && order.status === 'EM_ANDAMENTO' && (
            <Button onClick={() => {
              setAssinaturaNome(order.responsavel?.nome || '')
              setCloseOpen(true)
            }}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Concluir
            </Button>
          )}
          {canManageOrderStatus && !['CONCLUIDA', 'CANCELADA'].includes(order.status) && (
            <Button variant="outline" className="text-destructive" onClick={() => void cancelarOrdem()}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
          {canManageOrderStatus && !['CONCLUIDA', 'CANCELADA'].includes(order.status) && (
            <Button variant="outline" onClick={() => void escalarOrdem()}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Escalar
            </Button>
          )}
          {!['CONCLUIDA', 'CANCELADA'].includes(order.status) && (
            <Button
              variant="outline"
              onClick={() => {
                if (!canEditOrder) {
                  toast.error('Transferência disponível apenas para Supervisor, Gestor ou Admin.')
                  return
                }
                setTransferOpen(true)
              }}
            >
              Transferir
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Manutenção</p>
                  <Badge
                    variant="outline"
                    className={cn('mt-1', MAINTENANCE_TYPE_COLORS[order.tipo])}
                  >
                    {MAINTENANCE_TYPE_LABELS[order.tipo]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prioridade</p>
                  <Badge
                    variant="outline"
                    className={cn('mt-1', PRIORITY_COLORS[order.prioridade])}
                  >
                    {PRIORITY_LABELS[order.prioridade]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prazo SLA</p>
                  <p className="mt-1 text-sm">
                    {rawOrder?.dataLimiteSla
                      ? new Date(rawOrder.dataLimiteSla).toLocaleString('pt-BR')
                      : '-'}
                  </p>
                </div>
              </div>

              {order.descricao && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição do problema</p>
                  <p className="mt-1">{order.descricao}</p>
                </div>
              )}

              {rawOrder?.descricaoProblema && (
                <div>
                  <p className="text-sm text-muted-foreground">Detalhamento do problema</p>
                  <p className="mt-1">{rawOrder.descricaoProblema}</p>
                </div>
              )}

              {order.solucao && (
                <div>
                  <p className="text-sm text-muted-foreground">Solução Aplicada</p>
                  <p className="mt-1">{order.solucao}</p>
                </div>
              )}

              {(rawOrder?.fotoProblema || rawOrder?.fotoSolucao || rawOrder?.fotoAnexo) && (
                <div>
                  <p className="text-sm text-muted-foreground">Evidências</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {rawOrder?.fotoProblema && (
                      <a href={rawOrder.fotoProblema} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                        <img src={rawOrder.fotoProblema} alt="Foto do problema" className="h-40 w-full object-cover" />
                        <p className="p-2 text-xs text-muted-foreground">Problema</p>
                      </a>
                    )}
                    {rawOrder?.fotoSolucao && (
                      <a href={rawOrder.fotoSolucao} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                        <img src={rawOrder.fotoSolucao} alt="Foto da solução" className="h-40 w-full object-cover" />
                        <p className="p-2 text-xs text-muted-foreground">Solução</p>
                      </a>
                    )}
                    {rawOrder?.fotoAnexo && (
                      <a href={rawOrder.fotoAnexo} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                        <img src={rawOrder.fotoAnexo} alt="Foto da intervenção" className="h-40 w-full object-cover" />
                        <p className="p-2 text-xs text-muted-foreground">Intervenção</p>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {order.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="mt-1">{order.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/ativos/${order.ativo?.id}`}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{order.ativo?.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.ativo?.codigo} - {order.ativo?.localizacao}
                  </p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">{item.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.user} - {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Abertura</p>
                <p className="font-medium">{formatDate(order.dataAbertura)}</p>
              </div>
              {order.dataInicio && (
                <div>
                  <p className="text-sm text-muted-foreground">Início do trabalho</p>
                  <p className="font-medium">{formatDate(order.dataInicio)}</p>
                </div>
              )}
              {order.dataFechamento && (
                <div>
                  <p className="text-sm text-muted-foreground">Conclusão</p>
                  <p className="font-medium">{formatDate(order.dataFechamento)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* People Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Pessoas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getInitials(order.solicitante?.nome || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{order.solicitante?.nome}</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Responsável</p>
                {order.responsavel ? (
                  <div className="mt-2 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getInitials(order.responsavel.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{order.responsavel.nome}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Não atribuído
                  </p>
                )}
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Rastreabilidade</p>
                <p className="mt-2 text-sm">Criada por: {rawOrder?.criadoPorNome || 'N/D'}</p>
                <p className="text-sm">Iniciada por: {rawOrder?.iniciadoPorNome || 'N/D'}</p>
                <p className="text-sm">Finalizada por: {rawOrder?.finalizadoPorNome || 'N/D'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Comments placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum comentário ainda
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Técnico de destino</Label>
              <Select value={transferTecnicoId} onValueChange={setTransferTecnicoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos
                    .filter((t) => t.id !== rawOrder?.idTecnico)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo da transferência</Label>
              <Textarea
                rows={4}
                value={transferMotivo}
                onChange={(e) => setTransferMotivo(e.target.value)}
                placeholder="Explique por que a OS está sendo transferida..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void transferirOrdem()}>
                Confirmar transferência
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir OS com assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome do assinante</Label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={assinaturaNome}
                onChange={(e) => setAssinaturaNome(e.target.value)}
                placeholder="Nome de quem está finalizando"
              />
            </div>
            {order.tipo === 'CORRETIVA' && (
              <div className="space-y-2">
                <Label>Foto da solução (obrigatória)</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoSolucaoFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição da solução (obrigatória)</Label>
              <Textarea
                rows={3}
                value={descricaoSolucao}
                onChange={(e) => setDescricaoSolucao(e.target.value)}
                placeholder="Descreva o que foi feito..."
              />
            </div>
            <div className="space-y-2">
              <Label>Assinatura (canvas)</Label>
              <canvas
                ref={assinaturaCanvasRef}
                width={600}
                height={180}
                className="w-full rounded-md border bg-white"
                onMouseDown={(e) => {
                  drawingRef.current = false
                  drawAt(e.clientX, e.clientY)
                }}
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return
                  drawAt(e.clientX, e.clientY)
                }}
                onMouseUp={() => { drawingRef.current = false }}
                onMouseLeave={() => { drawingRef.current = false }}
                onTouchStart={(e) => {
                  const t = e.touches[0]
                  if (!t) return
                  drawingRef.current = false
                  drawAt(t.clientX, t.clientY)
                }}
                onTouchMove={(e) => {
                  const t = e.touches[0]
                  if (!t) return
                  drawAt(t.clientX, t.clientY)
                }}
                onTouchEnd={() => { drawingRef.current = false }}
              />
              <Button type="button" variant="outline" onClick={clearSignature}>Limpar assinatura</Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  const assinatura = getSignatureDataUrl()
                  if (!assinatura) {
                    toast.error('Assine no campo de assinatura para concluir.')
                    return
                  }
                  const formData = new FormData()
                  if (order.tipo === 'CORRETIVA') {
                    if (!fotoSolucaoFile) {
                      toast.error('Foto da solução é obrigatória para OS corretiva.')
                      return
                    }
                    const descricaoProblemaAtual = rawOrder?.descricaoProblema?.trim()
                    if (!descricaoProblemaAtual) {
                      toast.error('Descrição do problema é obrigatória na OS corretiva.')
                      return
                    }
                    if (!descricaoSolucao.trim()) {
                      toast.error('Descrição da solução é obrigatória para concluir a OS.')
                      return
                    }
                    formData.append('fotoSolucao', fotoSolucaoFile)
                    formData.append('descricaoProblema', descricaoProblemaAtual)
                    formData.append('descricaoSolucao', descricaoSolucao.trim())
                  } else {
                    const fotoAnexo = await requestInterventionPhotoFile('Selecione a foto da intervenção')
                    if (!fotoAnexo) {
                      toast.error('É obrigatório anexar a foto da intervenção para concluir a OS')
                      return
                    }
                    if (!descricaoSolucao.trim()) {
                      toast.error('Descrição da solução é obrigatória para concluir a OS.')
                      return
                    }
                    formData.append('fotoAnexo', fotoAnexo)
                    formData.append('descricaoSolucao', descricaoSolucao.trim())
                  }
                  formData.append('assinaturaImagemDataUrl', assinatura)
                  formData.append('assinaturaNome', assinaturaNome.trim())
                  if (!accessToken || !unit?.id || typeof params.id !== 'string') return
                  await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/fechar`, {
                    method: 'PATCH',
                    accessToken,
                    body: formData,
                  })
                  toast.success('Ordem concluída com assinatura.')
                  await loadOrder()
                  setCloseOpen(false)
                  clearSignature()
                }}
              >
                Confirmar conclusão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
