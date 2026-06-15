import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { HandleOsPreditivaCriadaUseCase } from '../../application/ordens-servico/handle-os-preditiva-criada.use-case';
import {
  MESSAGING,
  type OsPreditivaCriadaEvent,
} from './contracts';
import { setupTopology, consumeQueue, connectAmqp } from './rabbitmq.shared';

@Injectable()
export class MessagingConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingConsumerService.name);
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly handleOsPreditivaCriada: HandleOsPreditivaCriadaUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL ausente — consumer de realtime idle');
      return;
    }

    this.connection = await connectAmqp(url);
    this.channel = await this.connection.createChannel();
    await setupTopology(this.channel);

    await consumeQueue(
      this.channel,
      MESSAGING.queues.osPreditivaCriada,
      async (payload) => {
        await this.handleOsPreditivaCriada.execute(
          payload as OsPreditivaCriadaEvent,
        );
      },
    );

    this.logger.log('Consumer os.preditiva.created ativo (realtime + notificações)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
