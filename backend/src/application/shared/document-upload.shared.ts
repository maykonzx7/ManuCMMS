const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = ['image/'] as const;

const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

export function isAllowedDocumentMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  if (ALLOWED_MIME_EXACT.has(normalized)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function assertAllowedDocumentFile(file: Express.Multer.File): void {
  if (!isAllowedDocumentMimeType(file.mimetype)) {
    throw new Error(
      'Tipo de arquivo não permitido. Use imagens, PDF ou documentos Office.',
    );
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error('Arquivo excede o limite de 15 MB.');
  }
}

export { MAX_DOCUMENT_SIZE_BYTES };
