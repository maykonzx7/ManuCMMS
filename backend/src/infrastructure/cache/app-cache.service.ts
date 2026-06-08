import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

@Injectable()
export class AppCacheService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType | null = null;
  private redisEnabled = false;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) return;

    if (
      (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production' &&
      /\/\/(?:localhost|127\.0\.0\.1|redis)(?::|\/|$)/i.test(redisUrl)
    ) {
      return;
    }

    try {
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 2_000,
          reconnectStrategy: () => false,
        },
      });
      this.redisClient.on('error', () => undefined);
      await this.redisClient.connect();
      this.redisEnabled = true;
    } catch {
      this.redisClient = null;
      this.redisEnabled = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redisEnabled && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch {
        return this.getFromMemory<T>(key);
      }
    }
    return this.getFromMemory<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const ttl = Math.max(1, ttlSeconds);

    if (this.redisEnabled && this.redisClient) {
      try {
        await this.redisClient.set(key, serialized, { EX: ttl });
        return;
      } catch {
        // fallback para memória local
      }
    }

    this.memory.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redisEnabled && this.redisClient) {
      await this.redisClient.del(key).catch(() => undefined);
    }
    this.memory.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.redisEnabled && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch {
        // fallback abaixo
      }
    }

    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
      }
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      this.memory.delete(key);
      return null;
    }
  }
}
