import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PostgresHealthIndicator } from '../../infrastructure/health/postgres-health.indicator';
import { MongoHealthIndicator } from '../../infrastructure/health/mongo-health.indicator';
import { RabbitmqHealthIndicator } from '../../infrastructure/health/rabbitmq-health.indicator';

/**
 * NF-04 — health checks dos serviços de infraestrutura.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly postgresHealth: PostgresHealthIndicator,
    private readonly mongoHealth: MongoHealthIndicator,
    private readonly rabbitmqHealth: RabbitmqHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.postgresHealth.isHealthy('postgres'),
      () => this.mongoHealth.isHealthy('mongodb'),
      () => this.rabbitmqHealth.isHealthy('rabbitmq'),
    ]);
  }
}
