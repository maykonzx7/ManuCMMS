import { Inject, Injectable } from '@nestjs/common';
import type { UnidadeListaItem } from '../../domain/entities/unidade';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

@Injectable()
export class ListUnidadesUseCase {
  constructor(
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(idUnidade?: string): Promise<UnidadeListaItem[]> {
    if (!idUnidade) {
      return this.unidades.listAll();
    }

    const unidade = await this.unidades.findById(idUnidade);
    return unidade ? [unidade] : [];
  }
}
