const UPLOADS_DIR = process.env.UPLOAD_DIR ?? 'uploads';

/** Caminho público relativo servido via `/uploads/**` (proxy no frontend em produção). */
export function buildUploadPublicPath(
  subdir: 'usuarios' | 'ordens-servico' | 'ativos' | 'documentos',
  filename: string,
): string {
  return `/${UPLOADS_DIR}/${subdir}/${filename}`;
}
