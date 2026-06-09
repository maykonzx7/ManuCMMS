export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
export const MAX_OS_EVIDENCE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024

export function formatMaxFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

export function validateImageFile(
  file: File,
  maxBytes: number = MAX_IMAGE_SIZE_BYTES,
): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Selecione um arquivo de imagem.'
  }
  if (file.size > maxBytes) {
    return `Imagem excede o limite de ${formatMaxFileSize(maxBytes)}.`
  }
  return null
}

export function validateOsEvidenceImageFile(file: File): string | null {
  return validateImageFile(file, MAX_OS_EVIDENCE_IMAGE_SIZE_BYTES)
}

const DOCUMENT_MIME_PREFIXES = ['image/'] as const
const DOCUMENT_MIME_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
])

function isAllowedDocumentMime(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase()
  if (DOCUMENT_MIME_EXACT.has(normalized)) return true
  return DOCUMENT_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

export function validateDocumentFile(file: File): string | null {
  if (!isAllowedDocumentMime(file.type)) {
    return 'Tipo não permitido. Use imagens, PDF ou documentos Office.'
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return `Arquivo excede o limite de ${formatMaxFileSize(MAX_DOCUMENT_SIZE_BYTES)}.`
  }
  return null
}
