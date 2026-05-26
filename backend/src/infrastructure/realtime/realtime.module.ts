import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../../presentation/auth/auth.module';
import { RealtimeBroadcastService } from './realtime-broadcast.service';
import { RealtimeGateway } from './realtime.gateway';

@Global()
@Module({
  imports: [AuthModule],
  providers: [RealtimeBroadcastService, RealtimeGateway],
  exports: [RealtimeBroadcastService],
})
export class RealtimeModule {}
