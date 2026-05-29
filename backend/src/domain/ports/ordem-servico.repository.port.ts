import type {
  OrdemServicoComentarioItem,
  OrdemServicoListaItem,
  OrdemServicoParaFechamento,
} from '../entities/ordem-servico';

export const ORDEM_SERVICO_REPOSITORY_PORT = Symbol(
  'ORDEM_SERVICO_REPOSITORY_PORT',
);

export type CreateOrdemServicoInput = {
  empresaId: string;
  idUnidade: string;
  idAtivo: string;
  tipo: OrdemServicoListaItem['tipo'];
  prioridade?: OrdemServicoListaItem['prioridade'];
  descricao: string;
  dataLimiteSla: Date | null;
  idTecnico?: string | null;
  criadoPorUsuarioId: string;
};

export type ListOrdensServicoFilters = {
  status?: OrdemServicoListaItem['status'];
  tipo?: OrdemServicoListaItem['tipo'];
  prioridade?: OrdemServicoListaItem['prioridade'];
  idTecnico?: string;
  idAtivo?: string;
  from?: Date;
  to?: Date;
};

export type PecaConsumoInput = {
  pecaId: string;
  quantidade: number;
};

/** Persistência atômica: OS concluída + ativo OPERACIONAL (RN-14). */
export type FecharOrdemServicoPersistenciaInput = {
  idOrdemServico: string;
  empresaId: string;
  idUnidade: string;
  fotoAnexo: string | null;
  fotoProblema: string | null;
  descricaoProblema: string | null;
  fotoSolucao: string | null;
  descricaoSolucao: string | null;
  assinaturaDigital: string | null;
  finalizadoPorUsuarioId: string;
  pecasConsumidas?: PecaConsumoInput[];
};

export interface IOrdemServicoRepositoryPort {
  listByUnidade(
    empresaId: string,
    idUnidade: string,
    filters?: ListOrdensServicoFilters,
  ): Promise<OrdemServicoListaItem[]>;
  listByAtivo(
    empresaId: string,
    idUnidade: string,
    idAtivo: string,
  ): Promise<OrdemServicoListaItem[]>;
  findByIdInUnidade(
    idOrdemServico: string,
    empresaId: string,
    idUnidade: string,
  ): Promise<OrdemServicoListaItem | null>;
  create(input: CreateOrdemServicoInput): Promise<OrdemServicoListaItem>;
  updateDados(
    input: {
      idOrdemServico: string;
      empresaId: string;
      idUnidade: string;
      descricao?: string;
      idTecnico?: string | null;
      transferidoPorUsuarioId?: string;
      motivoTransferencia?: string;
    },
  ): Promise<OrdemServicoListaItem | null>;
  findParaFechamento(
    idOrdemServico: string,
    empresaId: string,
    idUnidade: string,
  ): Promise<OrdemServicoParaFechamento | null>;
  fecharComEvidencias(
    input: FecharOrdemServicoPersistenciaInput,
  ): Promise<OrdemServicoListaItem>;
  iniciarExecucao(
    idOrdemServico: string,
    empresaId: string,
    idUnidade: string,
    iniciadoPorUsuarioId: string,
    fotoProblema?: string | null,
    descricaoProblema?: string | null,
  ): Promise<OrdemServicoListaItem>;
  markOverdueAndCollect(
    empresaId: string,
    idUnidade: string,
  ): Promise<OrdemServicoListaItem[]>;
  markSlaNotified(ordemIds: string[]): Promise<void>;
  cancelar(
    input: {
      idOrdemServico: string;
      empresaId: string;
      idUnidade: string;
      observacaoCancelamento: string;
      canceladoPorUsuarioId: string;
    },
  ): Promise<OrdemServicoListaItem>;
  listComentarios(ordemServicoId: string): Promise<OrdemServicoComentarioItem[]>;
  createComentario(input: {
    ordemServicoId: string;
    usuarioId: string;
    texto: string;
  }): Promise<OrdemServicoComentarioItem>;
}
