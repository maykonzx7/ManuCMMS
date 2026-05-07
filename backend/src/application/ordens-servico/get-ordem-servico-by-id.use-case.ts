import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

@Injectable()
export class GetOrdemServicoByIdUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
  ): Promise<OrdemServicoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const os = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidade.empresaId,
      idUnidade,
    );
    if (!os) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return os;
  }
}
