import { BadRequestException, Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

type AssetStatsRow = {
  total: number;
  emManutencao: number;
  falha: number;
};

type OrderStatsRow = {
  total: number;
  abertas: number;
  emExecucao: number;
  concluidas: number;
  canceladas: number;
  corretivas: number;
  preventivas: number;
  preditivas: number;
  mttrHoras: number | null;
  falhasCount: number;
  downtimeHorasConcluidas: number | null;
};

type RecentOrderRow = {
  id: string;
  idAtivo: string;
  idTecnico: string | null;
  ativoNome: string;
  status: string;
  tipo: string;
  descricao: string;
  dataAbertura: Date;
  dataFechamento: Date | null;
};

type RecentAssetRow = {
  id: string;
  idUnidade: string;
  nome: string;
  tag: string | null;
  status: string;
  limiteTemp: number;
};

@Controller('unidades/:unidadeId/dashboard')
export class DashboardController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('executivo')
  async executivo(
    @Req() req: Request,
    @Param('unidadeId') unidadeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);

    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Período inválido.');
    }
    if (fromDate > toDate) {
      throw new BadRequestException('from não pode ser maior que to.');
    }

    const [assetStats, orderStats, recentOrders, recentAssets] = await Promise.all([
      this.prisma.$queryRaw<AssetStatsRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'MANUTENCAO')::int AS "emManutencao",
          COUNT(*) FILTER (WHERE status = 'FALHA')::int AS falha
        FROM ativo
        WHERE id_unidade = ${unidadeId}::uuid
      `),
      this.prisma.$queryRaw<OrderStatsRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE os.status = 'ABERTA')::int AS abertas,
          COUNT(*) FILTER (WHERE os.status = 'EM_EXECUCAO')::int AS "emExecucao",
          COUNT(*) FILTER (WHERE os.status = 'CONCLUIDA')::int AS concluidas,
          COUNT(*) FILTER (WHERE os.status = 'CANCELADA')::int AS canceladas,
          COUNT(*) FILTER (WHERE os.tipo = 'CORRETIVA')::int AS corretivas,
          COUNT(*) FILTER (WHERE os.tipo = 'PREVENTIVA')::int AS preventivas,
          COUNT(*) FILTER (WHERE os.tipo = 'PREDITIVA')::int AS preditivas,
          AVG(
            CASE
              WHEN os.status = 'CONCLUIDA' AND os.data_fechamento IS NOT NULL
                THEN EXTRACT(EPOCH FROM (os.data_fechamento - os.data_abertura)) / 3600.0
              ELSE NULL
            END
          )::float8 AS "mttrHoras",
          COUNT(*) FILTER (WHERE os.tipo IN ('CORRETIVA', 'PREDITIVA'))::int AS "falhasCount",
          SUM(
            CASE
              WHEN os.status = 'CONCLUIDA' AND os.data_fechamento IS NOT NULL
                THEN EXTRACT(EPOCH FROM (os.data_fechamento - os.data_abertura)) / 3600.0
              WHEN os.status = 'EM_EXECUCAO'
                THEN EXTRACT(EPOCH FROM (${toDate}::timestamptz - os.data_abertura)) / 3600.0
              ELSE 0
            END
          )::float8 AS "downtimeHorasConcluidas"
        FROM ordem_servico os
        JOIN ativo a ON a.id = os.id_ativo
        WHERE a.id_unidade = ${unidadeId}::uuid
          AND os.data_abertura BETWEEN ${fromDate}::timestamptz AND ${toDate}::timestamptz
      `),
      this.prisma.$queryRaw<RecentOrderRow[]>(Prisma.sql`
        SELECT
          os.id,
          os.id_ativo AS "idAtivo",
          os.id_tecnico AS "idTecnico",
          a.nome AS "ativoNome",
          os.status,
          os.tipo,
          os.descricao,
          os.data_abertura AS "dataAbertura",
          os.data_fechamento AS "dataFechamento"
        FROM ordem_servico os
        JOIN ativo a ON a.id = os.id_ativo
        WHERE a.id_unidade = ${unidadeId}::uuid
        ORDER BY os.data_abertura DESC
        LIMIT 8
      `),
      this.prisma.$queryRaw<RecentAssetRow[]>(Prisma.sql`
        SELECT
          id,
          id_unidade AS "idUnidade",
          nome,
          tag,
          status,
          limite_temp AS "limiteTemp"
        FROM ativo
        WHERE id_unidade = ${unidadeId}::uuid
        ORDER BY created_at DESC
        LIMIT 8
      `),
    ]);

    const a = assetStats[0] ?? { total: 0, emManutencao: 0, falha: 0 };
    const o = orderStats[0] ?? {
      total: 0,
      abertas: 0,
      emExecucao: 0,
      concluidas: 0,
      canceladas: 0,
      corretivas: 0,
      preventivas: 0,
      preditivas: 0,
      mttrHoras: null,
      falhasCount: 0,
      downtimeHorasConcluidas: null,
    };

    const periodHours = Math.max(1, (toDate.getTime() - fromDate.getTime()) / 3600000);
    const downtimeHours = Math.max(0, Number(o.downtimeHorasConcluidas ?? 0));
    const ativosCount = Math.max(1, Number(a.total ?? 0));
    const falhasCount = Math.max(0, Number(o.falhasCount ?? 0));

    const disponibilidadePercent = clampPercent(((periodHours - downtimeHours) / periodHours) * 100);
    const performancePercent = clampPercent((Number(o.concluidas ?? 0) / Math.max(1, Number(o.total ?? 0))) * 100);
    const qualidadePercent = clampPercent(
      (Number(o.concluidas ?? 0) / Math.max(1, Number(o.concluidas ?? 0) + Number(o.canceladas ?? 0))) * 100,
    );
    const oeePercent = clampPercent((disponibilidadePercent / 100) * (performancePercent / 100) * (qualidadePercent / 100) * 100);

    const mttrHoras = Number(o.mttrHoras ?? 0);
    const mtbfHoras =
      falhasCount > 0 ? (periodHours * ativosCount) / falhasCount : periodHours * ativosCount;

    const percentualPreventivaCorretiva = clampPercent(
      (Number(o.preventivas ?? 0) / Math.max(1, Number(o.preventivas ?? 0) + Number(o.corretivas ?? 0))) * 100,
    );

    const hourlyCost = Number(process.env.DASHBOARD_HOURLY_COST_BRL ?? '120');
    const fixedOrderCost = Number(process.env.DASHBOARD_FIXED_ORDER_COST_BRL ?? '35');
    const custoMensalEstimado =
      Number.isFinite(hourlyCost) && Number.isFinite(fixedOrderCost)
        ? Number((downtimeHours * hourlyCost + Number(o.concluidas ?? 0) * fixedOrderCost).toFixed(2))
        : 0;

    return {
      periodo: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        dias: Number((periodHours / 24).toFixed(2)),
      },
      kpis: {
        mtbfHoras: round2(mtbfHoras),
        mttrHoras: round2(mttrHoras),
        oeePercent: round2(oeePercent),
        disponibilidadePercent: round2(disponibilidadePercent),
        percentualPreventivaCorretiva: round2(percentualPreventivaCorretiva),
        custoMensalEstimado,
      },
      ativos: {
        total: Number(a.total ?? 0),
        emManutencao: Number(a.emManutencao ?? 0),
        falha: Number(a.falha ?? 0),
      },
      ordens: {
        total: Number(o.total ?? 0),
        abertas: Number(o.abertas ?? 0),
        emExecucao: Number(o.emExecucao ?? 0),
        concluidas: Number(o.concluidas ?? 0),
        canceladas: Number(o.canceladas ?? 0),
        corretivas: Number(o.corretivas ?? 0),
        preventivas: Number(o.preventivas ?? 0),
        preditivas: Number(o.preditivas ?? 0),
      },
      recentes: {
        ordens: recentOrders.map((item) => ({
          id: item.id,
          idAtivo: item.idAtivo,
          idTecnico: item.idTecnico,
          ativoNome: item.ativoNome,
          status: item.status,
          tipo: item.tipo,
          descricao: item.descricao,
          dataAbertura: item.dataAbertura.toISOString(),
          dataFechamento: item.dataFechamento?.toISOString() ?? null,
        })),
        ativos: recentAssets,
      },
      notas: {
        custoMensalEstimado:
          'Estimativa baseada em horas de indisponibilidade e custo fixo por OS concluída.',
        oee:
          'OEE derivado de disponibilidade, performance (concluídas/total) e qualidade (concluídas/(concluídas+canceladas)).',
      },
    };
  }
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function round2(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}
