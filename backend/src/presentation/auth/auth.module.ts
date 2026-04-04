import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { EnsureUsuarioLocalUseCase } from '../../application/iam/ensure-usuario-local.use-case';
import { PrismaModule } from '../../infrastructure/persistence/prisma.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';
import { UsuarioBootstrapGuard } from './usuario-bootstrap.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase-jwt' }),
    PrismaModule,
  ],
  providers: [
    SupabaseJwtStrategy,
    JwtAuthGuard,
    EnsureUsuarioLocalUseCase,
    UsuarioBootstrapGuard,
  ],
  exports: [JwtAuthGuard, UsuarioBootstrapGuard],
})
export class AuthModule {}
