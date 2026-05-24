import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

@Injectable()
export class DeleteAtivoUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(idUnidade: string, idAtivo: string): Promise<void> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    try {
      const removed = await this.ativos.deleteByIdInUnidade(
        unidade.empresaId,
        idUnidade,
        idAtivo,
      );
      if (!removed) {
        throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
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
