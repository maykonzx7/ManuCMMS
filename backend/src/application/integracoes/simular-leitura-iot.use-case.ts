import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

const RN01_LEITURAS = 3;

type IotSimularResponse = {
  ativoId: string;
  ativoNome: string;
  valor: number;
  limiteTemp: number;
  leiturasConsecutivasAcimaLimite: number;
  osPreditivaPublicada: boolean;
  correlationId: string;
};

@Injectable()
export class SimularLeituraIotUseCase {
  constructor(
    private readonly config: ConfigService,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
  ) {}

  async execute(input: { idUnidade: string; idAtivo: string }) {
    const unidade = await this.unidades.findById(input.idUnidade);
    if (!unidade) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    if (!unidade.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const ativo = await this.ativos.findByIdInUnidade(
      unidade.empresaId,
      input.idUnidade,
      input.idAtivo,
    );
    if (!ativo) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }

    if (ativo.status === 'MANUTENCAO') {
      throw new ConflictException(
        'Ativo em manutenção — finalize a OS atual antes de simular (RN-10).',
      );
    }
    if (ativo.status === 'INATIVO') {
      throw new ConflictException(
        'Ativo inativo — ative o ativo para permitir simulação.',
      );
    }

    const iotBaseUrl = this.config.get<string>('IOT_INGESTION_URL')?.trim();
    if (!iotBaseUrl) {
      throw new ServiceUnavailableException(
        'IOT_INGESTION_URL não configurada no backend.',
      );
    }

    await this.wakeIotIngestion(iotBaseUrl);

    const valor = ativo.limiteTemp + 5;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = this.config.get<string>('IOT_API_KEY')?.trim();
    if (apiKey) {
      headers['x-iot-api-key'] = apiKey;
    }

    const simularUrl = `${iotBaseUrl.replace(/\/$/, '')}/iot/simular`;
    const results: IotSimularResponse[] = [];
    for (let i = 0; i < RN01_LEITURAS; i++) {
      const response = await this.postIotWithRetry(simularUrl, headers, {
        ativoId: input.idAtivo,
        valor,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new BadGatewayException(
          `Gateway IoT respondeu ${response.status}: ${text.slice(0, 200)}`,
        );
      }

      results.push((await response.json()) as IotSimularResponse);
    }

    const last = results[results.length - 1];
    const osPreditivaPublicada = results.some(
      (item) => item.osPreditivaPublicada,
    );

    return {
      ativoId: input.idAtivo,
      ativoNome: ativo.nome,
      valor,
      limiteTemp: ativo.limiteTemp,
      leiturasEnviadas: RN01_LEITURAS,
      leiturasConsecutivasAcimaLimite: last.leiturasConsecutivasAcimaLimite,
      osPreditivaPublicada,
      correlationId: last.correlationId,
    };
  }

  /** Render free tier: microserviço IoT pode estar dormindo (~30–90s). */
  private async wakeIotIngestion(baseUrl: string): Promise<void> {
    const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const response = await fetch(healthUrl, {
          signal: AbortSignal.timeout(90_000),
        });
        if (response.ok) return;
      } catch {
        /* cold start */
      }
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
      }
    }
    throw new ServiceUnavailableException(
      'Microserviço IoT indisponível (cold start Render). Tente novamente em ~1 minuto.',
    );
  }

  private async postIotWithRetry(
    url: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90_000),
        });
        if (response.ok || response.status < 500) {
          return response;
        }
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 4000 * attempt));
      }
    }
    throw new BadGatewayException(
      `Falha ao contactar IoT ingestion: ${lastError instanceof Error ? lastError.message : 'erro de rede'}`,
    );
  }
}
