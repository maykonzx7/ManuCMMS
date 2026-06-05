"use client"

import { useEffect, useMemo, useState } from 'react'
import { 
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth, useCurrentCompany, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { useRealtimeConnection } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { PageDataLoading } from '@/components/shared'

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
}

const typeStyles = {
  info: 'bg-blue-500/10 text-blue-500',
  warning: 'bg-amber-500/10 text-amber-500',
  error: 'bg-rose-500/10 text-rose-500',
  success: 'bg-emerald-500/10 text-emerald-500',
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    title: string
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
    read: boolean
    createdAt: string
    linkPath?: string | null
    fotoUrl?: string | null
  }>>([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const { accessToken } = useAuth()
  const company = useCurrentCompany()
  const unit = useCurrentUnit()

  useEffect(() => {
    if (!accessToken || !unit?.id) return
    setIsPageLoading(true)
    void apiRequest<Array<{
      id: string
      tipo: 'info' | 'warning' | 'error' | 'success'
      titulo: string
      mensagem: string
      fotoUrl: string | null
      linkPath: string | null
      lidaEm: string | null
      createdAt: string
    }>>('/notificacoes', { accessToken })
      .then((res) => {
        setNotifications(
          res.map((item) => ({
            id: item.id,
            title: item.titulo,
            message: item.mensagem,
            type: item.tipo,
            read: Boolean(item.lidaEm),
            createdAt: item.createdAt,
            linkPath: item.linkPath,
            fotoUrl: item.fotoUrl,
          })),
        )
      })
      .catch(() => setNotifications([]))
      .finally(() => setIsPageLoading(false))
  }, [accessToken, unit?.id])

  useRealtimeConnection(accessToken, company?.slug, {
    onNotificacaoNova: (payload) => {
      setNotifications((prev) => [
        {
          id: payload.id,
          title: payload.titulo,
          message: payload.mensagem,
          type: payload.tipo,
          read: false,
          createdAt: payload.createdAt,
          linkPath: payload.linkPath,
          fotoUrl: payload.fotoUrl,
        },
        ...prev,
      ])
    },
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    if (!accessToken) return
    void apiRequest(`/notificacoes/${id}/lida`, { method: 'PATCH', accessToken })
      .then(() => {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        )
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Falha ao marcar notificação'))
  }

  const markAllAsRead = () => {
    if (!accessToken) return
    void apiRequest('/notificacoes/lidas', { method: 'PATCH', accessToken })
      .then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Falha ao marcar notificações'))
  }

  const deleteNotification = (id: string) => {
    if (!accessToken) return
    void apiRequest(`/notificacoes/${id}`, { method: 'DELETE', accessToken })
      .then(() => setNotifications(prev => prev.filter(n => n.id !== id)))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Falha ao excluir notificação'))
  }

  if (isPageLoading) {
    return <PageDataLoading variant="list" message="Carregando notificações..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `Você tem ${unreadCount} notificação(ões) não lida(s)`
              : 'Todas as notificações foram lidas'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      <Tabs defaultValue="todas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="todas">
            Todas
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="nao-lidas">
            Não lidas
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-primary">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma notificação</h3>
                <p className="text-sm text-muted-foreground">
                  Você não tem notificações no momento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info
                return (
                  <Card 
                    key={notification.id}
                    className={cn(
                      "transition-colors",
                      !notification.read && "border-l-4 border-l-primary bg-muted/30"
                    )}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        typeStyles[notification.type as keyof typeof typeStyles]
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <p className={cn(
                            "text-sm",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.fotoUrl ? (
                          <div className="pt-2">
                            <img
                              src={notification.fotoUrl}
                              alt="Evidência da intervenção"
                              className="max-h-40 rounded-md border object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {notification.linkPath ? (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={notification.linkPath}>
                                <ExternalLink className="mr-1 h-4 w-4" />
                                Abrir OS
                              </Link>
                            </Button>
                          ) : null}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Marcar como lida
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nao-lidas" className="space-y-4">
          {notifications.filter(n => !n.read).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <h3 className="mt-4 text-lg font-semibold">Tudo em dia!</h3>
                <p className="text-sm text-muted-foreground">
                  Você não tem notificações não lidas
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.filter(n => !n.read).map((notification) => {
                const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info
                return (
                  <Card 
                    key={notification.id}
                    className="border-l-4 border-l-primary bg-muted/30"
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        typeStyles[notification.type as keyof typeof typeStyles]
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <p className="text-sm font-semibold">
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.fotoUrl ? (
                          <div className="pt-2">
                            <img
                              src={notification.fotoUrl}
                              alt="Evidência da intervenção"
                              className="max-h-40 rounded-md border object-cover"
                            />
                          </div>
                        ) : null}
                        {notification.linkPath ? (
                          <div className="pt-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={notification.linkPath}>
                                <ExternalLink className="mr-1 h-4 w-4" />
                                Abrir OS
                              </Link>
                            </Button>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Marcar como lida
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure quais notificações você deseja receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Ordens de Serviço</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Nova OS atribuída</Label>
                      <p className="text-xs text-muted-foreground">
                        Receber notificação quando uma OS for atribuída a você
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>OS atrasada</Label>
                      <p className="text-xs text-muted-foreground">
                        Alerta quando uma OS ultrapassar o prazo
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>OS concluída</Label>
                      <p className="text-xs text-muted-foreground">
                        Notificar quando uma OS for finalizada
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Ativos</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Ativo parado</Label>
                      <p className="text-xs text-muted-foreground">
                        Alerta quando um ativo for marcado como parado
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Manutenção preventiva próxima</Label>
                      <p className="text-xs text-muted-foreground">
                        Lembrete de manutenção preventiva programada
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Sistema</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Atualizações do sistema</Label>
                      <p className="text-xs text-muted-foreground">
                        Novidades e atualizações do ManuCMMS
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Relatórios semanais</Label>
                      <p className="text-xs text-muted-foreground">
                        Resumo semanal de atividades
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Button>Salvar Preferências</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
