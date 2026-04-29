import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';

/**
 * RN-08 v1: o usuário autenticado só opera dentro da própria unidade.
 * Exceções de "matriz" podem entrar depois com política explícita.
 */
@Injectable()
export class EnforceUnidadeScopeUseCase {
  execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    unidadeId: string,
  ): void {
    if (!usuarioLocal?.idUnidade) {
      throw new ForbiddenException(
        'Contexto de unidade do usuario autenticado nao esta disponivel.',
      );
    }

    if (usuarioLocal.idUnidade !== unidadeId) {
      throw new ForbiddenException(
        'Acesso negado: a unidade solicitada nao pertence ao contexto autenticado.',
      );
    }
  }
}
