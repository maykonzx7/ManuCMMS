import { Controller, Get, Inject, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import { USUARIO_READ_PORT, type IUsuarioReadPort } from '../../domain/ports/usuario-read.port';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

@Controller('auditoria')
export class AuditoriaController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
    @Inject(USUARIO_READ_PORT) private readonly usuarioRead: IUsuarioReadPort,
    private readonly prisma: PrismaService,
  ) {}

  @Get('resumo')
  async resumo(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('unidadeId') unidadeId?: string,
    @Query('entidade') entidade?: string,
    @Query('idUsuario') idUsuario?: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');

    const result = await this.auditLog.list({
      from,
      to,
      unidadeId,
      entidade,
      idUsuario,
      page: 1,
      limit: 2000,
    });

    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const byEntity: Record<string, number> = {};
    const byUserId: Record<string, number> = {};

    for (const item of result.items) {
      byAction[item.acao] = (byAction[item.acao] ?? 0) + 1;
      const userKey = item.idUsuario ?? 'sistema';
      byUser[userKey] = (byUser[userKey] ?? 0) + 1;
      if (item.idUsuario) {
        byUserId[item.idUsuario] = (byUserId[item.idUsuario] ?? 0) + 1;
      }
      byEntity[item.entidadeAfetada] = (byEntity[item.entidadeAfetada] ?? 0) + 1;
    }

    const usuariosResumo: Array<{ idUsuario: string; nome: string; total: number }> = [];
    if (unidadeId?.trim()) {
      const usuarios = await this.usuarioRead.listByUnidade(unidadeId.trim());
      const nomes = new Map(usuarios.map((u) => [u.id, u.nome]));
      for (const [idUsuario, total] of Object.entries(byUserId)) {
        usuariosResumo.push({
          idUsuario,
          nome: nomes.get(idUsuario) ?? 'Usuário',
          total,
        });
      }
      usuariosResumo.sort((a, b) => b.total - a.total);
    }

    return {
      total: result.total,
      intervalo: { from: from ?? null, to: to ?? null },
      porAcao: byAction,
      porUsuario: byUser,
      porEntidade: byEntity,
      usuarios: usuariosResumo,
    };
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('unidadeId') unidadeId?: string,
    @Query('entidade') entidade?: string,
    @Query('idUsuario') idUsuario?: string,
    @Query('acao') acao?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');

    const parsedPage = Number(page ?? '1');
    const parsedLimit = Number(limit ?? '100');

    const result = await this.auditLog.list({
      from,
      to,
      unidadeId,
      entidade,
      idUsuario,
      acao: acao as
        | 'CREATE'
        | 'UPDATE'
        | 'DELETE'
        | 'SETTINGS_CHANGE'
        | 'LOGIN'
        | 'LOGOUT'
        | 'EXPORT'
        | undefined,
      page: Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : 1,
      limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100,
    });

    const userIds = Array.from(
      new Set(result.items.map((item) => item.idUsuario).filter((id): id is string => Boolean(id))),
    );
    const userNames = new Map<string, string>();
    if (userIds.length > 0) {
      const idParams = userIds.map((id) => Prisma.sql`${id}::uuid`);
      const rows = await this.prisma.$queryRaw<Array<{ id: string; nome: string }>>(Prisma.sql`
        SELECT id, nome
        FROM usuario
        WHERE id IN (${Prisma.join(idParams)})
      `);
      for (const row of rows) userNames.set(row.id, row.nome);
    }

    return {
      logs: result.items.map((item) => ({
        ...item,
        usuarioNome: item.idUsuario ? (userNames.get(item.idUsuario) ?? null) : null,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
    };
  }

  @Get('export')
  async exportCsv(
    @Req() req: Request,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('unidadeId') unidadeId?: string,
    @Query('entidade') entidade?: string,
    @Query('idUsuario') idUsuario?: string,
    @Query('acao') acao?: string,
    @Query('limit') limit?: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');

    const parsedLimit = Number(limit ?? '500');
    const result = await this.auditLog.list({
      from,
      to,
      unidadeId,
      entidade,
      idUsuario,
      acao: acao as
        | 'CREATE'
        | 'UPDATE'
        | 'DELETE'
        | 'SETTINGS_CHANGE'
        | 'LOGIN'
        | 'LOGOUT'
        | 'EXPORT'
        | undefined,
      page: 1,
      limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 2000) : 500,
    });
    const items = result.items;

    const header = [
      'idLog',
      'idUsuario',
      'entidadeAfetada',
      'idRegistro',
      'dataHora',
      'valorAnterior',
      'valorNovo',
    ];

    const rows = items.map((item) => [
      item.idLog,
      item.idUsuario ?? '',
      item.entidadeAfetada,
      item.idRegistro,
      item.dataHora,
      JSON.stringify(item.valorAnterior ?? {}),
      JSON.stringify(item.valorNovo ?? {}),
    ]);

    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.auditLog.append({
      idUsuario: req.usuarioLocal?.id ?? null,
      entidadeAfetada: 'Auditoria',
      idRegistro: randomUUID(),
      valorAnterior: {},
      valorNovo: {
        acao: 'EXPORT',
        formato: 'csv',
        filtros: { from, to, unidadeId, entidade, idUsuario, limit: parsedLimit },
        totalExportado: items.length,
      },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-${timestamp}.csv"`);
    res.send(csv);
  }

  @Get(':idLog')
  async getById(@Req() req: Request, @Param('idLog') idLog: string) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    const item = await this.auditLog.getById(idLog);
    if (!item) {
      throw new NotFoundException('Log de auditoria não encontrado.');
    }
    let usuarioNome: string | null = null;
    if (item.idUsuario) {
      const rows = await this.prisma.$queryRaw<Array<{ nome: string }>>(Prisma.sql`
        SELECT nome
        FROM usuario
        WHERE id = ${item.idUsuario}::uuid
        LIMIT 1
      `);
      usuarioNome = rows[0]?.nome ?? null;
    }
    return { ...item, usuarioNome };
  }
}
