import { Inject, Injectable } from '@nestjs/common';
import type { AtivoListaItem } from '../../domain/entities/ativo';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';

@Injectable()
export class ListAtivosByUnidadeUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
  ) {}

  execute(idUnidade: string): Promise<AtivoListaItem[]> {
    return this.ativos.listByUnidade(idUnidade);
  }
}
