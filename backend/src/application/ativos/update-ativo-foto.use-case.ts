import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AtivoListaItem } from '../../domain/entities/ativo';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import { SupabaseStorageService } from '../../infrastructure/storage/supabase-storage.service';
import { deleteLocalUploadIfStored } from '../shared/delete-local-upload.shared';
import { buildUploadPublicPath } from '../shared/upload-url.shared';

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? 'uploads';

type UploadedFotoFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class UpdateAtivoFotoUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLog: IAuditLogPort,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
    input: {
      fotoUrl: string | null;
      filename?: string;
      file?: UploadedFotoFile;
    },
    atualizadoPorUsuarioId: string,
  ): Promise<AtivoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const antes = await this.ativos.findByIdInUnidade(
      unidade.empresaId,
      idUnidade,
      idAtivo,
    );
    if (!antes) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }

    let nextFotoUrl: string | null = null;
    if (input.fotoUrl !== null) {
      if (input.file) {
        nextFotoUrl = await this.storeFotoFile(
          unidade.empresaId,
          idAtivo,
          input.file,
        );
      } else if (input.filename) {
        nextFotoUrl = buildUploadPublicPath('ativos', input.filename);
      } else if (input.fotoUrl) {
        nextFotoUrl = input.fotoUrl;
      }
    }

    if (
      nextFotoUrl !== null &&
      !nextFotoUrl.startsWith('/uploads/ativos/') &&
      !this.supabaseStorage.isManagedPublicUrl(nextFotoUrl)
    ) {
      throw new BadRequestException('URL de foto inválida');
    }

    if (antes.fotoUrl && antes.fotoUrl !== nextFotoUrl) {
      await this.supabaseStorage.deleteProfilePhotoIfStored(antes.fotoUrl);
      await deleteLocalUploadIfStored(antes.fotoUrl);
    }

    const atualizado = await this.ativos.updateFotoUrl(
      unidade.empresaId,
      idUnidade,
      idAtivo,
      nextFotoUrl,
    );

    if (!atualizado) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }

    await this.auditLog.append({
      idUsuario: atualizadoPorUsuarioId,
      entidadeAfetada: 'Ativo',
      idRegistro: atualizado.id,
      valorAnterior: { fotoUrl: antes.fotoUrl ?? null, idUnidade },
      valorNovo: {
        acao: 'UPDATE_FOTO',
        fotoUrl: atualizado.fotoUrl ?? null,
        idUnidade,
      },
    });

    return atualizado;
  }

  private async storeFotoFile(
    empresaId: string,
    ativoId: string,
    file: UploadedFotoFile,
  ): Promise<string> {
    const extension = extname(file.originalname || '') || '.jpg';

    if (this.supabaseStorage.isConfigured()) {
      return this.supabaseStorage.uploadAtivoPhoto({
        empresaId,
        ativoId,
        buffer: file.buffer,
        contentType: file.mimetype,
        extension,
      });
    }

    const uploadDir = join(process.cwd(), UPLOADS_DIR, 'ativos');
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, filename), file.buffer);
    return buildUploadPublicPath('ativos', filename);
  }
}
