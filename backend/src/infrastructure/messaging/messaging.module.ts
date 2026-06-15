import { Global, Module } from '@nestjs/common';
import { HandleOsPreditivaCriadaUseCase } from '../../application/ordens-servico/handle-os-preditiva-criada.use-case';
import { RealtimeModule } from '../realtime/realtime.module';
import { EventPublisherService } from './event-publisher.service';
import { MessagingConsumerService } from './messaging-consumer.service';

@Global()
@Module({
  imports: [RealtimeModule],
  providers: [
    EventPublisherService,
    MessagingConsumerService,
    HandleOsPreditivaCriadaUseCase,
  ],
  exports: [EventPublisherService],
})
export class MessagingModule {}
