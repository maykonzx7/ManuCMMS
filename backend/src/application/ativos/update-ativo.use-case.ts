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
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import {
  normalizeAtivoCoordenada,
  normalizeAtivoLocalizacao,
} from './ativo-location.shared';

const NOME_MAX = 100;
const TAG_MAX = 80;
const FABRICANTE_MAX = 120;
const MODELO_MAX = 120;
const NUMERO_SERIE_MAX = 120;
const OBSERVACOES_MAX = 500;
const LIMITE_TEMP_MIN = 0;
const LIMITE_TEMP_MAX = 200;
const CUSTO_MIN = 0;
const CUSTO_MAX = 1_000_000_000;
const STATUS_VALIDOS: StatusAtivoPersistido[] = [
  'OPERACIONAL',
  'MANUTENCAO',
  'FALHA',
  'INATIVO',
];

@Injectable()
export class UpdateAtivoUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLog: IAuditLogPort,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
    input: {
      nome?: string;
      limiteTemp?: number;
      status?: string;
      tag?: string;
      fabricante?: string;
      modelo?: string;
      numeroSerie?: string;
      observacoes?: string;
      custoHoraParada?: number;
      custoManutencaoMensal?: number;
      localizacao?: string;
      latitude?: number | null;
      longitude?: number | null;
    },
    atualizadoPorUsuarioId: string,
  ): Promise<AtivoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const nomeNormalizado = input.nome?.trim();
    if (
      input.nome !== undefined &&
      (!nomeNormalizado || nomeNormalizado.length > NOME_MAX)
    ) {
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
    if (input.custoHoraParada !== undefined) {
      if (
        typeof input.custoHoraParada !== 'number' ||
        Number.isNaN(input.custoHoraParada) ||
        input.custoHoraParada < CUSTO_MIN ||
        input.custoHoraParada > CUSTO_MAX
      ) {
        throw new BadRequestException(
          `custoHoraParada deve ser um número entre ${CUSTO_MIN} e ${CUSTO_MAX}`,
        );
      }
    }
    if (input.custoManutencaoMensal !== undefined) {
      if (
        typeof input.custoManutencaoMensal !== 'number' ||
        Number.isNaN(input.custoManutencaoMensal) ||
        input.custoManutencaoMensal < CUSTO_MIN ||
        input.custoManutencaoMensal > CUSTO_MAX
      ) {
        throw new BadRequestException(
          `custoManutencaoMensal deve ser um número entre ${CUSTO_MIN} e ${CUSTO_MAX}`,
        );
      }
    }

    const status = input.status as StatusAtivoPersistido | undefined;
    if (
      input.status !== undefined &&
      !STATUS_VALIDOS.includes(status as StatusAtivoPersistido)
    ) {
      throw new BadRequestException(
        `status deve ser um de: ${STATUS_VALIDOS.join(', ')}`,
      );
    }

    const tag = this.normalizeOptionalField(input.tag, TAG_MAX, 'tag');
    const fabricante = this.normalizeOptionalField(
      input.fabricante,
      FABRICANTE_MAX,
      'fabricante',
    );
    const modelo = this.normalizeOptionalField(
      input.modelo,
      MODELO_MAX,
      'modelo',
    );
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
    const localizacao = normalizeAtivoLocalizacao(input.localizacao);
    const latitude = normalizeAtivoCoordenada(input.latitude, 'latitude');
    const longitude = normalizeAtivoCoordenada(input.longitude, 'longitude');

    if (
      nomeNormalizado === undefined &&
      input.limiteTemp === undefined &&
      input.status === undefined &&
      input.tag === undefined &&
      input.fabricante === undefined &&
      input.modelo === undefined &&
      input.numeroSerie === undefined &&
      input.observacoes === undefined &&
      input.custoHoraParada === undefined &&
      input.custoManutencaoMensal === undefined &&
      input.localizacao === undefined &&
      input.latitude === undefined &&
      input.longitude === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualização',
      );
    }

    const antes = await this.ativos.findByIdInUnidade(
      unidade.empresaId,
      idUnidade,
      idAtivo,
    );
    if (!antes) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }

    const atualizado = await this.ativos.update({
      empresaId: unidade.empresaId,
      idUnidade,
      idAtivo,
      nome: nomeNormalizado,
      limiteTemp: input.limiteTemp,
      status,
      tag,
      fabricante,
      modelo,
      numeroSerie,
      observacoes,
      custoHoraParada: input.custoHoraParada,
      custoManutencaoMensal: input.custoManutencaoMensal,
      localizacao,
      latitude,
      longitude,
    });

    if (!atualizado) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }

    await this.auditLog.append({
      idUsuario: atualizadoPorUsuarioId,
      entidadeAfetada: 'Ativo',
      idRegistro: atualizado.id,
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
        acao: 'UPDATE',
        id: atualizado.id,
        idUnidade: atualizado.idUnidade,
        nome: atualizado.nome,
        status: atualizado.status,
        limiteTemp: atualizado.limiteTemp,
        tag: atualizado.tag,
        fabricante: atualizado.fabricante,
        modelo: atualizado.modelo,
        numeroSerie: atualizado.numeroSerie,
        observacoes: atualizado.observacoes,
        custoHoraParada: atualizado.custoHoraParada,
        custoManutencaoMensal: atualizado.custoManutencaoMensal,
      },
    });

    return atualizado;
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
