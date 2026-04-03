import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitmqHealthIndicator extends HealthIndicator {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url?.trim()) {
      throw new HealthCheckError(
        'RABBITMQ_URL ausente',
        this.getStatus(key, false, {
          message: 'Variável RABBITMQ_URL não configurada',
        }),
      );
    }

    let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
    try {
      connection = await amqp.connect(url, { timeout: 3000 });
      await connection.close();
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'RabbitMQ indisponível',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
