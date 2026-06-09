'use client'

import { useMemo, useRef, useState } from 'react'
import { Camera, Expand, Loader2, Package, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  /** Miniatura em formulários auxiliares */
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
  const [isExpanded, setIsExpanded] = useState(false)

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
      setIsExpanded(false)
      toast.success('Foto removida')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao remover foto')
    } finally {
      setIsSaving(false)
    }
  }

  const frameClass = compact
    ? 'h-28 w-28'
    : 'aspect-[4/3] w-full min-h-[220px] max-w-full sm:min-h-[280px] lg:max-w-[420px]'

  return (
    <div className={cn('flex w-full flex-col items-stretch gap-3', className)}>
      <button
        type="button"
        disabled={!previewUrl}
        onClick={() => previewUrl && setIsExpanded(true)}
        className={cn(
          'group relative overflow-hidden rounded-xl border bg-muted shadow-sm transition-shadow',
          frameClass,
          previewUrl && 'cursor-zoom-in hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !previewUrl && 'cursor-default',
        )}
        aria-label={previewUrl ? 'Ampliar foto do ativo' : 'Sem foto do ativo'}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Foto do ativo"
              className="h-full w-full object-cover"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent py-2 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Expand className="h-3.5 w-3.5" />
              Ampliar
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className={compact ? 'h-10 w-10' : 'h-16 w-16'} />
          </div>
        )}
      </button>

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

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl border-0 bg-transparent p-2 shadow-none sm:max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto do ativo ampliada</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Foto do ativo ampliada"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
