import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type {
  CreatePecaInput,
  IPecaRepositoryPort,
  PecaItem,
  PecaMovimentacaoItem,
  UpdatePecaInput,
} from '../../domain/ports/peca.repository.port';
import { PrismaService } from './prisma.service';

type PecaRow = {
  id: string;
  idUnidade: string;
  codigo: string;
  nome: string;
  quantidadeEstoque: number;
  quantidadeMinima: number;
};

@Injectable()
export class PrismaPecaRepository implements IPecaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByUnidade(
    empresaId: string,
    idUnidade: string,
  ): Promise<PecaItem[]> {
    const rows = await this.prisma.$queryRaw<PecaRow[]>(Prisma.sql`
      SELECT
        id,
        id_unidade AS "idUnidade",
        codigo,
        nome,
        quantidade_estoque AS "quantidadeEstoque",
        quantidade_minima AS "quantidadeMinima"
      FROM peca
      WHERE empresa_id = ${empresaId}::uuid
        AND id_unidade = ${idUnidade}::uuid
      ORDER BY nome ASC
    `);
    return rows;
  }

  async create(input: CreatePecaInput): Promise<PecaItem> {
    const id = randomUUID();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO peca (
        id,
        empresa_id,
        id_unidade,
        codigo,
        nome,
        quantidade_estoque,
        quantidade_minima,
        created_at,
        updated_at
      )
      VALUES (
        ${id}::uuid,
        ${input.empresaId}::uuid,
        ${input.idUnidade}::uuid,
        ${input.codigo.trim()},
        ${input.nome.trim()},
        ${input.quantidadeEstoque ?? 0},
        ${input.quantidadeMinima ?? 0},
        NOW(),
        NOW()
      )
    `);
    const created = await this.findByIdInUnidade(id, input.empresaId, input.idUnidade);
    if (!created) {
      throw new Error('Falha ao criar peça');
    }
    return created;
  }

  async findByIdInUnidade(
    pecaId: string,
    empresaId: string,
    idUnidade: string,
  ): Promise<PecaItem | null> {
    const rows = await this.prisma.$queryRaw<PecaRow[]>(Prisma.sql`
      SELECT
        id,
        id_unidade AS "idUnidade",
        codigo,
        nome,
        quantidade_estoque AS "quantidadeEstoque",
        quantidade_minima AS "quantidadeMinima"
      FROM peca
      WHERE id = ${pecaId}::uuid
        AND empresa_id = ${empresaId}::uuid
        AND id_unidade = ${idUnidade}::uuid
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async update(
    pecaId: string,
    empresaId: string,
    idUnidade: string,
    input: UpdatePecaInput,
  ): Promise<PecaItem> {
    const existing = await this.findByIdInUnidade(pecaId, empresaId, idUnidade);
    if (!existing) {
      throw new Error('Peça não encontrada');
    }
    const codigo = input.codigo?.trim() ?? existing.codigo;
    const nome = input.nome?.trim() ?? existing.nome;
    const quantidadeEstoque =
      input.quantidadeEstoque ?? existing.quantidadeEstoque;
    const quantidadeMinima =
      input.quantidadeMinima ?? existing.quantidadeMinima;

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE peca
      SET
        codigo = ${codigo},
        nome = ${nome},
        quantidade_estoque = ${quantidadeEstoque},
        quantidade_minima = ${quantidadeMinima},
        updated_at = NOW()
      WHERE id = ${pecaId}::uuid
        AND empresa_id = ${empresaId}::uuid
        AND id_unidade = ${idUnidade}::uuid
    `);
    const updated = await this.findByIdInUnidade(pecaId, empresaId, idUnidade);
    if (!updated) {
      throw new Error('Falha ao atualizar peça');
    }
    return updated;
  }

  async countConsumos(pecaId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM ordem_servico_peca
      WHERE peca_id = ${pecaId}::uuid
    `);
    return Number(rows[0]?.count ?? 0);
  }

  async delete(pecaId: string, empresaId: string, idUnidade: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM peca
      WHERE id = ${pecaId}::uuid
        AND empresa_id = ${empresaId}::uuid
        AND id_unidade = ${idUnidade}::uuid
    `);
  }

  async listMovimentacoes(
    empresaId: string,
    idUnidade: string,
    limit = 100,
  ): Promise<PecaMovimentacaoItem[]> {
    type Row = {
      pecaId: string;
      pecaCodigo: string;
      pecaNome: string;
      ordemServicoId: string;
      quantidade: number;
      createdAt: Date;
    };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        osp.peca_id AS "pecaId",
        p.codigo AS "pecaCodigo",
        p.nome AS "pecaNome",
        osp.ordem_servico_id AS "ordemServicoId",
        osp.quantidade,
        osp.created_at AS "createdAt"
      FROM ordem_servico_peca osp
      INNER JOIN peca p ON p.id = osp.peca_id
      INNER JOIN ordem_servico os ON os.id = osp.ordem_servico_id
      WHERE p.empresa_id = ${empresaId}::uuid
        AND p.id_unidade = ${idUnidade}::uuid
      ORDER BY osp.created_at DESC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      pecaId: r.pecaId,
      pecaCodigo: r.pecaCodigo,
      pecaNome: r.pecaNome,
      ordemServicoId: r.ordemServicoId,
      quantidade: r.quantidade,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
