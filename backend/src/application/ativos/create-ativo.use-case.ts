import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AtivoListaItem } from '../../domain/entities/ativo';
import {
  ATIVO_REPOSITORY_PORT,
  type CreateAtivoInput,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

const NOME_MAX = 100;
const LIMITE_TEMP_MIN = 0.1;
const LIMITE_TEMP_MAX = 500;

@Injectable()
export class CreateAtivoUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    idUnidade: string,
    input: { nome: string; limiteTemp?: number },
  ): Promise<AtivoListaItem> {
    const nome = input.nome?.trim() ?? '';
    if (nome.length === 0 || nome.length > NOME_MAX) {
      throw new BadRequestException(
        `nome é obrigatório e deve ter até ${NOME_MAX} caracteres`,
      );
    }

    const limiteTemp = input.limiteTemp;
    if (limiteTemp !== undefined) {
      if (
        typeof limiteTemp !== 'number' ||
        Number.isNaN(limiteTemp) ||
        limiteTemp < LIMITE_TEMP_MIN ||
        limiteTemp > LIMITE_TEMP_MAX
      ) {
        throw new BadRequestException(
          `limiteTemp deve ser um número entre ${LIMITE_TEMP_MIN} e ${LIMITE_TEMP_MAX}`,
        );
      }
    }

    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }

    const payload: CreateAtivoInput = { idUnidade, nome };
    if (limiteTemp !== undefined) {
      payload.limiteTemp = limiteTemp;
    }

    try {
      return await this.ativos.create(payload);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new NotFoundException('Unidade fabril não encontrada');
      }
      throw e;
    }
  }
}
