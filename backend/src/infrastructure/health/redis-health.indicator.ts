import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { createClient } from 'redis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url?.trim()) {
      throw new HealthCheckError(
        'REDIS_URL ausente',
        this.getStatus(key, false, {
          message: 'Variavel REDIS_URL nao configurada',
        }),
      );
    }

    const client = createClient({ url });
    try {
      await client.connect();
      await client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'Redis indisponivel',
        this.getStatus(key, false, { message }),
      );
    } finally {
      await client.quit().catch(() => undefined);
    }
  }
}
