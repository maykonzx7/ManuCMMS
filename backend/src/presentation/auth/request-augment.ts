import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';

declare module 'express-serve-static-core' {
  interface Request {
    usuarioLocal?: UsuarioLocalContext;
  }
}

export {};
