import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  OrdemServicoComentarioItem,
  OrdemServicoListaItem,
} from '../../domain/entities/ordem-servico';
import type { ListOrdensServicoFilters } from '../../domain/ports/ordem-servico.repository.port';
import {
  buildProfessionalPdfDocument,
  wrapPdfText,
  type PdfSection,
} from '../shared/simple-pdf.shared';
import { GetOrdemServicoByIdUseCase } from './get-ordem-servico-by-id.use-case';
import { ListOrdemServicoComentariosUseCase } from './list-ordem-servico-comentarios.use-case';
import { ListOrdensServicoByUnidadeUseCase } from './list-ordens-servico-by-unidade.use-case';

export type ExportOrdemPayload = {
  geradoEm: string;
  ordem: OrdemServicoListaItem;
  comentarios: OrdemServicoComentarioItem[];
};

@Injectable()
export class ExportOrdemServicoUseCase {
  constructor(
    private readonly getOrdemById: GetOrdemServicoByIdUseCase,
    private readonly listComentarios: ListOrdemServicoComentariosUseCase,
    private readonly listOrdens: ListOrdensServicoByUnidadeUseCase,
  ) {}

  async exportOne(
    idUnidade: string,
    idOrdemServico: string,
  ): Promise<ExportOrdemPayload> {
    const ordem = await this.getOrdemById.execute(idUnidade, idOrdemServico);
    const comentarios = await this.listComentarios.execute(
      idUnidade,
      idOrdemServico,
    );
    return {
      geradoEm: new Date().toISOString(),
      ordem,
      comentarios,
    };
  }

  async exportMany(
    idUnidade: string,
    filters: ListOrdensServicoFilters,
  ): Promise<OrdemServicoListaItem[]> {
    return this.listOrdens.execute(idUnidade, filters);
  }

  buildCsvOne(payload: ExportOrdemPayload): string {
    const { ordem, comentarios } = payload;
    const lines: string[] = [
      'secao,campo,valor',
      `meta,gerado_em,"${payload.geradoEm}"`,
      `os,id,"${ordem.id}"`,
      `os,ativo,"${escapeCsv(ordem.ativoNome)}"`,
      `os,tipo,"${ordem.tipo}"`,
      `os,prioridade,"${ordem.prioridade}"`,
      `os,status,"${ordem.status}"`,
      `os,status_sla,"${ordem.statusSla}"`,
      `os,descricao,"${escapeCsv(ordem.descricao)}"`,
      `os,descricao_problema,"${escapeCsv(ordem.descricaoProblema ?? '')}"`,
      `os,descricao_solucao,"${escapeCsv(ordem.descricaoSolucao ?? '')}"`,
      `os,tecnico,"${escapeCsv(ordem.finalizadoPorNome ?? ordem.iniciadoPorNome ?? '')}"`,
      `os,criado_por,"${escapeCsv(ordem.criadoPorNome ?? '')}"`,
      `os,data_abertura,"${ordem.dataAbertura.toISOString()}"`,
      `os,data_fechamento,"${ordem.dataFechamento?.toISOString() ?? ''}"`,
      `os,observacao_cancelamento,"${escapeCsv(ordem.observacaoCancelamento ?? '')}"`,
      `os,foto_problema,"${ordem.fotoProblema ?? ''}"`,
      `os,foto_solucao,"${ordem.fotoSolucao ?? ''}"`,
      `os,foto_anexo,"${ordem.fotoAnexo ?? ''}"`,
    ];

    for (const peca of ordem.pecasConsumidas ?? []) {
      lines.push(
        `peca,${escapeCsv(peca.codigo)},"${escapeCsv(peca.nome)} x${peca.quantidade}"`,
      );
    }

    for (const transferencia of ordem.transferencias) {
      lines.push(
        `transferencia,${transferencia.createdAt.toISOString()},"${escapeCsv(`${transferencia.deTecnicoNome ?? 'N/D'} -> ${transferencia.paraTecnicoNome ?? 'N/D'}: ${transferencia.motivo}`)}"`,
      );
    }

    for (const comentario of comentarios) {
      lines.push(
        `comentario,${comentario.createdAt.toISOString()},"${escapeCsv(`${comentario.usuarioNome}: ${comentario.texto}`)}"`,
      );
    }

    return lines.join('\n');
  }

