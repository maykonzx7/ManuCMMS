import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { EnsureUsuarioLocalUseCase } from '../../application/iam/ensure-usuario-local.use-case';
import { SupabaseAuthService } from '../../presentation/auth/supabase-auth.service';
import { RealtimeBroadcastService } from './realtime-broadcast.service';

type RealtimeSocketData = {
  usuarioId?: string;
  unidadeId?: string;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly supabaseAuth: SupabaseAuthService,
    private readonly ensureUsuarioLocal: EnsureUsuarioLocalUseCase,
    private readonly broadcast: RealtimeBroadcastService,
  ) {}

  afterInit(server: Server): void {
    this.broadcast.attachServer(server);
  }

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const data = client.data as RealtimeSocketData;
    try {
      const rawToken =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      const token = rawToken?.startsWith('Bearer ')
        ? rawToken.slice('Bearer '.length)
        : rawToken;

      if (!token?.trim()) {
        client.disconnect(true);
        return;
      }

      const authUser = await this.supabaseAuth.validateAccessToken(
        token.trim(),
      );
      const companySlug =
        (client.handshake.auth?.companySlug as string | undefined)?.trim() ||
        (client.handshake.query?.companySlug as string | undefined)?.trim() ||
        null;

      const usuario = await this.ensureUsuarioLocal.execute(authUser, {
        preferredEmpresaSlug: companySlug,
      });

      data.usuarioId = usuario.id;
      data.unidadeId = usuario.idUnidade;

      await client.join(`user:${usuario.id}`);
      await client.join(`unidade:${usuario.idUnidade}`);

      client.emit('realtime.ready', {
        usuarioId: usuario.id,
        unidadeId: usuario.idUnidade,
      });
    } catch (error) {
      this.logger.warn(
        `Conexão WebSocket rejeitada: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const data = client.data as RealtimeSocketData;
    if (data.usuarioId) {
      void client.leave(`user:${data.usuarioId}`);
    }
    if (data.unidadeId) {
      void client.leave(`unidade:${data.unidadeId}`);
    }
  }
}
