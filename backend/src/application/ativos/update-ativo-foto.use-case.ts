import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { ManagedUploadService } from '../../infrastructure/storage/managed-upload.service';

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
    private readonly managedUpload: ManagedUploadService,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
    input: {
      fotoUrl: string | null;
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
        nextFotoUrl = await this.managedUpload.storeFile({
          subdir: 'ativos',
          scopeSegments: [unidade.empresaId, idAtivo],
          buffer: input.file.buffer,
          contentType: input.file.mimetype,
          originalname: input.file.originalname,
        });
      } else if (input.fotoUrl) {
        nextFotoUrl = input.fotoUrl;
      }
    }

    if (nextFotoUrl !== null && !this.managedUpload.isManagedUrl(nextFotoUrl)) {
      throw new BadRequestException('URL de foto inválida');
    }

    if (antes.fotoUrl && antes.fotoUrl !== nextFotoUrl) {
      await this.managedUpload.deleteIfStored(antes.fotoUrl);
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
}
