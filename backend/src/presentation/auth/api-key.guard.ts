import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IntegracaoWebhookService } from '../../infrastructure/integracao/integracao-webhook.service';
import { IS_API_KEY_ROUTE } from './api-key.decorator';

declare module 'express-serve-static-core' {
  interface Request {
    integracaoEmpresa?: {
      id: string;
      webhookUrl: string | null;
      apiKeyIntegracao: string | null;
    };
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly integracao: IntegracaoWebhookService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isApiKeyRoute = this.reflector.getAllAndOverride<boolean>(
      IS_API_KEY_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (!isApiKeyRoute) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const apiKey = req.headers['x-api-key'];
    const normalized = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    if (!normalized?.trim()) {
      throw new UnauthorizedException('Header x-api-key é obrigatório.');
    }

    const empresa = await this.integracao.findEmpresaByApiKey(normalized.trim());
    if (!empresa) {
      throw new UnauthorizedException('API key inválida.');
    }

    req.integracaoEmpresa = empresa;
    return true;
  }
}
