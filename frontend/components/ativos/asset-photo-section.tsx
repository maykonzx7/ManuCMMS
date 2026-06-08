'use client'

import { useMemo, useRef, useState } from 'react'
import { Camera, Loader2, Package, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media-url'
import type { ApiAtivo } from '@/lib/backend-mappers'
import { cn } from '@/lib/utils'

type AssetPhotoSectionProps = {
  unidadeId: string
  ativoId: string
  accessToken: string
  fotoUrl?: string | null
  canManage: boolean
  onChange: (fotoUrl: string | null) => void
  className?: string
  compact?: boolean
}

export function AssetPhotoSection({
  unidadeId,
  ativoId,
  accessToken,
  fotoUrl,
  canManage,
  onChange,
  className,
  compact = false,
}: AssetPhotoSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const previewUrl = useMemo(() => {
    if (fotoFile) return URL.createObjectURL(fotoFile)
    return resolveMediaUrl(fotoUrl) ?? null
  }, [fotoFile, fotoUrl])

  const handleSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem excede o limite de 5 MB.')
      return
    }
    setFotoFile(file)
  }

  const handleSave = async () => {
    if (!fotoFile) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('foto', fotoFile)
      const res = await apiRequest<ApiAtivo>(
        `/unidades/${unidadeId}/ativos/${ativoId}/foto`,
        { method: 'PATCH', accessToken, body: formData },
      )
      onChange(res.fotoUrl ?? null)
      setFotoFile(null)
      toast.success('Foto do ativo atualizada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar foto')
    } finally {
      setIsSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setIsSaving(true)
    try {
      await apiRequest(`/unidades/${unidadeId}/ativos/${ativoId}/foto`, {
        method: 'PATCH',
        accessToken,
        body: { removerFoto: 'true' },
      })
      onChange(null)
      setFotoFile(null)
      toast.success('Foto removida')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao remover foto')
    } finally {
      setIsSaving(false)
    }
  }

  const sizeClass = compact ? 'h-24 w-24' : 'h-40 w-40 sm:h-48 sm:w-48'

  return (
    <div className={cn('flex flex-col items-start gap-3', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border bg-muted',
          sizeClass,
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Foto do ativo"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className={compact ? 'h-8 w-8' : 'h-12 w-12'} />
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleSelect(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            {previewUrl ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {fotoFile && (
            <Button type="button" size="sm" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar foto
            </Button>
          )}
          {(fotoUrl || fotoFile) && !fotoFile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => void handleRemove()}
            >
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              Remover
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
