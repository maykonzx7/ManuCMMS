import type {
  OrdemServicoListaItem,
  OrdemServicoParaFechamento,
} from '../entities/ordem-servico';

export const ORDEM_SERVICO_REPOSITORY_PORT = Symbol(
  'ORDEM_SERVICO_REPOSITORY_PORT',
);

export type CreateOrdemServicoInput = {
  idAtivo: string;
  tipo: OrdemServicoListaItem['tipo'];
  descricao: string;
  idTecnico?: string | null;
};

/** Persistência atômica: OS concluída + ativo OPERACIONAL (RN-14). */
export type FecharOrdemServicoPersistenciaInput = {
  idOrdemServico: string;
  idUnidade: string;
  fotoAnexo: string | null;
  fotoProblema: string | null;
  fotoSolucao: string | null;
  assinaturaDigital: string;
};

export interface IOrdemServicoRepositoryPort {
  listByUnidade(idUnidade: string): Promise<OrdemServicoListaItem[]>;
  create(input: CreateOrdemServicoInput): Promise<OrdemServicoListaItem>;
  findParaFechamento(
    idOrdemServico: string,
    idUnidade: string,
  ): Promise<OrdemServicoParaFechamento | null>;
  fecharComEvidencias(
    input: FecharOrdemServicoPersistenciaInput,
  ): Promise<OrdemServicoListaItem>;
}
