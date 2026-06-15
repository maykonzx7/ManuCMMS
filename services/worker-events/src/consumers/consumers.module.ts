import { Module } from '@nestjs/common';
import { EventPublisherService } from '../infrastructure/event-publisher.service';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { OsPreditivaService } from '../services/os-preditiva.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { MessagingConsumerService } from './messaging-consumer.service';

@Module({
  providers: [
    MessagingConsumerService,
    EventPublisherService,
    WebhookDeliveryService,
    EmailDeliveryService,
    OsPreditivaService,
  ],
})
export class ConsumersModule {}
