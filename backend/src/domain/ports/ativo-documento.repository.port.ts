import type {
  AtivoDocumentoItem,
  TipoAtivoDocumentoCodigo,
} from '../entities/ativo';

export const ATIVO_DOCUMENTO_REPOSITORY_PORT = Symbol(
  'ATIVO_DOCUMENTO_REPOSITORY_PORT',
);

export type CreateAtivoDocumentoInput = {
  empresaId: string;
  ativoId: string;
  tipo: TipoAtivoDocumentoCodigo;
  nome: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  uploadedPorUsuarioId: string;
};

export interface IAtivoDocumentoRepositoryPort {
  listByAtivo(
    empresaId: string,
    idUnidade: string,
    idAtivo: string,
  ): Promise<AtivoDocumentoItem[]>;
  create(input: CreateAtivoDocumentoInput): Promise<AtivoDocumentoItem>;
  deleteById(
    empresaId: string,
    idUnidade: string,
    idAtivo: string,
    idDocumento: string,
  ): Promise<boolean>;
}
