import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Get,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Prisma, StatusUsuario } from '@prisma/client';
import type { Request } from 'express';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

const PERFIS = ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'] as const;

type PerfilCodigo = (typeof PERFIS)[number];

@Controller('empresas/:empresaId/gestao')
export class GestaoEmpresaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
  ) {}

  @Get('painel')
  async painel(@Param('empresaId') empresaId: string, @Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const [empresaRows, usuarios, cargos, permissoes] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string; nomeEmpresa: string; slug: string }>>(Prisma.sql`
        SELECT id, nome_empresa AS "nomeEmpresa", slug
        FROM empresa
        WHERE id = ${empresaId}::uuid
        LIMIT 1
      `),
      this.prisma.$queryRaw<
        Array<{
          id: string;
          nome: string;
          email: string;
          perfil: string;
          status: string;
        }>
      >(Prisma.sql`
        SELECT DISTINCT
          u.id,
          u.nome,
          u.email,
          u.perfil::text AS perfil,
          u.status::text AS status
        FROM usuario u
        JOIN usuario_empresa ue ON ue.usuario_id = u.id
        WHERE ue.empresa_id = ${empresaId}::uuid
        ORDER BY u.nome ASC, u.email ASC
      `),
      this.prisma.$queryRaw<
        Array<{
          id: string;
          codigo: string;
          nome: string;
          descricao: string | null;
          nivelHierarquico: number;
          permissaoCodigo: string | null;
        }>
      >(Prisma.sql`
        SELECT
          c.id,
          c.codigo,
          c.nome,
          c.descricao,
          c.nivel_hierarquico AS "nivelHierarquico",
          p.codigo AS "permissaoCodigo"
        FROM cargo c
        LEFT JOIN cargo_permissao cp ON cp.cargo_id = c.id
        LEFT JOIN permissao p ON p.id = cp.permissao_id
        WHERE c.empresa_id = ${empresaId}::uuid
        ORDER BY c.nivel_hierarquico DESC, c.nome ASC
      `),
      this.prisma.$queryRaw<
        Array<{
          id: string;
          codigo: string;
          nome: string;
          descricao: string | null;
          modulo: string;
        }>
      >(Prisma.sql`
        SELECT id, codigo, nome, descricao, modulo
        FROM permissao
        ORDER BY modulo ASC, codigo ASC
      `),
    ]);

    const empresa = empresaRows[0];
    if (!empresa) {
      throw new BadRequestException('Empresa não encontrada.');
    }

    const byCargo = new Map<
      string,
      {
        id: string;
        codigo: string;
        nome: string;
        descricao: string | null;
        nivelHierarquico: number;
        permissoes: string[];
      }
    >();
    for (const row of cargos) {
      const current = byCargo.get(row.id);
      if (!current) {
        byCargo.set(row.id, {
          id: row.id,
          codigo: row.codigo,
          nome: row.nome,
          descricao: row.descricao,
          nivelHierarquico: row.nivelHierarquico,
          permissoes: row.permissaoCodigo ? [row.permissaoCodigo] : [],
        });
        continue;
      }
      if (row.permissaoCodigo && !current.permissoes.includes(row.permissaoCodigo)) {
        current.permissoes.push(row.permissaoCodigo);
      }
    }

    const frontendBase = this.config.get<string>('FRONTEND_PUBLIC_BASE_URL')?.trim();
    const accessPath = this.config.get<string>('FRONTEND_ACCESS_PORTAL_PATH')?.trim() || '/workspace/acesso';
    const accessLink = frontendBase ? `${frontendBase.replace(/\/+$/, '')}${accessPath}/${empresa.slug}` : null;

    return {
      empresa,
      links: {
        acessoConta: accessLink,
      },
      usuarios,
      cargos: Array.from(byCargo.values()).map((cargo) => ({
        ...cargo,
        permissoes: cargo.permissoes.sort(),
      })),
      permissoes,
    };
  }

  @Patch('usuarios/:usuarioId/status')
  async atualizarStatusUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { status: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const nextStatus = (body.status ?? '').trim().toUpperCase() as StatusUsuario;
    if (!['ATIVO', 'INATIVO', 'BLOQUEADO'].includes(nextStatus)) {
      throw new BadRequestException('status inválido. Use: ATIVO, INATIVO ou BLOQUEADO.');
    }

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario u
      SET
        status = ${nextStatus}::"StatusUsuario",
        updated_at = NOW()
      FROM usuario_empresa ue
      WHERE ue.usuario_id = u.id
        AND ue.empresa_id = ${empresaId}::uuid
        AND u.id = ${usuarioId}::uuid
    `);

    if (!updated) {
      throw new BadRequestException('Usuário não encontrado na empresa.');
    }

    return { ok: true, status: nextStatus };
  }

  @Patch('usuarios/:usuarioId/perfil')
  async atualizarPerfilUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { perfil: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const perfil = (body.perfil ?? '').trim().toUpperCase() as PerfilCodigo;
    if (!PERFIS.includes(perfil)) {
      throw new BadRequestException(`perfil inválido. Use: ${PERFIS.join(', ')}.`);
    }

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario u
      SET
        perfil = ${perfil}::"PerfilUsuario",
        updated_at = NOW()
      FROM usuario_empresa ue
      WHERE ue.usuario_id = u.id
        AND ue.empresa_id = ${empresaId}::uuid
        AND u.id = ${usuarioId}::uuid
    `);

    if (!updated) {
      throw new BadRequestException('Usuário não encontrado na empresa.');
    }

    return { ok: true, perfil };
  }

  @Patch('cargos/:cargoId/permissoes')
  async atualizarPermissoesCargo(
    @Param('empresaId') empresaId: string,
    @Param('cargoId') cargoId: string,
    @Body() body: { permissoes: string[] },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const codigos = Array.from(
      new Set((Array.isArray(body.permissoes) ? body.permissoes : []).map((item) => item.trim()).filter(Boolean)),
    );

    const cargoRows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM cargo
      WHERE id = ${cargoId}::uuid
        AND empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);
    if (!cargoRows[0]?.id) {
      throw new BadRequestException('Cargo não encontrado na empresa.');
    }

    const permissaoRows = codigos.length
      ? await this.prisma.$queryRaw<Array<{ id: string; codigo: string }>>(Prisma.sql`
          SELECT id, codigo
          FROM permissao
          WHERE codigo IN (${Prisma.join(codigos)})
        `)
      : [];

    if (codigos.length !== permissaoRows.length) {
      throw new BadRequestException('Uma ou mais permissões são inválidas.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM cargo_permissao
        WHERE cargo_id = ${cargoId}::uuid
      `);
      for (const permissao of permissaoRows) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO cargo_permissao (
            cargo_id,
            permissao_id,
            created_at
          )
          VALUES (
            ${cargoId}::uuid,
            ${permissao.id}::uuid,
            NOW()
          )
        `);
      }
    });

    return { ok: true, cargoId, permissoes: codigos.sort() };
  }

  @Post('cargos')
  async criarCargoPersonalizado(
    @Param('empresaId') empresaId: string,
    @Body()
    body: {
      codigo: string;
      nome: string;
      descricao?: string | null;
      nivelHierarquico?: number;
      permissoes?: string[];
    },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const codigo = (body.codigo ?? '').trim().toUpperCase();
    const nome = (body.nome ?? '').trim();
    const descricao = body.descricao?.trim() || null;
    const nivelHierarquico = Number(body.nivelHierarquico ?? 15);
    const codigosPermissao = Array.from(
      new Set((body.permissoes ?? []).map((item) => item.trim()).filter(Boolean)),
    );

    if (!codigo || codigo.length < 3 || codigo.length > 80) {
      throw new BadRequestException('codigo inválido. Use entre 3 e 80 caracteres.');
    }
    if (!/^[A-Z0-9_]+$/.test(codigo)) {
      throw new BadRequestException('codigo inválido. Use apenas A-Z, 0-9 e _.');
    }
    if (!nome || nome.length < 3 || nome.length > 120) {
      throw new BadRequestException('nome inválido. Use entre 3 e 120 caracteres.');
    }
    if (!Number.isFinite(nivelHierarquico) || nivelHierarquico < 1 || nivelHierarquico > 100) {
      throw new BadRequestException('nivelHierarquico inválido. Use um número entre 1 e 100.');
    }

    const exists = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM cargo
      WHERE empresa_id = ${empresaId}::uuid
        AND codigo = ${codigo}
      LIMIT 1
    `);
    if (exists[0]?.id) {
      throw new BadRequestException('Já existe cargo com este código na empresa.');
    }

    const permissaoRows = codigosPermissao.length
      ? await this.prisma.$queryRaw<Array<{ id: string; codigo: string }>>(Prisma.sql`
          SELECT id, codigo
          FROM permissao
          WHERE codigo IN (${Prisma.join(codigosPermissao)})
        `)
      : [];
    if (codigosPermissao.length !== permissaoRows.length) {
      throw new BadRequestException('Uma ou mais permissões são inválidas.');
    }

    const cargoId = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO cargo (
          id,
          empresa_id,
          codigo,
          nome,
          descricao,
          nivel_hierarquico,
          is_sistema,
          created_at,
          updated_at
        )
        VALUES (
          ${cargoId}::uuid,
          ${empresaId}::uuid,
          ${codigo},
          ${nome},
          ${descricao},
          ${nivelHierarquico},
          false,
          NOW(),
          NOW()
        )
      `);

      for (const permissao of permissaoRows) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO cargo_permissao (
            cargo_id,
            permissao_id,
            created_at
          )
          VALUES (
            ${cargoId}::uuid,
            ${permissao.id}::uuid,
            NOW()
          )
        `);
      }
    });

    return {
      ok: true,
      cargo: {
        id: cargoId,
        codigo,
        nome,
        descricao,
        nivelHierarquico,
        permissoes: codigosPermissao.sort(),
      },
    };
  }

  @Post('usuarios/:usuarioId/reset-senha')
  async resetSenhaUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const rows = await this.prisma.$queryRaw<Array<{ email: string }>>(Prisma.sql`
      SELECT u.email
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);

    const email = rows[0]?.email;
    if (!email) {
      throw new BadRequestException('Usuário não encontrado na empresa.');
    }

    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    const serviceRole = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!supabaseUrl || !serviceRole) {
      throw new InternalServerErrorException(
        'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para reset de senha administrativo.',
      );
    }

    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({
        type: 'recovery',
        email,
      }),
    });

    const payload = await response.json().catch(() => null) as
      | { action_link?: string; error_description?: string; msg?: string }
      | null;

    if (!response.ok) {
      throw new BadRequestException(
        payload?.error_description || payload?.msg || 'Não foi possível gerar link de redefinição de senha.',
      );
    }

    return {
      ok: true,
      email,
      resetLink: payload?.action_link ?? null,
    };
  }

  private ensureEmpresaScope(req: Request, empresaId: string) {
    const currentEmpresaId = req.usuarioLocal?.empresa?.id;
    if (!currentEmpresaId || currentEmpresaId !== empresaId) {
      throw new BadRequestException('Empresa fora do escopo do usuário autenticado.');
    }
  }
}
