import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { Client } from 'pg';

/** pg v8 trata sslmode=require na URL como verify-full, ignorando rejectUnauthorized: false. */
function pgClientConfig(url: string): {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
} {
  const needsSsl =
    /sslmode=require/i.test(url) ||
    /supabase\.co/i.test(url) ||
    /pooler\.supabase\.com/i.test(url);

  if (!needsSsl) {
    return { connectionString: url };
  }

  const connectionString = url
    .replace(/([?&])sslmode=[^&]*/gi, (_, sep) => sep)
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
}

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
      ...pgClientConfig(url),
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
