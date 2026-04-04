import type { UnidadeListaItem } from '../entities/unidade';

export const UNIDADE_READ_PORT = Symbol('UNIDADE_READ_PORT');

export interface IUnidadeReadPort {
  listAll(): Promise<UnidadeListaItem[]>;
  findById(id: string): Promise<UnidadeListaItem | null>;
}
