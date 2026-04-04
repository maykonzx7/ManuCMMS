import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type CreateOrdemServicoInput,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';

const TIPOS_VALIDOS: OrdemServicoListaItem['tipo'][] = [
  'CORRETIVA',
  'PREVENTIVA',
  'PREDITIVA',
];

const DESCRICAO_MAX = 32_000;

@Injectable()
export class CreateOrdemServicoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
  ) {}

  async execute(
    idUnidade: string,
    body: {
      idAtivo: string;
      tipo: string;
      descricao: string;
      idTecnico?: string | null;
    },
  ): Promise<OrdemServicoListaItem> {
    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }

    const tipo = body.tipo as OrdemServicoListaItem['tipo'];
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new BadRequestException(
        `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`,
      );
    }

    const descricao = body.descricao?.trim() ?? '';
    if (descricao.length === 0 || descricao.length > DESCRICAO_MAX) {
      throw new BadRequestException(
        `descricao é obrigatória e deve ter até ${DESCRICAO_MAX} caracteres`,
      );
    }

    const ativoOk = await this.ativos.existsInUnidade(body.idAtivo, idUnidade);
    if (!ativoOk) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }

    const statusAtivo = await this.ativos.getStatusInUnidade(
      body.idAtivo,
      idUnidade,
    );
    if (statusAtivo === 'MANUTENCAO') {
      throw new ConflictException(
        'Ativo em manutenção — não é permitida nova OS até encerrar a atual (RN-10)',
      );
    }

    let idTecnico: string | null | undefined = body.idTecnico;
    if (idTecnico === '' || idTecnico === undefined) {
      idTecnico = undefined;
    }
    if (idTecnico != null) {
      const tecnicoOk = await this.usuarios.existsInUnidade(
        idTecnico,
        idUnidade,
      );
      if (!tecnicoOk) {
        throw new NotFoundException(
          'Técnico não encontrado nesta unidade fabril',
        );
      }
    }

    const payload: CreateOrdemServicoInput = {
      idAtivo: body.idAtivo,
      tipo,
      descricao,
      idTecnico,
    };

    try {
      return await this.ordens.create(payload);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new NotFoundException('Referência inválida (ativo ou técnico)');
      }
      throw e;
    }
  }
}
