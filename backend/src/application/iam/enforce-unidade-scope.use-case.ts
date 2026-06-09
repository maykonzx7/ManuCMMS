import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import { usuarioPodeAcessarUnidade } from './usuario-unidade-scope.shared';

/**
 * RN-08: usuário opera nas unidades do seu escopo.
 * Admin, Gestor e Supervisor acessam qualquer unidade da mesma empresa.
 */
@Injectable()
export class EnforceUnidadeScopeUseCase {
  constructor(
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    unidadeId: string,
  ): Promise<void> {
    if (!usuarioLocal?.idUnidade) {
      throw new ForbiddenException(
        'Contexto de unidade do usuario autenticado nao esta disponivel.',
      );
    }

    const unidade = await this.unidades.findById(unidadeId);
    if (!unidade) {
      throw new ForbiddenException('Unidade solicitada nao foi encontrada.');
    }

    if (
      !usuarioPodeAcessarUnidade(
        usuarioLocal,
        unidadeId,
        unidade.empresaId ?? null,
      )
    ) {
      if (
        usuarioLocal.empresa?.id &&
        unidade.empresaId &&
        unidade.empresaId !== usuarioLocal.empresa.id
      ) {
        throw new ForbiddenException(
          'Acesso negado: a unidade solicitada pertence a outra empresa.',
        );
      }
      throw new ForbiddenException(
        'Acesso negado: a unidade solicitada nao pertence ao contexto autenticado.',
      );
    }
  }
}
