'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { USER_ROLE_LABELS, USER_ROLE_OPTIONS } from '@/lib/constants'
import { apiRequest } from '@/lib/api'
import type { UserRole } from '@/types'
import type { ConviteEmailStatus } from '@/components/convites/convites-panel'

export type UsuarioGestaoItem = {
  id: string
  nome: string
  email: string
  perfil: UserRole
  ativo: boolean
  usuarioAcesso?: string | null
}

export type UsuarioDialogAction =
  | 'status'
  | 'perfil'
  | 'email'
  | 'acesso'
  | 'reset-senha'
  | 'enviar-email'
  | 'remover-acesso'
  | null

type EmailActionResponse = {
  ok: boolean
  email: string
  resetLink?: string
  links?: { acessoConta?: string; convite?: string }
  entregaEmail?: { status: ConviteEmailStatus; erro?: string }
}

type RemoveAccessResponse = {
  ok: boolean
  email: string
  conviteReenviado?: {
    links?: { convite?: string }
    entregaEmail?: { status: ConviteEmailStatus }
  } | null
}

const ACESSO_REGEX = /^[a-z0-9._-]+$/

function emailStatusMessage(status: ConviteEmailStatus | undefined) {
  switch (status) {
    case 'ENVIADO':
      return 'E-mail enviado com sucesso.'
    case 'ENVIANDO':
      return 'E-mail enfileirado para envio.'
    case 'FALHOU':
      return 'Não foi possível enviar o e-mail agora. Copie o link manualmente se necessário.'
    default:
      return 'E-mail automático indisponível neste ambiente. Copie o link manualmente.'
  }
}

type UsuarioAcoesDialogsProps = {
  empresaId: string
  accessToken: string
  accessLink?: string | null
  action: UsuarioDialogAction
  user: UsuarioGestaoItem | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => Promise<void> | void
  onConviteReenviado?: (payload: {
    emailDestino: string
    link: string
    emailStatus?: ConviteEmailStatus
  }) => void
}

