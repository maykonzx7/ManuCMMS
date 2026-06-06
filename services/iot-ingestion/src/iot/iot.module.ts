import { Module } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';
import { IotController } from './iot.controller';
import { RedisCounterService } from './redis-counter.service';
import { TelemetryService } from './telemetry.service';

@Module({
  controllers: [IotController],
  providers: [TelemetryService, RedisCounterService, EventPublisherService],
})
export class IotModule {}
