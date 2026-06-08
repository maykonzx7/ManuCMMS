/** Estados operacionais do ativo (DEM / RN-10, RN-14). */
export type StatusAtivoCodigo =
  | 'OPERACIONAL'
  | 'MANUTENCAO'
  | 'FALHA'
  | 'INATIVO';

export type TipoAtivoDocumentoCodigo = 'MANUAL' | 'DIAGRAMA' | 'DOCUMENTACAO';

export type AtivoDocumentoItem = {
  id: string;
  ativoId: string;
  tipo: TipoAtivoDocumentoCodigo;
  nome: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  uploadedPorUsuarioId: string | null;
  createdAt: Date;
};

/** Item de listagem ou resposta após criação (campos expostos pela API). */
export type AtivoListaItem = {
  id: string;
  idUnidade: string;
  nome: string;
  tag?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  observacoes?: string | null;
  custoHoraParada: number;
  custoManutencaoMensal: number;
  status: StatusAtivoCodigo;
  limiteTemp: number;
  localizacao?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: Date;
  updatedAt: Date;
};
