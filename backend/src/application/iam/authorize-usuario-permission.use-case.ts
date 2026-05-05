import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';

@Injectable()
export class AuthorizeUsuarioPermissionUseCase {
  execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    permissao: string,
  ): void {
    if (!usuarioLocal) {
      throw new ForbiddenException(
        'Contexto do usuario autenticado nao esta disponivel.',
      );
    }

    if (!usuarioLocal.permissoes.includes(permissao)) {
      throw new ForbiddenException(
        `Acesso negado: permissao obrigatoria ausente (${permissao}).`,
      );
    }
  }
}
