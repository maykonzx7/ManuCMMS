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

    const needsSsl =
      /sslmode=require/i.test(url) ||
      /supabase\.co/i.test(url) ||
      /pooler\.supabase\.com/i.test(url);

    const client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 3000,
      // Prisma aceita sslmode=require; o driver pg exige ssl explícito no Supabase.
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
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
