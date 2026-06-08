import {
  File,
  FileSpreadsheet,
  FileText,
  FileType,
  ImageIcon,
  type LucideIcon,
} from 'lucide-react'

export type DocumentFormatMeta = {
  icon: LucideIcon
  label: string
  badgeClass: string
}

function extensionFromName(fileName: string): string {
  const parts = fileName.trim().split('.')
  if (parts.length < 2) return ''
  return (parts.pop() ?? '').toLowerCase()
}

export function getDocumentFormatMeta(
  mimeType: string,
  fileName: string,
): DocumentFormatMeta {
  const mime = mimeType.trim().toLowerCase()
  const ext = extensionFromName(fileName)

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return {
      icon: ImageIcon,
      label: ext.toUpperCase() || 'IMG',
      badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    }
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return {
      icon: FileType,
      label: 'PDF',
      badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    }
  }

  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    ['xls', 'xlsx', 'csv'].includes(ext)
  ) {
    return {
      icon: FileSpreadsheet,
      label: ext.toUpperCase() || 'XLS',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    }
  }

  if (
    mime.includes('word') ||
    mime === 'application/msword' ||
    ['doc', 'docx', 'odt', 'rtf'].includes(ext)
  ) {
    return {
      icon: FileText,
      label: ext.toUpperCase() || 'DOC',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    }
  }

  if (mime === 'text/plain' || ext === 'txt') {
    return {
      icon: FileText,
      label: 'TXT',
      badgeClass: 'bg-muted text-muted-foreground',
    }
  }

  return {
    icon: File,
    label: ext.toUpperCase() || 'ARQ',
    badgeClass: 'bg-muted text-muted-foreground',
  }
}
