import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AcceptConviteAcessoUseCase } from '../../application/onboarding/accept-convite-acesso.use-case';
import { CreateConviteAcessoUseCase } from '../../application/onboarding/create-convite-acesso.use-case';
import { CreateEmpresaWithInviteUseCase } from '../../application/onboarding/create-empresa-with-invite.use-case';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import type { AuthUserContext } from '../auth/auth-user.types';
import { AllowPendingUser } from '../auth/allow-pending-user.decorator';
import { Public } from '../auth/public.decorator';

type RequestWithUser = Request & { user: AuthUserContext };

@Controller()
export class OnboardingController {
  constructor(
    private readonly createEmpresaWithInvite: CreateEmpresaWithInviteUseCase,
    private readonly createConviteAcesso: CreateConviteAcessoUseCase,
    private readonly acceptConviteAcesso: AcceptConviteAcessoUseCase,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
  ) {}

  /**
   * Onboarding inicial da plataforma.
   * Futuramente deve ser restrito ao Administrador da Plataforma.
   */
  @Public()
  @Post('empresas')
  createEmpresa(
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
    return this.createEmpresaWithInvite.execute(body);
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

  @Post('convites/aceitar')
  @AllowPendingUser()
  acceptConvite(
    @Body() body: { token: string; nome?: string },
    @Req() req: RequestWithUser,
  ) {
    return this.acceptConviteAcesso.execute(req.user, body);
  }
}
