import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';
import { GetUsuarioByIdInUnidadeUseCase } from '../../application/iam/get-usuario-by-id-in-unidade.use-case';
import { ListUsuariosByUnidadeUseCase } from '../../application/iam/list-usuarios-by-unidade.use-case';

/**
 * RF-01 v1: leitura de usuários da unidade autenticada.
 */
@Controller('unidades/:unidadeId/usuarios')
export class UsuariosController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
    private readonly listUsuarios: ListUsuariosByUnidadeUseCase,
    private readonly getUsuarioByIdInUnidade: GetUsuarioByIdInUnidadeUseCase,
  ) {}

  @Get()
  async list(@Param('unidadeId') unidadeId: string, @Req() req: Request) {
    this.authorizePermission.execute(
      req.usuarioLocal,
      'usuario.visualizar_unidade',
    );
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.listUsuarios.execute(unidadeId);
  }

  @Get(':usuarioId')
  async getById(
    @Param('unidadeId') unidadeId: string,
    @Param('usuarioId') usuarioId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'usuario.visualizar_unidade');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.getUsuarioByIdInUnidade.execute(unidadeId, usuarioId);
  }
}
