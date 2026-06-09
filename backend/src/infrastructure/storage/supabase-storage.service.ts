import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStorageService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.baseUrl() && this.serviceRole() && this.bucket());
  }

  buildPublicUrl(objectPath: string): string {
    const baseUrl = this.baseUrl();
    const bucket = this.bucket();
    const normalizedPath = objectPath.replace(/^\/+/, '');
    return `${baseUrl}/storage/v1/object/public/${bucket}/${normalizedPath}`;
  }

  isManagedPublicUrl(url: string | null | undefined): boolean {
    if (!url?.trim() || !this.isConfigured()) return false;
    const prefix = `${this.baseUrl()}/storage/v1/object/public/${this.bucket()}/`;
    return url.startsWith(prefix);
  }

  extractObjectPathFromPublicUrl(url: string): string | null {
    if (!this.isManagedPublicUrl(url)) return null;
    const prefix = `${this.baseUrl()}/storage/v1/object/public/${this.bucket()}/`;
    return url.slice(prefix.length);
  }

  async uploadToPublicPath(
    objectPath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.uploadObject(objectPath, buffer, contentType);
    return this.buildPublicUrl(objectPath);
  }

  async deleteManagedFileIfStored(fileUrl: string | null | undefined): Promise<void> {
    const objectPath = fileUrl
      ? this.extractObjectPathFromPublicUrl(fileUrl)
      : null;
    if (!objectPath) return;
    await this.deleteObject(objectPath);
  }

  /** @deprecated use deleteManagedFileIfStored */
  async deleteProfilePhotoIfStored(fotoUrl: string | null | undefined): Promise<void> {
    return this.deleteManagedFileIfStored(fotoUrl);
  }

  private bucket(): string {
    return (
      this.config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() || 'avatars'
    );
  }

  private baseUrl(): string | undefined {
    return this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
  }

  private serviceRole(): string | undefined {
    return this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  }

  private async uploadObject(
    objectPath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    const baseUrl = this.baseUrl();
    const serviceRole = this.serviceRole();
    const bucket = this.bucket();
    if (!baseUrl || !serviceRole) {
      throw new InternalServerErrorException(
        'Supabase Storage não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
      );
    }

    const response = await fetch(
      `${baseUrl}/storage/v1/object/${bucket}/${objectPath}`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(buffer),
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      throw new InternalServerErrorException(
        payload?.message ||
          payload?.error ||
          `Falha ao enviar arquivo para Supabase Storage (${response.status}).`,
      );
    }
  }

  private async deleteObject(objectPath: string): Promise<void> {
    const baseUrl = this.baseUrl();
    const serviceRole = this.serviceRole();
    const bucket = this.bucket();
    if (!baseUrl || !serviceRole) return;

    await fetch(`${baseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    }).catch(() => undefined);
  }
}
