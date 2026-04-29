import type { UsuarioLocalContext } from '../entities/usuario-local';

export const USUARIO_READ_PORT = Symbol('USUARIO_READ_PORT');

export type CreateUsuarioBootstrapInput = {
  authSub: string;
  email: string;
  nome: string;
  idUnidade: string;
  perfil: 'TECNICO' | 'SUPERVISOR' | 'GESTOR' | 'AUDITOR' | 'ADMIN';
};

/** Leituras mínimas para validar vínculos (ex.: técnico na mesma unidade). */
export interface IUsuarioReadPort {
  existsInUnidade(idUsuario: string, idUnidade: string): Promise<boolean>;
  listByUnidade(idUnidade: string): Promise<UsuarioLocalContext[]>;
  findByAuthSub(authSub: string): Promise<UsuarioLocalContext | null>;
  createBootstrap(
    input: CreateUsuarioBootstrapInput,
  ): Promise<UsuarioLocalContext>;
}
