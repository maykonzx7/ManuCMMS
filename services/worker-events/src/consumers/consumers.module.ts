import { Module } from '@nestjs/common';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { OsPreditivaService } from '../services/os-preditiva.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { MessagingConsumerService } from './messaging-consumer.service';

@Module({
  providers: [
    MessagingConsumerService,
    WebhookDeliveryService,
    EmailDeliveryService,
    OsPreditivaService,
  ],
})
export class ConsumersModule {}
