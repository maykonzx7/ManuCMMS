import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
export class IniciarExecucaoOrdemServicoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    iniciadoPorUsuarioId: string,
    body?: { fotoProblema?: string | null },
  ): Promise<OrdemServicoListaItem> {
    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    if (!unidadeOk.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    const ordem = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidadeOk.empresaId,
      idUnidade,
    );
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    const fotoProblema = body?.fotoProblema?.trim() || null;
    if (ordem.tipo === 'CORRETIVA' && !fotoProblema) {
      throw new BadRequestException(
        'Ao iniciar OS corretiva, anexe a foto do problema (RN-13).',
      );
    }

    return this.ordens.iniciarExecucao(
      idOrdemServico,
      unidadeOk.empresaId,
      idUnidade,
      iniciadoPorUsuarioId,
      fotoProblema,
    );
  }
}
