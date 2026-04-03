import { Injectable } from '@nestjs/common';
import type { UnidadeListaItem } from '../../domain/entities/unidade';
import type { IUnidadeReadPort } from '../../domain/ports/unidade-read.port';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUnidadeRepository implements IUnidadeReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<UnidadeListaItem[]> {
    const rows = await this.prisma.unidadeFabril.findMany({
      orderBy: { nome: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      localizacao: r.localizacao,
    }));
  }
}
