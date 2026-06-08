export type UsuarioEmpresaContext = {
  id: string;
  nomeEmpresa: string;
  slug: string;
  /** Status da empresa (ATIVA, INATIVA, SUSPENSA). */
  status?: string;
  /** Status do vínculo usuario_empresa (ATIVO, INATIVO, PENDENTE). */
  statusMembros?: string;
};

export type UsuarioCargoContext = {
  id: string;
  codigo: string;
  nome: string;
  nivelHierarquico: number;
  idUnidade: string | null;
  permissoes: string[];
};

/** Usuário corporativo local após vínculo com JWT (`auth_sub`). */
export type UsuarioLocalContext = {
  id: string;
  authSub: string;
  idUnidade: string;
  nome: string;
  fotoUrl?: string | null;
  email: string;
  /** Valor do enum Prisma `PerfilUsuario` (evita acoplar domínio ao client). */
  perfil: string;
  /** Status global do usuário (ATIVO, INATIVO, BLOQUEADO). */
  status?: string;
  /** Status do vínculo na empresa atual (ATIVO, INATIVO, PENDENTE). */
  statusMembros?: string;
  empresa: UsuarioEmpresaContext | null;
  cargos: UsuarioCargoContext[];
  permissoes: string[];
  /** Operador da plataforma navegando em workspace de outro cliente (sem vínculo local). */
  isWorkspaceImpersonation?: boolean;
};
