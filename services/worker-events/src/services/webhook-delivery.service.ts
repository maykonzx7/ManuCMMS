import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { WebhookDeliverEvent } from '../shared/contracts';
import { PrismaService } from '../infrastructure/prisma.service';

@Injectable()
export class WebhookDeliveryService {
  private readonly failures = new Map<string, { count: number; openedAt: number }>();
  private readonly threshold = 3;
  private readonly cooldownMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async deliver(event: WebhookDeliverEvent): Promise<void> {
    const breakerKey = `webhook:${event.empresaId}`;
    if (this.isOpen(breakerKey)) {
      await this.markFailure(event.eventoId, 'Circuit breaker aberto para webhook.');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(event.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ManuCMMS-Webhook/1.0',
        },
        body: JSON.stringify(event.payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.recordFailure(breakerKey);
        await this.markFailure(
          event.eventoId,
          `Webhook respondeu ${response.status}.`,
        );
        return;
      }

      this.recordSuccess(breakerKey);
      await this.markSuccess(event.eventoId);
    } catch (error) {
      this.recordFailure(breakerKey);
      const message =
        error instanceof Error ? error.message : 'Falha ao entregar webhook.';
      await this.markFailure(event.eventoId, message);
    } finally {
      clearTimeout(timeout);
    }
  }

  private isOpen(key: string): boolean {
    const state = this.failures.get(key);
    if (!state) return false;
    if (state.count < this.threshold) return false;
    if (Date.now() - state.openedAt > this.cooldownMs) {
      this.failures.delete(key);
      return false;
    }
    return true;
  }

  private recordFailure(key: string): void {
    const current = this.failures.get(key) ?? { count: 0, openedAt: 0 };
    const count = current.count + 1;
    this.failures.set(key, {
      count,
      openedAt: count >= this.threshold ? Date.now() : current.openedAt,
    });
  }

  private recordSuccess(key: string): void {
    this.failures.delete(key);
  }

  private async markSuccess(eventoId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE integracao_evento
      SET
        status = 'ENTREGUE',
        tentativas = tentativas + 1,
        ultimo_erro = NULL,
        entregue_em = NOW(),
        updated_at = NOW()
      WHERE id = ${eventoId}::uuid
    `);
  }

  private async markFailure(eventoId: string, message: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE integracao_evento
      SET
        status = 'FALHA',
        tentativas = tentativas + 1,
        ultimo_erro = ${message.slice(0, 500)},
        updated_at = NOW()
      WHERE id = ${eventoId}::uuid
    `);
  }
}
