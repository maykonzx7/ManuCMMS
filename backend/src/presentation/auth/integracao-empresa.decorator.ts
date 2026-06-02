import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export const IntegracaoEmpresaParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.integracaoEmpresa) {
      throw new UnauthorizedException('Contexto de integração ausente.');
    }
    return req.integracaoEmpresa;
  },
);
