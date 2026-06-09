import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildUploadPublicPath } from '../../application/shared/upload-url.shared';
import { deleteLocalUploadIfStored } from '../../application/shared/delete-local-upload.shared';
import { SupabaseStorageService } from './supabase-storage.service';

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? 'uploads';

export type ManagedUploadSubdir =
  | 'ativos'
  | 'ordens-servico'
  | 'documentos'
  | 'usuarios';

export type StoreManagedFileInput = {
  subdir: ManagedUploadSubdir;
  scopeSegments?: string[];
  buffer: Buffer;
  contentType: string;
  originalname: string;
};

@Injectable()
export class ManagedUploadService {
  constructor(private readonly supabaseStorage: SupabaseStorageService) {}

  isManagedUrl(url: string | null | undefined): boolean {
    const trimmed = url?.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith(`/${UPLOADS_DIR}/`)) return true;
    return this.supabaseStorage.isManagedPublicUrl(trimmed);
  }

  async storeFile(input: StoreManagedFileInput): Promise<string> {
    const extension = extname(input.originalname) || '';
    const filename = `${randomUUID()}${extension}`;

    if (this.supabaseStorage.isConfigured()) {
      const segments = input.scopeSegments?.filter(Boolean) ?? [];
      const objectPath = [input.subdir, ...segments, filename].join('/');
      return this.supabaseStorage.uploadToPublicPath(
        objectPath,
        input.buffer,
        input.contentType,
      );
    }

    const uploadDir = join(process.cwd(), UPLOADS_DIR, input.subdir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), input.buffer);
    return buildUploadPublicPath(input.subdir, filename);
  }

  async deleteIfStored(url: string | null | undefined): Promise<void> {
    if (!url?.trim()) return;
    await this.supabaseStorage.deleteManagedFileIfStored(url);
    await deleteLocalUploadIfStored(url);
  }
}
