import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from './infrastructure/audit/audit.module';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
import { AuthModule } from './presentation/auth/auth.module';
import { JwtAuthGuard } from './presentation/auth/jwt-auth.guard';
import { UsuarioBootstrapGuard } from './presentation/auth/usuario-bootstrap.guard';
import { PresentationModule } from './presentation/presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    AuditModule,
    PrismaModule,
    AuthModule,
    PresentationModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: UsuarioBootstrapGuard },
  ],
})
export class AppModule {}
