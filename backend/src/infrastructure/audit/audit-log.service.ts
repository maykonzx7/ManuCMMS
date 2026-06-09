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
  AuditLogListResult,
  AuditLogEntrada,
  IAuditLogPort,
} from '../../domain/ports/audit-log.port';

const DEFAULT_DB_NAME = 'manucmms';
const COLLECTION_NAME = 'log_auditoria';

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
  private readonly mongoUri: string | null;
  private readonly dbName: string;
  private connectPromise: Promise<MongoClient | null> | null = null;

  constructor(private readonly config: ConfigService) {
    this.mongoUri = this.config.get<string>('MONGODB_URI')?.trim() || null;
    this.dbName =
      this.config.get<string>('MONGODB_DB_NAME')?.trim() || DEFAULT_DB_NAME;
  }

  private deriveAction(doc: {
    valor_anterior?: Record<string, unknown>;
    valor_novo?: Record<string, unknown>;
  }): AuditLogItem['acao'] {
    const before = doc.valor_anterior ?? {};
    const after = doc.valor_novo ?? {};
    const acaoRaw = after.acao;
    const explicitAction = (typeof acaoRaw === 'string' ? acaoRaw : '')
      .trim()
      .toUpperCase();
    if (
      explicitAction === 'CREATE' ||
      explicitAction === 'UPDATE' ||
      explicitAction === 'DELETE' ||
      explicitAction === 'SETTINGS_CHANGE' ||
      explicitAction === 'LOGIN' ||
      explicitAction === 'LOGOUT' ||
      explicitAction === 'EXPORT'
    ) {
      return explicitAction;
    }
    if (Object.keys(before).length === 0) return 'CREATE';
    const statusRaw = after.status;
    const statusAfter = typeof statusRaw === 'string' ? statusRaw : '';
    if (statusAfter === 'CANCELADA') return 'DELETE';
    if (statusAfter === 'CONCLUIDA') return 'SETTINGS_CHANGE';
    return 'UPDATE';
  }

  private collection() {
    return this.client!.db(this.dbName).collection(COLLECTION_NAME);
  }

  private async connect(): Promise<MongoClient | null> {
    const mongoUri = this.mongoUri;
    if (!mongoUri) {
      return null;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      try {
        if (this.client) {
          try {
            await this.client.db(this.dbName).command({ ping: 1 });
            return this.client;
          } catch {
            await this.client.close().catch(() => undefined);
            this.client = null;
          }
        }

        const client = new MongoClient(mongoUri, {
          serverSelectionTimeoutMS: 10_000,
          connectTimeoutMS: 10_000,
        });
        await client.connect();
        await client.db(this.dbName).command({ ping: 1 });
        this.client = client;
        this.logger.log(`MongoDB conectado (auditoria: ${this.dbName}).`);
        return client;
      } catch (error) {
        this.client = null;
        this.logger.warn(
          `Nao foi possivel conectar ao MongoDB; auditoria desativada neste ambiente. Motivo: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
        );
        return null;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  async onModuleInit() {
    if (!this.mongoUri) {
      this.logger.warn(
        'MONGODB_URI ausente — auditoria em MongoDB desativada (apenas dev).',
      );
      return;
    }
    await this.connect();
  }

  async onModuleDestroy() {
    await this.client?.close();
    this.client = null;
  }

  async append(entrada: AuditLogEntrada): Promise<void> {
    const client = await this.connect();
    if (!client) {
      return;
    }
    try {
      const acao = this.deriveAction({
        valor_anterior: entrada.valorAnterior,
        valor_novo: entrada.valorNovo,
      });
      await this.collection().insertOne({
        id_log: randomUUID(),
        id_usuario: entrada.idUsuario,
        entidade_afetada: entrada.entidadeAfetada,
        id_registro: entrada.idRegistro,
        valor_anterior: entrada.valorAnterior,
        valor_novo: entrada.valorNovo,
        acao,
        data_hora: new Date(),
      });
    } catch (err) {
      this.client = null;
      this.logger.error(
        'Falha ao gravar auditoria no MongoDB (NF-12)',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async list(filtro: AuditLogConsulta = {}): Promise<AuditLogListResult> {
    const client = await this.connect();
    if (!client) {
      return { items: [], total: 0, page: 1, limit: 100 };
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
    if (filtro.idUsuario?.trim()) {
      query.id_usuario = filtro.idUsuario.trim();
    }

    if (filtro.unidadeId?.trim()) {
      const unidadeId = filtro.unidadeId.trim();
      query.$or = [
        { 'valor_novo.idUnidade': unidadeId },
        { 'valor_novo.idUnidadeCargo': unidadeId },
        { 'valor_novo.id_unidade': unidadeId },
      ];
    }

    const page = Math.max(1, Number(filtro.page ?? 1));
    const limit = Math.min(Math.max(filtro.limit ?? 100, 1), 500);
    const skip = (page - 1) * limit;

    const actionFilter = filtro.acao?.trim().toUpperCase();
    const validActions = [
      'CREATE',
      'UPDATE',
      'DELETE',
      'SETTINGS_CHANGE',
      'LOGIN',
      'LOGOUT',
      'EXPORT',
    ] as const;
    const hasActionFilter =
      Boolean(actionFilter) &&
      validActions.includes(actionFilter as (typeof validActions)[number]);

    const collection = this.collection();
    const mapDoc = (doc: Record<string, unknown>): AuditLogItem => ({
      idLog: String(doc.id_log ?? ''),
      idUsuario: (doc.id_usuario as string | null | undefined) ?? null,
      acao:
        (typeof doc.acao === 'string'
          ? doc.acao
          : this.deriveAction(doc as never)) as AuditLogItem['acao'],
      entidadeAfetada: String(doc.entidade_afetada ?? ''),
      idRegistro: String(doc.id_registro ?? ''),
      valorAnterior:
        (doc.valor_anterior as Record<string, unknown> | undefined) ?? {},
      valorNovo: (doc.valor_novo as Record<string, unknown> | undefined) ?? {},
      dataHora:
        doc.data_hora instanceof Date
          ? doc.data_hora.toISOString()
          : new Date().toISOString(),
    });

    if (hasActionFilter) {
      const docs = await collection
        .find(query)
        .sort({ data_hora: -1 })
        .toArray();
      const filtered = docs
        .map((doc) => mapDoc(doc as Record<string, unknown>))
        .filter((item) => item.acao === actionFilter);
      return {
        items: filtered.slice(skip, skip + limit),
        total: filtered.length,
        page,
        limit,
      };
    }

    const [total, docs] = await Promise.all([
      collection.countDocuments(query),
      collection
        .find(query)
        .sort({ data_hora: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    return {
      items: docs.map((doc) => mapDoc(doc as Record<string, unknown>)),
      total,
      page,
      limit,
    };
  }

  async getById(idLog: string): Promise<AuditLogItem | null> {
    const client = await this.connect();
    if (!client) {
      return null;
    }
    const doc = await this.collection().findOne({ id_log: idLog });

    if (!doc) return null;

    return {
      idLog: String(doc.id_log ?? ''),
      idUsuario: (doc.id_usuario as string | null | undefined) ?? null,
      acao: this.deriveAction(doc as never),
      entidadeAfetada: String(doc.entidade_afetada ?? ''),
      idRegistro: String(doc.id_registro ?? ''),
      valorAnterior:
        (doc.valor_anterior as Record<string, unknown> | undefined) ?? {},
      valorNovo: (doc.valor_novo as Record<string, unknown> | undefined) ?? {},
      dataHora:
        doc.data_hora instanceof Date
          ? doc.data_hora.toISOString()
          : new Date().toISOString(),
    };
  }
}
