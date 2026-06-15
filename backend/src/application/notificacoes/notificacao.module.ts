import { Global, Module } from '@nestjs/common';
import { NotificacaoService } from '../../application/notificacoes/notificacao.service';
import { RealtimeModule } from '../../infrastructure/realtime/realtime.module';

@Global()
@Module({
  imports: [RealtimeModule],
  providers: [NotificacaoService],
  exports: [NotificacaoService],
})
export class NotificacaoModule {}
