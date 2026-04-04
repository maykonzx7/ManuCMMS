import { Inject, Injectable } from '@nestjs/common';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';

@Injectable()
export class ListOrdensServicoByUnidadeUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
  ) {}

  execute(idUnidade: string): Promise<OrdemServicoListaItem[]> {
    return this.ordens.listByUnidade(idUnidade);
  }
}
