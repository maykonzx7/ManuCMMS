import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  PecaItem,
  PecaMovimentacaoItem,
} from '../../domain/ports/peca.repository.port';
import {
  PECA_REPOSITORY_PORT,
  type IPecaRepositoryPort,
} from '../../domain/ports/peca.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import { buildProfessionalPdfDocument } from '../shared/simple-pdf.shared';

export type ExportPecasEstoquePayload = {
  unidadeId: string;
  unidadeNome: string;
  pecas: PecaItem[];
  movimentacoes: PecaMovimentacaoItem[];
};

@Injectable()
export class ExportPecasEstoqueUseCase {
  constructor(
    @Inject(PECA_REPOSITORY_PORT)
    private readonly pecas: IPecaRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(idUnidade: string): Promise<ExportPecasEstoquePayload> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const [lista, movimentacoes] = await Promise.all([
      this.pecas.listByUnidade(unidade.empresaId, idUnidade),
      this.pecas.listMovimentacoes(unidade.empresaId, idUnidade, 500),
    ]);

    return {
      unidadeId: idUnidade,
      unidadeNome: unidade.nome,
      pecas: lista,
      movimentacoes,
    };
  }

  normalizeFormato(formato?: string): 'csv' | 'pdf' {
    const f = (formato ?? 'pdf').trim().toLowerCase();
    if (f === 'csv' || f === 'excel') return 'csv';
    if (f === 'pdf') return 'pdf';
    throw new BadRequestException('formato deve ser csv ou pdf');
  }

  buildCsv(payload: ExportPecasEstoquePayload): string {
    const generatedAt = new Date().toISOString();
    const baixo = payload.pecas.filter(
      (p) => p.quantidadeEstoque <= p.quantidadeMinima,
    ).length;
    const meta = [
      ['gerado_em', generatedAt],
      ['unidade_id', payload.unidadeId],
      ['unidade_nome', payload.unidadeNome],
      ['total_pecas', String(payload.pecas.length)],
      ['pecas_estoque_baixo', String(baixo)],
      ['total_movimentacoes', String(payload.movimentacoes.length)],
      [],
      ['=== INVENTARIO ==='],
      'codigo,nome,quantidade_estoque,quantidade_minima,status',
    ];

    const inventario = payload.pecas.map((p) => {
      const status =
        p.quantidadeEstoque <= p.quantidadeMinima ? 'BAIXO' : 'OK';
      return [
        p.codigo,
        p.nome.replaceAll('"', '""'),
        String(p.quantidadeEstoque),
        String(p.quantidadeMinima),
        status,
      ]
        .map((v) => `"${v}"`)
        .join(',');
    });

    const movHeader = [[], ['=== MOVIMENTACOES (SAIDA POR OS) ==='], 'data,peca_codigo,peca_nome,quantidade,ordem_servico_id'];
    const movs = payload.movimentacoes.map((m) =>
      [
        m.createdAt,
        m.pecaCodigo,
        m.pecaNome.replaceAll('"', '""'),
        String(m.quantidade),
        m.ordemServicoId,
      ]
        .map((v) => `"${v}"`)
        .join(','),
    );

    return [...meta.map((line) => (Array.isArray(line) ? line.join(',') : line)), ...inventario, ...movHeader, ...movs].join('\n');
  }

  buildPdf(payload: ExportPecasEstoquePayload): Buffer {
    const baixo = payload.pecas.filter(
      (p) => p.quantidadeEstoque <= p.quantidadeMinima,
    );
    const totalSaidas = payload.movimentacoes.reduce(
      (acc, m) => acc + m.quantidade,
      0,
    );

    return buildProfessionalPdfDocument({
      documentTitle: 'Relatorio Analitico de Estoque',
      documentSubtitle: `${payload.pecas.length} peca(s) · ${payload.movimentacoes.length} movimentacao(oes)`,
      generatedAt: new Date().toISOString(),
      headerMeta: [
        { label: 'Unidade', value: payload.unidadeNome },
        { label: 'Unidade ID', value: payload.unidadeId },
      ],
      sections: [
        {
          title: 'Resumo',
          keyValues: [
            { label: 'Total de pecas', value: String(payload.pecas.length) },
            {
              label: 'Pecas com estoque baixo',
              value: String(baixo.length),
            },
            {
              label: 'Total unidades consumidas (OS)',
              value: String(totalSaidas),
            },
          ],
        },
        {
          title: 'Inventario atual',
          bullets: payload.pecas.map(
            (p) =>
              `${p.codigo} — ${p.nome}: ${p.quantidadeEstoque} un (min ${p.quantidadeMinima})${
                p.quantidadeEstoque <= p.quantidadeMinima ? ' [BAIXO]' : ''
              }`,
          ),
        },
        {
          title: 'Movimentacoes recentes (saida por OS)',
          bullets:
            payload.movimentacoes.length === 0
              ? ['Nenhuma movimentacao registrada.']
              : payload.movimentacoes
                  .slice(0, 80)
                  .map(
                    (m) =>
                      `${m.createdAt.slice(0, 10)} · ${m.pecaCodigo} · qtd ${m.quantidade} · OS ${m.ordemServicoId.slice(0, 8)}`,
                  ),
        },
      ],
    });
  }
}
