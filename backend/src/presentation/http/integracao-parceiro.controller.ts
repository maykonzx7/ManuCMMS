import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GetDashboardExecutivoUseCase } from '../../application/dashboard/get-dashboard-executivo.use-case';
import { ListAtivosByUnidadeUseCase } from '../../application/ativos/list-ativos-by-unidade.use-case';
import { ListOrdensServicoByUnidadeUseCase } from '../../application/ordens-servico/list-ordens-servico-by-unidade.use-case';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { Public } from '../auth/public.decorator';
import { ApiKeyRoute } from '../auth/api-key.decorator';
import { IntegracaoEmpresaParam } from '../auth/integracao-empresa.decorator';

type IntegracaoEmpresaContext = {
  id: string;
  webhookUrl: string | null;
  apiKeyIntegracao: string | null;
};

@Public()
@ApiKeyRoute()
@Controller('api/v1/integracao/unidades/:unidadeId')
export class IntegracaoParceiroController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listOrdens: ListOrdensServicoByUnidadeUseCase,
    private readonly listAtivos: ListAtivosByUnidadeUseCase,
    private readonly dashboardExecutivo: GetDashboardExecutivoUseCase,
  ) {}

  @Get('ordens-servico')
  async ordensServico(
    @IntegracaoEmpresaParam() empresa: IntegracaoEmpresaContext,
    @Param('unidadeId') unidadeId: string,
    @Query('status') status?: string,
    @Query('tipo') tipo?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.ensureUnidadeDaEmpresa(empresa.id, unidadeId);
    const filters: {
      status?: 'ABERTA' | 'EM_EXECUCAO' | 'CONCLUIDA' | 'CANCELADA';
      tipo?: 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA';
      from?: Date;
      to?: Date;
    } = {};
    if (status?.trim())
      filters.status = status.trim().toUpperCase() as typeof filters.status;
    if (tipo?.trim())
      filters.tipo = tipo.trim().toUpperCase() as typeof filters.tipo;
    if (from) {
      filters.from = new Date(from);
      if (Number.isNaN(filters.from.getTime()))
        throw new BadRequestException('from inválido');
    }
    if (to) {
      filters.to = new Date(to);
      if (Number.isNaN(filters.to.getTime()))
        throw new BadRequestException('to inválido');
    }
    return this.listOrdens.execute(unidadeId, filters);
  }

  @Get('ativos')
  async ativos(
    @IntegracaoEmpresaParam() empresa: IntegracaoEmpresaContext,
    @Param('unidadeId') unidadeId: string,
  ) {
    await this.ensureUnidadeDaEmpresa(empresa.id, unidadeId);
    return this.listAtivos.execute(unidadeId);
  }

  @Get('kpis')
  async kpis(
    @IntegracaoEmpresaParam() empresa: IntegracaoEmpresaContext,
    @Param('unidadeId') unidadeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.ensureUnidadeDaEmpresa(empresa.id, unidadeId);
    return this.dashboardExecutivo.execute(unidadeId, from, to);
  }

  private async ensureUnidadeDaEmpresa(
    empresaId: string,
    unidadeId: string,
  ): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM unidade_fabril
      WHERE id = ${unidadeId}::uuid
        AND empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);
    if (!rows[0]) {
      throw new NotFoundException(
        'Unidade fabril não encontrada para esta API key.',
      );
    }
  }
}
