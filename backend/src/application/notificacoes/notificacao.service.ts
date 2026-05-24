import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import type { NotificacaoInput, NotificacaoView } from './notificacao.types';

@Injectable()
export class NotificacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: NotificacaoInput): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO notificacao (
        id,
        usuario_id,
        empresa_id,
        id_unidade,
        ordem_servico_id,
        tipo,
        titulo,
        mensagem,
        foto_url,
        link_path,
        created_at,
        updated_at
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${input.usuarioId}::uuid,
        ${input.empresaId ?? null}::uuid,
        ${input.idUnidade ?? null}::uuid,
        ${input.ordemServicoId ?? null}::uuid,
        ${input.tipo},
        ${input.titulo},
        ${input.mensagem},
        ${input.fotoUrl ?? null},
        ${input.linkPath ?? null},
        NOW(),
        NOW()
      )
    `);
  }

  async listByUsuario(usuarioId: string): Promise<NotificacaoView[]> {
    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      tipo: string;
      titulo: string;
      mensagem: string;
      fotoUrl: string | null;
      linkPath: string | null;
      lidaEm: Date | null;
      createdAt: Date;
    }>>(Prisma.sql`
      SELECT
        id,
        tipo,
        titulo,
        mensagem,
        foto_url AS "fotoUrl",
        link_path AS "linkPath",
        lida_em AS "lidaEm",
        created_at AS "createdAt"
      FROM notificacao
      WHERE usuario_id = ${usuarioId}::uuid
      ORDER BY created_at DESC
      LIMIT 200
    `);

    return rows.map((r) => ({
      id: r.id,
      tipo: (r.tipo as NotificacaoView['tipo']) ?? 'info',
      titulo: r.titulo,
      mensagem: r.mensagem,
      fotoUrl: r.fotoUrl,
      linkPath: r.linkPath,
      lidaEm: r.lidaEm ? r.lidaEm.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async markAsRead(usuarioId: string, notificacaoId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE notificacao
      SET
        lida_em = COALESCE(lida_em, NOW()),
        updated_at = NOW()
      WHERE id = ${notificacaoId}::uuid
        AND usuario_id = ${usuarioId}::uuid
    `);
  }

  async markAllAsRead(usuarioId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE notificacao
      SET
        lida_em = COALESCE(lida_em, NOW()),
        updated_at = NOW()
      WHERE usuario_id = ${usuarioId}::uuid
        AND lida_em IS NULL
    `);
  }

  async delete(usuarioId: string, notificacaoId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM notificacao
      WHERE id = ${notificacaoId}::uuid
        AND usuario_id = ${usuarioId}::uuid
    `);
  }
}
