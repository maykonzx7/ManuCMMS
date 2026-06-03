import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

@Injectable()
export class CancelConviteAcessoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    empresaId: string,
    conviteId: string,
  ) {
    if (!usuarioLocal?.empresa?.id) {
      throw new ForbiddenException(
        'Contexto da empresa autenticada nao esta disponivel.',
      );
    }

    if (usuarioLocal.empresa.id !== empresaId) {
      throw new ForbiddenException(
        'Nao e permitido cancelar convite de outra empresa.',
      );
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; status: string; expiraEm: Date }>
    >(Prisma.sql`
      SELECT id, status::text AS status, expira_em AS "expiraEm"
      FROM convite_acesso
      WHERE id = ${conviteId}::uuid
        AND empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);
    const convite = rows[0];
    if (!convite) {
      throw new NotFoundException('Convite nao encontrado.');
    }

    if (convite.status !== 'PENDENTE') {
      throw new BadRequestException(
        'Somente convites pendentes podem ser cancelados.',
      );
    }

    if (convite.expiraEm.getTime() < Date.now()) {
      throw new BadRequestException(
        'Convite expirado. Reenvie um novo convite em vez de cancelar.',
      );
    }

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE convite_acesso
      SET status = 'CANCELADO', updated_at = NOW()
      WHERE id = ${conviteId}::uuid
    `);

    return { ok: true, conviteId, status: 'CANCELADO' as const };
  }
}
