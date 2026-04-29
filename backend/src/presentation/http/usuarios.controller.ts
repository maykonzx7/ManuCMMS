import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';
import { ListUsuariosByUnidadeUseCase } from '../../application/iam/list-usuarios-by-unidade.use-case';

/**
 * RF-01 v1: leitura de usuários da unidade autenticada.
 */
@Controller('unidades/:unidadeId/usuarios')
export class UsuariosController {
  constructor(
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
    private readonly listUsuarios: ListUsuariosByUnidadeUseCase,
  ) {}

  @Get()
  list(@Param('unidadeId') unidadeId: string, @Req() req: Request) {
    this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.listUsuarios.execute(unidadeId);
  }
}
