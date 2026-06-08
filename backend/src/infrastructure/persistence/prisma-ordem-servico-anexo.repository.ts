import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { OrdemServicoAnexoItem } from '../../domain/entities/ordem-servico';
import type {
  CreateOrdemServicoAnexoInput,
  IOrdemServicoAnexoRepositoryPort,
} from '../../domain/ports/ordem-servico-anexo.repository.port';
import { PrismaService } from './prisma.service';

type OrdemServicoAnexoRow = {
  id: string;
  ordemServicoId: string;
  categoria: OrdemServicoAnexoItem['categoria'];
  nome: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  uploadedPorUsuarioId: string | null;
  createdAt: Date;
};

@Injectable()
export class PrismaOrdemServicoAnexoRepository implements IOrdemServicoAnexoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByOrdemServico(
    empresaId: string,
    idUnidade: string,
    idOrdemServico: string,
  ): Promise<OrdemServicoAnexoItem[]> {
    const rows = await this.prisma.$queryRaw<OrdemServicoAnexoRow[]>(Prisma.sql`
      SELECT
        a.id,
        a.ordem_servico_id AS "ordemServicoId",
        a.categoria,
        a.nome,
        a.url,
        a.mime_type AS "mimeType",
        a.tamanho_bytes AS "tamanhoBytes",
        a.uploaded_por_usuario_id AS "uploadedPorUsuarioId",
        a.created_at AS "createdAt"
      FROM ordem_servico_anexo a
      JOIN ordem_servico os ON os.id = a.ordem_servico_id
      JOIN ativo at ON at.id = os.id_ativo
      WHERE a.empresa_id = ${empresaId}::uuid
        AND a.ordem_servico_id = ${idOrdemServico}::uuid
        AND at.id_unidade = ${idUnidade}::uuid
      ORDER BY a.created_at DESC
    `);

    return rows.map((row) => this.toItem(row));
  }

  async create(
    input: CreateOrdemServicoAnexoInput,
  ): Promise<OrdemServicoAnexoItem> {
    const id = randomUUID();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO ordem_servico_anexo (
        id,
        empresa_id,
        ordem_servico_id,
        categoria,
        nome,
        url,
        mime_type,
        tamanho_bytes,
        uploaded_por_usuario_id,
        created_at
      )
      VALUES (
        ${id}::uuid,
        ${input.empresaId}::uuid,
        ${input.ordemServicoId}::uuid,
        ${input.categoria}::"CategoriaOrdemServicoAnexo",
        ${input.nome},
        ${input.url},
        ${input.mimeType},
        ${input.tamanhoBytes},
        ${input.uploadedPorUsuarioId}::uuid,
        NOW()
      )
    `);

    const rows = await this.prisma.$queryRaw<OrdemServicoAnexoRow[]>(Prisma.sql`
      SELECT
        id,
        ordem_servico_id AS "ordemServicoId",
        categoria,
        nome,
        url,
        mime_type AS "mimeType",
        tamanho_bytes AS "tamanhoBytes",
        uploaded_por_usuario_id AS "uploadedPorUsuarioId",
        created_at AS "createdAt"
      FROM ordem_servico_anexo
      WHERE id = ${id}::uuid
      LIMIT 1
    `);

    return this.toItem(rows[0]);
  }

  async deleteById(
    empresaId: string,
    idUnidade: string,
    idOrdemServico: string,
    idAnexo: string,
  ): Promise<boolean> {
    const count = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM ordem_servico_anexo a
      USING ordem_servico os, ativo at
      WHERE a.id = ${idAnexo}::uuid
        AND a.empresa_id = ${empresaId}::uuid
        AND a.ordem_servico_id = ${idOrdemServico}::uuid
        AND os.id = a.ordem_servico_id
        AND at.id = os.id_ativo
        AND at.id_unidade = ${idUnidade}::uuid
    `);

    return Number(count) > 0;
  }

  private toItem(row: OrdemServicoAnexoRow): OrdemServicoAnexoItem {
    return {
      id: row.id,
      ordemServicoId: row.ordemServicoId,
      categoria: row.categoria,
      nome: row.nome,
      url: row.url,
      mimeType: row.mimeType,
      tamanhoBytes: row.tamanhoBytes,
      uploadedPorUsuarioId: row.uploadedPorUsuarioId,
      createdAt: row.createdAt,
    };
  }
}
