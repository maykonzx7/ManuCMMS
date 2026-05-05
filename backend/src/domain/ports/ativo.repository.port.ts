import type { AtivoListaItem } from '../entities/ativo';

export const ATIVO_REPOSITORY_PORT = Symbol('ATIVO_REPOSITORY_PORT');

export type StatusAtivoPersistido = AtivoListaItem['status'];

export type CreateAtivoInput = {
  empresaId: string;
  idUnidade: string;
  nome: string;
  limiteTemp?: number;
};

export interface IAtivoRepositoryPort {
  listByUnidade(empresaId: string, idUnidade: string): Promise<AtivoListaItem[]>;
  create(input: CreateAtivoInput): Promise<AtivoListaItem>;
  existsInUnidade(
    empresaId: string,
    idAtivo: string,
    idUnidade: string,
  ): Promise<boolean>;
  getStatusInUnidade(
    empresaId: string,
    idAtivo: string,
    idUnidade: string,
  ): Promise<StatusAtivoPersistido | null>;
}
