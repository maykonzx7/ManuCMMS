import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AtivoListaItem } from '../../domain/entities/ativo';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

@Injectable()
export class GetAtivoByIdUseCase {
  constructor(
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(idUnidade: string, idAtivo: string): Promise<AtivoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const ativo = await this.ativos.findByIdInUnidade(
      unidade.empresaId,
      idUnidade,
      idAtivo,
    );
    if (!ativo) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }
    return ativo;
  }
}
