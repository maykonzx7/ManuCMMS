/** Entrada alinhada ao dicionário LogAuditoria (RN-04, NF-05 — MongoDB). */
export type AuditLogEntrada = {
  idUsuario: string | null;
  entidadeAfetada: string;
  idRegistro: string;
  valorAnterior: Record<string, unknown>;
  valorNovo: Record<string, unknown>;
};

export type AuditLogConsulta = {
  from?: string;
  to?: string;
  unidadeId?: string;
  entidade?: string;
  limit?: number;
};

export type AuditLogItem = {
  idLog: string;
  idUsuario: string | null;
  entidadeAfetada: string;
  idRegistro: string;
  valorAnterior: Record<string, unknown>;
  valorNovo: Record<string, unknown>;
  dataHora: string;
};

export const AUDIT_LOG_PORT = Symbol('AUDIT_LOG_PORT');

export interface IAuditLogPort {
  append(entrada: AuditLogEntrada): Promise<void>;
  list(filtro?: AuditLogConsulta): Promise<AuditLogItem[]>;
}
