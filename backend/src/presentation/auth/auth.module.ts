import { Module } from '@nestjs/common';
import { EnsureUsuarioLocalUseCase } from '../../application/iam/ensure-usuario-local.use-case';
import { PrismaModule } from '../../infrastructure/persistence/prisma.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseAuthService } from './supabase-auth.service';
import { UsuarioBootstrapGuard } from './usuario-bootstrap.guard';

@Module({
  imports: [PrismaModule],
  providers: [
    SupabaseAuthService,
    JwtAuthGuard,
    EnsureUsuarioLocalUseCase,
    UsuarioBootstrapGuard,
  ],
  exports: [JwtAuthGuard, UsuarioBootstrapGuard],
})
export class AuthModule {}
