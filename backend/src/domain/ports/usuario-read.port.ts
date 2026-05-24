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
  findByIdInUnidade(
    idUsuario: string,
    idUnidade: string,
  ): Promise<UsuarioLocalContext | null>;
  findByAuthSub(
    authSub: string,
    preferredEmpresaSlug?: string | null,
  ): Promise<UsuarioLocalContext | null>;
  findByEmail(
    email: string,
    preferredEmpresaSlug?: string | null,
  ): Promise<UsuarioLocalContext | null>;
  updateAuthSub(idUsuario: string, authSub: string): Promise<void>;
  ensureAccessContext(input: EnsureUsuarioEmpresaAccessInput): Promise<void>;
  createBootstrap(
    input: CreateUsuarioBootstrapInput,
  ): Promise<UsuarioLocalContext>;
}
