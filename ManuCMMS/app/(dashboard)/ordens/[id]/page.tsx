'use client'

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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { mockOrders } from '@/lib/mock-data'
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

export default function OrderDetailPage() {
  const params = useParams()
  const { canManageOrderStatus, canEditOrder } = usePermissions()
  
  // Encontra a ordem pelo ID (em produção, viria da API)
  const order = mockOrders.find((o) => o.id === params.id)

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

  // Timeline mock
  const timeline = [
    {
      id: 1,
      action: 'Ordem criada',
      user: order.solicitante?.nome,
      date: order.dataAbertura,
    },
    ...(order.dataInicio ? [{
      id: 2,
      action: 'Trabalho iniciado',
      user: order.responsavel?.nome,
      date: order.dataInicio,
    }] : []),
    ...(order.dataFechamento ? [{
      id: 3,
      action: 'Ordem concluída',
      user: order.responsavel?.nome,
      date: order.dataFechamento,
    }] : []),
  ]

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
            </div>
            <p className="mt-1 text-lg text-muted-foreground">{order.titulo}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canManageOrderStatus && order.status === 'ABERTA' && (
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Iniciar
            </Button>
          )}
          {canManageOrderStatus && order.status === 'EM_ANDAMENTO' && (
            <Button>
              <CheckCircle className="mr-2 h-4 w-4" />
              Concluir
            </Button>
          )}
          {canManageOrderStatus && !['CONCLUIDA', 'CANCELADA'].includes(order.status) && (
            <Button variant="outline" className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
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
              </div>

              {order.descricao && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="mt-1">{order.descricao}</p>
                </div>
              )}

              {order.solucao && (
                <div>
                  <p className="text-sm text-muted-foreground">Solução Aplicada</p>
                  <p className="mt-1">{order.solucao}</p>
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
    </div>
  )
}
