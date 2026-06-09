import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ATIVO_DOCUMENTO_REPOSITORY_PORT,
  type IAtivoDocumentoRepositoryPort,
} from '../../domain/ports/ativo-documento.repository.port';
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

@Injectable()
export class DeleteAtivoUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(ATIVO_DOCUMENTO_REPOSITORY_PORT)
    private readonly documentos: IAtivoDocumentoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLog: IAuditLogPort,
    private readonly managedUpload: ManagedUploadService,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
    removidoPorUsuarioId: string,
  ): Promise<void> {
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

    const documentos = await this.documentos.listByAtivo(
      unidade.empresaId,
      idUnidade,
      idAtivo,
    );
    const storedUrls = [
      antes.fotoUrl,
      ...documentos.map((doc) => doc.url),
    ].filter((url): url is string => Boolean(url?.trim()));

    try {
      const removed = await this.ativos.deleteByIdInUnidade(
        unidade.empresaId,
        idUnidade,
        idAtivo,
      );
      if (!removed) {
        throw new NotFoundException(
          'Ativo não encontrado nesta unidade fabril',
        );
      }

      await this.auditLog.append({
        idUsuario: removidoPorUsuarioId,
        entidadeAfetada: 'Ativo',
        idRegistro: antes.id,
        valorAnterior: {
          id: antes.id,
          idUnidade: antes.idUnidade,
          nome: antes.nome,
          status: antes.status,
          limiteTemp: antes.limiteTemp,
          tag: antes.tag,
          fabricante: antes.fabricante,
          modelo: antes.modelo,
          numeroSerie: antes.numeroSerie,
          observacoes: antes.observacoes,
          custoHoraParada: antes.custoHoraParada,
          custoManutencaoMensal: antes.custoManutencaoMensal,
        },
        valorNovo: {
          acao: 'DELETE',
        },
      });

      for (const url of storedUrls) {
        await this.managedUpload.deleteIfStored(url);
      }
    } catch (e) {
      const isForeignKeyViolationViaExecuteRaw =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2010' &&
        typeof e.meta?.code === 'string' &&
        e.meta.code === '23503';
      if (
        (e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2003') ||
        isForeignKeyViolationViaExecuteRaw
      ) {
        throw new ConflictException(
          'Ativo possui ordens de serviço relacionadas e não pode ser removido; inative o cadastro em vez de excluir.',
        );
      }
      throw e;
    }
  }
}
