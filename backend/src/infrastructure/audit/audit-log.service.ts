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
    this.client = new MongoClient(uri);
    await this.client.connect();
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
}
