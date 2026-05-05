import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UnidadeListaItem } from '../../domain/entities/unidade';
import type { IUnidadeReadPort } from '../../domain/ports/unidade-read.port';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUnidadeRepository implements IUnidadeReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<UnidadeListaItem[]> {
    return this.prisma.$queryRaw<UnidadeListaItem[]>(Prisma.sql`
      SELECT
        id,
        nome,
        localizacao,
        empresa_id AS "empresaId"
      FROM unidade_fabril
      ORDER BY nome ASC
    `);
  }

  async listByEmpresa(empresaId: string): Promise<UnidadeListaItem[]> {
    return this.prisma.$queryRaw<UnidadeListaItem[]>(Prisma.sql`
      SELECT
        id,
        nome,
        localizacao,
        empresa_id AS "empresaId"
      FROM unidade_fabril
      WHERE empresa_id = ${empresaId}::uuid
      ORDER BY nome ASC
    `);
  }

  async listByIds(ids: string[]): Promise<UnidadeListaItem[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.$queryRaw<UnidadeListaItem[]>(Prisma.sql`
      SELECT
        id,
        nome,
        localizacao,
        empresa_id AS "empresaId"
      FROM unidade_fabril
      WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY nome ASC
    `);
  }

  async findById(id: string): Promise<UnidadeListaItem | null> {
    const rows = await this.prisma.$queryRaw<UnidadeListaItem[]>(Prisma.sql`
      SELECT
        id,
        nome,
        localizacao,
        empresa_id AS "empresaId"
      FROM unidade_fabril
      WHERE id = ${id}::uuid
      LIMIT 1
    `);
    return rows[0] ?? null;
  }
}
