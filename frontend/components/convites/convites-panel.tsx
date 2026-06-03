'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Link2, RefreshCw, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { apiRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export type ConviteSituacao = 'PENDENTE' | 'ACEITO' | 'EXPIRADO' | 'CANCELADO'

export type ConviteItem = {
  id: string
  emailDestino: string
  cargoCodigo: string
  status: string
  situacao: ConviteSituacao
  expiraEm: string
  createdAt: string
  unidadeNome: string | null
  convidadoPorNome: string | null
  podeCancelar: boolean
  podeReenviar: boolean
}

export type ConviteEmailStatus = 'ENVIADO' | 'ENVIANDO' | 'NAO_CONFIGURADO' | 'FALHOU'

export type ConviteActionResponse = {
  entregaEmail?: { status: ConviteEmailStatus; erro?: string }
  links?: { convite?: string }
}

const SITUACAO_LABELS: Record<ConviteSituacao, string> = {
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  EXPIRADO: 'Expirado',
  CANCELADO: 'Cancelado',
}

const SITUACAO_VARIANT: Record<
  ConviteSituacao,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDENTE: 'secondary',
  ACEITO: 'default',
  EXPIRADO: 'outline',
  CANCELADO: 'destructive',
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR')
}

function emailStatusMessage(status: ConviteEmailStatus | undefined) {
  switch (status) {
    case 'ENVIANDO':
      return 'O Brevo está enviando o e-mail em segundo plano (pode levar 1–2 min). Verifique também a caixa de spam. Se não chegar, copie o link abaixo ou use Reenviar na lista de convites. Em Configurações → Integrações, confira se SMTP aparece como conectado.'
    case 'ENVIADO':
      return 'E-mail enviado pelo Brevo. O convidado também pode usar o link abaixo. Se não encontrar, peça para verificar spam.'
    case 'FALHOU':
      return 'O Brevo rejeitou ou falhou no envio. Confira no painel Brevo (Transactional → Logs) se o remetente está validado e copie o link abaixo para enviar manualmente.'
    default:
      return 'A API não detectou SMTP/Brevo configurado no Render. Copie o link abaixo e envie manualmente, ou confira as variáveis BREVO_SMTP_* no Render.'
  }
}

type ConvitesPanelProps = {
  empresaId: string
  accessToken: string
  refreshKey?: number
}

export function ConvitesPanel({ empresaId, accessToken, refreshKey = 0 }: ConvitesPanelProps) {
  const [convites, setConvites] = useState<ConviteItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [linkDialog, setLinkDialog] = useState<{ title: string; link: string; emailStatus?: ConviteEmailStatus } | null>(null)

  const loadConvites = useCallback(async () => {
    if (!empresaId || !accessToken) return
    setIsLoading(true)
    try {
      const data = await apiRequest<{ convites: ConviteItem[] }>(
        `/empresas/${empresaId}/convites`,
        { accessToken },
      )
      setConvites(data.convites)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar convites')
      setConvites([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, empresaId])

  useEffect(() => {
    void loadConvites()
  }, [loadConvites, refreshKey])

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    toast.success('Link copiado')
  }

  const cancelConvite = async (conviteId: string) => {
    setActionId(conviteId)
    try {
      await apiRequest(`/empresas/${empresaId}/convites/${conviteId}/cancelar`, {
        method: 'PATCH',
        accessToken,
      })
      toast.success('Convite cancelado')
      await loadConvites()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao cancelar convite')
    } finally {
      setActionId(null)
    }
  }

  const resendConvite = async (convite: ConviteItem) => {
    setActionId(convite.id)
    try {
      const data = await apiRequest<ConviteActionResponse>(
        `/empresas/${empresaId}/convites/${convite.id}/reenviar`,
        { method: 'POST', accessToken },
      )
      toast.success('Convite reenviado')
      if (data.links?.convite) {
        setLinkDialog({
          title: `Novo link para ${convite.emailDestino}`,
          link: data.links.convite,
          emailStatus: data.entregaEmail?.status,
        })
      }
      await loadConvites()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao reenviar convite')
    } finally {
      setActionId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Convites enviados</CardTitle>
            <CardDescription>Acompanhe status, reenvie links ou cancele convites pendentes.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadConvites()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {convites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando convites...' : 'Nenhum convite enviado ainda.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {convites.map((convite) => (
                    <TableRow key={convite.id}>
                      <TableCell className="font-medium">{convite.emailDestino}</TableCell>
                      <TableCell>{convite.cargoCodigo}</TableCell>
                      <TableCell>
                        <Badge variant={SITUACAO_VARIANT[convite.situacao]}>
                          {SITUACAO_LABELS[convite.situacao]}
                        </Badge>
                      </TableCell>
                      <TableCell>{convite.unidadeNome ?? 'Corporativo'}</TableCell>
                      <TableCell>{formatDateTime(convite.createdAt)}</TableCell>
                      <TableCell>{formatDateTime(convite.expiraEm)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {convite.podeReenviar ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionId === convite.id}
                              onClick={() => void resendConvite(convite)}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" />
                              Reenviar
                            </Button>
                          ) : null}
                          {convite.podeCancelar ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionId === convite.id}
                              onClick={() => void cancelConvite(convite.id)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(linkDialog)} onOpenChange={(open) => !open && setLinkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{linkDialog?.title ?? 'Link do convite'}</DialogTitle>
            <DialogDescription>
              Compartilhe este link exclusivo com o convidado. Ele precisa entrar com o mesmo e-mail do convite.
            </DialogDescription>
          </DialogHeader>
          {linkDialog ? (
            <div className="space-y-4">
              <Alert>
                <Link2 className="h-4 w-4" />
                <AlertTitle>Entrega por e-mail</AlertTitle>
                <AlertDescription>{emailStatusMessage(linkDialog.emailStatus)}</AlertDescription>
              </Alert>
              <div className="rounded-md border bg-muted/40 p-3 text-sm break-all">{linkDialog.link}</div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>Fechar</Button>
            {linkDialog ? (
              <Button onClick={() => void copyLink(linkDialog.link)}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar link
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type InviteLinkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailDestino: string
  link: string
  emailStatus?: ConviteEmailStatus
}

export function InviteLinkDialog({
  open,
  onOpenChange,
  emailDestino,
  link,
  emailStatus,
}: InviteLinkDialogProps) {
  const copyLink = async () => {
    await navigator.clipboard.writeText(link)
    toast.success('Link copiado')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convite criado para {emailDestino}</DialogTitle>
          <DialogDescription>
            O convite foi registrado. Use o link abaixo se o e-mail não chegar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <Link2 className="h-4 w-4" />
            <AlertTitle>Entrega por e-mail</AlertTitle>
            <AlertDescription>{emailStatusMessage(emailStatus)}</AlertDescription>
          </Alert>
          <div className="rounded-md border bg-muted/40 p-3 text-sm break-all">{link}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => void copyLink()}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
