import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';
import { signTestJwt } from './sign-test-jwt';

type BootstrapAuthUserResult = {
  token: string;
  authSub: string;
  usuarioId: string;
  unidadeId: string;
  empresaId: string;
};

export async function bootstrapAuthUser(
  prisma: PrismaService,
  options?: {
    perfil?: 'TECNICO' | 'SUPERVISOR' | 'GESTOR' | 'AUDITOR' | 'ADMIN';
  },
): Promise<BootstrapAuthUserResult> {
  const suffix = randomUUID().slice(0, 8);
  const authSub = randomUUID();
  const email = `e2e-${suffix}@manucmms.local`;

  const empresa = await prisma.empresa.create({
    data: {
      nomeEmpresa: `Empresa E2E ${suffix}`,
      slug: `empresa-e2e-${suffix}`,
    },
  });

  const unidade = await prisma.unidadeFabril.create({
    data: {
      empresaId: empresa.id,
      nome: `Matriz E2E ${suffix}`,
      localizacao: 'Recife - PE (e2e)',
    },
  });

  const usuario = await prisma.usuario.create({
    data: {
      authSub,
      email,
      nome: `Usuario E2E ${suffix}`,
      idUnidade: unidade.id,
      perfil: options?.perfil ?? 'ADMIN',
    },
  });

  await prisma.usuarioEmpresa.create({
    data: {
      usuarioId: usuario.id,
      empresaId: empresa.id,
      status: 'ATIVO',
      isResponsavelPrincipal: true,
    },
  });

  const token = signTestJwt({
    sub: authSub,
    email,
  });

  return {
    token,
    authSub,
    usuarioId: usuario.id,
    unidadeId: unidade.id,
    empresaId: empresa.id,
  };
}
