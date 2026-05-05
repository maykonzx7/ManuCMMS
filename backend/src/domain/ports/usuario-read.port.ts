import type { UsuarioLocalContext } from '../entities/usuario-local';

export const USUARIO_READ_PORT = Symbol('USUARIO_READ_PORT');

export type PerfilUsuarioCodigo =
  | 'TECNICO'
  | 'SUPERVISOR'
  | 'GESTOR'
  | 'AUDITOR'
  | 'ADMIN';

export type CreateUsuarioBootstrapInput = {
  authSub: string;
  email: string;
  nome: string;
  idUnidade: string;
  idUnidadeCargo?: string | null;
  empresaId?: string | null;
  perfil: PerfilUsuarioCodigo;
};

export type EnsureUsuarioEmpresaAccessInput = {
  idUsuario: string;
  idUnidade: string;
  idUnidadeCargo?: string | null;
  empresaId?: string | null;
  perfil: PerfilUsuarioCodigo;
};

/** Leituras mínimas para validar vínculos (ex.: técnico na mesma unidade). */
export interface IUsuarioReadPort {
  existsInUnidade(idUsuario: string, idUnidade: string): Promise<boolean>;
  listByUnidade(idUnidade: string): Promise<UsuarioLocalContext[]>;
  findByAuthSub(authSub: string): Promise<UsuarioLocalContext | null>;
  ensureAccessContext(input: EnsureUsuarioEmpresaAccessInput): Promise<void>;
  createBootstrap(
    input: CreateUsuarioBootstrapInput,
  ): Promise<UsuarioLocalContext>;
}