  buildCsvMany(ordens: OrdemServicoListaItem[]): string {
    const header =
      'id,ativo,tipo,prioridade,status,status_sla,descricao,tecnico,criado_por,data_abertura,data_fechamento';
    const rows = ordens.map((ordem) =>
      [
        ordem.id,
        escapeCsv(ordem.ativoNome),
        ordem.tipo,
        ordem.prioridade,
        ordem.status,
        ordem.statusSla,
        escapeCsv(ordem.descricao),
        escapeCsv(ordem.finalizadoPorNome ?? ordem.iniciadoPorNome ?? ''),
        escapeCsv(ordem.criadoPorNome ?? ''),
        ordem.dataAbertura.toISOString(),
        ordem.dataFechamento?.toISOString() ?? '',
      ]
        .map((value) => `"${value}"`)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  buildPdfOne(payload: ExportOrdemPayload): Buffer {
    const { ordem, comentarios } = payload;
    const osCurta = ordem.id.slice(0, 8).toUpperCase();
    const confirmacao = parseConfirmacaoConclusao(ordem.assinaturaDigital);

    const sections: PdfSection[] = [
      {
        title: 'Identificacao',
        keyValues: [
          { label: 'Codigo OS', value: osCurta },
          { label: 'ID completo', value: ordem.id },
          { label: 'Ativo', value: ordem.ativoNome },
          { label: 'Tipo', value: ordem.tipo },
          { label: 'Prioridade', value: ordem.prioridade },
          { label: 'Status', value: ordem.status },
          { label: 'Status SLA', value: ordem.statusSla },
        ],
      },
      {
        title: 'Datas e responsaveis',
        keyValues: [
          { label: 'Abertura', value: formatIsoDateTime(ordem.dataAbertura) },
          {
            label: 'Fechamento',
            value: formatIsoDateTime(ordem.dataFechamento),
          },
          { label: 'Criado por', value: ordem.criadoPorNome ?? '-' },
          { label: 'Iniciado por', value: ordem.iniciadoPorNome ?? '-' },
          { label: 'Finalizado por', value: ordem.finalizadoPorNome ?? '-' },
        ],
      },
      {
        title: 'Descricao da ordem',
        paragraphs: [ordem.descricao],
      },
    ];

    if (ordem.descricaoProblema) {
      sections.push({
        title: 'Problema reportado',
        paragraphs: [ordem.descricaoProblema],
      });
    }

    if (ordem.descricaoSolucao) {
      sections.push({
        title: 'Solucao aplicada',
        paragraphs: [ordem.descricaoSolucao],
      });
    }

    if (ordem.observacaoCancelamento) {
      sections.push({
        title: 'Cancelamento',
        paragraphs: [ordem.observacaoCancelamento],
      });
    }

    if (confirmacao) {
      sections.push({
        title: 'Conclusao',
        keyValues: [{ label: 'Confirmacao', value: confirmacao }],
      });
    }

    if (ordem.fotoProblema || ordem.fotoSolucao || ordem.fotoAnexo) {
      sections.push({
        title: 'Evidencias fotograficas',
        keyValues: [
          ...(ordem.fotoProblema
            ? [{ label: 'Foto problema', value: ordem.fotoProblema }]
            : []),
          ...(ordem.fotoSolucao
            ? [{ label: 'Foto solucao', value: ordem.fotoSolucao }]
            : []),
          ...(ordem.fotoAnexo
            ? [{ label: 'Foto intervencao', value: ordem.fotoAnexo }]
            : []),
        ],
      });
    }

    if (ordem.pecasConsumidas?.length) {
      sections.push({
        title: 'Pecas consumidas',
        bullets: ordem.pecasConsumidas.map(
          (peca) => `${peca.codigo} · ${peca.nome} · Qtd ${peca.quantidade}`,
        ),
      });
    }

    if (ordem.transferencias.length) {
      sections.push({
        title: 'Transferencias',
        bullets: ordem.transferencias.map(
          (transferencia) =>
            `${formatIsoDateTime(transferencia.createdAt)} · ${transferencia.deTecnicoNome ?? 'N/D'} -> ${transferencia.paraTecnicoNome ?? 'N/D'} · ${transferencia.motivo}`,
        ),
      });
    }

    if (comentarios.length) {
      sections.push({
        title: 'Comentarios',
        bullets: comentarios.map(
          (comentario) =>
            `${formatIsoDateTime(comentario.createdAt)} · ${comentario.usuarioNome}: ${wrapPdfText(comentario.texto, 120).join(' ')}`,
        ),
      });
    }

    return buildProfessionalPdfDocument({
      documentTitle: `Ordem de Servico ${osCurta}`,
      documentSubtitle: ordem.ativoNome,
      generatedAt: payload.geradoEm,
      headerMeta: [
        { label: 'Documento', value: 'Relatorio individual de OS' },
        { label: 'Sistema', value: 'ManuCMMS CMMS' },
      ],
      sections,
    });
  }

  buildPdfMany(ordens: OrdemServicoListaItem[], unidadeId: string): Buffer {
    const generatedAt = new Date().toISOString();
    const sections: PdfSection[] = [
      {
        title: 'Resumo',
        keyValues: [
          { label: 'Unidade', value: unidadeId },
          { label: 'Total de ordens', value: String(ordens.length) },
        ],
      },
      {
        title: 'Ordens listadas',
        bullets: ordens.map(
          (ordem, index) =>
            `${String(index + 1).padStart(2, '0')}. ${ordem.id.slice(0, 8).toUpperCase()} · ${ordem.ativoNome} · ${ordem.tipo} · ${ordem.prioridade} · ${ordem.status} · SLA ${ordem.statusSla} · Abertura ${formatIsoDateTime(ordem.dataAbertura)}`,
        ),
      },
    ];

    return buildProfessionalPdfDocument({
      documentTitle: 'Relatorio de Ordens de Servico',
      documentSubtitle: `${ordens.length} registro(s) exportado(s)`,
      generatedAt,
      headerMeta: [
        { label: 'Documento', value: 'Listagem consolidada de OS' },
        { label: 'Unidade', value: unidadeId },
      ],
      sections,
    });
  }

  normalizeFormato(formato?: string): 'csv' | 'json' | 'pdf' {
    const normalized = (formato ?? 'csv').trim().toLowerCase();
    if (normalized === 'csv' || normalized === 'json' || normalized === 'pdf') {
      return normalized;
    }
    throw new BadRequestException('formato deve ser csv, json ou pdf.');
  }
}

function formatIsoDateTime(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function parseConfirmacaoConclusao(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as {
      tipo?: string;
      usuarioNome?: string | null;
      confirmadoEm?: string;
      dataHora?: string;
    };
    if (parsed.tipo === 'confirmacao') {
      const quando = parsed.confirmadoEm ?? parsed.dataHora ?? '';
      return `${parsed.usuarioNome ?? 'Tecnico'} em ${quando || 'N/D'} (confirmacao eletronica)`;
    }
    if (parsed.tipo === 'canvas') {
      return `${parsed.usuarioNome ?? 'Assinante'} (assinatura legada)`;
    }
  } catch {
    if (raw.startsWith('data:image')) {
      return 'Assinatura legada em imagem';
    }
  }
  return null;
}

function escapeCsv(value: string): string {
  return value.replaceAll('"', '""');
}
