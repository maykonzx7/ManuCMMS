import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from './infrastructure/audit/audit.module';
import { EmailModule } from './infrastructure/email/email.module';
import { SupabaseAdminService } from './infrastructure/auth/supabase-admin.service';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
import { IntegracaoModule } from './infrastructure/integracao/integracao.module';
import { MessagingModule } from './infrastructure/messaging/messaging.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { AuthModule } from './presentation/auth/auth.module';
import { JwtAuthGuard } from './presentation/auth/jwt-auth.guard';
import { ApiKeyGuard } from './presentation/auth/api-key.guard';
import { UsuarioBootstrapGuard } from './presentation/auth/usuario-bootstrap.guard';
import { PresentationModule } from './presentation/presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    AuditModule,
    EmailModule,
    IntegracaoModule,
    MessagingModule,
    RealtimeModule,
    PrismaModule,
    AuthModule,
    PresentationModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: ApiKeyGuard },
    { provide: APP_GUARD, useExisting: UsuarioBootstrapGuard },
  ],
})
export class AppModule {}
