import { Global, Module } from '@nestjs/common';
import { ATIVO_DOCUMENTO_REPOSITORY_PORT } from '../../domain/ports/ativo-documento.repository.port';
import { ATIVO_REPOSITORY_PORT } from '../../domain/ports/ativo.repository.port';
import { ORDEM_SERVICO_ANEXO_REPOSITORY_PORT } from '../../domain/ports/ordem-servico-anexo.repository.port';
import { ORDEM_SERVICO_REPOSITORY_PORT } from '../../domain/ports/ordem-servico.repository.port';
import { PECA_REPOSITORY_PORT } from '../../domain/ports/peca.repository.port';
import { UNIDADE_READ_PORT } from '../../domain/ports/unidade-read.port';
import { USUARIO_READ_PORT } from '../../domain/ports/usuario-read.port';
import { PrismaAtivoDocumentoRepository } from './prisma-ativo-documento.repository';
import { PrismaAtivoRepository } from './prisma-ativo.repository';
import { PrismaOrdemServicoAnexoRepository } from './prisma-ordem-servico-anexo.repository';
import { PrismaOrdemServicoRepository } from './prisma-ordem-servico.repository';
import { PrismaPecaRepository } from './prisma-peca.repository';
import { PrismaUnidadeRepository } from './prisma-unidade.repository';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaUnidadeRepository,
    PrismaAtivoRepository,
    PrismaAtivoDocumentoRepository,
    PrismaUsuarioRepository,
    PrismaOrdemServicoRepository,
    PrismaOrdemServicoAnexoRepository,
    PrismaPecaRepository,
    {
      provide: UNIDADE_READ_PORT,
      useExisting: PrismaUnidadeRepository,
    },
    {
      provide: ATIVO_REPOSITORY_PORT,
      useExisting: PrismaAtivoRepository,
    },
    {
      provide: ATIVO_DOCUMENTO_REPOSITORY_PORT,
      useExisting: PrismaAtivoDocumentoRepository,
    },
    {
      provide: USUARIO_READ_PORT,
      useExisting: PrismaUsuarioRepository,
    },
    {
      provide: ORDEM_SERVICO_REPOSITORY_PORT,
      useExisting: PrismaOrdemServicoRepository,
    },
    {
      provide: ORDEM_SERVICO_ANEXO_REPOSITORY_PORT,
      useExisting: PrismaOrdemServicoAnexoRepository,
    },
    {
      provide: PECA_REPOSITORY_PORT,
      useExisting: PrismaPecaRepository,
    },
  ],
  exports: [
    PrismaService,
    UNIDADE_READ_PORT,
    ATIVO_REPOSITORY_PORT,
    ATIVO_DOCUMENTO_REPOSITORY_PORT,
    USUARIO_READ_PORT,
    ORDEM_SERVICO_REPOSITORY_PORT,
    ORDEM_SERVICO_ANEXO_REPOSITORY_PORT,
    PECA_REPOSITORY_PORT,
  ],
})
export class PrismaModule {}
