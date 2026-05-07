import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';

@Controller('auditoria')
export class AuditoriaController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
  ) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('unidadeId') unidadeId?: string,
    @Query('entidade') entidade?: string,
    @Query('limit') limit?: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');

    const parsedLimit = Number(limit ?? '100');

    const items = await this.auditLog.list({
      from,
      to,
      unidadeId,
      entidade,
      limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100,
    });

    return {
      logs: items,
      total: items.length,
    };
  }
}
