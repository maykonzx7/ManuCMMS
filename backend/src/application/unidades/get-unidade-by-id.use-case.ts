import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { UnidadeListaItem } from '../../domain/entities/unidade';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';

@Injectable()
export class GetUnidadeByIdUseCase {
  constructor(
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    usuarioLocal: UsuarioLocalContext,
    unidadeId: string,
  ): Promise<UnidadeListaItem> {
    const unidade = await this.unidades.findById(unidadeId);
    if (!unidade) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    if (
      usuarioLocal.idUnidade !== unidadeId &&
      !usuarioLocal.cargos.some((c) => c.idUnidade === unidadeId || c.idUnidade == null)
    ) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    return unidade;
  }
}
