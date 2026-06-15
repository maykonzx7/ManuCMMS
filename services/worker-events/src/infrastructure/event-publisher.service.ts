import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  MESSAGING,
  type OsPreditivaCriadaEvent,
} from '../shared/contracts';
import { setupTopology, publishEvent } from '../shared/rabbitmq.shared';

@Injectable()
export class EventPublisherService implements OnModuleDestroy {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: amqp.Channel | null = null;
  private connecting: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('RABBITMQ_URL')?.trim());
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }

  private async ensureChannel(): Promise<amqp.Channel | null> {
    if (!this.isConfigured()) return null;
    if (this.channel) return this.channel;
    if (this.connecting) {
      await this.connecting;
      return this.channel;
    }

    this.connecting = (async () => {
      const url = this.config.get<string>('RABBITMQ_URL')!.trim();
      this.connection = await amqp.connect(url, { timeout: 5000 });
      this.channel = await this.connection.createChannel();
      await setupTopology(this.channel);
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }

    return this.channel;
  }

  async publishOsPreditivaCriada(
    event: Omit<OsPreditivaCriadaEvent, 'version'>,
  ): Promise<boolean> {
    const channel = await this.ensureChannel();
    if (!channel) return false;

    await publishEvent(channel, MESSAGING.routingKeys.osPreditivaCriada, {
      version: 1,
      ...event,
    });
    return true;
  }
}
