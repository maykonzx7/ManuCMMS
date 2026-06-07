import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { AuthorizePlatformOperatorUseCase } from '../../application/iam/authorize-platform-operator.use-case';
import { resolveFrontendBaseUrl } from '../../application/shared/frontend-link.shared';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import type { AuthUserContext } from '../auth/auth-user.types';
import { AllowPendingUser } from '../auth/allow-pending-user.decorator';

type RequestWithUser = Request & { user: AuthUserContext };

type PlatformPainelRow = {
  empresasTotal: bigint;
  empresasAtivas: bigint;
  usuariosTotal: bigint;
  usuariosAtivos: bigint;
  unidadesTotal: bigint;
  unidadesAtivas: bigint;
  convitesPendentes: bigint;
  ordensAbertas: bigint;
};

type PlatformUnidadeRow = {
  id: string;
  nome: string;
  localizacao: string;
  status: string;
  cidade: string | null;
  estado: string | null;
  empresaId: string;
  empresaNome: string;
  empresaSlug: string;
  usuariosAtivos: bigint;
  ativosTotal: bigint;
};

type PlatformClienteRow = {
  id: string;
  nomeEmpresa: string;
  slug: string;
  status: string;
  createdAt: Date;
  usuariosAtivos: bigint;
  unidadesAtivas: bigint;
  ordensAbertas: bigint;
};

type PlatformUsuarioRow = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  empresaNome: string;
  empresaSlug: string;
};

type PlatformClienteDetalheRow = {
  id: string;
  nomeEmpresa: string;
  slug: string;
  status: string;
  createdAt: Date;
  ownerEmail: string | null;
  ownerNome: string | null;
  inviteOwnerEmail: string | null;
};

type PlatformClienteColaboradorRow = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  empresaNome: string;
  empresaSlug: string;
};

