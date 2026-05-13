import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RequestRateLimitService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType | null = null;
  private redisEnabled = false;
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      this.redisEnabled = false;
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl });
      this.redisClient.on('error', () => undefined);
      await this.redisClient.connect();
      this.redisEnabled = true;
    } catch {
      this.redisEnabled = false;
      this.redisClient = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.quit().catch(() => undefined);
  }

  enforce(input: {
    scope: string;
    key: string;
    maxHits: number;
    windowMs: number;
    message: string;
  }): Promise<void> {
    if (this.redisEnabled && this.redisClient) {
      return this.enforceWithRedis(input);
    }
    this.enforceInMemory(input);
    return Promise.resolve();
  }

  private enforceInMemory(input: {
    scope: string;
    key: string;
    maxHits: number;
    windowMs: number;
    message: string;
  }): void {
    const now = Date.now();
    const bucketKey = `${input.scope}:${input.key}`;
    const current = this.buckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + input.windowMs });
      return;
    }

    if (current.count >= input.maxHits) {
      throw new HttpException(input.message, HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
  }

  private async enforceWithRedis(input: {
    scope: string;
    key: string;
    maxHits: number;
    windowMs: number;
    message: string;
  }): Promise<void> {
    const bucketKey = `${input.scope}:${input.key}`;
    const ttlSeconds = Math.max(1, Math.ceil(input.windowMs / 1000));
    const totalHits = await this.redisClient!.incr(bucketKey);
    if (totalHits === 1) {
      await this.redisClient!.expire(bucketKey, ttlSeconds);
    }
    if (totalHits > input.maxHits) {
      throw new HttpException(input.message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
