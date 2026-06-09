const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_OS_EVIDENCE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function isImagemMimeType(mimeType: string): boolean {
  return mimeType.trim().toLowerCase().startsWith('image/');
}

export function assertAllowedImageFile(file: Express.Multer.File): void {
  if (!isImagemMimeType(file.mimetype)) {
    throw new Error('Apenas arquivos de imagem são permitidos.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Imagem excede o limite de 5 MB.');
  }
}

export function assertAllowedOsEvidenceImageFile(file: Express.Multer.File): void {
  if (!isImagemMimeType(file.mimetype)) {
    throw new Error('Apenas arquivos de imagem são permitidos.');
  }
  if (file.size > MAX_OS_EVIDENCE_IMAGE_SIZE_BYTES) {
    throw new Error('Imagem excede o limite de 10 MB.');
  }
}

export { MAX_IMAGE_SIZE_BYTES, MAX_OS_EVIDENCE_IMAGE_SIZE_BYTES };
