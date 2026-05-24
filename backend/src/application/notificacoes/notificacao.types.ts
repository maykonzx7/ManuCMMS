export type NotificacaoTipo = 'info' | 'warning' | 'error' | 'success';

export type NotificacaoInput = {
  usuarioId: string;
  empresaId?: string | null;
  idUnidade?: string | null;
  ordemServicoId?: string | null;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  fotoUrl?: string | null;
  linkPath?: string | null;
};

export type NotificacaoView = {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  fotoUrl: string | null;
  linkPath: string | null;
  lidaEm: string | null;
  createdAt: string;
};
