import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  hashConviteToken,
  normalizeConviteToken,
} from './convite-token.shared';
import type { AuthUserContext } from '../../presentation/auth/auth-user.types';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
  type PerfilUsuarioCodigo,
} from '../../domain/ports/usuario-read.port';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import {
  isPerfilConvite,
  resolvePerfilFromCargo,
} from './convite-cargo.shared';
import { normalizeDisplayName, normalizeEmail } from './onboarding.shared';

@Injectable()
export class AcceptConviteAcessoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
  ) {}

  async execute(
    authUser: AuthUserContext,
    input: { token: string; nome?: string },
  ) {
    const token = normalizeConviteToken(input.token);
    if (token.length < 20) {
      throw new BadRequestException('Token de convite invalido.');
    }

    const emailAuth = normalizeEmail(authUser.email ?? undefined);
    if (!emailAuth) {
      throw new BadRequestException(
        'O token autenticado precisa conter email para aceitar o convite.',
      );
    }

    const tokenHash = hashConviteToken(token);
    const conviteRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        empresaId: string;
        emailDestino: string;
        cargoCodigo: string;
        idUnidadeDestino: string | null;
        status: string;
        expiraEm: Date;
        usuarioCriadoId: string | null;
      }>
    >(Prisma.sql`
      SELECT
        id,
        empresa_id AS "empresaId",
        email_destino AS "emailDestino",
        cargo_codigo AS "cargoCodigo",
        id_unidade_destino AS "idUnidadeDestino",
        status::text AS status,
        expira_em AS "expiraEm",
        usuario_criado_id AS "usuarioCriadoId"
      FROM convite_acesso
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `);

    const convite = conviteRows[0];
    if (!convite) {
      throw new NotFoundException('Convite nao encontrado.');
    }

    if (normalizeEmail(convite.emailDestino) !== emailAuth) {
      throw new BadRequestException(
        `O email autenticado nao corresponde ao convite. Este convite foi emitido para ${normalizeEmail(convite.emailDestino)}.`,
      );
    }

    if (convite.status !== 'PENDENTE' && convite.status !== 'ACEITO') {
      throw new BadRequestException('Convite expirado ou indisponivel.');
    }

    if (convite.status === 'PENDENTE') {
      const expiradoRows = await this.prisma.$queryRaw<
        Array<{ expirado: boolean }>
      >(Prisma.sql`
        SELECT (expira_em <= NOW()) AS expirado
        FROM convite_acesso
        WHERE id = ${convite.id}::uuid
        LIMIT 1
      `);
      if (expiradoRows[0]?.expirado) {
        throw new BadRequestException('Convite expirado ou indisponivel.');
      }
    }

    const unidadeRows = await this.unidades.listByEmpresa(convite.empresaId);
    const unidadePrincipal =
      unidadeRows.find((item) => item.id === convite.idUnidadeDestino) ??
      unidadeRows[0];
    if (!unidadePrincipal) {
      throw new NotFoundException(
        'Empresa do convite nao possui unidade fabril inicial.',
      );
    }
    const perfil = await this.resolveConvitePerfil(
      convite.empresaId,
      convite.cargoCodigo,
    );
    const cargoCodigoEmpresa = isPerfilConvite(convite.cargoCodigo)
      ? null
      : convite.cargoCodigo;
    const idUnidadeCargo = convite.idUnidadeDestino;

    const nome = normalizeDisplayName(
      input.nome,
      emailAuth.split('@')[0] || 'Colaborador',
    );

    const usuarioLocal = await this.ensureUsuarioLocalFromConvite({
      authUser,
      emailAuth,
      nome,
      convite,
      unidadePrincipalId: unidadePrincipal.id,
      idUnidadeCargo,
      perfil,
      cargoCodigoEmpresa,
    });

    if (convite.status === 'PENDENTE') {
      const updatedRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          UPDATE convite_acesso
          SET
            status = 'ACEITO',
            usuario_criado_id = ${usuarioLocal.id}::uuid,
            updated_at = NOW()
          WHERE id = ${convite.id}::uuid
            AND status = 'PENDENTE'
            AND expira_em > NOW()
          RETURNING id
        `,
      );

      if (!updatedRows[0]?.id) {
        const refreshedRows = await this.prisma.$queryRaw<
          Array<{ status: string; usuarioCriadoId: string | null }>
        >(Prisma.sql`
          SELECT status::text AS status, usuario_criado_id AS "usuarioCriadoId"
          FROM convite_acesso
          WHERE id = ${convite.id}::uuid
          LIMIT 1
        `);
        const refreshed = refreshedRows[0];
        if (
          refreshed?.status === 'ACEITO' &&
          refreshed.usuarioCriadoId === usuarioLocal.id
        ) {
          return this.buildAcceptResponse(convite, usuarioLocal, perfil, idUnidadeCargo);
        }

        throw new BadRequestException('Convite expirado ou indisponivel.');
      }

      await this.auditLog.append({
        idUsuario: usuarioLocal.id,
        entidadeAfetada: 'ConviteAcesso',
        idRegistro: convite.id,
        valorAnterior: {
          status: 'PENDENTE',
        },
        valorNovo: {
          status: 'ACEITO',
          empresaId: convite.empresaId,
          usuarioId: usuarioLocal.id,
          perfil,
          idUnidadeCargo,
        },
      });
    } else if (!convite.usuarioCriadoId) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE convite_acesso
        SET
          usuario_criado_id = ${usuarioLocal.id}::uuid,
          updated_at = NOW()
        WHERE id = ${convite.id}::uuid
          AND usuario_criado_id IS NULL
      `);
    }

    return this.buildAcceptResponse(convite, usuarioLocal, perfil, idUnidadeCargo);
  }

  private buildAcceptResponse(
    convite: {
      id: string;
      empresaId: string;
      idUnidadeDestino: string | null;
    },
    usuarioLocal: Awaited<ReturnType<IUsuarioReadPort['findByAuthSub']>>,
    perfil: PerfilUsuarioCodigo,
    idUnidadeCargo: string | null,
  ) {
    if (!usuarioLocal) {
      throw new BadRequestException(
        'Nao foi possivel concluir o vinculo local do convite.',
      );
    }

    return {
      convite: {
        id: convite.id,
        status: 'ACEITO' as const,
        empresaId: convite.empresaId,
        cargoCodigo: perfil,
        idUnidadeDestino: idUnidadeCargo,
      },
      usuario: usuarioLocal,
    };
  }

  private async ensureUsuarioLocalFromConvite(input: {
    authUser: AuthUserContext;
    emailAuth: string;
    nome: string;
    convite: { id: string; empresaId: string };
    unidadePrincipalId: string;
    idUnidadeCargo: string | null;
    perfil: PerfilUsuarioCodigo;
    cargoCodigoEmpresa: string | null;
  }) {
    let usuarioLocal = await this.usuarios.findByAuthSub(input.authUser.userId);

    if (!usuarioLocal) {
      const existentePorEmail = await this.usuarios.findByEmail(input.emailAuth);
      if (existentePorEmail) {
        await this.usuarios.updateAuthSub(
          existentePorEmail.id,
          input.authUser.userId,
        );
        usuarioLocal =
          (await this.usuarios.findByAuthSub(input.authUser.userId)) ??
          existentePorEmail;
      }
    }

    if (!usuarioLocal) {
      usuarioLocal = await this.usuarios.createBootstrap({
        authSub: input.authUser.userId,
        email: input.emailAuth,
        nome: input.nome,
        idUnidade: input.unidadePrincipalId,
        idUnidadeCargo: input.idUnidadeCargo,
        empresaId: input.convite.empresaId,
        perfil: input.perfil,
        cargoCodigoEmpresa: input.cargoCodigoEmpresa,
      });
    } else {
      await this.usuarios.ensureAccessContext({
        idUsuario: usuarioLocal.id,
        idUnidade: input.unidadePrincipalId,
        idUnidadeCargo: input.idUnidadeCargo,
        empresaId: input.convite.empresaId,
        perfil: input.perfil,
        cargoCodigoEmpresa: input.cargoCodigoEmpresa,
      });
      usuarioLocal =
        (await this.usuarios.findByAuthSub(input.authUser.userId)) ??
        usuarioLocal;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario
      SET
        status = 'ATIVO',
        nome = ${input.nome},
        perfil = ${input.perfil}::"PerfilUsuario",
        id_unidade = ${input.unidadePrincipalId}::uuid,
        updated_at = NOW()
      WHERE id = ${usuarioLocal.id}::uuid
    `);

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario_empresa
      SET
        status = 'ATIVO',
        updated_at = NOW()
      WHERE usuario_id = ${usuarioLocal.id}::uuid
        AND empresa_id = ${input.convite.empresaId}::uuid
    `);

    const refreshed = await this.usuarios.findByAuthSub(input.authUser.userId);
    return refreshed ?? usuarioLocal;
  }

  private async resolveConvitePerfil(
    empresaId: string,
    cargoCodigo: string,
  ): Promise<PerfilUsuarioCodigo> {
    const normalized = cargoCodigo.trim().toUpperCase();
    if (isPerfilConvite(normalized)) {
      return normalized;
    }

    const empresaCargoRows = await this.prisma.$queryRaw<
      Array<{
        codigo: string;
        nome: string;
        nivelHierarquico: number;
      }>
    >(Prisma.sql`
      SELECT
        codigo,
        nome,
        nivel_hierarquico AS "nivelHierarquico"
      FROM cargo
      WHERE empresa_id = ${empresaId}::uuid
        AND codigo = ${normalized}
      LIMIT 1
    `);

    const empresaCargo = empresaCargoRows[0];
    if (!empresaCargo) {
      throw new BadRequestException(
        'Convite possui cargo invalido ou removido da empresa.',
      );
    }

    return resolvePerfilFromCargo(normalized, empresaCargo);
  }
}
