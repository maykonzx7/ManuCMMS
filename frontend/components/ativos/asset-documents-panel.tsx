'use client'

import { useRef, useState } from 'react'
import { Download, Loader2, Trash2, Upload } from 'lucide-react'
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
import { resolveMediaUrl, downloadMediaFile } from '@/lib/media-url'
import { validateDocumentFile } from '@/lib/upload-limits'
import { getDocumentFormatMeta } from '@/lib/document-format'
import type { ApiAtivoDocumento } from '@/lib/backend-mappers'
import { cn } from '@/lib/utils'

const TIPO_LABELS: Record<ApiAtivoDocumento['tipo'], string> = {
  MANUAL: 'Manual',
  DIAGRAMA: 'Diagrama',
  DOCUMENTACAO: 'Documentação',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type AssetDocumentsPanelProps = {
  unidadeId: string
  ativoId: string
  accessToken: string
  documentos: ApiAtivoDocumento[]
  canManage: boolean
  onChange: () => void
}

export function AssetDocumentsPanel({
  unidadeId,
  ativoId,
  accessToken,
  documentos,
  canManage,
  onChange,
}: AssetDocumentsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState<ApiAtivoDocumento['tipo']>('MANUAL')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const uploadSingle = async (file: File) => {
    const error = validateDocumentFile(file)
    if (error) {
      throw new Error(error)
    }
    const formData = new FormData()
    formData.append('arquivo', file)
    formData.append('tipo', tipo)
    formData.append('nome', file.name)
    await apiRequest(`/unidades/${unidadeId}/ativos/${ativoId}/documentos`, {
      method: 'POST',
      accessToken,
      body: formData,
    })
  }

  const handleUploadBatch = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return

    setIsUploading(true)
    setUploadProgress({ done: 0, total: list.length })
    let success = 0
    let failed = 0

    for (const file of list) {
      try {
        await uploadSingle(file)
        success += 1
      } catch (e) {
        failed += 1
        if (failed === 1) {
          toast.error(e instanceof Error ? e.message : 'Falha ao enviar documento')
        }
      }
      setUploadProgress({ done: success + failed, total: list.length })
    }

    setIsUploading(false)
    setUploadProgress(null)
    if (fileRef.current) fileRef.current.value = ''

    if (success > 0) {
      toast.success(
        success === 1 ? 'Documento enviado' : `${success} documento(s) enviado(s)`,
      )
      onChange()
    }
    if (failed > 0) {
      toast.error(
        failed === 1
          ? 'Falha ao enviar 1 arquivo'
          : `Falha ao enviar ${failed} arquivo(s)`,
      )
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiRequest(`/unidades/${unidadeId}/ativos/${ativoId}/documentos/${id}`, {
        method: 'DELETE',
        accessToken,
      })
      toast.success('Documento removido')
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao remover documento')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (doc: ApiAtivoDocumento) => {
    setDownloadingId(doc.id)
    try {
      await downloadMediaFile(doc.url, doc.nome)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao baixar documento')
    } finally {
      setDownloadingId(null)
    }
  }

  const grouped = {
    MANUAL: documentos.filter((d) => d.tipo === 'MANUAL'),
    DIAGRAMA: documentos.filter((d) => d.tipo === 'DIAGRAMA'),
    DOCUMENTACAO: documentos.filter((d) => d.tipo === 'DOCUMENTACAO'),
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Documentação do Ativo</CardTitle>
        {canManage && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as ApiAtivoDocumento['tipo'])}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="DIAGRAMA">Diagrama</SelectItem>
                  <SelectItem value="DOCUMENTACAO">Documentação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => {
                const files = e.target.files
                if (files && files.length > 0) void handleUploadBatch(files)
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
              {uploadProgress
                ? `Enviando ${uploadProgress.done}/${uploadProgress.total}...`
                : 'Anexar em lote'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum manual, diagrama ou documentação anexado.
          </p>
        ) : (
          (Object.keys(grouped) as ApiAtivoDocumento['tipo'][]).map((key) => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <div key={key} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {TIPO_LABELS[key]}
                </p>
                <div className="space-y-2">
                  {items.map((doc) => {
                    const format = getDocumentFormatMeta(doc.mimeType, doc.nome)
                    const FormatIcon = format.icon
                    const isImage = doc.mimeType.startsWith('image/')
                    const mediaUrl = resolveMediaUrl(doc.url)

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                              format.badgeClass,
                            )}
                          >
                            <FormatIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate font-medium text-primary hover:underline"
                              >
                                {doc.nome}
                              </a>
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                                  format.badgeClass,
                                )}
                              >
                                {format.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.tamanhoBytes)} ·{' '}
                              {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                            {isImage && mediaUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={mediaUrl}
                                alt={doc.nome}
                                className="mt-2 max-h-24 rounded border object-contain"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Baixar"
                            disabled={downloadingId === doc.id}
                            onClick={() => void handleDownload(doc)}
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remover"
                              disabled={deletingId === doc.id}
                              onClick={() => void handleDelete(doc.id)}
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
