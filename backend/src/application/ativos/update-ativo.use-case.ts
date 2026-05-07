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
  type StatusAtivoPersistido,
} from '../../domain/ports/ativo.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

const NOME_MAX = 100;
const LIMITE_TEMP_MIN = 0.1;
const LIMITE_TEMP_MAX = 500;
const STATUS_VALIDOS: StatusAtivoPersistido[] = ['OPERACIONAL', 'MANUTENCAO', 'FALHA'];

@Injectable()
export class UpdateAtivoUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
    input: { nome?: string; limiteTemp?: number; status?: string },
  ): Promise<AtivoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const nomeNormalizado = input.nome?.trim();
    if (input.nome !== undefined && (!nomeNormalizado || nomeNormalizado.length > NOME_MAX)) {
      throw new BadRequestException(
        `nome deve ter entre 1 e ${NOME_MAX} caracteres`,
      );
    }

    if (input.limiteTemp !== undefined) {
      if (
        typeof input.limiteTemp !== 'number' ||
        Number.isNaN(input.limiteTemp) ||
        input.limiteTemp < LIMITE_TEMP_MIN ||
        input.limiteTemp > LIMITE_TEMP_MAX
      ) {
        throw new BadRequestException(
          `limiteTemp deve ser um número entre ${LIMITE_TEMP_MIN} e ${LIMITE_TEMP_MAX}`,
        );
      }
    }

    const status = input.status as StatusAtivoPersistido | undefined;
    if (input.status !== undefined && !STATUS_VALIDOS.includes(status as StatusAtivoPersistido)) {
      throw new BadRequestException(
        `status deve ser um de: ${STATUS_VALIDOS.join(', ')}`,
      );
    }

    if (
      nomeNormalizado === undefined &&
      input.limiteTemp === undefined &&
      input.status === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualização');
    }

    const atualizado = await this.ativos.update({
      empresaId: unidade.empresaId,
      idUnidade,
      idAtivo,
      nome: nomeNormalizado,
      limiteTemp: input.limiteTemp,
      status,
    });

    if (!atualizado) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }
    return atualizado;
  }
}
