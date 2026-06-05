export type UsuarioEmpresaContext = {
  id: string;
  nomeEmpresa: string;
  slug: string;
  status?: string;
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
  status?: string;
  empresa: UsuarioEmpresaContext | null;
  cargos: UsuarioCargoContext[];
  permissoes: string[];
};
