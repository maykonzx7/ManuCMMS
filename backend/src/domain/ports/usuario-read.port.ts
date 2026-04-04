export const USUARIO_READ_PORT = Symbol('USUARIO_READ_PORT');

/** Leituras mínimas para validar vínculos (ex.: técnico na mesma unidade). */
export interface IUsuarioReadPort {
  existsInUnidade(idUsuario: string, idUnidade: string): Promise<boolean>;
}
