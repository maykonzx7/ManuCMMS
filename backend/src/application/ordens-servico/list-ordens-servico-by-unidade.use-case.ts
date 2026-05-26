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
import { OrdemServicoSlaMonitorService } from './sla-monitor.service';

@Injectable()
export class ListOrdensServicoByUnidadeUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    private readonly slaMonitor: OrdemServicoSlaMonitorService,
  ) {}

  async execute(idUnidade: string): Promise<OrdemServicoListaItem[]> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    await this.slaMonitor.processarAtrasos(unidade.empresaId, idUnidade);
    return this.ordens.listByUnidade(unidade.empresaId, idUnidade);
  }
}