@Controller('platform')
export class PlatformAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
  ) {}

  @Get('painel')
  @AllowPendingUser()
  async getPainel(@Req() req: RequestWithUser) {
    this.authorizePlatformOperator.execute(req.user);

    const [summaryRows, topClientes] = await Promise.all([
      this.prisma.$queryRaw<PlatformPainelRow[]>(Prisma.sql`
        SELECT
          (SELECT COUNT(*) FROM empresa)::bigint AS "empresasTotal",
          (SELECT COUNT(*) FROM empresa WHERE status = 'ATIVA')::bigint AS "empresasAtivas",
          (SELECT COUNT(*) FROM usuario)::bigint AS "usuariosTotal",
          (SELECT COUNT(*) FROM usuario WHERE status = 'ATIVO')::bigint AS "usuariosAtivos",
          (SELECT COUNT(*) FROM unidade_fabril)::bigint AS "unidadesTotal",
          (SELECT COUNT(*) FROM unidade_fabril WHERE status = 'ATIVA')::bigint AS "unidadesAtivas",
          (SELECT COUNT(*) FROM convite_acesso WHERE status = 'PENDENTE' AND expira_em > NOW())::bigint AS "convitesPendentes",
          (SELECT COUNT(*) FROM ordem_servico WHERE status IN ('ABERTA', 'EM_EXECUCAO'))::bigint AS "ordensAbertas"
      `),
      this.prisma.$queryRaw<
        Array<{
          empresaId: string;
          nomeEmpresa: string;
          slug: string;
          usuariosAtivos: bigint;
        }>
      >(Prisma.sql`
        SELECT
          e.id AS "empresaId",
          e.nome_empresa AS "nomeEmpresa",
          e.slug,
          COUNT(DISTINCT u.id)::bigint AS "usuariosAtivos"
        FROM empresa e
        LEFT JOIN usuario_empresa ue ON ue.empresa_id = e.id
        LEFT JOIN usuario u ON u.id = ue.usuario_id AND u.status = 'ATIVO'
        GROUP BY e.id, e.nome_empresa, e.slug
        ORDER BY "usuariosAtivos" DESC, e.created_at ASC
        LIMIT 8
      `),
    ]);

    const summary = summaryRows[0];
    return {
      resumo: {
        empresasTotal: Number(summary?.empresasTotal ?? 0n),
        empresasAtivas: Number(summary?.empresasAtivas ?? 0n),
        usuariosTotal: Number(summary?.usuariosTotal ?? 0n),
        usuariosAtivos: Number(summary?.usuariosAtivos ?? 0n),
        unidadesTotal: Number(summary?.unidadesTotal ?? 0n),
        unidadesAtivas: Number(summary?.unidadesAtivas ?? 0n),
        convitesPendentes: Number(summary?.convitesPendentes ?? 0n),
        ordensAbertas: Number(summary?.ordensAbertas ?? 0n),
      },
      clientesTop: topClientes.map((item) => ({
        empresaId: item.empresaId,
        nomeEmpresa: item.nomeEmpresa,
        slug: item.slug,
        usuariosAtivos: Number(item.usuariosAtivos ?? 0n),
      })),
    };
  }

  @Get('clientes')
  @AllowPendingUser()
  async listClientes(@Req() req: RequestWithUser) {
    this.authorizePlatformOperator.execute(req.user);

    const rows = await this.prisma.$queryRaw<PlatformClienteRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.nome_empresa AS "nomeEmpresa",
        e.slug,
        e.status::text AS status,
        e.created_at AS "createdAt",
        COUNT(DISTINCT CASE WHEN u.status = 'ATIVO' THEN u.id END)::bigint AS "usuariosAtivos",
        COUNT(DISTINCT CASE WHEN uf.status = 'ATIVA' THEN uf.id END)::bigint AS "unidadesAtivas",
        COUNT(DISTINCT CASE WHEN os.status IN ('ABERTA', 'EM_EXECUCAO') THEN os.id END)::bigint AS "ordensAbertas"
      FROM empresa e
      LEFT JOIN usuario_empresa ue ON ue.empresa_id = e.id
      LEFT JOIN usuario u ON u.id = ue.usuario_id
      LEFT JOIN unidade_fabril uf ON uf.empresa_id = e.id
      LEFT JOIN ordem_servico os ON os.empresa_id = e.id
      GROUP BY e.id, e.nome_empresa, e.slug, e.status, e.created_at
      ORDER BY e.created_at DESC
    `);

    return rows.map((item) => ({
      id: item.id,
      nomeEmpresa: item.nomeEmpresa,
      slug: item.slug,
      status: item.status,
      createdAt: item.createdAt,
      usuariosAtivos: Number(item.usuariosAtivos ?? 0n),
      unidadesAtivas: Number(item.unidadesAtivas ?? 0n),
      ordensAbertas: Number(item.ordensAbertas ?? 0n),
      linkAcesso: this.buildAccessLink(item.slug),
    }));
  }

  @Get('unidades')
  @AllowPendingUser()
  async listUnidades(
    @Req() req: RequestWithUser,
    @Query('empresaId') empresaId?: string,
  ) {
    this.authorizePlatformOperator.execute(req.user);

    const empresaFilter =
      empresaId?.trim().length
        ? Prisma.sql`AND uf.empresa_id = ${empresaId.trim()}::uuid`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<PlatformUnidadeRow[]>(Prisma.sql`
      SELECT
        uf.id,
        uf.nome,
        uf.localizacao,
        uf.status::text AS status,
        uf.cidade,
        uf.estado,
        e.id AS "empresaId",
        e.nome_empresa AS "empresaNome",
        e.slug AS "empresaSlug",
        COUNT(DISTINCT CASE WHEN u.status = 'ATIVO' THEN u.id END)::bigint AS "usuariosAtivos",
        COUNT(DISTINCT a.id)::bigint AS "ativosTotal"
      FROM unidade_fabril uf
      JOIN empresa e ON e.id = uf.empresa_id
      LEFT JOIN usuario u ON u.id_unidade = uf.id
      LEFT JOIN ativo a ON a.id_unidade = uf.id
      WHERE TRUE
      ${empresaFilter}
      GROUP BY uf.id, uf.nome, uf.localizacao, uf.status, uf.cidade, uf.estado, e.id, e.nome_empresa, e.slug
      ORDER BY e.nome_empresa ASC, uf.nome ASC
    `);

    return rows.map((item) => ({
      id: item.id,
      nome: item.nome,
      localizacao: item.localizacao,
      status: item.status,
      cidade: item.cidade,
      estado: item.estado,
      empresaId: item.empresaId,
      empresaNome: item.empresaNome,
      empresaSlug: item.empresaSlug,
      usuariosAtivos: Number(item.usuariosAtivos ?? 0n),
      ativosTotal: Number(item.ativosTotal ?? 0n),
      linkAcesso: this.buildAccessLink(item.empresaSlug),
    }));
  }

  @Get('usuarios')
  @AllowPendingUser()
  async listUsuarios(
    @Req() req: RequestWithUser,
    @Query('q') query?: string,
    @Query('limit') limitRaw?: string,
  ) {
    this.authorizePlatformOperator.execute(req.user);

    const normalizedQuery = (query ?? '').trim().toLowerCase();
    const limit = this.parseLimit(limitRaw);

    const rows = await this.prisma.$queryRaw<PlatformUsuarioRow[]>(Prisma.sql`
      SELECT
        u.id,
        u.nome,
        u.email,
        u.perfil::text AS perfil,
        u.status::text AS status,
        e.nome_empresa AS "empresaNome",
        e.slug AS "empresaSlug"
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      JOIN empresa e ON e.id = ue.empresa_id
      WHERE
        ${
          normalizedQuery.length === 0
            ? Prisma.sql`TRUE`
            : Prisma.sql`(
              lower(u.nome) LIKE ${`%${normalizedQuery}%`}
              OR lower(u.email) LIKE ${`%${normalizedQuery}%`}
              OR lower(e.nome_empresa) LIKE ${`%${normalizedQuery}%`}
              OR lower(e.slug) LIKE ${`%${normalizedQuery}%`}
            )`
        }
      ORDER BY u.updated_at DESC, u.created_at DESC
      LIMIT ${limit}
    `);

    return rows;
  }

  @Get('clientes/:empresaId')
  @AllowPendingUser()
  async getClienteDetalhe(
    @Req() req: RequestWithUser,
    @Param('empresaId') empresaId: string,
  ) {
    this.authorizePlatformOperator.execute(req.user);

    const [rows, colaboradores, unidades] = await Promise.all([
      this.prisma.$queryRaw<PlatformClienteDetalheRow[]>(Prisma.sql`
        SELECT
          e.id,
          e.nome_empresa AS "nomeEmpresa",
          e.slug,
          e.status::text AS status,
          e.created_at AS "createdAt",
          (
            SELECT u.email
            FROM usuario_empresa ue
            JOIN usuario u ON u.id = ue.usuario_id
            WHERE ue.empresa_id = e.id
            ORDER BY ue.is_responsavel_principal DESC, ue.created_at ASC
            LIMIT 1
          ) AS "ownerEmail",
          (
            SELECT u.nome
            FROM usuario_empresa ue
            JOIN usuario u ON u.id = ue.usuario_id
            WHERE ue.empresa_id = e.id
            ORDER BY ue.is_responsavel_principal DESC, ue.created_at ASC
            LIMIT 1
          ) AS "ownerNome",
          (
            SELECT ca.email_destino
            FROM convite_acesso ca
            WHERE ca.empresa_id = e.id
              AND ca.cargo_codigo = 'ADMIN'
            ORDER BY
              CASE WHEN ca.status = 'PENDENTE' THEN 0 ELSE 1 END,
              ca.created_at ASC
            LIMIT 1
          ) AS "inviteOwnerEmail"
        FROM empresa e
        WHERE e.id = ${empresaId}::uuid
        LIMIT 1
      `),
      this.prisma.$queryRaw<PlatformClienteColaboradorRow[]>(Prisma.sql`
        SELECT
          u.id,
          u.nome,
          u.email,
          u.perfil::text AS perfil,
          u.status::text AS status,
          e.nome_empresa AS "empresaNome",
          e.slug AS "empresaSlug"
        FROM usuario_empresa ue
        JOIN usuario u ON u.id = ue.usuario_id
        JOIN empresa e ON e.id = ue.empresa_id
        WHERE ue.empresa_id = ${empresaId}::uuid
        ORDER BY u.nome ASC
      `),
      this.prisma.$queryRaw<
        Array<{
          id: string;
          nome: string;
          localizacao: string;
          status: string;
          cidade: string | null;
          estado: string | null;
        }>
      >(Prisma.sql`
        SELECT
          uf.id,
          uf.nome,
          uf.localizacao,
          uf.status::text AS status,
          uf.cidade,
          uf.estado
        FROM unidade_fabril uf
        WHERE uf.empresa_id = ${empresaId}::uuid
        ORDER BY uf.nome ASC
      `),
    ]);

    const cliente = rows[0];
    if (!cliente) {
      return null;
    }

    return {
      id: cliente.id,
      nomeEmpresa: cliente.nomeEmpresa,
      slug: cliente.slug,
      status: cliente.status,
      createdAt: cliente.createdAt,
      ownerEmail: cliente.ownerEmail ?? cliente.inviteOwnerEmail,
      ownerNome: cliente.ownerNome,
      linkAcesso: this.buildAccessLink(cliente.slug),
      colaboradores,
      unidades,
    };
  }

  private buildAccessLink(slug: string): string | null {
    const frontendBase = resolveFrontendBaseUrl({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>(
        'FRONTEND_PUBLIC_BASE_URL',
      ),
    });
    const accessPath =
      this.config.get<string>('FRONTEND_ACCESS_PORTAL_PATH')?.trim() ||
      '/workspace/acesso';
    if (!frontendBase || !slug) {
      return null;
    }
    return `${frontendBase}${accessPath}/${slug}`;
  }

  private parseLimit(raw: string | undefined): number {
    const parsed = Number(raw ?? '60');
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 60;
    }
    return Math.min(Math.floor(parsed), 200);
  }
}
