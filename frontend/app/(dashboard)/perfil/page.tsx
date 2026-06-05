'use client'

import { useEffect, useMemo, useState } from 'react'
import { Camera, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuth, useCurrentUser } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media-url'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { PageDataLoading } from '@/components/shared'

type MeResponse = {
  usuario: {
    id: string
    nome: string
    email: string
    fotoUrl?: string | null
    perfil: string
    cargos: Array<{
      id: string
      codigo: string
      nome: string
      nivelHierarquico: number
    }>
  } | null
}

export default function PerfilPage() {
  const { accessToken, refreshSession } = useAuth()
  const currentUser = useCurrentUser()
  const [me, setMe] = useState<MeResponse['usuario']>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)

  const previewUrl = useMemo(() => {
    if (fotoFile) return URL.createObjectURL(fotoFile)
    return resolveMediaUrl(me?.fotoUrl ?? currentUser?.avatar ?? null) ?? null
  }, [fotoFile, me?.fotoUrl, currentUser?.avatar])

  useEffect(() => {
    return () => {
      if (fotoFile && previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [fotoFile, previewUrl])

  useEffect(() => {
    if (!accessToken) return
    setIsPageLoading(true)
    void apiRequest<MeResponse>('/me', { accessToken })
      .then((res) => setMe(res.usuario))
      .catch(() => setMe(null))
      .finally(() => setIsPageLoading(false))
  }, [accessToken])

  const initials = (me?.nome ?? currentUser?.nome ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const cargoPrincipal = me?.cargos?.[0]

  async function removerFoto() {
    if (!accessToken) return
    setSalvando(true)
    try {
      const formData = new FormData()
      formData.append('removerFoto', 'true')
      const res = await apiRequest<{ usuario: MeResponse['usuario'] }>('/me/perfil', {
        method: 'PATCH',
        accessToken,
        body: formData,
      })
      setMe(res.usuario)
      setFotoFile(null)
      await refreshSession()
      toast.success('Foto removida.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover foto')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarFoto() {
    if (!accessToken || !fotoFile) return
    setSalvando(true)
    try {
      const formData = new FormData()
      formData.append('foto', fotoFile)
      const res = await apiRequest<{ usuario: MeResponse['usuario'] }>('/me/perfil', {
        method: 'PATCH',
        accessToken,
        body: formData,
      })
      setMe(res.usuario)
      setFotoFile(null)
      await refreshSession()
      toast.success('Foto de perfil atualizada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar foto')
    } finally {
      setSalvando(false)
    }
  }

  if (isPageLoading) {
    return <PageDataLoading variant="form" message="Carregando seu perfil..." />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Visualize seus dados e personalize sua foto de perfil.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Dados do usuário
          </CardTitle>
          <CardDescription>
            Nome e cargo são gerenciados pela empresa. A foto pode ser alterada por você.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 rounded-xl">
              <AvatarImage src={previewUrl ?? undefined} alt={me?.nome ?? 'Perfil'} />
              <AvatarFallback className="rounded-xl text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-lg font-semibold">{me?.nome ?? currentUser?.nome}</p>
                <p className="text-sm text-muted-foreground">{me?.email ?? currentUser?.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {USER_ROLE_LABELS[(me?.perfil ?? currentUser?.perfil ?? 'TECNICO') as keyof typeof USER_ROLE_LABELS]}
                </Badge>
                {cargoPrincipal ? (
                  <Badge variant="secondary">{cargoPrincipal.nome}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <Label>Foto de perfil</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = () => setFotoFile(input.files?.[0] ?? null)
                  input.click()
                }}
              >
                <Camera className="mr-2 h-4 w-4" />
                {fotoFile || me?.fotoUrl ? 'Trocar foto' : 'Adicionar foto'}
              </Button>
              {fotoFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFotoFile(null)}
                >
                  Cancelar seleção
                </Button>
              ) : null}
              {!fotoFile && me?.fotoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  disabled={salvando}
                  onClick={() => void removerFoto()}
                >
                  Remover foto
                </Button>
              ) : null}
            </div>
            {fotoFile ? (
              <Button disabled={salvando} onClick={() => void salvarFoto()}>
                {salvando ? 'Salvando...' : 'Salvar foto'}
              </Button>
            ) : null}
          </div>

          {me?.cargos && me.cargos.length > 1 ? (
            <div className="space-y-2">
              <Label>Cargos vinculados</Label>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {me.cargos.map((cargo) => (
                  <li key={cargo.id}>• {cargo.nome} ({cargo.codigo})</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
