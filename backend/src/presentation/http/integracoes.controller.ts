import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { SmtpEmailService } from '../../infrastructure/email/smtp-email.service';
import { MongoHealthIndicator } from '../../infrastructure/health/mongo-health.indicator';
import { RabbitmqHealthIndicator } from '../../infrastructure/health/rabbitmq-health.indicator';
import { RedisHealthIndicator } from '../../infrastructure/health/redis-health.indicator';

type IntegrationStatus = {
  ok: boolean;
  message: string;
};

@Controller('integracoes')
export class IntegracoesController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly rabbitmqHealth: RabbitmqHealthIndicator,
    private readonly mongoHealth: MongoHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly smtpService: SmtpEmailService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  async status(@Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'unidade.visualizar');

    const [rabbitmq, mongodb, redis, smtp, iot] = await Promise.all([
      this.checkRabbitMq(),
      this.checkMongo(),
      this.checkRedis(),
      this.checkSmtp(),
      this.checkIot(),
    ]);

    const allOk = rabbitmq.ok && mongodb.ok && redis.ok && smtp.ok && iot.ok;

    return {
      status: allOk ? 'ok' : 'degraded',
      checkedAt: new Date().toISOString(),
      integrations: {
        rabbitmq,
        mongodb,
        redis,
        smtp,
        iot,
      },
    };
  }

  private async checkRabbitMq(): Promise<IntegrationStatus> {
    try {
      await this.rabbitmqHealth.isHealthy('rabbitmq');
      return { ok: true, message: 'RabbitMQ conectado.' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'RabbitMQ indisponivel.',
      };
    }
  }

  private async checkMongo(): Promise<IntegrationStatus> {
    try {
      await this.mongoHealth.isHealthy('mongodb');
      return { ok: true, message: 'MongoDB conectado.' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'MongoDB indisponivel.',
      };
    }
  }

  private async checkRedis(): Promise<IntegrationStatus> {
    try {
      await this.redisHealth.isHealthy('redis');
      return { ok: true, message: 'Redis conectado.' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Redis indisponivel.',
      };
    }
  }

  private async checkSmtp(): Promise<IntegrationStatus> {
    if (!this.smtpService.isConfigured()) {
      return { ok: false, message: 'SMTP nao configurado.' };
    }

    try {
      const result = await this.smtpService.verifyConnection();
      return result.ok
        ? { ok: true, message: 'SMTP conectado.' }
        : { ok: false, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Falha ao validar SMTP.',
      };
    }
  }

  private async checkIot(): Promise<IntegrationStatus> {
    const iotHealthUrl = this.config.get<string>('IOT_HEALTHCHECK_URL')?.trim();
    if (!iotHealthUrl) {
      return {
        ok: false,
        message: 'IOT_HEALTHCHECK_URL nao configurada.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(iotHealthUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `IoT respondeu ${response.status}.`,
        };
      }

      return {
        ok: true,
        message: 'Gateway IoT online.',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Gateway IoT indisponivel.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
