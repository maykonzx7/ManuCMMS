import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { MongoClient } from 'mongodb';

@Injectable()
export class MongoHealthIndicator extends HealthIndicator {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const uri = this.config.get<string>('MONGODB_URI');
    if (!uri?.trim()) {
      throw new HealthCheckError(
        'MONGODB_URI ausente',
        this.getStatus(key, false, {
          message: 'Variável MONGODB_URI não configurada',
        }),
      );
    }

    let client: MongoClient | undefined;
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      await client.db().command({ ping: 1 });
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'MongoDB indisponível',
        this.getStatus(key, false, { message }),
      );
    } finally {
      await client?.close().catch(() => undefined);
    }
  }
}