export function UsuarioAcoesDialogs({
  empresaId,
  accessToken,
  accessLink,
  action,
  user,
  onOpenChange,
  onSuccess,
  onConviteReenviado,
}: UsuarioAcoesDialogsProps) {
  const [submitting, setSubmitting] = useState(false)
  const [reenviarConvite, setReenviarConvite] = useState(true)
  const [perfil, setPerfil] = useState<UserRole>('TECNICO')
  const [email, setEmail] = useState('')
  const [usuarioAcesso, setUsuarioAcesso] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [emailResult, setEmailResult] = useState<EmailActionResponse | null>(null)

  useEffect(() => {
    if (!user) return
    setPerfil(user.perfil)
    setEmail(user.email)
    setUsuarioAcesso(user.usuarioAcesso ?? '')
    setMensagem('')
    setEmailResult(null)
    setReenviarConvite(true)
  }, [user, action])

  const close = () => onOpenChange(false)

  const patchUsuario = async (path: string, body: Record<string, unknown>) => {
    if (!user) return
    await apiRequest(`/empresas/${empresaId}/gestao/usuarios/${user.id}/${path}`, {
      method: 'PATCH',
      accessToken,
      body,
    })
  }

  const handleStatus = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      const novoStatus = user.ativo ? 'INATIVO' : 'ATIVO'
      await patchUsuario('status', { status: novoStatus })
      toast.success(`Usuário ${novoStatus === 'ATIVO' ? 'ativado' : 'inativado'}`)
      await onSuccess()
      close()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar status')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePerfil = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      await patchUsuario('perfil', { perfil })
      toast.success('Perfil atualizado')
      await onSuccess()
      close()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar perfil')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEmail = async () => {
    if (!user) return
    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail.includes('@')) {
      toast.error('Informe um e-mail válido')
      return
    }
    setSubmitting(true)
    try {
      await patchUsuario('email', { email: nextEmail })
      toast.success('E-mail atualizado')
      await onSuccess()
      close()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar e-mail')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcesso = async () => {
    if (!user) return
    const nextAcesso = usuarioAcesso.trim().toLowerCase()
    if (nextAcesso.length < 3 || nextAcesso.length > 60) {
      toast.error('Usuário de acesso deve ter entre 3 e 60 caracteres')
      return
    }
    if (!ACESSO_REGEX.test(nextAcesso)) {
      toast.error('Use apenas letras minúsculas, números, ponto, underline ou hífen')
      return
    }
    setSubmitting(true)
    try {
      await patchUsuario('usuario-acesso', { usuarioAcesso: nextAcesso })
      toast.success('Usuário de acesso atualizado')
      await onSuccess()
      close()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar usuário de acesso')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetSenha = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      const response = await apiRequest<EmailActionResponse>(
        `/empresas/${empresaId}/gestao/usuarios/${user.id}/reset-senha`,
        { method: 'POST', accessToken },
      )
      setEmailResult(response)
      if (response.entregaEmail?.status === 'ENVIADO') {
        toast.success('Link de redefinição enviado por e-mail')
      } else {
        toast.message('Link gerado — verifique o status do envio')
      }
      await onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no reset de senha')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoverAcesso = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      const response = await apiRequest<RemoveAccessResponse>(
        `/empresas/${empresaId}/gestao/usuarios/${user.id}/remover-acesso`,
        {
          method: 'POST',
          accessToken,
          body: {
            reenviarConvite,
            cargoCodigo: user.perfil,
          },
        },
      )
      toast.success(
        reenviarConvite
          ? 'Acesso removido e novo convite enviado'
          : 'Acesso removido da empresa',
      )
      const conviteLink = response.conviteReenviado?.links?.convite
      if (conviteLink) {
        onConviteReenviado?.({
          emailDestino: response.email,
          link: conviteLink,
          emailStatus: response.conviteReenviado?.entregaEmail?.status,
        })
      }
      await onSuccess()
      close()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover acesso')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnviarEmail = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      const response = await apiRequest<EmailActionResponse>(
        `/empresas/${empresaId}/gestao/usuarios/${user.id}/enviar-email`,
        {
          method: 'POST',
          accessToken,
          body: { mensagem: mensagem.trim() || undefined },
        },
      )
      setEmailResult(response)
      if (response.entregaEmail?.status === 'ENVIADO') {
        toast.success('E-mail de acesso enviado')
      } else {
        toast.message('Informações preparadas — verifique o status do envio')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar e-mail')
    } finally {
      setSubmitting(false)
    }
  }

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copiado`)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  if (!user) return null

  return (
    <>
      <AlertDialog open={action === 'status'} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.ativo ? 'Inativar usuário' : 'Ativar usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.ativo
                ? `${user.nome} não poderá acessar o sistema enquanto estiver inativo. Você pode reativar depois.`
                : `${user.nome} voltará a ter acesso ao sistema da empresa.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault()
                void handleStatus()
              }}
            >
              {submitting ? 'Salvando...' : user.ativo ? 'Inativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={action === 'perfil'} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar perfil</DialogTitle>
            <DialogDescription>
              Defina o perfil de acesso de {user.nome} na empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={perfil} onValueChange={(value) => setPerfil(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Perfil atual: {USER_ROLE_LABELS[user.perfil]}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={submitting}>Cancelar</Button>
            <Button onClick={() => void handlePerfil()} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'email'} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar e-mail</DialogTitle>
            <DialogDescription>
              O e-mail de login será atualizado no Supabase e no cadastro local de {user.nome}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="usuario-email">Novo e-mail</Label>
            <Input
              id="usuario-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={submitting}>Cancelar</Button>
            <Button onClick={() => void handleEmail()} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar e-mail'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'acesso'} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário de acesso</DialogTitle>
            <DialogDescription>
              Credencial usada no login por identificador (sem @). Apenas letras minúsculas, números, ponto, underline ou hífen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="usuario-acesso">Usuário de acesso</Label>
            <Input
              id="usuario-acesso"
              value={usuarioAcesso}
              onChange={(e) => setUsuarioAcesso(e.target.value.toLowerCase())}
              placeholder="joao.silva"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Entre 3 e 60 caracteres.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={submitting}>Cancelar</Button>
            <Button onClick={() => void handleAcesso()} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar credencial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'reset-senha'} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
            <DialogDescription>
              Será gerado um link de redefinição e enviado para <strong>{user.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          {emailResult ? (
            <div className="space-y-3 py-2">
              <Alert>
                <AlertTitle>Status do envio</AlertTitle>
                <AlertDescription>
                  {emailStatusMessage(emailResult.entregaEmail?.status)}
                </AlertDescription>
              </Alert>
              {emailResult.resetLink ? (
                <div className="space-y-2">
                  <Label>Link de redefinição</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={emailResult.resetLink} className="text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void copyText(emailResult.resetLink!, 'Link')}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              O usuário receberá um e-mail com botão para criar uma nova senha. O link expira automaticamente.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {emailResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {!emailResult ? (
              <Button onClick={() => void handleResetSenha()} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={action === 'remover-acesso'} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {user.nome} deixará de ter acesso a esta empresa. O vínculo local será removido
                  e convites anteriores serão cancelados.
                </p>
                <label className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    checked={reenviarConvite}
                    onCheckedChange={(checked) => setReenviarConvite(checked === true)}
                    disabled={submitting}
                  />
                  <span>
                    <span className="font-medium text-foreground">Reenviar convite por e-mail</span>
                    <span className="mt-1 block">
                      Gera um novo link de convite para {user.email} com o perfil atual ({USER_ROLE_LABELS[user.perfil]}).
                    </span>
                  </span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                void handleRemoverAcesso()
              }}
            >
              {submitting ? 'Removendo...' : 'Remover acesso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={action === 'enviar-email'} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar e-mail de acesso</DialogTitle>
            <DialogDescription>
              Envia um e-mail profissional com o link do portal e dados de login para {user.nome}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <p><span className="text-muted-foreground">Destinatário:</span> {user.email}</p>
              {user.usuarioAcesso ? (
                <p className="mt-1">
                  <span className="text-muted-foreground">Usuário de acesso:</span> {user.usuarioAcesso}
                </p>
              ) : null}
              {accessLink ? (
                <p className="mt-1 break-all">
                  <span className="text-muted-foreground">Portal:</span> {accessLink}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mensagem-email">Mensagem opcional</Label>
              <Textarea
                id="mensagem-email"
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Instruções adicionais para o usuário..."
              />
            </div>
            {emailResult ? (
              <Alert>
                <AlertTitle>Status do envio</AlertTitle>
                <AlertDescription>
                  {emailStatusMessage(emailResult.entregaEmail?.status)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {emailResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {!emailResult ? (
              <Button onClick={() => void handleEnviarEmail()} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar e-mail'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
