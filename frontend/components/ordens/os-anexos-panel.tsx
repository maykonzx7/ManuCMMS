'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiRequest } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media-url'
import { validateDocumentFile } from '@/lib/upload-limits'
import type { ApiOrdemAnexo } from '@/lib/backend-mappers'

const CATEGORIA_LABELS: Record<ApiOrdemAnexo['categoria'], string> = {
  PROBLEMA: 'Problema',
  RESOLUCAO: 'Resolução',
  GERAL: 'Geral',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type OsAnexosPanelProps = {
  unidadeId: string
  ordemId: string
  accessToken: string
  anexos: ApiOrdemAnexo[]
  canUpload?: boolean
  canDelete?: boolean
  canManage?: boolean
  onChange: () => void
}

export function OsAnexosPanel({
  unidadeId,
  ordemId,
  accessToken,
  anexos,
  canUpload,
  canDelete,
  canManage = false,
  onChange,
}: OsAnexosPanelProps) {
  const allowUpload = canUpload ?? canManage
  const allowDelete = canDelete ?? canManage
  const fileRef = useRef<HTMLInputElement>(null)
  const [categoria, setCategoria] = useState<ApiOrdemAnexo['categoria']>('GERAL')
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    const validationError = validateDocumentFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('categoria', categoria)
      formData.append('nome', file.name)
      await apiRequest(`/unidades/${unidadeId}/ordens-servico/${ordemId}/anexos`, {
        method: 'POST',
        accessToken,
        body: formData,
      })
      toast.success('Anexo enviado')
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar anexo')
    } finally {
      setIsUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiRequest(
        `/unidades/${unidadeId}/ordens-servico/${ordemId}/anexos/${id}`,
        { method: 'DELETE', accessToken },
      )
      toast.success('Anexo removido')
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao remover anexo')
    } finally {
      setDeletingId(null)
    }
  }

  const grouped = {
    PROBLEMA: anexos.filter((a) => a.categoria === 'PROBLEMA'),
    RESOLUCAO: anexos.filter((a) => a.categoria === 'RESOLUCAO'),
    GERAL: anexos.filter((a) => a.categoria === 'GERAL'),
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Documentos da OS</CardTitle>
        {allowUpload && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select
                value={categoria}
                onValueChange={(v) => setCategoria(v as ApiOrdemAnexo['categoria'])}
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROBLEMA">Problema</SelectItem>
                  <SelectItem value="RESOLUCAO">Resolução</SelectItem>
                  <SelectItem value="GERAL">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
              }}
            />
            <Button
              size="sm"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Anexar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {anexos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum documento adicional anexado à ordem de serviço.
          </p>
        ) : (
          (Object.keys(grouped) as ApiOrdemAnexo['categoria'][]).map((key) => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <div key={key} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {CATEGORIA_LABELS[key]}
                </p>
                <div className="space-y-2">
                  {items.map((anexo) => (
                    <div
                      key={anexo.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <a
                            href={resolveMediaUrl(anexo.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate font-medium text-primary hover:underline"
                          >
                            {anexo.nome}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(anexo.tamanhoBytes)} ·{' '}
                            {new Date(anexo.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      {allowDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === anexo.id}
                          onClick={() => void handleDelete(anexo.id)}
                        >
                          {deletingId === anexo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
