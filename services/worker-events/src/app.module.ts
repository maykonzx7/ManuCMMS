import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ConsumersModule } from './consumers/consumers.module';
import { HealthController } from './health/health.controller';
import { RabbitmqHealthIndicator } from './health/rabbitmq-health.indicator';
import { PrismaModule } from './infrastructure/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    TerminusModule,
    PrismaModule,
    ConsumersModule,
  ],
  controllers: [HealthController],
  providers: [RabbitmqHealthIndicator],
})
export class AppModule {}
