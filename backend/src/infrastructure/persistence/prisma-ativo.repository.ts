import { Injectable } from '@nestjs/common';
import type { Ativo as AtivoRow } from '@prisma/client';
import type { AtivoListaItem } from '../../domain/entities/ativo';
import type {
  CreateAtivoInput,
  IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaAtivoRepository implements IAtivoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByUnidade(idUnidade: string): Promise<AtivoListaItem[]> {
    const rows = await this.prisma.ativo.findMany({
      where: { idUnidade },
      orderBy: { nome: 'asc' },
    });
    return rows.map((r: AtivoRow) => this.toListaItem(r));
  }

  async create(input: CreateAtivoInput): Promise<AtivoListaItem> {
    const row = await this.prisma.ativo.create({
      data: {
        idUnidade: input.idUnidade,
        nome: input.nome,
        ...(input.limiteTemp !== undefined
          ? { limiteTemp: input.limiteTemp }
          : {}),
      },
    });
    return this.toListaItem(row);
  }

  async existsInUnidade(idAtivo: string, idUnidade: string): Promise<boolean> {
    const n = await this.prisma.ativo.count({
      where: { id: idAtivo, idUnidade },
    });
    return n > 0;
  }

  async getStatusInUnidade(
    idAtivo: string,
    idUnidade: string,
  ): Promise<AtivoListaItem['status'] | null> {
    const r = await this.prisma.ativo.findFirst({
      where: { id: idAtivo, idUnidade },
      select: { status: true },
    });
    if (!r) {
      return null;
    }
    return r.status as AtivoListaItem['status'];
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
