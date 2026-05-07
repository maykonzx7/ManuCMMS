import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import type {
  AuditLogConsulta,
  AuditLogItem,
  AuditLogEntrada,
  IAuditLogPort,
} from '../../domain/ports/audit-log.port';

/**
 * Grava documentos na coleção `log_auditoria`. Sem MONGODB_URI, append é ignorado (dev).
 * Falha de escrita não reverte transação PostgreSQL (NF-12).
 */
@Injectable()
export class AuditLogService
  implements IAuditLogPort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AuditLogService.name);
  private client: MongoClient | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const uri = this.config.get<string>('MONGODB_URI')?.trim();
    if (!uri) {
      this.logger.warn(
        'MONGODB_URI ausente — auditoria em MongoDB desativada (apenas dev).',
      );
      return;
    }
    try {
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 1000,
        connectTimeoutMS: 1000,
      });
      await this.client.connect();
    } catch (error) {
      this.logger.warn(
        `Nao foi possivel conectar ao MongoDB; auditoria desativada neste ambiente. Motivo: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      this.client = null;
    }
  }

  async onModuleDestroy() {
    await this.client?.close();
  }

  async append(entrada: AuditLogEntrada): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.db().collection('log_auditoria').insertOne({
        id_log: randomUUID(),
        id_usuario: entrada.idUsuario,
        entidade_afetada: entrada.entidadeAfetada,
        id_registro: entrada.idRegistro,
        valor_anterior: entrada.valorAnterior,
        valor_novo: entrada.valorNovo,
        data_hora: new Date(),
      });
    } catch (err) {
      this.logger.error(
        'Falha ao gravar auditoria no MongoDB (NF-12)',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async list(filtro: AuditLogConsulta = {}): Promise<AuditLogItem[]> {
    if (!this.client) {
      return [];
    }

    const query: Record<string, unknown> = {};
    const fromDate = filtro.from ? new Date(filtro.from) : null;
    const toDate = filtro.to ? new Date(filtro.to) : null;

    if (
      fromDate &&
      toDate &&
      !Number.isNaN(fromDate.getTime()) &&
      !Number.isNaN(toDate.getTime())
    ) {
      query.data_hora = { $gte: fromDate, $lte: toDate };
    } else if (fromDate && !Number.isNaN(fromDate.getTime())) {
      query.data_hora = { $gte: fromDate };
    } else if (toDate && !Number.isNaN(toDate.getTime())) {
      query.data_hora = { $lte: toDate };
    }

    if (filtro.entidade?.trim()) {
      query.entidade_afetada = filtro.entidade.trim();
    }

    if (filtro.unidadeId?.trim()) {
      const unidadeId = filtro.unidadeId.trim();
      query.$or = [
        { 'valor_novo.idUnidade': unidadeId },
        { 'valor_novo.idUnidadeCargo': unidadeId },
        { 'valor_novo.id_unidade': unidadeId },
      ];
    }

    const limit = Math.min(Math.max(filtro.limit ?? 100, 1), 500);

    const docs = await this.client
      .db()
      .collection('log_auditoria')
      .find(query)
      .sort({ data_hora: -1 })
      .limit(limit)
      .toArray();

    return docs.map((doc) => ({
      idLog: String(doc.id_log ?? ''),
      idUsuario: (doc.id_usuario as string | null | undefined) ?? null,
      entidadeAfetada: String(doc.entidade_afetada ?? ''),
      idRegistro: String(doc.id_registro ?? ''),
      valorAnterior:
        (doc.valor_anterior as Record<string, unknown> | undefined) ?? {},
      valorNovo: (doc.valor_novo as Record<string, unknown> | undefined) ?? {},
      dataHora:
        doc.data_hora instanceof Date
          ? doc.data_hora.toISOString()
          : new Date().toISOString(),
    }));
  }
}
