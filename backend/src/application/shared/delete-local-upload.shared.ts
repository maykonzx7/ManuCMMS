import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? 'uploads';

/** Remove arquivo local salvo em `/uploads/**` (ignora URLs externas). */
export async function deleteLocalUploadIfStored(
  publicPath: string | null | undefined,
): Promise<void> {
  const trimmed = publicPath?.trim();
  if (!trimmed) return;

  const prefix = `/${UPLOADS_DIR}/`;
  if (!trimmed.startsWith(prefix)) return;

  const relative = trimmed.slice(prefix.length);
  if (!relative || relative.includes('..')) return;

  const absolute = join(process.cwd(), UPLOADS_DIR, relative);
  try {
    await unlink(absolute);
  } catch {
    // arquivo já removido ou inexistente
  }
}
