import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import type {
  CreateOrdemServicoInput,
  FecharOrdemServicoPersistenciaInput,
  IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import { PrismaService } from './prisma.service';

const includeAtivoNome = {
  ativo: { select: { nome: true } },
} satisfies Prisma.OrdemServicoInclude;

type OrdemServicoComAtivoNome = Prisma.OrdemServicoGetPayload<{
  include: typeof includeAtivoNome;
}>;

@Injectable()
export class PrismaOrdemServicoRepository implements IOrdemServicoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByUnidade(idUnidade: string): Promise<OrdemServicoListaItem[]> {
    const rows = await this.prisma.ordemServico.findMany({
      where: { ativo: { idUnidade } },
      orderBy: { dataAbertura: 'desc' },
      include: includeAtivoNome,
    });
    return rows.map((r) => this.toListaItem(r));
  }

  async create(input: CreateOrdemServicoInput): Promise<OrdemServicoListaItem> {
    const row = await this.prisma.ordemServico.create({
      data: {
        idAtivo: input.idAtivo,
        tipo: input.tipo,
        descricao: input.descricao,
        ...(input.idTecnico != null && input.idTecnico !== ''
          ? { idTecnico: input.idTecnico }
          : {}),
      },
      include: includeAtivoNome,
    });
    return this.toListaItem(row);
  }

  async findParaFechamento(idOrdemServico: string, idUnidade: string) {
    const row = await this.prisma.ordemServico.findFirst({
      where: {
        id: idOrdemServico,
        status: { in: ['ABERTA', 'EM_EXECUCAO'] },
        ativo: { idUnidade },
      },
      select: {
        id: true,
        idAtivo: true,
        tipo: true,
        status: true,
      },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      idAtivo: row.idAtivo,
      tipo: row.tipo as OrdemServicoListaItem['tipo'],
      status: row.status as OrdemServicoListaItem['status'],
    };
  }

  async fecharComEvidencias(
    input: FecharOrdemServicoPersistenciaInput,
  ): Promise<OrdemServicoListaItem> {
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.ordemServico.findFirst({
        where: {
          id: input.idOrdemServico,
          status: { in: ['ABERTA', 'EM_EXECUCAO'] },
          ativo: { idUnidade: input.idUnidade },
        },
        select: { id: true, idAtivo: true },
      });
      if (!atual) {
        throw new NotFoundException(
          'Ordem de serviço não encontrada ou já encerrada',
        );
      }

      const updated = await tx.ordemServico.update({
        where: { id: atual.id },
        data: {
          status: 'CONCLUIDA',
          dataFechamento: new Date(),
          fotoAnexo: input.fotoAnexo,
          fotoProblema: input.fotoProblema,
          fotoSolucao: input.fotoSolucao,
          assinaturaDigital: input.assinaturaDigital,
        },
        include: includeAtivoNome,
      });

      await tx.ativo.update({
        where: { id: atual.idAtivo },
        data: { status: 'OPERACIONAL' },
      });

      return this.toListaItem(updated);
    });
  }

  private toListaItem(r: OrdemServicoComAtivoNome): OrdemServicoListaItem {
    return {
      id: r.id,
      idAtivo: r.idAtivo,
      ativoNome: r.ativo.nome,
      idTecnico: r.idTecnico,
      tipo: r.tipo as OrdemServicoListaItem['tipo'],
      status: r.status as OrdemServicoListaItem['status'],
      descricao: r.descricao,
      fotoAnexo: r.fotoAnexo,
      fotoProblema: r.fotoProblema,
      fotoSolucao: r.fotoSolucao,
      assinaturaDigital: r.assinaturaDigital,
      dataAbertura: r.dataAbertura,
      dataFechamento: r.dataFechamento,
    };
  }
}
