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
const TAG_MAX = 80;
const FABRICANTE_MAX = 120;
const MODELO_MAX = 120;
const NUMERO_SERIE_MAX = 120;
const OBSERVACOES_MAX = 500;
const LIMITE_TEMP_MIN = 0;
const LIMITE_TEMP_MAX = 200;

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
    input: {
      nome: string;
      limiteTemp?: number;
      tag?: string;
      fabricante?: string;
      modelo?: string;
      numeroSerie?: string;
      observacoes?: string;
    },
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
    const tag = this.normalizeOptionalField(input.tag, TAG_MAX, 'tag');
    const fabricante = this.normalizeOptionalField(
      input.fabricante,
      FABRICANTE_MAX,
      'fabricante',
    );
    const modelo = this.normalizeOptionalField(input.modelo, MODELO_MAX, 'modelo');
    const numeroSerie = this.normalizeOptionalField(
      input.numeroSerie,
      NUMERO_SERIE_MAX,
      'numeroSerie',
    );
    const observacoes = this.normalizeOptionalField(
      input.observacoes,
      OBSERVACOES_MAX,
      'observacoes',
    );

    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }

    if (!unidadeOk.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    const ativosUnidade = await this.ativos.listByUnidade(unidadeOk.empresaId, idUnidade);
    const nomeJaExiste = ativosUnidade.some(
      (ativo) =>
        ativo.status === 'OPERACIONAL' &&
        ativo.nome.trim().toLowerCase() === nome.toLowerCase(),
    );
    if (nomeJaExiste) {
      throw new BadRequestException(
        'Já existe ativo operacional com este nome nesta unidade.',
      );
    }

    const payload: CreateAtivoInput = {
      empresaId: unidadeOk.empresaId,
      idUnidade,
      nome,
    };
    if (limiteTemp !== undefined) {
      payload.limiteTemp = limiteTemp;
    }
    if (tag !== undefined) payload.tag = tag;
    if (fabricante !== undefined) payload.fabricante = fabricante;
    if (modelo !== undefined) payload.modelo = modelo;
    if (numeroSerie !== undefined) payload.numeroSerie = numeroSerie;
    if (observacoes !== undefined) payload.observacoes = observacoes;

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

  private normalizeOptionalField(
    value: string | undefined,
    maxLength: number,
    field: string,
  ): string | undefined {
    if (value === undefined) return undefined;
    const normalized = value.trim();
    if (normalized.length === 0) return '';
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${field} deve ter até ${maxLength} caracteres`,
      );
    }
    return normalized;
  }
}
