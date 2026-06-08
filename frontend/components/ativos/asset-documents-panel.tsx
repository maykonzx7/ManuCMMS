'use client'

import { useRef, useState } from 'react'
import { BookOpen, FileText, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
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
import type { ApiAtivoDocumento } from '@/lib/backend-mappers'

const TIPO_LABELS: Record<ApiAtivoDocumento['tipo'], string> = {
  MANUAL: 'Manual',
  DIAGRAMA: 'Diagrama',
  DOCUMENTACAO: 'Documentação',
}

const TIPO_ICONS: Record<ApiAtivoDocumento['tipo'], typeof FileText> = {
  MANUAL: BookOpen,
  DIAGRAMA: ImageIcon,
  DOCUMENTACAO: FileText,
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('tipo', tipo)
      formData.append('nome', file.name)
      await apiRequest(`/unidades/${unidadeId}/ativos/${ativoId}/documentos`, {
        method: 'POST',
        accessToken,
        body: formData,
      })
      toast.success('Documento enviado')
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar documento')
    } finally {
      setIsUploading(false)
      if (fileRef.current) fileRef.current.value = ''
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
        {documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum manual, diagrama ou documentação anexado.
          </p>
        ) : (
          (Object.keys(grouped) as ApiAtivoDocumento['tipo'][]).map((key) => {
            const items = grouped[key]
            if (items.length === 0) return null
            const Icon = TIPO_ICONS[key]
            return (
              <div key={key} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {TIPO_LABELS[key]}
                </p>
                <div className="space-y-2">
                  {items.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <a
                            href={resolveMediaUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate font-medium text-primary hover:underline"
                          >
                            {doc.nome}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.tamanhoBytes)} ·{' '}
                            {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
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
