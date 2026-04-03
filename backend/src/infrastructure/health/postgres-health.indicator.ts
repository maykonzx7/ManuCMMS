import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { Client } from 'pg';

@Injectable()
export class PostgresHealthIndicator extends HealthIndicator {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = this.config.get<string>('DATABASE_URL');
    if (!url?.trim()) {
      throw new HealthCheckError(
        'DATABASE_URL ausente',
        this.getStatus(key, false, {
          message: 'Variável DATABASE_URL não configurada',
        }),
      );
    }

    const client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'PostgreSQL indisponível',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
