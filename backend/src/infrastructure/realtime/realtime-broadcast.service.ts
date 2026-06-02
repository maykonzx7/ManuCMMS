import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { NotificacaoView } from '../../application/notificacoes/notificacao.types';

export type OrdemServicoStatusEvent = {
  id: string;
  idUnidade: string;
  status: string;
  tipo?: string;
  prioridade?: string;
  idAtivo?: string;
  idTecnico?: string | null;
  updatedAt: string;
};

@Injectable()
export class RealtimeBroadcastService {
  private readonly logger = new Logger(RealtimeBroadcastService.name);
  private server: Server | null = null;

  attachServer(server: Server): void {
    this.server = server;
  }

  emitNotificacaoNova(usuarioId: string, payload: NotificacaoView): void {
    if (!this.server) return;
    this.server.to(`user:${usuarioId}`).emit('notificacao.nova', payload);
  }

  emitOrdemServicoStatus(
    idUnidade: string,
    payload: OrdemServicoStatusEvent,
  ): void {
    if (!this.server) return;
    this.server
      .to(`unidade:${idUnidade}`)
      .emit('ordem_servico.status', payload);
  }

  logMissingServer(context: string): void {
    if (!this.server) {
      this.logger.debug(`WebSocket indisponível ao emitir ${context}`);
    }
  }
}
