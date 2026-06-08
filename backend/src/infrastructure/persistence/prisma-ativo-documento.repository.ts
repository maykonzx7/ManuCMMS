import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AtivoDocumentoItem } from '../../domain/entities/ativo';
import type {
  CreateAtivoDocumentoInput,
  IAtivoDocumentoRepositoryPort,
} from '../../domain/ports/ativo-documento.repository.port';
import { PrismaService } from './prisma.service';

type AtivoDocumentoRow = {
  id: string;
  ativoId: string;
  tipo: AtivoDocumentoItem['tipo'];
  nome: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  uploadedPorUsuarioId: string | null;
  createdAt: Date;
};

@Injectable()
export class PrismaAtivoDocumentoRepository implements IAtivoDocumentoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByAtivo(
    empresaId: string,
    idUnidade: string,
    idAtivo: string,
  ): Promise<AtivoDocumentoItem[]> {
    const rows = await this.prisma.$queryRaw<AtivoDocumentoRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.ativo_id AS "ativoId",
        d.tipo,
        d.nome,
        d.url,
        d.mime_type AS "mimeType",
        d.tamanho_bytes AS "tamanhoBytes",
        d.uploaded_por_usuario_id AS "uploadedPorUsuarioId",
        d.created_at AS "createdAt"
      FROM ativo_documento d
      JOIN ativo a ON a.id = d.ativo_id
      WHERE d.empresa_id = ${empresaId}::uuid
        AND d.ativo_id = ${idAtivo}::uuid
        AND a.id_unidade = ${idUnidade}::uuid
      ORDER BY d.created_at DESC
    `);

    return rows.map((row) => this.toItem(row));
  }

  async create(input: CreateAtivoDocumentoInput): Promise<AtivoDocumentoItem> {
    const id = randomUUID();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO ativo_documento (
        id,
        empresa_id,
        ativo_id,
        tipo,
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
        ${input.ativoId}::uuid,
        ${input.tipo}::"TipoAtivoDocumento",
        ${input.nome},
        ${input.url},
        ${input.mimeType},
        ${input.tamanhoBytes},
        ${input.uploadedPorUsuarioId}::uuid,
        NOW()
      )
    `);

    const rows = await this.prisma.$queryRaw<AtivoDocumentoRow[]>(Prisma.sql`
      SELECT
        id,
        ativo_id AS "ativoId",
        tipo,
        nome,
        url,
        mime_type AS "mimeType",
        tamanho_bytes AS "tamanhoBytes",
        uploaded_por_usuario_id AS "uploadedPorUsuarioId",
        created_at AS "createdAt"
      FROM ativo_documento
      WHERE id = ${id}::uuid
      LIMIT 1
    `);

    return this.toItem(rows[0]);
  }

  async deleteById(
    empresaId: string,
    idUnidade: string,
    idAtivo: string,
    idDocumento: string,
  ): Promise<boolean> {
    const count = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM ativo_documento d
      USING ativo a
      WHERE d.id = ${idDocumento}::uuid
        AND d.empresa_id = ${empresaId}::uuid
        AND d.ativo_id = ${idAtivo}::uuid
        AND a.id = d.ativo_id
        AND a.id_unidade = ${idUnidade}::uuid
    `);

    return Number(count) > 0;
  }

  private toItem(row: AtivoDocumentoRow): AtivoDocumentoItem {
    return {
      id: row.id,
      ativoId: row.ativoId,
      tipo: row.tipo,
      nome: row.nome,
      url: row.url,
      mimeType: row.mimeType,
      tamanhoBytes: row.tamanhoBytes,
      uploadedPorUsuarioId: row.uploadedPorUsuarioId,
      createdAt: row.createdAt,
    };
  }
}
