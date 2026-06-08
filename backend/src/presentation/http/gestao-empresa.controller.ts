import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Get,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Prisma, StatusEmpresa } from '@prisma/client';
import type { Request } from 'express';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { RemoveUsuarioAcessoUseCase } from '../../application/iam/remove-usuario-acesso.use-case';
import { UpdateUsuarioEmpresaStatusUseCase } from '../../application/iam/update-usuario-empresa-status.use-case';
import {
  buildAcessoPortalEmail,
  buildResetSenhaEmail,
} from '../../application/shared/email/email-template.shared';
import { resolveFrontendBaseUrl } from '../../application/shared/frontend-link.shared';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { IntegracaoWebhookService } from '../../infrastructure/integracao/integracao-webhook.service';
import { maskApiKeyIntegracao } from './response-mappers';

const PERFIS = ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'] as const;

type PerfilCodigo = (typeof PERFIS)[number];
type EmailEntregaStatus = 'ENVIADO' | 'ENVIANDO' | 'NAO_CONFIGURADO' | 'FALHOU';

@Controller('empresas/:empresaId/gestao')
export class GestaoEmpresaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly removeUsuarioAcesso: RemoveUsuarioAcessoUseCase,
    private readonly updateUsuarioEmpresaStatus: UpdateUsuarioEmpresaStatusUseCase,
    private readonly integracaoWebhook: IntegracaoWebhookService,
    @Inject(EMAIL_PORT) private readonly emailPort: IEmailPort,
  ) {}

  @Get('painel')
  async painel(@Param('empresaId') empresaId: string, @Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const [empresaRows, usuarios, cargos, permissoes] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          id: string;
          nomeEmpresa: string;
          slug: string;
          status: string;
          cnpj: string | null;
          cep: string | null;
          endereco: string | null;
          numeroEndereco: string | null;
          bairro: string | null;
          cidade: string | null;
          estado: string | null;
          contatoNome: string | null;
          contatoEmail: string | null;
          contatoTelefone: string | null;
        }>
      >(Prisma.sql`
        SELECT id, nome_empresa AS "nomeEmpresa", slug, status::text AS status,
          cnpj, cep, endereco, numero_endereco AS "numeroEndereco", bairro, cidade, estado,
          contato_nome AS "contatoNome", contato_email AS "contatoEmail", contato_telefone AS "contatoTelefone"
        FROM empresa
        WHERE id = ${empresaId}::uuid
        LIMIT 1
      `),
      this.prisma.$queryRaw<
        Array<{
          id: string;
          nome: string;
          usuarioAcesso: string | null;
          email: string;
          perfil: string;
          status: string;
          idUnidade: string;
          unidadeNome: string;
        }>
      >(Prisma.sql`
        SELECT DISTINCT
          u.id,
          u.nome,
          u.credencial AS "usuarioAcesso",
          u.email,
          u.perfil::text AS perfil,
          CASE
            WHEN u.status = 'BLOQUEADO' THEN 'BLOQUEADO'
            ELSE ue.status::text
          END AS status,
          u.id_unidade AS "idUnidade",
          uf.nome AS "unidadeNome"
        FROM usuario u
        JOIN usuario_empresa ue ON ue.usuario_id = u.id
        JOIN unidade_fabril uf ON uf.id = u.id_unidade
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
      if (
        row.permissaoCodigo &&
        !current.permissoes.includes(row.permissaoCodigo)
      ) {
        current.permissoes.push(row.permissaoCodigo);
      }
    }

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
    const accessLink = frontendBase
      ? `${frontendBase}${accessPath}/${empresa.slug}`
      : null;

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

  @Patch('status')
  async atualizarStatusEmpresa(
    @Param('empresaId') empresaId: string,
    @Body() body: { status: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const nextStatus = (body.status ?? '')
      .trim()
      .toUpperCase() as StatusEmpresa;
    if (!['ATIVA', 'INATIVA', 'SUSPENSA'].includes(nextStatus)) {
      throw new BadRequestException(
        'status inválido. Use: ATIVA, INATIVA ou SUSPENSA.',
      );
    }

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE empresa
      SET
        status = ${nextStatus}::"StatusEmpresa",
        updated_at = NOW()
      WHERE id = ${empresaId}::uuid
    `);

    if (!updated) {
      throw new BadRequestException('Empresa não encontrada.');
    }

    return { ok: true, status: nextStatus };
  }

  @Patch('dados')
  async atualizarDadosEmpresa(
    @Param('empresaId') empresaId: string,
    @Body()
    body: {
      nomeEmpresa?: string;
      cnpj?: string | null;
      cep?: string | null;
      endereco?: string | null;
      numeroEndereco?: string | null;
      bairro?: string | null;
      cidade?: string | null;
      estado?: string | null;
      contatoNome?: string | null;
      contatoEmail?: string | null;
      contatoTelefone?: string | null;
    },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const nomeEmpresa = body.nomeEmpresa?.trim();
    const cnpj = body.cnpj?.trim() || null;
    const cep = body.cep?.trim() || null;
    const endereco = body.endereco?.trim() || null;
    const numeroEndereco = body.numeroEndereco?.trim() || null;
    const bairro = body.bairro?.trim() || null;
    const cidade = body.cidade?.trim() || null;
    const estado = body.estado?.trim().toUpperCase() || null;
    const contatoNome = body.contatoNome?.trim() || null;
    const contatoEmail = body.contatoEmail?.trim().toLowerCase() || null;
    const contatoTelefone = body.contatoTelefone?.trim() || null;

    const fields: Prisma.Sql[] = [];
    if (nomeEmpresa !== undefined)
      fields.push(Prisma.sql`nome_empresa = ${nomeEmpresa}`);
    if (body.cnpj !== undefined) fields.push(Prisma.sql`cnpj = ${cnpj}`);
    if (body.cep !== undefined) fields.push(Prisma.sql`cep = ${cep}`);
    if (body.endereco !== undefined)
      fields.push(Prisma.sql`endereco = ${endereco}`);
    if (body.numeroEndereco !== undefined)
      fields.push(Prisma.sql`numero_endereco = ${numeroEndereco}`);
    if (body.bairro !== undefined) fields.push(Prisma.sql`bairro = ${bairro}`);
    if (body.cidade !== undefined) fields.push(Prisma.sql`cidade = ${cidade}`);
    if (body.estado !== undefined) fields.push(Prisma.sql`estado = ${estado}`);
    if (body.contatoNome !== undefined)
      fields.push(Prisma.sql`contato_nome = ${contatoNome}`);
    if (body.contatoEmail !== undefined)
      fields.push(Prisma.sql`contato_email = ${contatoEmail}`);
    if (body.contatoTelefone !== undefined)
      fields.push(Prisma.sql`contato_telefone = ${contatoTelefone}`);
    if (fields.length === 0) {
      throw new BadRequestException(
        'Informe ao menos um dado para atualização.',
      );
    }
    fields.push(Prisma.sql`updated_at = NOW()`);

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE empresa
      SET ${Prisma.join(fields, ', ')}
      WHERE id = ${empresaId}::uuid
    `);
    if (!updated) {
      throw new BadRequestException('Empresa não encontrada.');
    }
    return { ok: true };
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

    return this.updateUsuarioEmpresaStatus.execute(
      req.usuarioLocal,
      empresaId,
      usuarioId,
      body.status ?? '',
    );
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
      throw new BadRequestException(
        `perfil inválido. Use: ${PERFIS.join(', ')}.`,
      );
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

  @Patch('usuarios/:usuarioId/email')
  async atualizarEmailUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { email: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || email.length > 100 || !email.includes('@')) {
      throw new BadRequestException('email inválido.');
    }

    const usuarioRows = await this.prisma.$queryRaw<
      Array<{ authSub: string | null }>
    >(Prisma.sql`
      SELECT u.auth_sub AS "authSub"
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);
    const authSub = usuarioRows[0]?.authSub ?? null;
    if (!usuarioRows[0]) {
      throw new BadRequestException('Usuário não encontrado na empresa.');
    }

    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    const serviceRole = this.config
      .get<string>('SUPABASE_SERVICE_ROLE_KEY')
      ?.trim();
    if (authSub && supabaseUrl && serviceRole) {
      const response = await fetch(
        `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${authSub}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceRole,
            Authorization: `Bearer ${serviceRole}`,
          },
          body: JSON.stringify({ email }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          msg?: string;
          error_description?: string;
        } | null;
        throw new BadRequestException(
          payload?.error_description ||
            payload?.msg ||
            'Falha ao atualizar email no provedor de autenticação.',
        );
      }
    }

    try {
      const updated = await this.prisma.$executeRaw(Prisma.sql`
        UPDATE usuario u
        SET
          email = ${email},
          updated_at = NOW()
        FROM usuario_empresa ue
        WHERE ue.usuario_id = u.id
          AND ue.empresa_id = ${empresaId}::uuid
          AND u.id = ${usuarioId}::uuid
      `);

      if (!updated) {
        throw new BadRequestException('Usuário não encontrado na empresa.');
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' ||
          (error.code === 'P2010' &&
            (error.meta as { code?: string } | undefined)?.code === '23505'))
      ) {
        throw new BadRequestException(
          'Email já está em uso por outro usuário.',
        );
      }
      throw error;
    }

    return { ok: true, email };
  }

  @Patch('usuarios/:usuarioId/nome')
  async atualizarNomeUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { nome: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const nome = (body.nome ?? '').trim();
    if (!nome || nome.length < 3 || nome.length > 150) {
      throw new BadRequestException(
        'nome inválido. Use entre 3 e 150 caracteres.',
      );
    }

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario u
      SET
        nome = ${nome},
        updated_at = NOW()
      FROM usuario_empresa ue
      WHERE ue.usuario_id = u.id
        AND ue.empresa_id = ${empresaId}::uuid
        AND u.id = ${usuarioId}::uuid
    `);

    if (!updated) {
      throw new BadRequestException('Usuário não encontrado na empresa.');
    }

    return { ok: true, nome };
  }

  @Patch('usuarios/:usuarioId/usuario-acesso')
  async atualizarUsuarioAcessoUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { usuarioAcesso?: string; credencial?: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const usuarioAcesso = (body.usuarioAcesso ?? body.credencial ?? '')
      .trim()
      .toLowerCase();
    if (
      !usuarioAcesso ||
      usuarioAcesso.length < 3 ||
      usuarioAcesso.length > 60
    ) {
      throw new BadRequestException(
        'usuarioAcesso inválido. Use entre 3 e 60 caracteres.',
      );
    }
    if (!/^[a-z0-9._-]+$/.test(usuarioAcesso)) {
      throw new BadRequestException(
        'usuarioAcesso inválido. Use apenas letras minúsculas, números, ponto, underline ou hífen.',
      );
    }

    try {
      const updated = await this.prisma.$executeRaw(Prisma.sql`
        UPDATE usuario u
        SET
          credencial = ${usuarioAcesso},
          updated_at = NOW()
        FROM usuario_empresa ue
        WHERE ue.usuario_id = u.id
          AND ue.empresa_id = ${empresaId}::uuid
          AND u.id = ${usuarioId}::uuid
      `);

      if (!updated) {
        throw new BadRequestException('Usuário não encontrado na empresa.');
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' ||
          (error.code === 'P2010' &&
            (error.meta as { code?: string } | undefined)?.code === '23505'))
      ) {
        throw new BadRequestException(
          'Usuário de acesso já está em uso por outro usuário.',
        );
      }
      throw error;
    }

    return { ok: true, usuarioAcesso };
  }

  // Compatibilidade com clientes antigos; manter temporariamente.
  @Patch('usuarios/:usuarioId/credencial')
  async atualizarCredencialUsuarioLegacy(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { credencial: string },
    @Req() req: Request,
  ) {
    return this.atualizarUsuarioAcessoUsuario(
      empresaId,
      usuarioId,
      { usuarioAcesso: body.credencial },
      req,
    );
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
      new Set(
        (Array.isArray(body.permissoes) ? body.permissoes : [])
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    const cargoRows = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
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
      ? await this.prisma.$queryRaw<
          Array<{ id: string; codigo: string }>
        >(Prisma.sql`
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
      new Set(
        (body.permissoes ?? []).map((item) => item.trim()).filter(Boolean),
      ),
    );

    if (!codigo || codigo.length < 3 || codigo.length > 80) {
      throw new BadRequestException(
        'codigo inválido. Use entre 3 e 80 caracteres.',
      );
    }
    if (!/^[A-Z0-9_]+$/.test(codigo)) {
      throw new BadRequestException(
        'codigo inválido. Use apenas A-Z, 0-9 e _.',
      );
    }
    if (!nome || nome.length < 3 || nome.length > 120) {
      throw new BadRequestException(
        'nome inválido. Use entre 3 e 120 caracteres.',
      );
    }
    if (
      !Number.isFinite(nivelHierarquico) ||
      nivelHierarquico < 1 ||
      nivelHierarquico > 100
    ) {
      throw new BadRequestException(
        'nivelHierarquico inválido. Use um número entre 1 e 100.',
      );
    }

    const exists = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT id
      FROM cargo
      WHERE empresa_id = ${empresaId}::uuid
        AND codigo = ${codigo}
      LIMIT 1
    `);
    if (exists[0]?.id) {
      throw new BadRequestException(
        'Já existe cargo com este código na empresa.',
      );
    }

    const permissaoRows = codigosPermissao.length
      ? await this.prisma.$queryRaw<
          Array<{ id: string; codigo: string }>
        >(Prisma.sql`
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

    const rows = await this.prisma.$queryRaw<
      Array<{ email: string }>
    >(Prisma.sql`
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
    const serviceRole = this.config
      .get<string>('SUPABASE_SERVICE_ROLE_KEY')
      ?.trim();
    if (!supabaseUrl || !serviceRole) {
      throw new InternalServerErrorException(
        'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para reset de senha administrativo.',
      );
    }

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/generate_link`,
      {
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
      },
    );

    const payload = (await response.json().catch(() => null)) as {
      action_link?: string;
      error_description?: string;
      msg?: string;
    } | null;

    if (!response.ok || !payload?.action_link) {
      throw new BadRequestException(
        payload?.error_description ||
          payload?.msg ||
          'Não foi possível gerar link de redefinição de senha.',
      );
    }

    const usuarioRows = await this.prisma.$queryRaw<
      Array<{ nome: string; empresaNome: string }>
    >(Prisma.sql`
      SELECT u.nome, e.nome_empresa AS "empresaNome"
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      JOIN empresa e ON e.id = ue.empresa_id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);
    const usuario = usuarioRows[0];
    const frontendBaseUrl = resolveFrontendBaseUrl({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>(
        'FRONTEND_PUBLIC_BASE_URL',
      ),
    });
    const template = buildResetSenhaEmail({
      frontendBaseUrl: frontendBaseUrl || 'https://manucmms.vercel.app',
      nome: usuario?.nome ?? email,
      empresaNome: usuario?.empresaNome ?? 'Empresa',
      resetLink: payload.action_link,
    });
    const entregaEmail = await this.enviarEmailTransacional(
      email,
      template.subject,
      template.text,
      template.html,
    );

    return {
      ok: true,
      email,
      resetLink: payload.action_link,
      entregaEmail: { status: entregaEmail },
    };
  }

  @Post('usuarios/:usuarioId/remover-acesso')
  async removerAcessoUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body()
    body: {
      reenviarConvite?: boolean;
      cargoCodigo?: string;
      idUnidadeDestino?: string | null;
      nomeDestino?: string;
    },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const result = await this.removeUsuarioAcesso.execute(
      req.usuarioLocal,
      empresaId,
      usuarioId,
      body,
    );

    const convite = result.conviteReenviado;
    return {
      ok: true,
      email: result.email,
      usuarioId: result.usuarioId,
      conviteReenviado: convite
        ? {
            convite: convite.convite,
            links: convite.links,
            entregaEmail: { status: convite.entregaEmail },
          }
        : null,
    };
  }

  @Post('usuarios/:usuarioId/enviar-email')
  async enviarEmailUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { mensagem?: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const rows = await this.prisma.$queryRaw<
      Array<{
        nome: string;
        email: string;
        usuarioAcesso: string | null;
        empresaNome: string;
        empresaSlug: string;
      }>
    >(Prisma.sql`
      SELECT
        u.nome,
        u.email,
        u.credencial AS "usuarioAcesso",
        e.nome_empresa AS "empresaNome",
        e.slug AS "empresaSlug"
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      JOIN empresa e ON e.id = ue.empresa_id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);

    const usuario = rows[0];
    if (!usuario?.email) {
      throw new BadRequestException('Usuário não encontrado na empresa.');
    }

    const frontendBaseUrl = resolveFrontendBaseUrl({
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
    const accessLink = frontendBaseUrl
      ? `${frontendBaseUrl}${accessPath}/${usuario.empresaSlug}`
      : null;
    if (!accessLink) {
      throw new BadRequestException(
        'FRONTEND_PUBLIC_BASE_URL não configurada para gerar link de acesso.',
      );
    }

    const template = buildAcessoPortalEmail({
      frontendBaseUrl: frontendBaseUrl || 'https://manucmms.vercel.app',
      nome: usuario.nome,
      email: usuario.email,
      empresaNome: usuario.empresaNome,
      accessLink,
      usuarioAcesso: usuario.usuarioAcesso,
      mensagem: body.mensagem?.trim() || null,
    });
    const entregaEmail = await this.enviarEmailTransacional(
      usuario.email,
      template.subject,
      template.text,
      template.html,
    );

    return {
      ok: true,
      email: usuario.email,
      links: { acessoConta: accessLink },
      entregaEmail: { status: entregaEmail },
    };
  }

  @Patch('usuarios/:usuarioId/senha')
  async definirSenhaUsuario(
    @Param('empresaId') empresaId: string,
    @Param('usuarioId') usuarioId: string,
    @Body() body: { senha: string },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const senha = (body.senha ?? '').trim();
    if (senha.length < 8 || senha.length > 72) {
      throw new BadRequestException(
        'senha inválida. Use entre 8 e 72 caracteres.',
      );
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ authSub: string | null }>
    >(Prisma.sql`
      SELECT u.auth_sub AS "authSub"
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);

    const authSub = rows[0]?.authSub ?? null;
    if (!authSub) {
      throw new BadRequestException(
        'Usuário não encontrado na empresa ou sem vínculo de autenticação.',
      );
    }

    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    const serviceRole = this.config
      .get<string>('SUPABASE_SERVICE_ROLE_KEY')
      ?.trim();
    if (!supabaseUrl || !serviceRole) {
      throw new InternalServerErrorException(
        'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para atualização de senha administrativa.',
      );
    }

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${authSub}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
        },
        body: JSON.stringify({ password: senha }),
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        msg?: string;
        error_description?: string;
      } | null;
      throw new BadRequestException(
        payload?.error_description ||
          payload?.msg ||
          'Não foi possível atualizar a senha no provedor de autenticação.',
      );
    }

    return { ok: true };
  }

  @Get('integracao')
  async getIntegracao(
    @Param('empresaId') empresaId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);
    const resumo = await this.integracaoWebhook.getResumo(empresaId);
    return {
      ...resumo,
      apiKeyIntegracao: maskApiKeyIntegracao(resumo.apiKeyIntegracao),
    };
  }

  @Patch('integracao')
  async patchIntegracao(
    @Param('empresaId') empresaId: string,
    @Req() req: Request,
    @Body() body: { webhookUrl?: string | null },
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);

    const webhookUrl =
      body.webhookUrl === undefined
        ? undefined
        : body.webhookUrl === null || body.webhookUrl.trim() === ''
          ? null
          : body.webhookUrl.trim();

    if (webhookUrl !== undefined) {
      await this.integracaoWebhook.updateWebhookUrl(empresaId, webhookUrl);
    }

    const resumo = await this.integracaoWebhook.getResumo(empresaId);
    return {
      ...resumo,
      apiKeyIntegracao: maskApiKeyIntegracao(resumo.apiKeyIntegracao),
    };
  }

  @Post('integracao/regenerar-api-key')
  async regenerarApiKey(
    @Param('empresaId') empresaId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);
    const apiKeyIntegracao =
      await this.integracaoWebhook.regenerateApiKey(empresaId);
    const resumo = await this.integracaoWebhook.getResumo(empresaId);
    return { ...resumo, apiKeyIntegracao };
  }

  @Post('integracao/testar-webhook')
  async testarWebhook(
    @Param('empresaId') empresaId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'empresa.gerenciar');
    this.ensureEmpresaScope(req, empresaId);
    return this.integracaoWebhook.testWebhook(empresaId);
  }

  private async enviarEmailTransacional(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<EmailEntregaStatus> {
    if (!this.emailPort.isConfigured()) {
      return 'NAO_CONFIGURADO';
    }
    try {
      await this.emailPort.send({ to, subject, text, html });
      return 'ENVIADO';
    } catch {
      return 'FALHOU';
    }
  }

  private ensureEmpresaScope(req: Request, empresaId: string) {
    const currentEmpresaId = req.usuarioLocal?.empresa?.id;
    if (!currentEmpresaId || currentEmpresaId !== empresaId) {
      throw new BadRequestException(
        'Empresa fora do escopo do usuário autenticado.',
      );
    }
  }
}
