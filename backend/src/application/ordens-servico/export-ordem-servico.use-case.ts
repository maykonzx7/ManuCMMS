import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  OrdemServicoComentarioItem,
  OrdemServicoListaItem,
} from '../../domain/entities/ordem-servico';
import type { ListOrdensServicoFilters } from '../../domain/ports/ordem-servico.repository.port';
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

  normalizeFormato(formato?: string): 'csv' | 'json' {
    const normalized = (formato ?? 'csv').trim().toLowerCase();
    if (normalized === 'csv' || normalized === 'json') return normalized;
    throw new BadRequestException('formato deve ser csv ou json.');
  }
}

function escapeCsv(value: string): string {
  return value.replaceAll('"', '""');
}
