import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
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

const DESCRICAO_MAX = 32_000;

@Injectable()
export class UpdateOrdemServicoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    body: { descricao?: string; idTecnico?: string | null },
  ): Promise<OrdemServicoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const descricao = body.descricao?.trim();
    if (body.descricao !== undefined && (!descricao || descricao.length > DESCRICAO_MAX)) {
      throw new BadRequestException(
        `descricao deve ter entre 1 e ${DESCRICAO_MAX} caracteres`,
      );
    }

    let idTecnico = body.idTecnico;
    if (idTecnico === '') {
      idTecnico = null;
    }

    if (idTecnico !== undefined && idTecnico !== null) {
      const tecnicoOk = await this.usuarios.existsInUnidade(idTecnico, idUnidade);
      if (!tecnicoOk) {
        throw new NotFoundException('Técnico não encontrado nesta unidade fabril');
      }
    }

    if (descricao === undefined && idTecnico === undefined) {
      throw new BadRequestException('Informe ao menos um campo para atualização');
    }

    const atual = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidade.empresaId,
      idUnidade,
    );
    if (!atual) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    if (atual.status === 'CONCLUIDA' || atual.status === 'CANCELADA') {
      throw new BadRequestException('OS encerrada não pode ser editada');
    }

    const atualizado = await this.ordens.updateDados({
      idOrdemServico,
      empresaId: unidade.empresaId,
      idUnidade,
      descricao,
      idTecnico,
    });

    if (!atualizado) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return atualizado;
  }
}
