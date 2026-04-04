import type { AtivoListaItem } from '../entities/ativo';

export const ATIVO_REPOSITORY_PORT = Symbol('ATIVO_REPOSITORY_PORT');

export type StatusAtivoPersistido = AtivoListaItem['status'];

export type CreateAtivoInput = {
  idUnidade: string;
  nome: string;
  limiteTemp?: number;
};

export interface IAtivoRepositoryPort {
  listByUnidade(idUnidade: string): Promise<AtivoListaItem[]>;
  create(input: CreateAtivoInput): Promise<AtivoListaItem>;
  existsInUnidade(idAtivo: string, idUnidade: string): Promise<boolean>;
  getStatusInUnidade(
    idAtivo: string,
    idUnidade: string,
  ): Promise<StatusAtivoPersistido | null>;
}
