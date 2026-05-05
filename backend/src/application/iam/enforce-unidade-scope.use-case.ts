import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

/**
 * RN-08 v1: o usuário autenticado só opera dentro da própria unidade.
 * Exceções de "matriz" podem entrar depois com política explícita.
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

    const unidadeIdsAutorizadas = new Set([
      usuarioLocal.idUnidade,
      ...usuarioLocal.cargos
        .map((cargo) => cargo.idUnidade)
        .filter((value): value is string => Boolean(value)),
    ]);
    const temEscopoCorporativo = usuarioLocal.cargos.some(
      (cargo) => cargo.idUnidade == null,
    );

    if (!temEscopoCorporativo && !unidadeIdsAutorizadas.has(unidadeId)) {
      throw new ForbiddenException(
        'Acesso negado: a unidade solicitada nao pertence ao contexto autenticado.',
      );
    }

    if (
      usuarioLocal.empresa?.id &&
      unidade.empresaId &&
      unidade.empresaId !== usuarioLocal.empresa.id
    ) {
      throw new ForbiddenException(
        'Acesso negado: a unidade solicitada pertence a outra empresa.',
      );
    }
  }
}
