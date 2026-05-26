import { Inject, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
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

  async execute(
    usuarioLocal?: UsuarioLocalContext,
  ): Promise<UnidadeListaItem[]> {
    if (!usuarioLocal) {
      return [];
    }

    const temEscopoCorporativo = usuarioLocal.cargos.some(
      (cargo) => cargo.idUnidade == null,
    );
    const perfilComVisaoEmpresa = ['ADMIN', 'GESTOR', 'SUPERVISOR'].includes(
      usuarioLocal.perfil?.toUpperCase?.() ?? '',
    );

    if ((temEscopoCorporativo || perfilComVisaoEmpresa) && usuarioLocal.empresa?.id) {
      return this.unidades.listByEmpresa(usuarioLocal.empresa.id);
    }

    const unidadeIds = Array.from(
      new Set([
        usuarioLocal.idUnidade,
        ...usuarioLocal.cargos
          .map((cargo) => cargo.idUnidade)
          .filter((value): value is string => Boolean(value)),
      ]),
    );

    return this.unidades.listByIds(unidadeIds);
  }
}
