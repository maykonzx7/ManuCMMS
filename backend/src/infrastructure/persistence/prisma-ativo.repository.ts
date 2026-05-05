import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { AtivoListaItem } from '../../domain/entities/ativo';
import type {
  CreateAtivoInput,
  IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import { PrismaService } from './prisma.service';

type AtivoRow = {
  id: string;
  idUnidade: string;
  nome: string;
  status: string;
  limiteTemp: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaAtivoRepository implements IAtivoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByUnidade(
    empresaId: string,
    idUnidade: string,
  ): Promise<AtivoListaItem[]> {
    const rows = await this.prisma.$queryRaw<AtivoRow[]>(Prisma.sql`
      SELECT
        id,
        id_unidade AS "idUnidade",
        nome,
        status,
        limite_temp AS "limiteTemp",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ativo
      WHERE empresa_id = ${empresaId}::uuid
        AND id_unidade = ${idUnidade}::uuid
      ORDER BY nome ASC
    `);

    return rows.map((row) => this.toListaItem(row));
  }

  async create(input: CreateAtivoInput): Promise<AtivoListaItem> {
    const id = randomUUID();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO ativo (
        id,
        empresa_id,
        id_unidade,
        nome,
        status,
        limite_temp,
        created_at,
        updated_at
      )
      VALUES (
        ${id}::uuid,
        ${input.empresaId}::uuid,
        ${input.idUnidade}::uuid,
        ${input.nome},
        'OPERACIONAL',
        ${input.limiteTemp ?? 48},
        NOW(),
        NOW()
      )
    `);

    const row = await this.findById(id);
    return this.toListaItem(row);
  }

  async existsInUnidade(
    empresaId: string,
    idAtivo: string,
    idUnidade: string,
  ): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM ativo
        WHERE id = ${idAtivo}::uuid
          AND empresa_id = ${empresaId}::uuid
          AND id_unidade = ${idUnidade}::uuid
      ) AS "exists"
    `);

    return rows[0]?.exists === true;
  }

  async getStatusInUnidade(
    empresaId: string,
    idAtivo: string,
    idUnidade: string,
  ): Promise<AtivoListaItem['status'] | null> {
    const rows = await this.prisma.$queryRaw<Array<{ status: AtivoListaItem['status'] }>>(
      Prisma.sql`
        SELECT status
        FROM ativo
        WHERE id = ${idAtivo}::uuid
          AND empresa_id = ${empresaId}::uuid
          AND id_unidade = ${idUnidade}::uuid
        LIMIT 1
      `,
    );

    return rows[0]?.status ?? null;
  }

  private async findById(id: string): Promise<AtivoRow> {
    const rows = await this.prisma.$queryRaw<AtivoRow[]>(Prisma.sql`
      SELECT
        id,
        id_unidade AS "idUnidade",
        nome,
        status,
        limite_temp AS "limiteTemp",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ativo
      WHERE id = ${id}::uuid
      LIMIT 1
    `);

    return rows[0];
  }

  private toListaItem(r: AtivoRow): AtivoListaItem {
    return {
      id: r.id,
      idUnidade: r.idUnidade,
      nome: r.nome,
      status: r.status as AtivoListaItem['status'],
      limiteTemp: r.limiteTemp,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
