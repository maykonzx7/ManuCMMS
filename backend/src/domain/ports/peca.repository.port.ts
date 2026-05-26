export const PECA_REPOSITORY_PORT = Symbol('PECA_REPOSITORY_PORT');

export type PecaItem = {
  id: string;
  idUnidade: string;
  codigo: string;
  nome: string;
  quantidadeEstoque: number;
  quantidadeMinima: number;
};

export type CreatePecaInput = {
  empresaId: string;
  idUnidade: string;
  codigo: string;
  nome: string;
  quantidadeEstoque?: number;
  quantidadeMinima?: number;
};

export type UpdatePecaInput = {
  codigo?: string;
  nome?: string;
  quantidadeEstoque?: number;
  quantidadeMinima?: number;
};

export type PecaMovimentacaoItem = {
  pecaId: string;
  pecaCodigo: string;
  pecaNome: string;
  ordemServicoId: string;
  quantidade: number;
  createdAt: string;
};

export interface IPecaRepositoryPort {
  listByUnidade(empresaId: string, idUnidade: string): Promise<PecaItem[]>;
  create(input: CreatePecaInput): Promise<PecaItem>;
  findByIdInUnidade(
    pecaId: string,
    empresaId: string,
    idUnidade: string,
  ): Promise<PecaItem | null>;
  update(
    pecaId: string,
    empresaId: string,
    idUnidade: string,
    input: UpdatePecaInput,
  ): Promise<PecaItem>;
  delete(pecaId: string, empresaId: string, idUnidade: string): Promise<void>;
  countConsumos(pecaId: string): Promise<number>;
  listMovimentacoes(
    empresaId: string,
    idUnidade: string,
    limit?: number,
  ): Promise<PecaMovimentacaoItem[]>;
}
