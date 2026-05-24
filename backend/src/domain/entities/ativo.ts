/** Estados operacionais do ativo (DEM / RN-10, RN-14). */
export type StatusAtivoCodigo =
  | 'OPERACIONAL'
  | 'MANUTENCAO'
  | 'FALHA'
  | 'INATIVO';

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
  createdAt: Date;
  updatedAt: Date;
};
