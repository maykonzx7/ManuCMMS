import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

const URL_MAX = 2048;
const ASSINATURA_MAX = 32_000;

function normalizarUrl(v: unknown): string | null {
  if (v == null || typeof v !== 'string') {
    return null;
  }
  const t = v.trim();
  return t.length === 0 ? null : t;
}

@Injectable()
export class FecharOrdemServicoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    body: {
      assinaturaDigital: string;
      fotoAnexo?: string | null;
      fotoProblema?: string | null;
      fotoSolucao?: string | null;
    },
  ): Promise<OrdemServicoListaItem> {
    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }

    const os = await this.ordens.findParaFechamento(idOrdemServico, idUnidade);
    if (!os) {
      throw new NotFoundException(
        'Ordem de serviço não encontrada ou já encerrada',
      );
    }

    const assinatura = body.assinaturaDigital?.trim() ?? '';
    if (assinatura.length === 0 || assinatura.length > ASSINATURA_MAX) {
      throw new BadRequestException(
        'assinaturaDigital é obrigatória e deve ter até 32.000 caracteres',
      );
    }

    const fotoAnexo = normalizarUrl(body.fotoAnexo);
    const fotoProblema = normalizarUrl(body.fotoProblema);
    const fotoSolucao = normalizarUrl(body.fotoSolucao);

    for (const [nome, url] of [
      ['fotoAnexo', fotoAnexo],
      ['fotoProblema', fotoProblema],
      ['fotoSolucao', fotoSolucao],
    ] as const) {
      if (url != null && url.length > URL_MAX) {
        throw new BadRequestException(
          `${nome}: URL com até ${URL_MAX} caracteres`,
        );
      }
    }

    if (os.tipo === 'CORRETIVA') {
      if (fotoProblema == null || fotoSolucao == null) {
        throw new BadRequestException(
          'OS corretiva exige fotoProblema e fotoSolucao (RN-13)',
        );
      }
    } else if (fotoAnexo == null) {
      throw new BadRequestException(
        'É obrigatório enviar pelo menos uma foto da intervenção em fotoAnexo (RN-02)',
      );
    }

    return this.ordens.fecharComEvidencias({
      idOrdemServico,
      idUnidade,
      fotoAnexo: fotoAnexo ?? null,
      fotoProblema: os.tipo === 'CORRETIVA' ? fotoProblema : null,
      fotoSolucao: os.tipo === 'CORRETIVA' ? fotoSolucao : null,
      assinaturaDigital: assinatura,
    });
  }
}
