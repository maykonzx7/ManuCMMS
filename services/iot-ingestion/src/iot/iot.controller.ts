import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelemetryService } from './telemetry.service';

@Controller('iot')
export class IotController {
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly config: ConfigService,
  ) {}

  @Post('leituras')
  async leituras(
    @Headers('x-iot-api-key') apiKey: string | undefined,
    @Body() body: { ativoId?: string; valor?: number },
  ) {
    this.assertApiKey(apiKey);
    return this.telemetry.ingest({
      ativoId: body.ativoId ?? '',
      valor: Number(body.valor),
      origem: 'IOT',
    });
  }

  @Post('simular')
  async simular(
    @Headers('x-iot-api-key') apiKey: string | undefined,
    @Body() body: { ativoId?: string; valor?: number },
  ) {
    this.assertApiKey(apiKey);
    return this.telemetry.ingest({
      ativoId: body.ativoId ?? '',
      valor: Number(body.valor),
      origem: 'SIMULACAO',
    });
  }

  private assertApiKey(provided: string | undefined): void {
    const expected = this.config.get<string>('IOT_API_KEY')?.trim();
    if (!expected) return;
    if (provided?.trim() !== expected) {
      throw new UnauthorizedException('x-iot-api-key inválida.');
    }
  }
}
