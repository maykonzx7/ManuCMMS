export type TipoOrdemServicoCodigo = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA';

export type StatusOrdemServicoCodigo =
  | 'ABERTA'
  | 'EM_EXECUCAO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type StatusSlaOrdemServicoCodigo = 'NO_PRAZO' | 'ATRASADA' | 'CONCLUIDA';

export type OrdemServicoTransferenciaItem = {
  id: string;
  deTecnicoId: string | null;
  deTecnicoNome: string | null;
  paraTecnicoId: string;
  paraTecnicoNome: string | null;
  transferidoPorUsuarioId: string;
  transferidoPorNome: string | null;
  motivo: string;
  createdAt: Date;
};

export type OrdemServicoPecaConsumidaItem = {
  pecaId: string;
  codigo: string;
  nome: string;
  quantidade: number;
};

export type OrdemServicoComentarioItem = {
  id: string;
  ordemServicoId: string;
  usuarioId: string;
  usuarioNome: string;
  texto: string;
  createdAt: Date;
};

export type CategoriaOrdemServicoAnexoCodigo = 'PROBLEMA' | 'RESOLUCAO' | 'GERAL';

export type OrdemServicoAnexoItem = {
  id: string;
  ordemServicoId: string;
  categoria: CategoriaOrdemServicoAnexoCodigo;
  nome: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  uploadedPorUsuarioId: string | null;
  createdAt: Date;
};

export type OrdemServicoListaItem = {
  id: string;
  idAtivo: string;
  ativoNome: string;
  idTecnico: string | null;
  tipo: TipoOrdemServicoCodigo;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  status: StatusOrdemServicoCodigo;
  descricao: string;
  fotoAnexo: string | null;
  fotoProblema: string | null;
  descricaoProblema: string | null;
  fotoSolucao: string | null;
  descricaoSolucao: string | null;
  dataLimiteSla: Date | null;
  statusSla: StatusSlaOrdemServicoCodigo;
  assinaturaDigital: string | null;
  observacaoCancelamento: string | null;
  dataAbertura: Date;
  dataFechamento: Date | null;
  idCriadoPorUsuario: string | null;
  criadoPorNome: string | null;
  idIniciadoPorUsuario: string | null;
  iniciadoPorNome: string | null;
  idFinalizadoPorUsuario: string | null;
  finalizadoPorNome: string | null;
  transferencias: OrdemServicoTransferenciaItem[];
  pecasConsumidas?: OrdemServicoPecaConsumidaItem[];
  anexos?: OrdemServicoAnexoItem[];
};

/** Dados mínimos para aplicar regras de fechamento (RN-02, RN-13). */
export type OrdemServicoParaFechamento = {
  id: string;
  idAtivo: string;
  tipo: TipoOrdemServicoCodigo;
  status: StatusOrdemServicoCodigo;
};
