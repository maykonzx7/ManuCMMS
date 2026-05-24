import type {
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
  descricao: string;
  idTecnico?: string | null;
};

/** Persistência atômica: OS concluída + ativo OPERACIONAL (RN-14). */
export type FecharOrdemServicoPersistenciaInput = {
  idOrdemServico: string;
  empresaId: string;
  idUnidade: string;
  fotoAnexo: string | null;
  fotoProblema: string | null;
  fotoSolucao: string | null;
};

export interface IOrdemServicoRepositoryPort {
  listByUnidade(
    empresaId: string,
    idUnidade: string,
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
  ): Promise<OrdemServicoListaItem>;
  cancelar(
    input: {
      idOrdemServico: string;
      empresaId: string;
      idUnidade: string;
      observacaoCancelamento: string;
    },
  ): Promise<OrdemServicoListaItem>;
}
