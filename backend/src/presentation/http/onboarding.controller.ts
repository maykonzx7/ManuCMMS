import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ActivateConviteAcessoUseCase } from '../../application/onboarding/activate-convite-acesso.use-case';
import { AcceptConviteAcessoUseCase } from '../../application/onboarding/accept-convite-acesso.use-case';
import { CancelConviteAcessoUseCase } from '../../application/onboarding/cancel-convite-acesso.use-case';
import { CreateConviteAcessoUseCase } from '../../application/onboarding/create-convite-acesso.use-case';
import { CreateEmpresaWithInviteUseCase } from '../../application/onboarding/create-empresa-with-invite.use-case';
import { ListConvitesAcessoUseCase } from '../../application/onboarding/list-convites-acesso.use-case';
import { ResendConviteAcessoUseCase } from '../../application/onboarding/resend-convite-acesso.use-case';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { AuthorizePlatformOperatorUseCase } from '../../application/iam/authorize-platform-operator.use-case';
import type { AuthUserContext } from '../auth/auth-user.types';
import { AllowPendingUser } from '../auth/allow-pending-user.decorator';
import { Public } from '../auth/public.decorator';
import { RequestRateLimitService } from './request-rate-limit.service';

type RequestWithUser = Request & { user: AuthUserContext };

@Controller()
export class OnboardingController {
  constructor(
    private readonly config: ConfigService,
    private readonly createEmpresaWithInvite: CreateEmpresaWithInviteUseCase,
    private readonly createConviteAcesso: CreateConviteAcessoUseCase,
    private readonly listConvitesAcesso: ListConvitesAcessoUseCase,
    private readonly cancelConviteAcesso: CancelConviteAcessoUseCase,
    private readonly resendConviteAcesso: ResendConviteAcessoUseCase,
    private readonly acceptConviteAcesso: AcceptConviteAcessoUseCase,
    private readonly activateConviteAcesso: ActivateConviteAcessoUseCase,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
    private readonly rateLimit: RequestRateLimitService,
  ) {}

  /**
   * Onboarding inicial da plataforma.
   * Futuramente deve ser restrito ao Administrador da Plataforma.
   */
  @AllowPendingUser()
  @Post('empresas')
  async createEmpresa(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      nomeEmpresa: string;
      slug?: string;
      emailResponsavel: string;
      nomeResponsavel?: string;
      nomeUnidadeInicial?: string;
      localizacaoUnidadeInicial?: string;
    },
  ) {
    await this.rateLimit.enforce({
      scope: 'onboarding:create-empresa',
      key: this.getClientIp(req),
      maxHits: this.getNumberConfig('RATE_LIMIT_CREATE_EMPRESA_MAX_HITS', 10),
      windowMs: this.getNumberConfig(
        'RATE_LIMIT_CREATE_EMPRESA_WINDOW_MS',
        60_000,
      ),
      message: 'Muitas tentativas de criar empresa. Aguarde e tente novamente.',
    });

    this.authorizePlatformOperator.execute(req.user);

    return this.createEmpresaWithInvite.execute(body);
  }

  @Get('empresas/:empresaId/convites')
  listConvites(@Param('empresaId') empresaId: string, @Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'usuario.convidar');
    return this.listConvitesAcesso.execute(req.usuarioLocal, empresaId);
  }

  @Post('empresas/:empresaId/convites')
  createConvite(
    @Param('empresaId') empresaId: string,
    @Body()
    body: {
      emailDestino: string;
      nomeDestino?: string;
      cargoCodigo: string;
      idUnidadeDestino?: string | null;
    },
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'usuario.convidar');
    return this.createConviteAcesso.execute(req.usuarioLocal, empresaId, body);
  }

  @Patch('empresas/:empresaId/convites/:conviteId/cancelar')
  cancelConvite(
    @Param('empresaId') empresaId: string,
    @Param('conviteId') conviteId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'usuario.convidar');
    return this.cancelConviteAcesso.execute(
      req.usuarioLocal,
      empresaId,
      conviteId,
    );
  }

  @Post('empresas/:empresaId/convites/:conviteId/reenviar')
  resendConvite(
    @Param('empresaId') empresaId: string,
    @Param('conviteId') conviteId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'usuario.convidar');
    return this.resendConviteAcesso.execute(
      req.usuarioLocal,
      empresaId,
      conviteId,
    );
  }

  @Public()
  @Post('convites/ativar')
  async activateConvite(
    @Body() body: { token: string; nome: string; senha: string },
    @Req() req: Request,
  ) {
    await this.rateLimit.enforce({
      scope: 'onboarding:activate-convite',
      key: this.getClientIp(req),
      maxHits: this.getNumberConfig('RATE_LIMIT_ACCEPT_CONVITE_MAX_HITS', 20),
      windowMs: this.getNumberConfig(
        'RATE_LIMIT_ACCEPT_CONVITE_WINDOW_MS',
        60_000,
      ),
      message:
        'Muitas tentativas de ativacao de convite. Aguarde e tente novamente.',
    });

    return this.activateConviteAcesso.execute(body);
  }

  @Post('convites/aceitar')
  @AllowPendingUser()
  async acceptConvite(
    @Body() body: { token: string; nome?: string },
    @Req() req: RequestWithUser,
  ) {
    await this.rateLimit.enforce({
      scope: 'onboarding:accept-convite',
      key: this.getClientIp(req),
      maxHits: this.getNumberConfig('RATE_LIMIT_ACCEPT_CONVITE_MAX_HITS', 20),
      windowMs: this.getNumberConfig(
        'RATE_LIMIT_ACCEPT_CONVITE_WINDOW_MS',
        60_000,
      ),
      message:
        'Muitas tentativas de aceite de convite. Aguarde e tente novamente.',
    });

    return this.acceptConviteAcesso.execute(req.user, body);
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.config.get<string>(key)?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0]?.trim() || req.ip || 'unknown';
    }
    return req.ip || 'unknown';
  }
}
