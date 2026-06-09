import { Inject, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import type { UnidadeListaItem } from '../../domain/entities/unidade';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  buildUnidadeIdsAutorizadas,
  usuarioTemEscopoCorporativo,
  usuarioTemVisaoEmpresa,
} from '../iam/usuario-unidade-scope.shared';

@Injectable()
export class ListUnidadesUseCase {
  constructor(
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    usuarioLocal?: UsuarioLocalContext,
  ): Promise<UnidadeListaItem[]> {
    if (!usuarioLocal) {
      return [];
    }

    if (
      (usuarioTemEscopoCorporativo(usuarioLocal) ||
        usuarioTemVisaoEmpresa(usuarioLocal)) &&
      usuarioLocal.empresa?.id
    ) {
      return this.unidades.listByEmpresa(usuarioLocal.empresa.id);
    }

    return this.unidades.listByIds(
      Array.from(buildUnidadeIdsAutorizadas(usuarioLocal)),
    );
  }
}
