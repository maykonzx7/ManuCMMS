import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import type { IAuditLogPort } from '../../domain/ports/audit-log.port';
import { AUDIT_LOG_PORT } from '../../domain/ports/audit-log.port';
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

function osParaAuditoria(o: OrdemServicoListaItem): Record<string, unknown> {
  return {
    id: o.id,
    idAtivo: o.idAtivo,
    status: o.status,
    tipo: o.tipo,
    descricao:
      o.descricao.length > 500 ? `${o.descricao.slice(0, 500)}…` : o.descricao,
    idTecnico: o.idTecnico,
    dataAbertura: o.dataAbertura.toISOString(),
    dataFechamento: o.dataFechamento?.toISOString() ?? null,
  };
}

@Injectable()
export class PrismaOrdemServicoRepository implements IOrdemServicoRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
  ) {}

  async listByUnidade(idUnidade: string): Promise<OrdemServicoListaItem[]> {
    const rows = await this.prisma.ordemServico.findMany({
      where: { ativo: { idUnidade } },
      orderBy: { dataAbertura: 'desc' },
      include: includeAtivoNome,
    });
    return rows.map((r) => this.toListaItem(r));
  }

  async create(input: CreateOrdemServicoInput): Promise<OrdemServicoListaItem> {
    const item = await this.prisma.$transaction(async (tx) => {
      const row = await tx.ordemServico.create({
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
      await tx.ativo.update({
        where: { id: input.idAtivo },
        data: { status: 'MANUTENCAO' },
      });
      return this.toListaItem(row);
    });
    await this.auditLog.append({
      idUsuario: null,
      entidadeAfetada: 'OrdemServico',
      idRegistro: item.id,
      valorAnterior: {},
      valorNovo: osParaAuditoria(item),
    });
    return item;
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
    const anteriorRaw = await this.prisma.$transaction(async (tx) => {
      const atual = await tx.ordemServico.findFirst({
        where: {
          id: input.idOrdemServico,
          status: { in: ['ABERTA', 'EM_EXECUCAO'] },
          ativo: { idUnidade: input.idUnidade },
        },
        include: includeAtivoNome,
      });
      if (!atual) {
        throw new NotFoundException(
          'Ordem de serviço não encontrada ou já encerrada',
        );
      }
      const antes = osParaAuditoria(this.toListaItem(atual));

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

      return { item: this.toListaItem(updated), antes };
    });

    const novo = osParaAuditoria(anteriorRaw.item);
    await this.auditLog.append({
      idUsuario: null,
      entidadeAfetada: 'OrdemServico',
      idRegistro: anteriorRaw.item.id,
      valorAnterior: anteriorRaw.antes,
      valorNovo: novo,
    });

    return anteriorRaw.item;
  }

  async iniciarExecucao(
    idOrdemServico: string,
    idUnidade: string,
  ): Promise<OrdemServicoListaItem> {
    const out = await this.prisma.$transaction(async (tx) => {
      const atual = await tx.ordemServico.findFirst({
        where: {
          id: idOrdemServico,
          status: 'ABERTA',
          ativo: { idUnidade },
        },
        include: includeAtivoNome,
      });
      if (!atual) {
        throw new NotFoundException(
          'Ordem de serviço não encontrada ou não está aberta para execução',
        );
      }
      const antes = osParaAuditoria(this.toListaItem(atual));
      const updated = await tx.ordemServico.update({
        where: { id: atual.id },
        data: { status: 'EM_EXECUCAO' },
        include: includeAtivoNome,
      });
      return { item: this.toListaItem(updated), antes };
    });
    await this.auditLog.append({
      idUsuario: null,
      entidadeAfetada: 'OrdemServico',
      idRegistro: out.item.id,
      valorAnterior: out.antes,
      valorNovo: osParaAuditoria(out.item),
    });
    return out.item;
  }

  async cancelar(
    idOrdemServico: string,
    idUnidade: string,
  ): Promise<OrdemServicoListaItem> {
    const out = await this.prisma.$transaction(async (tx) => {
      const atual = await tx.ordemServico.findFirst({
        where: {
          id: idOrdemServico,
          status: { in: ['ABERTA', 'EM_EXECUCAO'] },
          ativo: { idUnidade },
        },
        include: includeAtivoNome,
      });
      if (!atual) {
        throw new NotFoundException(
          'Ordem de serviço não encontrada ou já encerrada',
        );
      }
      const antes = osParaAuditoria(this.toListaItem(atual));
      const idAtivo = atual.idAtivo;

      const updated = await tx.ordemServico.update({
        where: { id: atual.id },
        data: { status: 'CANCELADA' },
        include: includeAtivoNome,
      });

      const outrasAbertas = await tx.ordemServico.count({
        where: {
          idAtivo,
          id: { not: atual.id },
          status: { in: ['ABERTA', 'EM_EXECUCAO'] },
        },
      });
      if (outrasAbertas === 0) {
        await tx.ativo.update({
          where: { id: idAtivo },
          data: { status: 'OPERACIONAL' },
        });
      }

      return { item: this.toListaItem(updated), antes };
    });

    await this.auditLog.append({
      idUsuario: null,
      entidadeAfetada: 'OrdemServico',
      idRegistro: out.item.id,
      valorAnterior: out.antes,
      valorNovo: osParaAuditoria(out.item),
    });

    return out.item;
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
