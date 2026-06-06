import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { RabbitmqHealthIndicator } from './health/rabbitmq-health.indicator';
import { RedisHealthIndicator } from './health/redis-health.indicator';
import { IotModule } from './iot/iot.module';
import { PrismaModule } from './infrastructure/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    TerminusModule,
    PrismaModule,
    IotModule,
  ],
  controllers: [HealthController],
  providers: [RabbitmqHealthIndicator, RedisHealthIndicator],
})
export class AppModule {}
