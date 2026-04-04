/** Usuário corporativo local após vínculo com JWT (`auth_sub`). */
export type UsuarioLocalContext = {
  id: string;
  authSub: string;
  idUnidade: string;
  nome: string;
  email: string;
  /** Valor do enum Prisma `PerfilUsuario` (evita acoplar domínio ao client). */
  perfil: string;
};
