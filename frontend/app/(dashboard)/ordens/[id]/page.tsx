'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Download,
  Send,
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
import { useAuth, useCurrentUnit, useCurrentUser } from '@/lib/auth'
import { apiRequest, downloadApiFile } from '@/lib/api'
import { mapApiOrdemToServiceOrder, type ApiOrdem, type ApiOrdemComentario } from '@/lib/backend-mappers'
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
import { Checkbox } from '@/components/ui/checkbox'

type ApiUsuario = {
  id?: string
  idUsuario?: string
  nome: string
  perfil?: string
}

type ApiPeca = {
  id: string
  codigo: string
  nome: string
  quantidadeEstoque: number
  quantidadeMinima: number
}

export default function OrderDetailPage() {
  const params = useParams()
  const { canManageOrderStatus, canEditOrder } = usePermissions()
  const { accessToken } = useAuth()
  const currentUser = useCurrentUser()
  const unit = useCurrentUnit()
  const [order, setOrder] = useState<ReturnType<typeof mapApiOrdemToServiceOrder> | null>(null)
  const [rawOrder, setRawOrder] = useState<ApiOrdem | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTecnicoId, setTransferTecnicoId] = useState('')
  const [transferMotivo, setTransferMotivo] = useState('')
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([])
  const [closeOpen, setCloseOpen] = useState(false)
  const [confirmacaoConclusao, setConfirmacaoConclusao] = useState(false)
  const [descricaoSolucao, setDescricaoSolucao] = useState('')
  const [fotoSolucaoFile, setFotoSolucaoFile] = useState<File | null>(null)
  const [pecasCatalog, setPecasCatalog] = useState<ApiPeca[]>([])
  const [pecasConsumo, setPecasConsumo] = useState<Record<string, number>>({})
  const [comentarios, setComentarios] = useState<ApiOrdemComentario[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [salvandoComentario, setSalvandoComentario] = useState(false)
  const [exportando, setExportando] = useState(false)

  const confirmacaoFechamento = useMemo(() => {
    if (!rawOrder?.assinaturaDigital) return null
    try {
      const parsed = JSON.parse(rawOrder.assinaturaDigital) as {
        tipo?: string
        usuarioNome?: string | null
        nomeAssinante?: string | null
        confirmadoEm?: string
        dataHora?: string
        dataUrl?: string
      }
      if (parsed.tipo === 'confirmacao') {
        return {
          nome: parsed.usuarioNome ?? rawOrder.finalizadoPorNome ?? 'Técnico',
          data: parsed.confirmadoEm ?? parsed.dataHora ?? rawOrder.dataFechamento,
          legacyCanvas: null as string | null,
        }
      }
      if (parsed.tipo === 'canvas' && parsed.dataUrl) {
        return {
          nome: parsed.nomeAssinante ?? parsed.usuarioNome ?? rawOrder.finalizadoPorNome,
          data: parsed.dataHora ?? rawOrder.dataFechamento,
          legacyCanvas: parsed.dataUrl,
        }
      }
    } catch {
      if (rawOrder.assinaturaDigital.startsWith('data:image')) {
        return {
          nome: rawOrder.finalizadoPorNome,
          data: rawOrder.dataFechamento,
          legacyCanvas: rawOrder.assinaturaDigital,
        }
      }
    }
    return null
  }, [rawOrder?.assinaturaDigital, rawOrder?.finalizadoPorNome, rawOrder?.dataFechamento])

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

  const loadComentarios = async () => {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    try {
      const res = await apiRequest<ApiOrdemComentario[]>(
        `/unidades/${unit.id}/ordens-servico/${params.id}/comentarios`,
        { accessToken },
      )
      setComentarios(res)
    } catch {
      setComentarios([])
    }
  }

  useEffect(() => {
    void loadOrder()
    void loadComentarios()
  }, [accessToken, params.id, unit?.id])

  async function enviarComentario() {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    const texto = novoComentario.trim()
    if (texto.length < 2) {
      toast.error('Digite um comentário com ao menos 2 caracteres.')
      return
    }
    setSalvandoComentario(true)
    try {
      await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/comentarios`, {
        method: 'POST',
        accessToken,
        body: { texto },
      })
      setNovoComentario('')
      await loadComentarios()
      toast.success('Comentário adicionado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar comentário')
    } finally {
      setSalvandoComentario(false)
    }
  }

  async function baixarOrdem(formato: 'csv' | 'json') {
    if (!unit?.id || typeof params.id !== 'string' || !order) return
    setExportando(true)
    try {
      const ext = formato === 'csv' ? 'csv' : 'json'
      await downloadApiFile(
        `/unidades/${unit.id}/ordens-servico/${params.id}/export?formato=${formato}`,
        `os_${order.numero}.${ext}`,
        { accessToken },
      )
      toast.success(`Download ${ext.toUpperCase()} iniciado.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao baixar OS')
    } finally {
      setExportando(false)
    }
  }

  useEffect(() => {
    if (!closeOpen || !accessToken || !unit?.id) return
    void apiRequest<ApiPeca[]>(`/unidades/${unit.id}/pecas`, { accessToken })
      .then((res) => setPecasCatalog(res))
      .catch(() => setPecasCatalog([]))
  }, [closeOpen, accessToken, unit?.id])

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
    formData.append('confirmacaoConclusao', 'true')
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
    setConfirmacaoConclusao(false)
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={exportando} onClick={() => void baixarOrdem('csv')}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" disabled={exportando} onClick={() => void baixarOrdem('json')}>
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          {canManageOrderStatus && order.status === 'ABERTA' && (
            <Button onClick={() => void iniciarOrdem()}>
              <Play className="mr-2 h-4 w-4" />
              Iniciar
            </Button>
          )}
          {canManageOrderStatus && order.status === 'EM_ANDAMENTO' && (
            <Button onClick={() => {
              setConfirmacaoConclusao(false)
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
                  <p className="text-sm text-muted-foreground">Status SLA</p>
                  <p className="mt-1 text-sm">{rawOrder?.statusSla ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Identificador</p>
                  <p className="mt-1 font-mono text-xs break-all">{order.id}</p>
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

              {rawOrder?.observacaoCancelamento && (
                <div>
                  <p className="text-sm text-muted-foreground">Motivo do cancelamento</p>
                  <p className="mt-1">{rawOrder.observacaoCancelamento}</p>
                </div>
              )}

              {(rawOrder?.pecasConsumidas?.length ?? 0) > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Peças consumidas</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {rawOrder?.pecasConsumidas?.map((peca) => (
                      <li key={peca.pecaId} className="rounded-md border px-3 py-2">
                        {peca.codigo} — {peca.nome} · Qtd: {peca.quantidade}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {confirmacaoFechamento && (
                <div>
                  <p className="text-sm text-muted-foreground">Confirmação de conclusão</p>
                  {confirmacaoFechamento.legacyCanvas ? (
                    <img
                      src={confirmacaoFechamento.legacyCanvas}
                      alt="Assinatura de fechamento (legado)"
                      className="mt-2 max-h-32 rounded-md border bg-white"
                    />
                  ) : (
                    <p className="mt-1 text-sm">
                      {confirmacaoFechamento.nome ?? 'Técnico'}
                      {confirmacaoFechamento.data
                        ? ` · ${formatDate(confirmacaoFechamento.data)}`
                        : ''}
                      {' · confirmação eletrônica'}
                    </p>
                  )}
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

          {/* Transferências */}
          {(rawOrder?.transferencias?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Transferências</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rawOrder?.transferencias?.map((t) => (
                  <div key={t.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {t.deTecnicoNome ?? 'Não atribuído'} → {t.paraTecnicoNome ?? 'Técnico'}
                    </p>
                    <p className="text-muted-foreground">
                      Por {t.transferidoPorNome ?? 'usuário'} em {formatDate(t.createdAt)}
                    </p>
                    <p className="mt-1">{t.motivo}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
              <div>
                <p className="text-sm text-muted-foreground">Prazo SLA</p>
                <p className="font-medium">
                  {rawOrder?.dataLimiteSla
                    ? new Date(rawOrder.dataLimiteSla).toLocaleString('pt-BR')
                    : '-'}
                </p>
              </div>
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

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentários
                <Badge variant="secondary">{comentarios.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comentarios.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum comentário ainda
                </p>
              ) : (
                <div className="max-h-72 space-y-3 overflow-y-auto">
                  {comentarios.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.usuarioNome}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{item.texto}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  placeholder="Adicionar observação sobre a execução..."
                  maxLength={2000}
                />
                <Button
                  className="w-full"
                  disabled={salvandoComentario}
                  onClick={() => void enviarComentario()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {salvandoComentario ? 'Enviando...' : 'Comentar'}
                </Button>
              </div>
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

      <Dialog open={closeOpen} onOpenChange={(open) => {
        setCloseOpen(open)
        if (!open) setConfirmacaoConclusao(false)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir ordem de serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            {pecasCatalog.length > 0 ? (
              <div className="space-y-2">
                <Label>Peças consumidas (opcional)</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                  {pecasCatalog.map((peca) => (
                    <div key={peca.id} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium">{peca.codigo} — {peca.nome}</p>
                        <p className="text-xs text-muted-foreground">Estoque: {peca.quantidadeEstoque}</p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={peca.quantidadeEstoque}
                        className="w-20 rounded-md border px-2 py-1"
                        value={pecasConsumo[peca.id] ?? 0}
                        onChange={(e) => {
                          const qty = Math.max(0, Number(e.target.value) || 0)
                          setPecasConsumo((prev) => ({ ...prev, [peca.id]: qty }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="confirmacao-conclusao"
                checked={confirmacaoConclusao}
                onCheckedChange={(checked) => setConfirmacaoConclusao(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="confirmacao-conclusao" className="leading-snug">
                  Confirmo que concluí esta intervenção conforme descrito
                </Label>
                <p className="text-xs text-muted-foreground">
                  Técnico: {currentUser?.nome ?? order.responsavel?.nome ?? 'Usuário logado'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button>
              <Button
                disabled={!confirmacaoConclusao}
                onClick={async () => {
                  if (!confirmacaoConclusao) {
                    toast.error('Marque a confirmação para concluir a OS.')
                    return
                  }
                  const formData = new FormData()
                  formData.append('confirmacaoConclusao', 'true')
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
                  const consumo = Object.entries(pecasConsumo)
                    .filter(([, qty]) => qty > 0)
                    .map(([pecaId, quantidade]) => ({ pecaId, quantidade }))
                  if (consumo.length > 0) {
                    formData.append('pecasConsumidas', JSON.stringify(consumo))
                  }
                  if (!accessToken || !unit?.id || typeof params.id !== 'string') return
                  await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/fechar`, {
                    method: 'PATCH',
                    accessToken,
                    body: formData,
                  })
                  toast.success('Ordem concluída.')
                  await loadOrder()
                  setCloseOpen(false)
                  setPecasConsumo({})
                  setConfirmacaoConclusao(false)
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
