import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
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
    const token = input.token?.trim() ?? '';
    if (token.length < 20) {
      throw new BadRequestException('Token de convite invalido.');
    }

    const emailAuth = normalizeEmail(authUser.email ?? undefined);
    if (!emailAuth) {
      throw new BadRequestException(
        'O token autenticado precisa conter email para aceitar o convite.',
      );
    }
    if (!authUser.emailConfirmedAt) {
      throw new BadRequestException(
        'Confirme o email da conta antes de aceitar o convite.',
      );
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const conviteRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        empresaId: string;
        emailDestino: string;
        cargoCodigo: string;
        idUnidadeDestino: string | null;
        status: string;
        expiraEm: Date;
      }>
    >(Prisma.sql`
      SELECT
        id,
        empresa_id AS "empresaId",
        email_destino AS "emailDestino",
        cargo_codigo AS "cargoCodigo",
        id_unidade_destino AS "idUnidadeDestino",
        status,
        expira_em AS "expiraEm"
      FROM convite_acesso
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `);

    const convite = conviteRows[0];
    if (!convite) {
      throw new NotFoundException('Convite nao encontrado.');
    }

    if (
      convite.status !== 'PENDENTE' ||
      convite.expiraEm.getTime() < Date.now()
    ) {
      throw new BadRequestException('Convite expirado ou indisponivel.');
    }

    if (normalizeEmail(convite.emailDestino) !== emailAuth) {
      throw new BadRequestException(
        `O email autenticado nao corresponde ao convite. Este convite foi emitido para ${normalizeEmail(convite.emailDestino)}.`,
      );
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

    let usuarioLocal = await this.usuarios.findByAuthSub(authUser.userId);
    if (!usuarioLocal) {
      usuarioLocal = await this.usuarios.createBootstrap({
        authSub: authUser.userId,
        email: emailAuth,
        nome,
        idUnidade: unidadePrincipal.id,
        idUnidadeCargo,
        empresaId: convite.empresaId,
        perfil,
        cargoCodigoEmpresa,
      });
    } else {
      await this.usuarios.ensureAccessContext({
        idUsuario: usuarioLocal.id,
        idUnidade: unidadePrincipal.id,
        idUnidadeCargo,
        empresaId: convite.empresaId,
        perfil,
        cargoCodigoEmpresa,
      });
      usuarioLocal =
        (await this.usuarios.findByAuthSub(authUser.userId)) ?? usuarioLocal;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE convite_acesso
      SET
        status = 'ACEITO',
        usuario_criado_id = ${usuarioLocal.id}::uuid,
        updated_at = NOW()
      WHERE id = ${convite.id}::uuid
    `);

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

    return {
      convite: {
        id: convite.id,
        status: 'ACEITO',
        empresaId: convite.empresaId,
        cargoCodigo: perfil,
        idUnidadeDestino: idUnidadeCargo,
      },
      usuario: usuarioLocal,
    };
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
