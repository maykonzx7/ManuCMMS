import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type {
  OrdemServicoListaItem,
  OrdemServicoParaFechamento,
  OrdemServicoTransferenciaItem,
} from '../../domain/entities/ordem-servico';
import type { IAuditLogPort } from '../../domain/ports/audit-log.port';
import { AUDIT_LOG_PORT } from '../../domain/ports/audit-log.port';
import type {
  CreateOrdemServicoInput,
  FecharOrdemServicoPersistenciaInput,
  IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import { PrismaService } from './prisma.service';

type OrdemServicoRow = {
  id: string;
  idAtivo: string;
  ativoNome: string;
  idTecnico: string | null;
  tipo: OrdemServicoListaItem['tipo'];
  status: OrdemServicoListaItem['status'];
  descricao: string;
  fotoAnexo: string | null;
  fotoProblema: string | null;
  descricaoProblema: string | null;
  fotoSolucao: string | null;
  descricaoSolucao: string | null;
  dataLimiteSla: Date | null;
  statusSla: OrdemServicoListaItem['statusSla'];
  assinaturaDigital: string | null;
  observacaoCancelamento: string | null;
  dataAbertura: Date;
  dataFechamento: Date | null;
  idCriadoPorUsuario: string | null;
  criadoPorNome: string | null;
  idIniciadoPorUsuario: string | null;
  iniciadoPorNome: string | null;
  idFinalizadoPorUsuario: string | null;
  finalizadoPorNome: string | null;
};

type OrdemTransferenciaRow = {
  id: string;
  deTecnicoId: string | null;
  deTecnicoNome: string | null;
  paraTecnicoId: string;
  paraTecnicoNome: string | null;
  transferidoPorUsuarioId: string;
  transferidoPorNome: string | null;
  motivo: string;
  createdAt: Date;
};

function osParaAuditoria(o: OrdemServicoListaItem): Record<string, unknown> {
  return {
    id: o.id,
    idAtivo: o.idAtivo,
    status: o.status,
    tipo: o.tipo,
    descricao:
      o.descricao.length > 500 ? `${o.descricao.slice(0, 500)}…` : o.descricao,
    idTecnico: o.idTecnico,
    observacaoCancelamento: o.observacaoCancelamento,
    descricaoSolucao: o.descricaoSolucao,
    assinaturaDigital: o.assinaturaDigital,
    descricaoProblema: o.descricaoProblema,
    dataLimiteSla: o.dataLimiteSla?.toISOString() ?? null,
    statusSla: o.statusSla,
    dataAbertura: o.dataAbertura.toISOString(),
    dataFechamento: o.dataFechamento?.toISOString() ?? null,
    idCriadoPorUsuario: o.idCriadoPorUsuario,
    idIniciadoPorUsuario: o.idIniciadoPorUsuario,
    idFinalizadoPorUsuario: o.idFinalizadoPorUsuario,
  };
}

@Injectable()
export class PrismaOrdemServicoRepository implements IOrdemServicoRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
  ) {}

  async listByUnidade(
    empresaId: string,
    idUnidade: string,
  ): Promise<OrdemServicoListaItem[]> {
    const rows = await this.listRowsWhere(Prisma.sql`
      os.empresa_id = ${empresaId}::uuid
      AND a.id_unidade = ${idUnidade}::uuid
    `);

    return Promise.all(
      rows.map(async (row) =>
        this.toListaItem(row, await this.listTransferencias(row.id)),
      ),
    );
  }

  async create(input: CreateOrdemServicoInput): Promise<OrdemServicoListaItem> {
    const id = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO ordem_servico (
          id,
          empresa_id,
          id_ativo,
          id_tecnico,
          criado_por_usuario_id,
          tipo,
          status,
          descricao,
          data_limite_sla,
          status_sla,
          data_abertura
        )
        VALUES (
          ${id}::uuid,
          ${input.empresaId}::uuid,
          ${input.idAtivo}::uuid,
          ${input.idTecnico ?? null}::uuid,
          ${input.criadoPorUsuarioId}::uuid,
          ${input.tipo}::"TipoOrdemServico",
          'ABERTA',
          ${input.descricao},
          ${input.dataLimiteSla},
          'NO_PRAZO',
          NOW()
        )
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE ativo
        SET
          status = 'MANUTENCAO',
          updated_at = NOW()
        WHERE id = ${input.idAtivo}::uuid
          AND empresa_id = ${input.empresaId}::uuid
          AND id_unidade = ${input.idUnidade}::uuid
      `);
    });

    const item = await this.findById(id, input.empresaId);
    await this.auditLog.append({
      idUsuario: input.criadoPorUsuarioId,
      entidadeAfetada: 'OrdemServico',
      idRegistro: item.id,
      valorAnterior: {},
      valorNovo: osParaAuditoria(item),
    });
    return item;
  }

  async findByIdInUnidade(
    idOrdemServico: string,
    empresaId: string,
    idUnidade: string,
  ): Promise<OrdemServicoListaItem | null> {
    const rows = await this.listRowsWhere(Prisma.sql`
      os.id = ${idOrdemServico}::uuid
      AND os.empresa_id = ${empresaId}::uuid
      AND a.id_unidade = ${idUnidade}::uuid
    `);
    if (!rows[0]) return null;
    return this.toListaItem(rows[0], await this.listTransferencias(rows[0].id));
  }

  async updateDados(input: {
    idOrdemServico: string;
    empresaId: string;
    idUnidade: string;
    descricao?: string;
    idTecnico?: string | null;
    transferidoPorUsuarioId?: string;
    motivoTransferencia?: string;
  }): Promise<OrdemServicoListaItem | null> {
    const before = await this.findByIdInUnidade(
      input.idOrdemServico,
      input.empresaId,
      input.idUnidade,
    );

    const fields: Prisma.Sql[] = [];
    if (input.descricao !== undefined) {
      fields.push(Prisma.sql`descricao = ${input.descricao}`);
    }
    if (input.idTecnico !== undefined) {
      fields.push(Prisma.sql`id_tecnico = ${input.idTecnico}::uuid`);
    }
    if (fields.length === 0) {
      return before;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE ordem_servico
      SET ${Prisma.join(fields, ', ')}
      WHERE id = ${input.idOrdemServico}::uuid
        AND empresa_id = ${input.empresaId}::uuid
    `);

    let transferenciaId: string | null = null;
    if (
      before &&
      input.transferidoPorUsuarioId &&
      input.idTecnico !== undefined &&
      (before.idTecnico ?? null) !== (input.idTecnico ?? null)
    ) {
      transferenciaId = randomUUID();
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO ordem_servico_transferencia (
          id,
          ordem_servico_id,
          de_tecnico_id,
          para_tecnico_id,
          transferido_por_usuario_id,
          motivo,
          created_at
        )
        VALUES (
          ${transferenciaId}::uuid,
          ${input.idOrdemServico}::uuid,
          ${before.idTecnico ?? null}::uuid,
          ${input.idTecnico}::uuid,
          ${input.transferidoPorUsuarioId}::uuid,
          ${input.motivoTransferencia ?? 'Transferência operacional'}::varchar,
          NOW()
        )
      `);
    }

    const after = await this.findByIdInUnidade(
      input.idOrdemServico,
      input.empresaId,
      input.idUnidade,
    );
    if (before && after) {
      await this.auditLog.append({
        idUsuario: input.transferidoPorUsuarioId ?? null,
        entidadeAfetada: 'OrdemServico',
        idRegistro: after.id,
        valorAnterior: osParaAuditoria(before),
        valorNovo: {
          ...osParaAuditoria(after),
          acao: 'UPDATE',
        },
      });
      if (transferenciaId && input.transferidoPorUsuarioId) {
        await this.auditLog.append({
          idUsuario: input.transferidoPorUsuarioId,
          entidadeAfetada: 'OrdemServicoTransferencia',
          idRegistro: transferenciaId,
          valorAnterior: {},
          valorNovo: {
            acao: 'CREATE',
            ordemServicoId: after.id,
            deTecnicoId: before.idTecnico ?? null,
            paraTecnicoId: after.idTecnico ?? null,
            motivoTransferencia:
              input.motivoTransferencia ?? 'Transferência operacional',
          },
        });
      }
    }
    return after;
  }

  async findParaFechamento(
    idOrdemServico: string,
    empresaId: string,
    idUnidade: string,
  ): Promise<OrdemServicoParaFechamento | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        idAtivo: string;
        tipo: OrdemServicoListaItem['tipo'];
        status: OrdemServicoListaItem['status'];
      }>
    >(Prisma.sql`
      SELECT
        os.id,
        os.id_ativo AS "idAtivo",
        os.tipo,
        os.status
      FROM ordem_servico os
      JOIN ativo a ON a.id = os.id_ativo
      WHERE os.id = ${idOrdemServico}::uuid
        AND os.empresa_id = ${empresaId}::uuid
        AND a.id_unidade = ${idUnidade}::uuid
        AND os.status IN ('ABERTA', 'EM_EXECUCAO')
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async fecharComEvidencias(
    input: FecharOrdemServicoPersistenciaInput,
  ): Promise<OrdemServicoListaItem> {
    const atual = await this.findParaFechamento(
      input.idOrdemServico,
      input.empresaId,
      input.idUnidade,
    );
    if (!atual) {
      throw new NotFoundException(
        'Ordem de serviço não encontrada ou já encerrada',
      );
    }

    const antes = osParaAuditoria(
      await this.findById(input.idOrdemServico, input.empresaId),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE ordem_servico
        SET
          status = 'CONCLUIDA',
          data_fechamento = NOW(),
          foto_anexo = ${input.fotoAnexo},
          foto_problema = ${input.fotoProblema},
          descricao_problema = ${input.descricaoProblema},
          foto_solucao = ${input.fotoSolucao},
          descricao_solucao = ${input.descricaoSolucao},
          assinatura_digital = ${input.assinaturaDigital},
          status_sla = 'CONCLUIDA',
          finalizado_por_usuario_id = ${input.finalizadoPorUsuarioId}::uuid
        WHERE id = ${input.idOrdemServico}::uuid
          AND empresa_id = ${input.empresaId}::uuid
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE ativo
        SET
          status = 'OPERACIONAL',
          updated_at = NOW()
        WHERE id = ${atual.idAtivo}::uuid
          AND empresa_id = ${input.empresaId}::uuid
          AND id_unidade = ${input.idUnidade}::uuid
      `);
    });

    const item = await this.findById(input.idOrdemServico, input.empresaId);
    await this.auditLog.append({
      idUsuario: input.finalizadoPorUsuarioId,
      entidadeAfetada: 'OrdemServico',
      idRegistro: item.id,
      valorAnterior: antes,
      valorNovo: osParaAuditoria(item),
    });

    return item;
  }

  async iniciarExecucao(
    idOrdemServico: string,
    empresaId: string,
    idUnidade: string,
    iniciadoPorUsuarioId: string,
    fotoProblema?: string | null,
    descricaoProblema?: string | null,
  ): Promise<OrdemServicoListaItem> {
    const atual = await this.findStatusTransitionCandidate(
      idOrdemServico,
      empresaId,
      idUnidade,
      ['ABERTA'],
    );
    if (!atual) {
      throw new NotFoundException(
        'Ordem de serviço não encontrada ou não está aberta para execução',
      );
    }

    const antes = osParaAuditoria(await this.findById(idOrdemServico, empresaId));

    const fields: Prisma.Sql[] = [
      Prisma.sql`status = 'EM_EXECUCAO'`,
      Prisma.sql`iniciado_por_usuario_id = ${iniciadoPorUsuarioId}::uuid`,
    ];
    if (fotoProblema) {
      fields.push(Prisma.sql`foto_problema = ${fotoProblema}`);
    }
    if (descricaoProblema) {
      fields.push(Prisma.sql`descricao_problema = ${descricaoProblema}`);
    }
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE ordem_servico
      SET ${Prisma.join(fields, ', ')}
      WHERE id = ${idOrdemServico}::uuid
        AND empresa_id = ${empresaId}::uuid
    `);

    const item = await this.findById(idOrdemServico, empresaId);
    await this.auditLog.append({
      idUsuario: iniciadoPorUsuarioId,
      entidadeAfetada: 'OrdemServico',
      idRegistro: item.id,
      valorAnterior: antes,
      valorNovo: osParaAuditoria(item),
    });
    return item;
  }

  async cancelar(input: {
    idOrdemServico: string;
    empresaId: string;
    idUnidade: string;
    observacaoCancelamento: string;
    canceladoPorUsuarioId: string;
  }): Promise<OrdemServicoListaItem> {
    const atual = await this.findStatusTransitionCandidate(
      input.idOrdemServico,
      input.empresaId,
      input.idUnidade,
      ['ABERTA', 'EM_EXECUCAO'],
    );
    if (!atual) {
      throw new NotFoundException(
        'Ordem de serviço não encontrada ou já encerrada',
      );
    }

    const antes = osParaAuditoria(
      await this.findById(input.idOrdemServico, input.empresaId),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE ordem_servico
        SET
          status = 'CANCELADA',
          observacao_cancelamento = ${input.observacaoCancelamento},
          status_sla = 'CONCLUIDA'
        WHERE id = ${input.idOrdemServico}::uuid
          AND empresa_id = ${input.empresaId}::uuid
      `);

      const abertas = await tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM ordem_servico
        WHERE empresa_id = ${input.empresaId}::uuid
          AND id_ativo = ${atual.idAtivo}::uuid
          AND id <> ${input.idOrdemServico}::uuid
          AND status IN ('ABERTA', 'EM_EXECUCAO')
      `);

      if (Number(abertas[0]?.total ?? 0) === 0) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE ativo
          SET
            status = 'OPERACIONAL',
            updated_at = NOW()
          WHERE id = ${atual.idAtivo}::uuid
            AND empresa_id = ${input.empresaId}::uuid
            AND id_unidade = ${input.idUnidade}::uuid
        `);
      }
    });

    const item = await this.findById(input.idOrdemServico, input.empresaId);
    await this.auditLog.append({
      idUsuario: input.canceladoPorUsuarioId,
      entidadeAfetada: 'OrdemServico',
      idRegistro: item.id,
      valorAnterior: antes,
      valorNovo: {
        ...osParaAuditoria(item),
        acao: 'DELETE',
      },
    });

    return item;
  }

  async markOverdueAndCollect(
    empresaId: string,
    idUnidade: string,
  ): Promise<OrdemServicoListaItem[]> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE ordem_servico os
      SET status_sla = 'ATRASADA'
      FROM ativo a
      WHERE os.id_ativo = a.id
        AND os.empresa_id = ${empresaId}::uuid
        AND a.id_unidade = ${idUnidade}::uuid
        AND os.status IN ('ABERTA', 'EM_EXECUCAO')
        AND os.data_limite_sla IS NOT NULL
        AND os.data_limite_sla < NOW()
        AND os.status_sla <> 'ATRASADA'
    `);

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT os.id
      FROM ordem_servico os
      JOIN ativo a ON a.id = os.id_ativo
      WHERE os.empresa_id = ${empresaId}::uuid
        AND a.id_unidade = ${idUnidade}::uuid
        AND os.status_sla = 'ATRASADA'
        AND os.sla_atraso_notificado_em IS NULL
        AND os.status IN ('ABERTA', 'EM_EXECUCAO')
    `);

    const itens: OrdemServicoListaItem[] = [];
    for (const row of rows) {
      itens.push(await this.findById(row.id, empresaId));
    }
    return itens;
  }

  async markSlaNotified(ordemIds: string[]): Promise<void> {
    if (ordemIds.length === 0) return;
    const idsSql = ordemIds.map((id) => Prisma.sql`${id}::uuid`);
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE ordem_servico
      SET sla_atraso_notificado_em = NOW()
      WHERE id IN (${Prisma.join(idsSql)})
    `);
  }

  private async findStatusTransitionCandidate(
    idOrdemServico: string,
    empresaId: string,
    idUnidade: string,
    statuses: string[],
  ) {
    const statusParams = statuses.map(
      (status) => Prisma.sql`${status}::"StatusOrdemServico"`,
    );
    const rows = await this.prisma.$queryRaw<Array<{ idAtivo: string }>>(Prisma.sql`
      SELECT os.id_ativo AS "idAtivo"
      FROM ordem_servico os
      JOIN ativo a ON a.id = os.id_ativo
      WHERE os.id = ${idOrdemServico}::uuid
        AND os.empresa_id = ${empresaId}::uuid
        AND a.id_unidade = ${idUnidade}::uuid
        AND os.status IN (${Prisma.join(statusParams)})
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async findById(
    idOrdemServico: string,
    empresaId: string,
  ): Promise<OrdemServicoListaItem> {
    const rows = await this.listRowsWhere(Prisma.sql`
      os.id = ${idOrdemServico}::uuid
      AND os.empresa_id = ${empresaId}::uuid
    `);

    return this.toListaItem(rows[0], await this.listTransferencias(idOrdemServico));
  }

  private async listRowsWhere(whereSql: Prisma.Sql): Promise<OrdemServicoRow[]> {
    return this.prisma.$queryRaw<OrdemServicoRow[]>(Prisma.sql`
      SELECT
        os.id,
        os.id_ativo AS "idAtivo",
        a.nome AS "ativoNome",
        os.id_tecnico AS "idTecnico",
        os.tipo,
        os.status,
        os.descricao,
        os.foto_anexo AS "fotoAnexo",
        os.foto_problema AS "fotoProblema",
        os.descricao_problema AS "descricaoProblema",
        os.foto_solucao AS "fotoSolucao",
        os.descricao_solucao AS "descricaoSolucao",
        os.data_limite_sla AS "dataLimiteSla",
        os.status_sla AS "statusSla",
        os.assinatura_digital AS "assinaturaDigital",
        os.observacao_cancelamento AS "observacaoCancelamento",
        os.data_abertura AS "dataAbertura",
        os.data_fechamento AS "dataFechamento",
        os.criado_por_usuario_id AS "idCriadoPorUsuario",
        uc.nome AS "criadoPorNome",
        os.iniciado_por_usuario_id AS "idIniciadoPorUsuario",
        ui.nome AS "iniciadoPorNome",
        os.finalizado_por_usuario_id AS "idFinalizadoPorUsuario",
        uf.nome AS "finalizadoPorNome"
      FROM ordem_servico os
      JOIN ativo a ON a.id = os.id_ativo
      LEFT JOIN usuario uc ON uc.id = os.criado_por_usuario_id
      LEFT JOIN usuario ui ON ui.id = os.iniciado_por_usuario_id
      LEFT JOIN usuario uf ON uf.id = os.finalizado_por_usuario_id
      WHERE ${whereSql}
      ORDER BY os.data_abertura DESC
    `);
  }

  private toListaItem(
    r: OrdemServicoRow,
    transferencias: OrdemServicoTransferenciaItem[] = [],
  ): OrdemServicoListaItem {
    return {
      id: r.id,
      idAtivo: r.idAtivo,
      ativoNome: r.ativoNome,
      idTecnico: r.idTecnico,
      tipo: r.tipo,
      status: r.status,
      descricao: r.descricao,
      fotoAnexo: r.fotoAnexo,
      fotoProblema: r.fotoProblema,
      descricaoProblema: r.descricaoProblema,
      fotoSolucao: r.fotoSolucao,
      descricaoSolucao: r.descricaoSolucao,
      dataLimiteSla: r.dataLimiteSla,
      statusSla: r.statusSla,
      assinaturaDigital: r.assinaturaDigital,
      observacaoCancelamento: r.observacaoCancelamento,
      dataAbertura: r.dataAbertura,
      dataFechamento: r.dataFechamento,
      idCriadoPorUsuario: r.idCriadoPorUsuario,
      criadoPorNome: r.criadoPorNome,
      idIniciadoPorUsuario: r.idIniciadoPorUsuario,
      iniciadoPorNome: r.iniciadoPorNome,
      idFinalizadoPorUsuario: r.idFinalizadoPorUsuario,
      finalizadoPorNome: r.finalizadoPorNome,
      transferencias,
    };
  }

  private async listTransferencias(
    ordemServicoId: string,
  ): Promise<OrdemServicoTransferenciaItem[]> {
    const rows = await this.prisma.$queryRaw<OrdemTransferenciaRow[]>(Prisma.sql`
      SELECT
        t.id,
        t.de_tecnico_id AS "deTecnicoId",
        du.nome AS "deTecnicoNome",
        t.para_tecnico_id AS "paraTecnicoId",
        pu.nome AS "paraTecnicoNome",
        t.transferido_por_usuario_id AS "transferidoPorUsuarioId",
        tu.nome AS "transferidoPorNome",
        t.motivo,
        t.created_at AS "createdAt"
      FROM ordem_servico_transferencia t
      LEFT JOIN usuario du ON du.id = t.de_tecnico_id
      LEFT JOIN usuario pu ON pu.id = t.para_tecnico_id
      LEFT JOIN usuario tu ON tu.id = t.transferido_por_usuario_id
      WHERE t.ordem_servico_id = ${ordemServicoId}::uuid
      ORDER BY t.created_at DESC
    `);

    return rows.map((row) => ({
      id: row.id,
      deTecnicoId: row.deTecnicoId,
      deTecnicoNome: row.deTecnicoNome,
      paraTecnicoId: row.paraTecnicoId,
      paraTecnicoNome: row.paraTecnicoNome,
      transferidoPorUsuarioId: row.transferidoPorUsuarioId,
      transferidoPorNome: row.transferidoPorNome,
      motivo: row.motivo,
      createdAt: row.createdAt,
    }));
  }
}
