import { Global, Module } from '@nestjs/common';
import { UNIDADE_READ_PORT } from '../../domain/ports/unidade-read.port';
import { PrismaUnidadeRepository } from './prisma-unidade.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaUnidadeRepository,
    {
      provide: UNIDADE_READ_PORT,
      useExisting: PrismaUnidadeRepository,
    },
  ],
  exports: [PrismaService, UNIDADE_READ_PORT],
})
export class PrismaModule {}
