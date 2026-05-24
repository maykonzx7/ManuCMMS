import type { AtivoListaItem } from '../entities/ativo';

export const ATIVO_REPOSITORY_PORT = Symbol('ATIVO_REPOSITORY_PORT');

export type StatusAtivoPersistido = AtivoListaItem['status'];

export type CreateAtivoInput = {
  empresaId: string;
  idUnidade: string;
  nome: string;
  limiteTemp?: number;
  tag?: string;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  observacoes?: string;
};

export type UpdateAtivoInput = {
  empresaId: string;
  idUnidade: string;
  idAtivo: string;
  nome?: string;
  limiteTemp?: number;
  status?: StatusAtivoPersistido;
  tag?: string;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  observacoes?: string;
};

export interface IAtivoRepositoryPort {
  listByUnidade(empresaId: string, idUnidade: string): Promise<AtivoListaItem[]>;
  findByIdInUnidade(
    empresaId: string,
    idUnidade: string,
    idAtivo: string,
  ): Promise<AtivoListaItem | null>;
  create(input: CreateAtivoInput): Promise<AtivoListaItem>;
  update(input: UpdateAtivoInput): Promise<AtivoListaItem | null>;
  deleteByIdInUnidade(
    empresaId: string,
    idUnidade: string,
    idAtivo: string,
  ): Promise<boolean>;
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
