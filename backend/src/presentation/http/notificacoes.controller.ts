import { Controller, Delete, Get, Param, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { NotificacaoService } from '../../application/notificacoes/notificacao.service';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly notificacoes: NotificacaoService,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    return this.notificacoes.listByUsuario(req.usuarioLocal!.id);
  }

  @Patch('lidas')
  async markAllAsRead(@Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    await this.notificacoes.markAllAsRead(req.usuarioLocal!.id);
    return { ok: true };
  }

  @Patch('ordem-servico/:ordemServicoId/lidas')
  async markOrdemServicoAsRead(
    @Req() req: Request,
    @Param('ordemServicoId') ordemServicoId: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    await this.notificacoes.markOrdemServicoAsReadForUsuario(
      req.usuarioLocal!.id,
      ordemServicoId,
    );
    return { ok: true };
  }

  @Patch(':notificacaoId/lida')
  async markAsRead(
    @Req() req: Request,
    @Param('notificacaoId') notificacaoId: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    await this.notificacoes.markAsRead(req.usuarioLocal!.id, notificacaoId);
    return { ok: true };
  }

  @Delete(':notificacaoId')
  async remove(
    @Req() req: Request,
    @Param('notificacaoId') notificacaoId: string,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    await this.notificacoes.delete(req.usuarioLocal!.id, notificacaoId);
    return { ok: true };
  }
}
