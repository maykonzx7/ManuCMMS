import { Global, Module } from '@nestjs/common';
import { ATIVO_REPOSITORY_PORT } from '../../domain/ports/ativo.repository.port';
import { ORDEM_SERVICO_REPOSITORY_PORT } from '../../domain/ports/ordem-servico.repository.port';
import { UNIDADE_READ_PORT } from '../../domain/ports/unidade-read.port';
import { USUARIO_READ_PORT } from '../../domain/ports/usuario-read.port';
import { PrismaAtivoRepository } from './prisma-ativo.repository';
import { PrismaOrdemServicoRepository } from './prisma-ordem-servico.repository';
import { PrismaUnidadeRepository } from './prisma-unidade.repository';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaUnidadeRepository,
    PrismaAtivoRepository,
    PrismaUsuarioRepository,
    PrismaOrdemServicoRepository,
    {
      provide: UNIDADE_READ_PORT,
      useExisting: PrismaUnidadeRepository,
    },
    {
      provide: ATIVO_REPOSITORY_PORT,
      useExisting: PrismaAtivoRepository,
    },
    {
      provide: USUARIO_READ_PORT,
      useExisting: PrismaUsuarioRepository,
    },
    {
      provide: ORDEM_SERVICO_REPOSITORY_PORT,
      useExisting: PrismaOrdemServicoRepository,
    },
  ],
  exports: [
    PrismaService,
    UNIDADE_READ_PORT,
    ATIVO_REPOSITORY_PORT,
    USUARIO_READ_PORT,
    ORDEM_SERVICO_REPOSITORY_PORT,
  ],
})
export class PrismaModule {}
