import type {
  CategoriaOrdemServicoAnexoCodigo,
  OrdemServicoAnexoItem,
} from '../entities/ordem-servico';

export const ORDEM_SERVICO_ANEXO_REPOSITORY_PORT = Symbol(
  'ORDEM_SERVICO_ANEXO_REPOSITORY_PORT',
);

export type CreateOrdemServicoAnexoInput = {
  empresaId: string;
  ordemServicoId: string;
  categoria: CategoriaOrdemServicoAnexoCodigo;
  nome: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  uploadedPorUsuarioId: string;
};

export interface IOrdemServicoAnexoRepositoryPort {
  listByOrdemServico(
    empresaId: string,
    idUnidade: string,
    idOrdemServico: string,
  ): Promise<OrdemServicoAnexoItem[]>;
  create(input: CreateOrdemServicoAnexoInput): Promise<OrdemServicoAnexoItem>;
  deleteById(
    empresaId: string,
    idUnidade: string,
    idOrdemServico: string,
    idAnexo: string,
  ): Promise<boolean>;
}
