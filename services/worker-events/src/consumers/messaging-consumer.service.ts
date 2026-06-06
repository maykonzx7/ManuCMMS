import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  MESSAGING,
  type CriarOSPreditivaEvent,
  type EmailSendEvent,
  type WebhookDeliverEvent,
} from '../shared/contracts';
import {
  connectAmqp,
  consumeQueue,
  setupTopology,
} from '../shared/rabbitmq.shared';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { OsPreditivaService } from '../services/os-preditiva.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

@Injectable()
export class MessagingConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingConsumerService.name);
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly webhookDelivery: WebhookDeliveryService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly osPreditiva: OsPreditivaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL ausente — worker em modo idle');
      return;
    }

    this.connection = await connectAmqp(url);
    this.channel = await this.connection.createChannel();
    await setupTopology(this.channel);

    await consumeQueue(
      this.channel,
      MESSAGING.queues.webhookDeliver,
      async (payload) => {
        await this.webhookDelivery.deliver(payload as WebhookDeliverEvent);
      },
    );

    await consumeQueue(
      this.channel,
      MESSAGING.queues.emailSend,
      async (payload) => {
        const event = payload as EmailSendEvent;
        if (!this.emailDelivery.isConfigured()) {
          this.logger.warn('Email não configurado; descartando mensagem.');
          return;
        }
        await this.emailDelivery.send({
          to: event.to,
          subject: event.subject,
          text: event.text,
          html: event.html,
        });
      },
    );

    await consumeQueue(
      this.channel,
      MESSAGING.queues.osPreditiva,
      async (payload) => {
        await this.osPreditiva.createFromEvent(payload as CriarOSPreditivaEvent);
      },
    );

    this.logger.log('Consumers RabbitMQ ativos');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
