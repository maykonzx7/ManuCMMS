import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { Public } from '../auth/public.decorator';

type ResolveLoginBody = {
  identificador?: string;
  companySlug?: string | null;
};

@Controller('auth')
export class AuthPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('resolve-login')
  async resolveLogin(@Body() body: ResolveLoginBody) {
    const identificador = (body.identificador ?? '').trim().toLowerCase();
    const companySlug = (body.companySlug ?? '').trim().toLowerCase();

    if (!identificador) {
      throw new BadRequestException('Identificador de acesso é obrigatório.');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ email: string }>
    >(Prisma.sql`
      SELECT DISTINCT u.email
      FROM usuario u
      LEFT JOIN usuario_empresa ue ON ue.usuario_id = u.id
      LEFT JOIN empresa e ON e.id = ue.empresa_id
      WHERE (
        lower(u.email) = ${identificador}
        OR lower(COALESCE(u.credencial, '')) = ${identificador}
      )
      AND (${companySlug} = '' OR lower(e.slug) = ${companySlug})
      ORDER BY u.email ASC
      LIMIT 1
    `);

    const email = rows[0]?.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Credenciais inválidas.');
    }

    return { email };
  }
}
