import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  UsuarioCargoContext,
  UsuarioEmpresaContext,
  UsuarioLocalContext,
} from '../../domain/entities/usuario-local';
import type {
  CreateUsuarioBootstrapInput,
  EnsureUsuarioEmpresaAccessInput,
  IUsuarioReadPort,
  PerfilUsuarioCodigo,
} from '../../domain/ports/usuario-read.port';
import { PrismaService } from './prisma.service';

type PrismaExecutor = Pick<
  PrismaClient,
  '$executeRaw' | '$queryRaw' | 'usuario'
>;

type UsuarioRow = {
  id: string;
  authSub: string;
  idUnidade: string;
  nome: string;
  fotoUrl?: string | null;
  email: string;
  perfil: string;
  status: string;
};

type UsuarioEmpresaRow = {
  id: string;
  nomeEmpresa: string;
  slug: string;
  status: string;
  statusMembros: string;
};

type UsuarioCargoRow = {
  id: string;
  codigo: string;
  nome: string;
  nivelHierarquico: number;
  idUnidade: string | null;
  permissaoCodigo: string | null;
};

type DefaultPermission = {
  codigo: string;
  nome: string;
  descricao: string;
  modulo: string;
};

@Injectable()
export class PrismaUsuarioRepository implements IUsuarioReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async existsInUnidade(
    idUsuario: string,
    idUnidade: string,
  ): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<
      Array<{ exists: boolean }>
    >(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM usuario u
        WHERE u.id = ${idUsuario}::uuid
          AND (
            u.id_unidade = ${idUnidade}::uuid
            OR EXISTS (
              SELECT 1
              FROM usuario_empresa ue
              JOIN usuario_cargo uc ON uc.usuario_empresa_id = ue.id
              WHERE ue.usuario_id = u.id
                AND uc.id_unidade = ${idUnidade}::uuid
            )
          )
      ) AS "exists"
    `);
    return rows[0]?.exists === true;
  }

  async listByUnidade(idUnidade: string): Promise<UsuarioLocalContext[]> {
    const usuarioIds = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT DISTINCT u.id
      FROM usuario u
      JOIN unidade_fabril uf ON uf.id = ${idUnidade}::uuid
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
        AND ue.empresa_id = uf.empresa_id
        AND ue.status = 'ATIVO'
      LEFT JOIN usuario_cargo uc ON uc.usuario_empresa_id = ue.id
      WHERE u.id_unidade = ${idUnidade}::uuid
         OR uc.id_unidade = ${idUnidade}::uuid
    `);

    if (usuarioIds.length === 0) {
      return [];
    }

    const ids = usuarioIds.map((row) => row.id);
    const rows = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      orderBy: [{ nome: 'asc' }, { email: 'asc' }],
    });

    const empresaRows = await this.prisma.$queryRaw<
      Array<UsuarioEmpresaRow & { usuarioId: string }>
    >(Prisma.sql`
      SELECT
        ue.usuario_id AS "usuarioId",
        e.id,
        e.nome_empresa AS "nomeEmpresa",
        e.slug,
        e.status::text AS status,
        ue.status::text AS "statusMembros"
      FROM usuario_empresa ue
      JOIN empresa e ON e.id = ue.empresa_id
      JOIN unidade_fabril uf ON uf.empresa_id = e.id AND uf.id = ${idUnidade}::uuid
      WHERE ue.usuario_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
    `);

    const empresaByUser = new Map(
      empresaRows.map((row) => [row.usuarioId, row]),
    );
    const empresaId = empresaRows[0]?.id ?? null;
    const cargosByUser = empresaId
      ? await this.loadCargoContextsBatch(ids, empresaId)
      : new Map<string, UsuarioCargoContext[]>();

    return rows.map((row) =>
      this.buildLocalContext(
        row,
        empresaByUser.get(row.id) ?? null,
        cargosByUser.get(row.id) ?? [],
      ),
    );
  }

  async findByIdInUnidade(
    idUsuario: string,
    idUnidade: string,
  ): Promise<UsuarioLocalContext | null> {
    const pertence = await this.existsInUnidade(idUsuario, idUnidade);
    if (!pertence) {
      return null;
    }
    const row = await this.prisma.usuario.findUnique({
      where: { id: idUsuario },
    });
    if (!row) {
      return null;
    }
    return this.toLocalContext(row);
  }

  async findByAuthSub(
    authSub: string,
    preferredEmpresaSlug?: string | null,
  ): Promise<UsuarioLocalContext | null> {
    const row = await this.prisma.usuario.findUnique({
      where: { authSub },
    });
    if (!row) {
      return null;
    }

    return this.toLocalContext(row, preferredEmpresaSlug ?? null);
  }

  async findByEmail(
    email: string,
    preferredEmpresaSlug?: string | null,
  ): Promise<UsuarioLocalContext | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<UsuarioRow[]>(Prisma.sql`
      SELECT
        id,
        auth_sub AS "authSub",
        id_unidade AS "idUnidade",
        nome,
        foto_url AS "fotoUrl",
        email,
        perfil,
        status::text AS status
      FROM usuario
      WHERE lower(email) = ${normalizedEmail}
      LIMIT 1
    `);

    if (!rows[0]) {
      return null;
    }

    return this.toLocalContext(rows[0], preferredEmpresaSlug ?? null);
  }

  async updateAuthSub(idUsuario: string, authSub: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario
      SET
        auth_sub = ${authSub},
        updated_at = NOW()
      WHERE id = ${idUsuario}::uuid
    `);
  }

  async ensureAccessContext(
    input: EnsureUsuarioEmpresaAccessInput,
  ): Promise<void> {
    if (!input.empresaId) {
      return;
    }

    await this.ensureBootstrapBindings(this.prisma, input.idUsuario, {
      authSub: '',
      email: '',
      nome: '',
      idUnidade: input.idUnidade,
      idUnidadeCargo: input.idUnidadeCargo ?? input.idUnidade,
      empresaId: input.empresaId,
      perfil: input.perfil,
      cargoCodigoEmpresa: input.cargoCodigoEmpresa,
    });
  }

  async createBootstrap(
    input: CreateUsuarioBootstrapInput,
  ): Promise<UsuarioLocalContext> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            authSub: input.authSub,
            email: input.email,
            nome: input.nome,
            idUnidade: input.idUnidade,
            perfil: input.perfil,
          },
        });

        if (input.empresaId) {
          await this.ensureBootstrapBindings(tx, usuario.id, input);
        }

        return usuario;
      });

      return this.toLocalContext(created);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const again = await this.findByAuthSub(input.authSub);
        if (again) {
          return again;
        }

        const byEmail = await this.findByEmail(input.email);
        if (byEmail) {
          await this.updateAuthSub(byEmail.id, input.authSub);
          await this.ensureAccessContext({
            idUsuario: byEmail.id,
            idUnidade: input.idUnidade,
            idUnidadeCargo: input.idUnidadeCargo ?? input.idUnidade,
            empresaId: input.empresaId ?? null,
            perfil: input.perfil,
            cargoCodigoEmpresa: input.cargoCodigoEmpresa,
          });
          const relinked = await this.findByAuthSub(input.authSub);
          if (relinked) {
            return relinked;
          }
          return byEmail;
        }
      }
      throw e;
    }
  }

  private async ensureBootstrapBindings(
    executor: PrismaExecutor,
    usuarioId: string,
    input: CreateUsuarioBootstrapInput,
  ) {
    await this.promoteUsuarioPerfilIfNeeded(executor, usuarioId, input.perfil);

    const empresaId = input.empresaId;
    if (!empresaId) {
      return;
    }
    const idUnidadeCargo = input.idUnidadeCargo ?? input.idUnidade;

    let usuarioEmpresaId = await this.findUsuarioEmpresaId(
      executor,
      usuarioId,
      empresaId,
    );
    if (!usuarioEmpresaId) {
      const empresaVinculosRows = await executor.$queryRaw<
        Array<{ total: number }>
      >(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM usuario_empresa
        WHERE empresa_id = ${empresaId}::uuid
      `);
      const isResponsavelPrincipal = (empresaVinculosRows[0]?.total ?? 0) === 0;

      usuarioEmpresaId = randomUUID();
      await executor.$executeRaw(Prisma.sql`
        INSERT INTO usuario_empresa (
          id,
          usuario_id,
          empresa_id,
          status,
          is_responsavel_principal,
          created_at,
          updated_at
        )
        VALUES (
          ${usuarioEmpresaId}::uuid,
          ${usuarioId}::uuid,
          ${empresaId}::uuid,
          'ATIVO',
          ${isResponsavelPrincipal},
          NOW(),
          NOW()
        )
      `);
    } else {
      await executor.$executeRaw(Prisma.sql`
        UPDATE usuario_empresa
        SET
          status = 'ATIVO',
          updated_at = NOW()
        WHERE id = ${usuarioEmpresaId}::uuid
      `);
    }

    const cargoEmpresaCodigo = input.cargoCodigoEmpresa?.trim().toUpperCase() ?? '';
    let cargoId: string | null = null;
    let usingCustomCargo = false;
    if (cargoEmpresaCodigo) {
      cargoId = await this.findCargoIdByCodigo(
        executor,
        empresaId,
        cargoEmpresaCodigo,
      );
      usingCustomCargo = Boolean(cargoId);
    }
    if (!cargoId) {
      cargoId = await this.findCargoId(executor, empresaId, input.perfil);
    }
    if (!cargoId) {
      cargoId = randomUUID();
      await executor.$executeRaw(Prisma.sql`
        INSERT INTO cargo (
          id,
          empresa_id,
          codigo,
          nome,
          nivel_hierarquico,
          is_sistema,
          created_at,
          updated_at
        )
        VALUES (
          ${cargoId}::uuid,
          ${empresaId}::uuid,
          ${input.perfil},
          ${formatPerfilLabel(input.perfil)},
          ${perfilHierarchy[input.perfil]},
          true,
          NOW(),
          NOW()
        )
      `);
    } else if (!usingCustomCargo) {
      await executor.$executeRaw(Prisma.sql`
        UPDATE cargo
        SET
          nome = ${formatPerfilLabel(input.perfil)},
          nivel_hierarquico = ${perfilHierarchy[input.perfil]},
          is_sistema = true,
          updated_at = NOW()
        WHERE id = ${cargoId}::uuid
      `);
    }

    if (!usingCustomCargo) {
      await this.ensureDefaultPermissions(executor, cargoId, input.perfil);
    }

    const usuarioCargoExiste = await executor.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
        FROM usuario_cargo
        WHERE usuario_empresa_id = ${usuarioEmpresaId}::uuid
          AND cargo_id = ${cargoId}::uuid
          AND (
            (${idUnidadeCargo}::uuid IS NULL AND id_unidade IS NULL)
            OR id_unidade = ${idUnidadeCargo}::uuid
          )
        LIMIT 1
      `,
    );

    if (!usuarioCargoExiste[0]?.id) {
      await executor.$executeRaw(Prisma.sql`
        INSERT INTO usuario_cargo (
          id,
          usuario_empresa_id,
          cargo_id,
          id_unidade,
          created_at,
          updated_at
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${usuarioEmpresaId}::uuid,
          ${cargoId}::uuid,
          ${idUnidadeCargo}::uuid,
          NOW(),
          NOW()
        )
      `);
    }
  }

  private async findUsuarioEmpresaId(
    executor: PrismaExecutor,
    usuarioId: string,
    empresaId: string,
  ) {
    const rows = await executor.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM usuario_empresa
      WHERE usuario_id = ${usuarioId}::uuid
        AND empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);

    return rows[0]?.id ?? null;
  }

  private async findCargoIdByCodigo(
    executor: PrismaExecutor,
    empresaId: string,
    codigo: string,
  ) {
    const rows = await executor.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM cargo
      WHERE empresa_id = ${empresaId}::uuid
        AND codigo = ${codigo}
      LIMIT 1
    `);

    return rows[0]?.id ?? null;
  }

  private async findCargoId(
    executor: PrismaExecutor,
    empresaId: string,
    perfil: PerfilUsuarioCodigo,
  ) {
    const rows = await executor.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM cargo
      WHERE empresa_id = ${empresaId}::uuid
        AND codigo = ${perfil}
      LIMIT 1
    `);

    return rows[0]?.id ?? null;
  }

  private async ensureDefaultPermissions(
    executor: PrismaExecutor,
    cargoId: string,
    perfil: PerfilUsuarioCodigo,
  ) {
    for (const permission of defaultPermissionsByPerfil[perfil]) {
      let permissaoId = await this.findPermissaoId(executor, permission.codigo);

      if (!permissaoId) {
        permissaoId = randomUUID();
        await executor.$executeRaw(Prisma.sql`
          INSERT INTO permissao (
            id,
            codigo,
            nome,
            descricao,
            modulo,
            created_at
          )
          VALUES (
            ${permissaoId}::uuid,
            ${permission.codigo},
            ${permission.nome},
            ${permission.descricao},
            ${permission.modulo},
            NOW()
          )
        `);
      }

      const relacaoExiste = await executor.$queryRaw<
        Array<{ cargoId: string }>
      >(
        Prisma.sql`
          SELECT cargo_id AS "cargoId"
          FROM cargo_permissao
          WHERE cargo_id = ${cargoId}::uuid
            AND permissao_id = ${permissaoId}::uuid
          LIMIT 1
        `,
      );

      if (!relacaoExiste[0]?.cargoId) {
        await executor.$executeRaw(Prisma.sql`
          INSERT INTO cargo_permissao (
            cargo_id,
            permissao_id,
            created_at
          )
          VALUES (
            ${cargoId}::uuid,
            ${permissaoId}::uuid,
            NOW()
          )
        `);
      }
    }
  }

  private async findPermissaoId(
    executor: PrismaExecutor,
    codigo: string,
  ): Promise<string | null> {
    const rows = await executor.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM permissao
      WHERE codigo = ${codigo}
      LIMIT 1
    `);

    return rows[0]?.id ?? null;
  }

  private async promoteUsuarioPerfilIfNeeded(
    executor: PrismaExecutor,
    usuarioId: string,
    perfilNovo: PerfilUsuarioCodigo,
  ) {
    const usuario = await executor.usuario.findUnique({
      where: { id: usuarioId },
      select: { perfil: true },
    });
    const perfilAtual = (usuario?.perfil ?? '')
      .trim()
      .toUpperCase() as PerfilUsuarioCodigo;
    const perfilMaisForte = pickHighestPerfil(perfilAtual, perfilNovo);
    if (perfilMaisForte === perfilAtual) {
      return;
    }

    await executor.$executeRaw(Prisma.sql`
      UPDATE usuario
      SET
        perfil = ${perfilMaisForte},
        updated_at = NOW()
      WHERE id = ${usuarioId}::uuid
    `);
  }

  private async toLocalContext(
    r: UsuarioRow,
    preferredEmpresaSlug?: string | null,
  ): Promise<UsuarioLocalContext> {
    const empresa = await this.loadEmpresaContext(
      r.id,
      r.idUnidade,
      preferredEmpresaSlug ?? null,
    );
    const cargos = empresa?.id
      ? await this.loadCargoContexts(r.id, empresa.id)
      : [];
    return this.buildLocalContext(r, empresa, cargos);
  }

  private buildLocalContext(
    r: UsuarioRow,
    empresa: UsuarioEmpresaContext | null,
    cargos: UsuarioCargoContext[],
  ): UsuarioLocalContext {
    const permissoes = Array.from(
      new Set(cargos.flatMap((cargo) => cargo.permissoes)),
    ).sort();

    return {
      id: r.id,
      authSub: r.authSub,
      idUnidade: r.idUnidade,
      nome: r.nome,
      fotoUrl: r.fotoUrl ?? null,
      email: r.email,
      perfil: r.perfil,
      status: r.status,
      statusMembros: empresa?.statusMembros ?? 'ATIVO',
      empresa,
      cargos,
      permissoes,
    };
  }

  private async loadCargoContextsBatch(
    usuarioIds: string[],
    empresaId: string,
  ): Promise<Map<string, UsuarioCargoContext[]>> {
    if (usuarioIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.$queryRaw<
      Array<UsuarioCargoRow & { usuarioId: string }>
    >(Prisma.sql`
      SELECT
        ue.usuario_id AS "usuarioId",
        c.id,
        c.codigo,
        c.nome,
        c.nivel_hierarquico AS "nivelHierarquico",
        uc.id_unidade AS "idUnidade",
        p.codigo AS "permissaoCodigo"
      FROM usuario_empresa ue
      JOIN usuario_cargo uc ON uc.usuario_empresa_id = ue.id
      JOIN cargo c ON c.id = uc.cargo_id
      LEFT JOIN cargo_permissao cp ON cp.cargo_id = c.id
      LEFT JOIN permissao p ON p.id = cp.permissao_id
      WHERE ue.empresa_id = ${empresaId}::uuid
        AND ue.usuario_id IN (${Prisma.join(usuarioIds.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY c.nivel_hierarquico DESC, c.nome ASC
    `);

    const byUser = new Map<string, Map<string, UsuarioCargoContext>>();
    for (const row of rows) {
      const userCargos = byUser.get(row.usuarioId) ?? new Map<string, UsuarioCargoContext>();
      const current = userCargos.get(row.id);
      if (!current) {
        userCargos.set(row.id, {
          id: row.id,
          codigo: row.codigo,
          nome: row.nome,
          nivelHierarquico: row.nivelHierarquico,
          idUnidade: row.idUnidade,
          permissoes: row.permissaoCodigo ? [row.permissaoCodigo] : [],
        });
      } else if (
        row.permissaoCodigo &&
        !current.permissoes.includes(row.permissaoCodigo)
      ) {
        current.permissoes.push(row.permissaoCodigo);
      }
      byUser.set(row.usuarioId, userCargos);
    }

    const result = new Map<string, UsuarioCargoContext[]>();
    for (const [usuarioId, cargoMap] of byUser.entries()) {
      result.set(
        usuarioId,
        Array.from(cargoMap.values()).map((cargo) => ({
          ...cargo,
          permissoes: cargo.permissoes.sort(),
        })),
      );
    }
    return result;
  }

  async updateFotoUrl(idUsuario: string, fotoUrl: string | null): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario
      SET
        foto_url = ${fotoUrl},
        updated_at = NOW()
      WHERE id = ${idUsuario}::uuid
    `);
  }

  private async loadEmpresaContext(
    usuarioId: string,
    idUnidade: string,
    preferredEmpresaSlug?: string | null,
  ): Promise<UsuarioEmpresaContext | null> {
    const normalizedPreferredSlug =
      preferredEmpresaSlug?.trim().toLowerCase() ?? '';

    const rows = await this.prisma.$queryRaw<UsuarioEmpresaRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.nome_empresa AS "nomeEmpresa",
        e.slug,
        e.status::text AS status,
        ue.status::text AS "statusMembros"
      FROM usuario_empresa ue
      JOIN empresa e ON e.id = ue.empresa_id
      LEFT JOIN unidade_fabril uf ON uf.empresa_id = e.id AND uf.id = ${idUnidade}::uuid
      WHERE ue.usuario_id = ${usuarioId}::uuid
      ORDER BY
        CASE
          WHEN ${normalizedPreferredSlug} <> ''
            AND lower(e.slug) = ${normalizedPreferredSlug}
          THEN 0 ELSE 1
        END,
        CASE WHEN uf.id IS NOT NULL THEN 0 ELSE 1 END,
        ue.is_responsavel_principal DESC,
        ue.created_at ASC
      LIMIT 1
    `);

    if (rows[0]) {
      return rows[0];
    }

    const fallback = await this.prisma.$queryRaw<
      UsuarioEmpresaRow[]
    >(Prisma.sql`
      SELECT
        e.id,
        e.nome_empresa AS "nomeEmpresa",
        e.slug,
        e.status::text AS status,
        'ATIVO'::text AS "statusMembros"
      FROM empresa e
      JOIN unidade_fabril uf ON uf.empresa_id = e.id
      WHERE uf.id = ${idUnidade}::uuid
      LIMIT 1
    `);

    return fallback[0] ?? null;
  }

  private async loadCargoContexts(
    usuarioId: string,
    empresaId: string,
  ): Promise<UsuarioCargoContext[]> {
    const rows = await this.prisma.$queryRaw<UsuarioCargoRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.codigo,
        c.nome,
        c.nivel_hierarquico AS "nivelHierarquico",
        uc.id_unidade AS "idUnidade",
        p.codigo AS "permissaoCodigo"
      FROM usuario_empresa ue
      JOIN usuario_cargo uc ON uc.usuario_empresa_id = ue.id
      JOIN cargo c ON c.id = uc.cargo_id
      LEFT JOIN cargo_permissao cp ON cp.cargo_id = c.id
      LEFT JOIN permissao p ON p.id = cp.permissao_id
      WHERE ue.usuario_id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      ORDER BY c.nivel_hierarquico DESC, c.nome ASC
    `);

    const byCargoId = new Map<string, UsuarioCargoContext>();
    for (const row of rows) {
      const current = byCargoId.get(row.id);
      if (!current) {
        byCargoId.set(row.id, {
          id: row.id,
          codigo: row.codigo,
          nome: row.nome,
          nivelHierarquico: row.nivelHierarquico,
          idUnidade: row.idUnidade,
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

    return Array.from(byCargoId.values()).map((cargo) => ({
      ...cargo,
      permissoes: cargo.permissoes.sort(),
    }));
  }
}

const perfilHierarchy: Record<PerfilUsuarioCodigo, number> = {
  TECNICO: 10,
  SUPERVISOR: 20,
  GESTOR: 30,
  AUDITOR: 40,
  ADMIN: 50,
};

function pickHighestPerfil(
  maybeCurrent: string | null | undefined,
  incoming: PerfilUsuarioCodigo,
): PerfilUsuarioCodigo {
  const current = (maybeCurrent ?? '')
    .trim()
    .toUpperCase() as PerfilUsuarioCodigo;
  if (!(current in perfilHierarchy)) {
    return incoming;
  }
  return perfilHierarchy[current] >= perfilHierarchy[incoming]
    ? current
    : incoming;
}

function formatPerfilLabel(perfil: PerfilUsuarioCodigo) {
  return perfil.charAt(0) + perfil.slice(1).toLowerCase();
}

const READ_UNIDADES: DefaultPermission = {
  codigo: 'unidade.visualizar',
  nome: 'Visualizar unidades',
  descricao: 'Permite visualizar unidades autorizadas.',
  modulo: 'unidade',
};

const READ_USERS: DefaultPermission = {
  codigo: 'usuario.visualizar_unidade',
  nome: 'Visualizar usuarios da unidade',
  descricao: 'Permite listar usuarios da unidade.',
  modulo: 'usuario',
};

const INVITE_USERS: DefaultPermission = {
  codigo: 'usuario.convidar',
  nome: 'Convidar usuarios',
  descricao: 'Permite emitir convites de acesso para a empresa.',
  modulo: 'usuario',
};

const READ_ATIVOS: DefaultPermission = {
  codigo: 'ativo.visualizar',
  nome: 'Visualizar ativos',
  descricao: 'Permite visualizar ativos da unidade.',
  modulo: 'ativo',
};

const CREATE_ATIVOS: DefaultPermission = {
  codigo: 'ativo.criar',
  nome: 'Criar ativo',
  descricao: 'Permite cadastrar ativos na unidade.',
  modulo: 'ativo',
};

const READ_ORDENS: DefaultPermission = {
  codigo: 'os.visualizar_unidade',
  nome: 'Visualizar ordens de servico',
  descricao: 'Permite visualizar ordens de servico da unidade.',
  modulo: 'ordem_servico',
};

const CREATE_ORDENS: DefaultPermission = {
  codigo: 'os.criar',
  nome: 'Criar ordem de servico',
  descricao: 'Permite abrir ordens de servico.',
  modulo: 'ordem_servico',
};

const EXECUTE_ORDENS: DefaultPermission = {
  codigo: 'os.executar',
  nome: 'Executar ordem de servico',
  descricao: 'Permite iniciar execucao de ordem de servico.',
  modulo: 'ordem_servico',
};

const CANCEL_ORDENS: DefaultPermission = {
  codigo: 'os.cancelar',
  nome: 'Cancelar ordem de servico',
  descricao: 'Permite cancelar ordens de servico.',
  modulo: 'ordem_servico',
};

const CLOSE_ORDENS: DefaultPermission = {
  codigo: 'os.fechar',
  nome: 'Fechar ordem de servico',
  descricao: 'Permite concluir ordem de servico com evidencias.',
  modulo: 'ordem_servico',
};

const DASHBOARD_EXECUTIVO: DefaultPermission = {
  codigo: 'dashboard.executivo',
  nome: 'Dashboard executivo',
  descricao: 'Visualizar KPIs executivos da unidade.',
  modulo: 'dashboard',
};

const MANAGE_EMPRESA: DefaultPermission = {
  codigo: 'empresa.gerenciar',
  nome: 'Gerenciar empresa',
  descricao: 'Permite administrar configuracoes e onboarding da empresa.',
  modulo: 'empresa',
};

const defaultPermissionsByPerfil: Record<
  PerfilUsuarioCodigo,
  DefaultPermission[]
> = {
  TECNICO: [
    READ_UNIDADES,
    READ_ATIVOS,
    READ_ORDENS,
    EXECUTE_ORDENS,
    CLOSE_ORDENS,
  ],
  SUPERVISOR: [
    READ_UNIDADES,
    READ_USERS,
    READ_ATIVOS,
    CREATE_ATIVOS,
    READ_ORDENS,
    CREATE_ORDENS,
    EXECUTE_ORDENS,
    CANCEL_ORDENS,
    CLOSE_ORDENS,
  ],
  GESTOR: [
    READ_UNIDADES,
    READ_USERS,
    READ_ATIVOS,
    CREATE_ATIVOS,
    READ_ORDENS,
    CREATE_ORDENS,
    EXECUTE_ORDENS,
    CANCEL_ORDENS,
    CLOSE_ORDENS,
    DASHBOARD_EXECUTIVO,
  ],
  AUDITOR: [READ_UNIDADES, READ_USERS, READ_ATIVOS, READ_ORDENS],
  ADMIN: [
    MANAGE_EMPRESA,
    READ_UNIDADES,
    READ_USERS,
    INVITE_USERS,
    READ_ATIVOS,
    CREATE_ATIVOS,
    READ_ORDENS,
    CREATE_ORDENS,
    EXECUTE_ORDENS,
    CANCEL_ORDENS,
    CLOSE_ORDENS,
    DASHBOARD_EXECUTIVO,
  ],
};
