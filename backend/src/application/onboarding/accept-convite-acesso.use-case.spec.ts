import { BadRequestException } from '@nestjs/common';
import { AcceptConviteAcessoUseCase } from './accept-convite-acesso.use-case';

describe('AcceptConviteAcessoUseCase', () => {
  it('bloqueia aceite sem email confirmado no provedor de auth', async () => {
    const prisma = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    } as any;
    const usuarios = {
      findByAuthSub: jest.fn(),
      createBootstrap: jest.fn(),
      ensureAccessContext: jest.fn(),
    } as any;
    const unidades = {
      listByEmpresa: jest.fn(),
    } as any;
    const auditLog = {
      append: jest.fn(),
    } as any;

    const useCase = new AcceptConviteAcessoUseCase(
      prisma,
      usuarios,
      unidades,
      auditLog,
    );

    await expect(
      useCase.execute(
        {
          userId: '9f8bc9ce-c87f-4ab0-b116-962ca2df6160',
          email: 'cliente@empresa.com',
          role: 'authenticated',
          emailConfirmedAt: null,
        },
        { token: '12345678901234567890' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

