import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

const RN01_THRESHOLD = 3;

@Injectable()
export class RedisCounterService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) return;
    this.client = createClient({ url });
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }

  private key(ativoId: string): string {
    return `iot:consecutive:${ativoId}`;
  }

  async registerReading(
    ativoId: string,
    valor: number,
    limiteTemp: number,
  ): Promise<{ consecutive: number; triggered: boolean }> {
    if (!this.client) {
      return { consecutive: valor > limiteTemp ? RN01_THRESHOLD : 0, triggered: false };
    }

    const key = this.key(ativoId);
    if (valor <= limiteTemp) {
      await this.client.set(key, '0');
      return { consecutive: 0, triggered: false };
    }

    const consecutive = await this.client.incr(key);
    await this.client.expire(key, 3600);
    return {
      consecutive,
      triggered: consecutive >= RN01_THRESHOLD,
    };
  }

  async reset(ativoId: string): Promise<void> {
    if (!this.client) return;
    await this.client.set(this.key(ativoId), '0');
  }
}
