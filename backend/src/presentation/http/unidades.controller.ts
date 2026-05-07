import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { GetUnidadeByIdUseCase } from '../../application/unidades/get-unidade-by-id.use-case';
import { ListUnidadesUseCase } from '../../application/unidades/list-unidades.use-case';

/**
 * Listagem das unidades visíveis ao usuário autenticado (RN-08 v1: somente a própria unidade).
 */
@Controller('unidades')
export class UnidadesController {
  constructor(
    private readonly listUnidades: ListUnidadesUseCase,
    private readonly getUnidadeById: GetUnidadeByIdUseCase,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
  ) {}

  @Get()
  findAll(@Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'unidade.visualizar');
    return this.listUnidades.execute(req.usuarioLocal);
  }

  @Get(':unidadeId')
  findById(@Req() req: Request, @Param('unidadeId') unidadeId: string) {
    this.authorizePermission.execute(req.usuarioLocal, 'unidade.visualizar');
    return this.getUnidadeById.execute(req.usuarioLocal!, unidadeId);
  }
}
