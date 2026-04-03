import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppService } from '../application/app.service';
import { AppController } from './http/app.controller';
import { HealthController } from './http/health.controller';
import { MeController } from './http/me.controller';
import { PostgresHealthIndicator } from '../infrastructure/health/postgres-health.indicator';
import { MongoHealthIndicator } from '../infrastructure/health/mongo-health.indicator';
import { RabbitmqHealthIndicator } from '../infrastructure/health/rabbitmq-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [AppController, HealthController, MeController],
  providers: [
    AppService,
    PostgresHealthIndicator,
    MongoHealthIndicator,
    RabbitmqHealthIndicator,
  ],
})
export class PresentationModule {}
