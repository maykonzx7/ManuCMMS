import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { AuthorizePlatformOperatorUseCase } from './authorize-platform-operator.use-case';
import { assertUsuarioGestaoTargetAllowed } from './usuario-gestao-guards.shared';

type StatusMembros = 'ATIVO' | 'INATIVO';

@Injectable()
export class UpdateUsuarioEmpresaStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
  ) {}

  async execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    empresaId: string,
    usuarioId: string,
    rawStatus: string,
  ): Promise<{ ok: true; status: StatusMembros }> {
    if (!usuarioLocal?.empresa?.id) {
      throw new ForbiddenException(
        'Contexto da empresa autenticada nao esta disponivel.',
      );
    }

    if (usuarioLocal.empresa.id !== empresaId) {
      throw new ForbiddenException(
        'Nao e permitido alterar status de usuario de outra empresa.',
      );
    }

    const nextStatus = (rawStatus ?? '').trim().toUpperCase();
    if (!['ATIVO', 'INATIVO'].includes(nextStatus)) {
      throw new BadRequestException(
        'status invalido. Use: ATIVO ou INATIVO (escopo da empresa).',
      );
    }

    const targetRows = await this.prisma.$queryRaw<
      Array<{ id: string; email: string; perfil: string }>
    >(Prisma.sql`
      SELECT u.id, u.email, u.perfil::text AS perfil
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);
    const target = targetRows[0];
    if (!target) {
      throw new NotFoundException('Usuario nao encontrado nesta empresa.');
    }

    assertUsuarioGestaoTargetAllowed({
      actor: usuarioLocal,
      targetId: target.id,
      targetEmail: target.email,
      targetPerfil: target.perfil,
      authorizePlatformOperator: this.authorizePlatformOperator,
      action: 'inativar ou alterar o status de',
    });

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE usuario_empresa
      SET
        status = ${nextStatus}::"StatusUsuarioEmpresa",
        updated_at = NOW()
      WHERE usuario_id = ${usuarioId}::uuid
        AND empresa_id = ${empresaId}::uuid
    `);

    if (!updated) {
      throw new NotFoundException('Usuario nao encontrado nesta empresa.');
    }

    return { ok: true, status: nextStatus as StatusMembros };
  }
}
