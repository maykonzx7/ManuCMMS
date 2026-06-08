import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { CreateConviteAcessoUseCase } from '../onboarding/create-convite-acesso.use-case';
import { normalizeEmail } from '../onboarding/onboarding.shared';
import { AuthorizePlatformOperatorUseCase } from './authorize-platform-operator.use-case';
import { assertUsuarioGestaoTargetAllowed } from './usuario-gestao-guards.shared';

@Injectable()
export class RemoveUsuarioAcessoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createConvite: CreateConviteAcessoUseCase,
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
  ) {}

  async execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    empresaId: string,
    usuarioId: string,
    input?: {
      reenviarConvite?: boolean;
      cargoCodigo?: string;
      idUnidadeDestino?: string | null;
      nomeDestino?: string;
    },
  ) {
    if (!usuarioLocal?.empresa?.id) {
      throw new ForbiddenException(
        'Contexto da empresa autenticada nao esta disponivel.',
      );
    }

    if (usuarioLocal.empresa.id !== empresaId) {
      throw new ForbiddenException(
        'Nao e permitido remover acesso de usuario de outra empresa.',
      );
    }

    if (usuarioLocal.id === usuarioId) {
      throw new BadRequestException(
        'Voce nao pode remover o proprio acesso da empresa.',
      );
    }

    const targetRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        nome: string;
        email: string;
        perfil: string;
        idUnidade: string;
        isResponsavelPrincipal: boolean;
      }>
    >(Prisma.sql`
      SELECT
        u.id,
        u.nome,
        u.email,
        u.perfil::text AS perfil,
        u.id_unidade AS "idUnidade",
        ue.is_responsavel_principal AS "isResponsavelPrincipal"
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);

    const target = targetRows[0];
    if (!target?.id) {
      throw new NotFoundException('Usuario nao encontrado nesta empresa.');
    }

    assertUsuarioGestaoTargetAllowed({
      actor: usuarioLocal,
      targetId: target.id,
      targetEmail: target.email,
      targetPerfil: target.perfil,
      authorizePlatformOperator: this.authorizePlatformOperator,
      action: 'remover o acesso de',
    });

    const membrosAtivosRows = await this.prisma.$queryRaw<
      Array<{ total: number; admins: number }>
    >(Prisma.sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE u.perfil IN ('ADMIN', 'GESTOR')
        )::int AS admins
      FROM usuario_empresa ue
      JOIN usuario u ON u.id = ue.usuario_id
      WHERE ue.empresa_id = ${empresaId}::uuid
        AND ue.status = 'ATIVO'
    `);
    const membrosAtivos = membrosAtivosRows[0]?.total ?? 0;
    const adminsAtivos = membrosAtivosRows[0]?.admins ?? 0;

    if (membrosAtivos <= 1) {
      throw new BadRequestException(
        'Nao e permitido remover o ultimo usuario ativo da empresa.',
      );
    }

    const perfilAlvo = target.perfil.trim().toUpperCase();
    if (
      target.isResponsavelPrincipal &&
      ['ADMIN', 'GESTOR'].includes(perfilAlvo) &&
      adminsAtivos <= 1
    ) {
      throw new BadRequestException(
        'Nao e permitido remover o ultimo administrador/gestor ativo da empresa. Promova outro usuario antes.',
      );
    }

    const emailDestino = normalizeEmail(target.email);
    const cargoCodigo = (input?.cargoCodigo ?? target.perfil).trim().toUpperCase();
    const idUnidadeDestino = input?.idUnidadeDestino?.trim() || target.idUnidade;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM usuario_cargo uc
        USING usuario_empresa ue
        WHERE uc.usuario_empresa_id = ue.id
          AND ue.usuario_id = ${usuarioId}::uuid
          AND ue.empresa_id = ${empresaId}::uuid
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM usuario_empresa
        WHERE usuario_id = ${usuarioId}::uuid
          AND empresa_id = ${empresaId}::uuid
      `);

      if (target.isResponsavelPrincipal) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE usuario_empresa ue
          SET
            is_responsavel_principal = true,
            updated_at = NOW()
          WHERE ue.id = (
            SELECT ue2.id
            FROM usuario_empresa ue2
            JOIN usuario u ON u.id = ue2.usuario_id
            WHERE ue2.empresa_id = ${empresaId}::uuid
              AND ue2.status = 'ATIVO'
              AND u.id <> ${usuarioId}::uuid
            ORDER BY
              CASE WHEN u.perfil = 'ADMIN' THEN 0 WHEN u.perfil = 'GESTOR' THEN 1 ELSE 2 END,
              ue2.created_at ASC
            LIMIT 1
          )
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE convite_acesso
        SET status = 'CANCELADO', updated_at = NOW()
        WHERE empresa_id = ${empresaId}::uuid
          AND lower(email_destino) = ${emailDestino}
          AND status IN ('PENDENTE', 'ACEITO')
      `);

      const outrosVinculosRows = await tx.$queryRaw<
        Array<{ total: number }>
      >(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM usuario_empresa
        WHERE usuario_id = ${usuarioId}::uuid
          AND status = 'ATIVO'
      `);
      const outrosVinculosAtivos = outrosVinculosRows[0]?.total ?? 0;

      if (outrosVinculosAtivos === 0) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE usuario
          SET
            status = 'INATIVO',
            updated_at = NOW()
          WHERE id = ${usuarioId}::uuid
        `);
      }
    });

    let conviteReenviado:
      | Awaited<ReturnType<CreateConviteAcessoUseCase['execute']>>
      | null = null;

    if (input?.reenviarConvite) {
      conviteReenviado = await this.createConvite.execute(
        usuarioLocal,
        empresaId,
        {
          emailDestino,
          nomeDestino: input?.nomeDestino?.trim() || target.nome,
          cargoCodigo,
          idUnidadeDestino,
        },
      );
    }

    return {
      ok: true,
      usuarioId,
      email: emailDestino,
      conviteReenviado,
    };
  }
}
