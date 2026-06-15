import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthorizePlatformOperatorUseCase } from '../../application/iam/authorize-platform-operator.use-case';
import { SimularLeituraIotUseCase } from '../../application/integracoes/simular-leitura-iot.use-case';
import { ListLeiturasIotUseCase } from '../../application/integracoes/list-leituras-iot.use-case';
import type { AuthUserContext } from '../auth/auth-user.types';
import { EmailDeliveryService } from '../../infrastructure/email/email-delivery.service';
import { MongoHealthIndicator } from '../../infrastructure/health/mongo-health.indicator';
import { RabbitmqHealthIndicator } from '../../infrastructure/health/rabbitmq-health.indicator';
import { RedisHealthIndicator } from '../../infrastructure/health/redis-health.indicator';

type IntegrationStatus = {
  ok: boolean;
  message: string;
};

type RequestWithUser = Request & { user: AuthUserContext };

@Controller('integracoes')
export class IntegracoesController {
  constructor(
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
    private readonly simularLeituraIot: SimularLeituraIotUseCase,
    private readonly listLeiturasIot: ListLeiturasIotUseCase,
    private readonly rabbitmqHealth: RabbitmqHealthIndicator,
    private readonly mongoHealth: MongoHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly config: ConfigService,
  ) {}

  @Post('iot/simular')
  async simularIot(
    @Req() req: RequestWithUser,
    @Body() body: { idUnidade?: string; idAtivo?: string },
  ) {
    this.authorizePlatformOperator.execute(req.user);

    const idUnidade = body.idUnidade?.trim();
    const idAtivo = body.idAtivo?.trim();
    if (!idUnidade || !idAtivo) {
      throw new BadRequestException('idUnidade e idAtivo são obrigatórios.');
    }

    return this.simularLeituraIot.execute({ idUnidade, idAtivo });
  }

  @Get('iot/leituras')
  async listarLeiturasIot(
    @Req() req: RequestWithUser,
    @Query('idUnidade') idUnidade?: string,
    @Query('idAtivo') idAtivo?: string,
    @Query('limit') limitRaw?: string,
  ) {
    this.authorizePlatformOperator.execute(req.user);

    const unidadeId = idUnidade?.trim();
    if (!unidadeId) {
      throw new BadRequestException('idUnidade é obrigatório.');
    }

    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    return this.listLeiturasIot.execute({
      idUnidade: unidadeId,
      idAtivo: idAtivo?.trim() || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  @Get('iot/info')
  async iotInfo(@Req() req: RequestWithUser) {
    this.authorizePlatformOperator.execute(req.user);

    const base = this.config.get<string>('IOT_INGESTION_URL')?.trim() ?? '';
    const normalizedBase = base.replace(/\/$/, '');
    const apiKeyConfigured = Boolean(
      this.config.get<string>('IOT_API_KEY')?.trim(),
    );

    return {
      configured: normalizedBase.length > 0,
      ingestionUrl: normalizedBase || null,
      leiturasUrl: normalizedBase ? `${normalizedBase}/iot/leituras` : null,
      cloudLeiturasUrl: normalizedBase
        ? `${normalizedBase}/iot/cloud/leituras`
        : null,
      simularUrl: normalizedBase ? `${normalizedBase}/iot/simular` : null,
      apiKeyRequired: apiKeyConfigured,
      authHeader: 'x-iot-api-key',
      payloadExample: {
        ativoId: 'uuid-do-ativo',
        valor: 52.5,
      },
      cloudPayloadExample: {
        ativoId: 'uuid-do-ativo',
        field1: 52.5,
      },
      bridgeStatus: normalizedBase ? 'manual' : 'not_configured',
      cloudPlatforms: {
        thingSpeak:
          'ESP32 publica no ThingSpeak; use MATLAB Analysis ou React para encaminhar POST ao cloudLeiturasUrl.',
        adafruitIo:
          'ESP32 publica no Adafruit IO; configure webhook do feed apontando para cloudLeiturasUrl.',
      },
      flow: [
        'ESP32/Arduino + DHT22',
        'ThingSpeak ou Adafruit IO',
        'POST /iot/leituras ou /iot/cloud/leituras',
        'RabbitMQ (RN-01: 3 leituras acima do limite)',
        'Worker cria OS preditiva + atribui técnico',
        'Notificação WebSocket + lista de OS',
      ],
    };
  }

  @Get('status')
  async status(@Req() req: RequestWithUser) {
    this.authorizePlatformOperator.execute(req.user);

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
        message:
          error instanceof Error ? error.message : 'RabbitMQ indisponivel.',
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
        message:
          error instanceof Error ? error.message : 'MongoDB indisponivel.',
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
    if (!this.emailDelivery.isConfigured()) {
      return {
        ok: false,
        message:
          'Email nao configurado. No Render free use BREVO_API_KEY (nao SMTP).',
      };
    }

    try {
      const transport = this.emailDelivery.activeTransport();
      const result = await this.emailDelivery.verifyConnection();
      if (result.ok) {
        return {
          ok: true,
          message:
            transport === 'brevo-api'
              ? 'Brevo API conectada (HTTPS).'
              : 'SMTP conectado.',
        };
      }

      if (transport === 'smtp') {
        return {
          ok: false,
          message: `${result.message} No Render free, SMTP (587) e bloqueado — use BREVO_API_KEY.`,
        };
      }

      return { ok: false, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Falha ao validar email.',
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
        message:
          error instanceof Error ? error.message : 'Gateway IoT indisponivel.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
