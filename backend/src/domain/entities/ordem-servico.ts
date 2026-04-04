export type TipoOrdemServicoCodigo = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA';

export type StatusOrdemServicoCodigo =
  | 'ABERTA'
  | 'EM_EXECUCAO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type OrdemServicoListaItem = {
  id: string;
  idAtivo: string;
  ativoNome: string;
  idTecnico: string | null;
  tipo: TipoOrdemServicoCodigo;
  status: StatusOrdemServicoCodigo;
  descricao: string;
  fotoAnexo: string | null;
  fotoProblema: string | null;
  fotoSolucao: string | null;
  assinaturaDigital: string | null;
  dataAbertura: Date;
  dataFechamento: Date | null;
};

/** Dados mínimos para aplicar regras de fechamento (RN-02, RN-13). */
export type OrdemServicoParaFechamento = {
  id: string;
  idAtivo: string;
  tipo: TipoOrdemServicoCodigo;
  status: StatusOrdemServicoCodigo;
};
