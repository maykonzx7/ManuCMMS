/** Estados operacionais do ativo (DEM / RN-10, RN-14). */
export type StatusAtivoCodigo = 'OPERACIONAL' | 'MANUTENCAO' | 'FALHA';

/** Item de listagem ou resposta após criação (campos expostos pela API). */
export type AtivoListaItem = {
  id: string;
  idUnidade: string;
  nome: string;
  status: StatusAtivoCodigo;
  limiteTemp: number;
  createdAt: Date;
  updatedAt: Date;
};
