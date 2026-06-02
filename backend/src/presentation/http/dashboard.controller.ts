import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';
import { GetDashboardExecutivoUseCase } from '../../application/dashboard/get-dashboard-executivo.use-case';

@Controller('unidades/:unidadeId/dashboard')
export class DashboardController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
    private readonly dashboardExecutivo: GetDashboardExecutivoUseCase,
  ) {}

  @Get('executivo')
  async executivo(
    @Req() req: Request,
    @Param('unidadeId') unidadeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'dashboard.executivo');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.dashboardExecutivo.execute(unidadeId, from, to);
  }
}
