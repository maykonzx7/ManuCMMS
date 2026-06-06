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
  Printer,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_COLORS,
  USER_ROLE_LABELS,
} from '@/lib/constants'
import { usePermissions } from '@/hooks/use-permissions'
import { cn } from '@/lib/utils'
import { useAuth, useCurrentCompany, useCurrentUnit, useCurrentUser } from '@/lib/auth'
import { apiRequest, downloadApiFile, peekApiCache } from '@/lib/api'
import { buildApiCacheKey } from '@/lib/api-cache'
import { resolveMediaUrl } from '@/lib/media-url'
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
import { OsFlowProgress } from '@/components/ordens/os-flow-progress'
import {
  OsIniciarWizard,
  OsConcluirWizard,
  OsFluxoContinuoPrompt,
} from '@/components/ordens/os-execution-wizard'
import { OsProximoPassoBanner } from '@/components/ordens/os-proximo-passo-banner'
import { PageDataLoading } from '@/components/shared'
import { getPodeConcluirOrdem } from '@/lib/os-flow-utils'
import { ROUTES } from '@/lib/routes'
import type { UserRole } from '@/types'

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
  const { canManageOrderStatus, canEditOrder, role } = usePermissions()
  const { accessToken } = useAuth()
  const company = useCurrentCompany()
  const currentUser = useCurrentUser()
  const unit = useCurrentUnit()
  const [order, setOrder] = useState<ReturnType<typeof mapApiOrdemToServiceOrder> | null>(null)
  const [rawOrder, setRawOrder] = useState<ApiOrdem | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTecnicoId, setTransferTecnicoId] = useState('')
  const [transferMotivo, setTransferMotivo] = useState('')
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([])
  const [iniciarWizardOpen, setIniciarWizardOpen] = useState(false)
  const [concluirWizardOpen, setConcluirWizardOpen] = useState(false)
  const [fluxoContinuoOpen, setFluxoContinuoOpen] = useState(false)
  const [wizardSubmitting, setWizardSubmitting] = useState(false)
  const [pecasCatalog, setPecasCatalog] = useState<ApiPeca[]>([])
  const [comentarios, setComentarios] = useState<ApiOrdemComentario[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [salvandoComentario, setSalvandoComentario] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<{ url: string; label: string } | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)

  const confirmacaoFechamento = useMemo(() => {
    if (!rawOrder?.assinaturaDigital) return null
    try {
      const parsed = JSON.parse(rawOrder.assinaturaDigital) as {
        tipo?: string
        usuarioNome?: string | null
        usuarioFotoUrl?: string | null
        usuarioCargo?: string | null
        usuarioPerfil?: string | null
        nomeAssinante?: string | null
        confirmadoEm?: string
        dataHora?: string
        dataUrl?: string
      }
      if (parsed.tipo === 'confirmacao') {
        return {
          nome: parsed.usuarioNome ?? rawOrder.finalizadoPorNome ?? 'Técnico',
          fotoUrl: parsed.usuarioFotoUrl ?? null,
          cargo: parsed.usuarioCargo ?? null,
          perfil: parsed.usuarioPerfil ?? null,
          data: parsed.confirmadoEm ?? parsed.dataHora ?? rawOrder.dataFechamento,
          legacyCanvas: null as string | null,
        }
      }
      if (parsed.tipo === 'canvas' && parsed.dataUrl) {
        return {
          nome: parsed.nomeAssinante ?? parsed.usuarioNome ?? rawOrder.finalizadoPorNome,
          fotoUrl: null as string | null,
          cargo: null as string | null,
          perfil: null as string | null,
          data: parsed.dataHora ?? rawOrder.dataFechamento,
          legacyCanvas: parsed.dataUrl,
        }
      }
    } catch {
      if (rawOrder.assinaturaDigital.startsWith('data:image')) {
        return {
          nome: rawOrder.finalizadoPorNome,
          fotoUrl: null as string | null,
          cargo: null as string | null,
          perfil: null as string | null,
          data: rawOrder.dataFechamento,
          legacyCanvas: rawOrder.assinaturaDigital,
        }
      }
    }
    return null
  }, [rawOrder?.assinaturaDigital, rawOrder?.finalizadoPorNome, rawOrder?.dataFechamento])

  const loadOrder = async () => {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    const path = `/unidades/${unit.id}/ordens-servico/${params.id}`
    const cacheKey = buildApiCacheKey('GET', path, company?.slug ?? null)
    const hasCached = peekApiCache<ApiOrdem>(cacheKey) !== undefined
    if (!hasCached) setIsPageLoading(true)
    try {
      const res = await apiRequest<ApiOrdem>(path, { accessToken })
      setRawOrder(res)
      setOrder(mapApiOrdemToServiceOrder(res, unit.id))
    } catch {
      setRawOrder(null)
      setOrder(null)
    } finally {
      setIsPageLoading(false)
    }
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

  async function baixarOrdem(formato: 'csv' | 'json' | 'pdf') {
    if (!unit?.id || typeof params.id !== 'string' || !order) return
    setExportando(true)
    try {
      const ext = formato
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
    if (!concluirWizardOpen || !accessToken || !unit?.id) return
    void apiRequest<ApiPeca[]>(`/unidades/${unit.id}/pecas`, { accessToken })
      .then((res) => setPecasCatalog(res))
      .catch(() => setPecasCatalog([]))
  }, [concluirWizardOpen, accessToken, unit?.id])

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

  const podeConcluir = useMemo(
    () =>
      order
        ? getPodeConcluirOrdem({
            status: order.status,
            tipo: order.tipo,
            fotoProblema: rawOrder?.fotoProblema,
            descricaoProblema: rawOrder?.descricaoProblema,
          })
        : { ok: false, motivo: null },
    [order, rawOrder?.fotoProblema, rawOrder?.descricaoProblema],
  )

  const tecnicoContext = useMemo(
    () => ({
      nome: currentUser?.nome ?? order?.responsavel?.nome ?? 'Técnico',
      avatar: currentUser?.avatar ?? null,
      perfil: currentUser?.perfil,
      cargo: currentUser?.cargoNome ?? null,
    }),
    [currentUser, order?.responsavel?.nome],
  )

  async function openConcluirWizard() {
    if (!podeConcluir.ok) {
      toast.error(podeConcluir.motivo ?? 'Não é possível concluir esta OS agora.')
      return
    }
    if (accessToken && unit?.id) {
      try {
        const res = await apiRequest<ApiPeca[]>(`/unidades/${unit.id}/pecas`, { accessToken })
        setPecasCatalog(res)
      } catch {
        setPecasCatalog([])
      }
    }
    setConcluirWizardOpen(true)
  }

  async function handleIniciarWizard(data: { fotoProblema?: File; descricaoProblema?: string }) {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    setWizardSubmitting(true)
    try {
      if (order?.tipo === 'CORRETIVA') {
        const formData = new FormData()
        formData.append('fotoProblema', data.fotoProblema!)
        formData.append('descricaoProblema', data.descricaoProblema!)
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
      toast.success('Ordem iniciada.')
      setIniciarWizardOpen(false)
      await loadOrder()
      setFluxoContinuoOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao iniciar ordem')
    } finally {
      setWizardSubmitting(false)
    }
  }

  async function handleConcluirWizard(data: {
    descricaoSolucao: string
    fotoSolucao?: File
    fotoAnexo?: File
    confirmacaoConclusao: boolean
    pecasConsumidas: Array<{ pecaId: string; quantidade: number }>
  }) {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    setWizardSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('descricaoSolucao', data.descricaoSolucao)
      formData.append('confirmacaoConclusao', 'true')
      if (data.fotoSolucao) {
        formData.append('fotoSolucao', data.fotoSolucao)
        if (rawOrder?.descricaoProblema?.trim()) {
          formData.append('descricaoProblema', rawOrder.descricaoProblema.trim())
        }
      }
      if (data.fotoAnexo) formData.append('fotoAnexo', data.fotoAnexo)
      if (data.pecasConsumidas.length > 0) {
        formData.append('pecasConsumidas', JSON.stringify(data.pecasConsumidas))
      }
      await apiRequest(`/unidades/${unit.id}/ordens-servico/${params.id}/fechar`, {
        method: 'PATCH',
        accessToken,
        body: formData,
      })
      toast.success('Ordem concluída.')
      setConcluirWizardOpen(false)
      await loadOrder()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao concluir ordem')
    } finally {
      setWizardSubmitting(false)
    }
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
    if (transferTecnicoId === rawOrder?.idTecnico) {
      toast.error('Selecione um técnico diferente do responsável atual.')
      return
    }
    if (transferMotivo.trim().length < 10) {
      toast.error('Informe um motivo com no mínimo 10 caracteres.')
      return
    }
    try {
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao transferir OS')
    }
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

  if (isPageLoading) {
    return <PageDataLoading variant="detail" message="Carregando ordem de serviço..." />
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={ROUTES.ordemImprimir(String(params.id))}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Link>
          </Button>
          {role !== 'TECNICO' ? (
            <>
              <Button variant="outline" disabled={exportando} onClick={() => void baixarOrdem('csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" disabled={exportando} onClick={() => void baixarOrdem('json')}>
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button variant="outline" disabled={exportando} onClick={() => void baixarOrdem('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </>
          ) : null}
          {canManageOrderStatus && order.status === 'ABERTA' && (
            <Button onClick={() => setIniciarWizardOpen(true)}>
              <Play className="mr-2 h-4 w-4" />
              Iniciar
            </Button>
          )}
          {canManageOrderStatus && order.status === 'EM_ANDAMENTO' && (
            <Button
              disabled={!podeConcluir.ok}
              title={podeConcluir.motivo ?? undefined}
              onClick={() => void openConcluirWizard()}
            >
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
          {canEditOrder && ['ABERTA', 'EM_ANDAMENTO'].includes(order.status) && (
            <Button
              variant="outline"
              onClick={() => {
                setTransferTecnicoId('')
                setTransferMotivo('')
                setTransferOpen(true)
              }}
            >
              Transferir
            </Button>
          )}
        </div>
      </div>

      {canManageOrderStatus && !['CONCLUIDA', 'CANCELADA'].includes(order.status) ? (
        <>
          <OsProximoPassoBanner
            status={order.status}
            tipo={order.tipo}
            fotoProblema={rawOrder?.fotoProblema}
            descricaoProblema={rawOrder?.descricaoProblema}
            onIniciar={() => setIniciarWizardOpen(true)}
            onConcluir={() => void openConcluirWizard()}
          />
          <OsFlowProgress
            status={order.status}
            tipo={order.tipo}
            hasFotoProblema={Boolean(rawOrder?.fotoProblema)}
            hasDescricaoProblema={Boolean(rawOrder?.descricaoProblema?.trim())}
            hasDescricaoSolucao={Boolean(rawOrder?.descricaoSolucao?.trim())}
            hasFotoSolucao={Boolean(rawOrder?.fotoSolucao || rawOrder?.fotoAnexo)}
            hasConfirmacao={Boolean(confirmacaoFechamento)}
          />
        </>
      ) : null}

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
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoPreview({
                            url: resolveMediaUrl(rawOrder.fotoProblema!) ?? rawOrder.fotoProblema!,
                            label: 'Foto do problema',
                          })
                        }
                        className="block overflow-hidden rounded-md border text-left transition hover:opacity-90"
                      >
                        <img
                          src={resolveMediaUrl(rawOrder.fotoProblema) ?? rawOrder.fotoProblema}
                          alt="Foto do problema"
                          className="h-40 w-full object-cover"
                        />
                        <p className="p-2 text-xs text-muted-foreground">Problema · clique para ampliar</p>
                      </button>
                    )}
                    {rawOrder?.fotoSolucao && (
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoPreview({
                            url: resolveMediaUrl(rawOrder.fotoSolucao!) ?? rawOrder.fotoSolucao!,
                            label: 'Foto da solução',
                          })
                        }
                        className="block overflow-hidden rounded-md border text-left transition hover:opacity-90"
                      >
                        <img
                          src={resolveMediaUrl(rawOrder.fotoSolucao) ?? rawOrder.fotoSolucao}
                          alt="Foto da solução"
                          className="h-40 w-full object-cover"
                        />
                        <p className="p-2 text-xs text-muted-foreground">Solução · clique para ampliar</p>
                      </button>
                    )}
                    {rawOrder?.fotoAnexo && (
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoPreview({
                            url: resolveMediaUrl(rawOrder.fotoAnexo!) ?? rawOrder.fotoAnexo!,
                            label: 'Foto da intervenção',
                          })
                        }
                        className="block overflow-hidden rounded-md border text-left transition hover:opacity-90"
                      >
                        <img
                          src={resolveMediaUrl(rawOrder.fotoAnexo) ?? rawOrder.fotoAnexo}
                          alt="Foto da intervenção"
                          className="h-40 w-full object-cover"
                        />
                        <p className="p-2 text-xs text-muted-foreground">Intervenção · clique para ampliar</p>
                      </button>
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
                    <div className="mt-2 flex items-center gap-3 rounded-md border p-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage
                          src={resolveMediaUrl(confirmacaoFechamento.fotoUrl) ?? confirmacaoFechamento.fotoUrl ?? undefined}
                          alt={confirmacaoFechamento.nome ?? ''}
                        />
                        <AvatarFallback className="rounded-lg">
                          {(confirmacaoFechamento.nome ?? 'T').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{confirmacaoFechamento.nome ?? 'Técnico'}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {confirmacaoFechamento.perfil && confirmacaoFechamento.perfil in USER_ROLE_LABELS ? (
                            <Badge variant="outline" className="text-xs">
                              {USER_ROLE_LABELS[confirmacaoFechamento.perfil as UserRole]}
                            </Badge>
                          ) : null}
                          {confirmacaoFechamento.cargo ? (
                            <Badge variant="secondary" className="text-xs">{confirmacaoFechamento.cargo}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {confirmacaoFechamento.data ? formatDate(confirmacaoFechamento.data) : ''}
                          {' · confirmação eletrônica'}
                        </p>
                      </div>
                    </div>
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

      <OsIniciarWizard
        open={iniciarWizardOpen}
        onOpenChange={setIniciarWizardOpen}
        orderNumero={order.numero}
        orderTipo={order.tipo}
        submitting={wizardSubmitting}
        onConfirm={handleIniciarWizard}
      />
      <OsFluxoContinuoPrompt
        open={fluxoContinuoOpen}
        onOpenChange={setFluxoContinuoOpen}
        orderNumero={order.numero}
        onConcluirAgora={() => void openConcluirWizard()}
      />
      <OsConcluirWizard
        open={concluirWizardOpen}
        onOpenChange={setConcluirWizardOpen}
        orderNumero={order.numero}
        orderTipo={order.tipo}
        tecnico={tecnicoContext}
        pecasCatalog={pecasCatalog}
        submitting={wizardSubmitting}
        onConfirm={handleConcluirWizard}
      />

      <Dialog open={photoPreview != null} onOpenChange={(open) => { if (!open) setPhotoPreview(null) }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{photoPreview?.label ?? 'Evidência fotográfica'}</DialogTitle>
          </DialogHeader>
          {photoPreview ? (
            <div className="overflow-hidden rounded-md border bg-muted/20">
              <img
                src={photoPreview.url}
                alt={photoPreview.label}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
