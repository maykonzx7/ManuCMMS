import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EnsureUsuarioLocalUseCase } from './ensure-usuario-local.use-case';

function buildUsuarioLocal() {
  return {
    id: '49b8fb5f-7130-40f1-870f-e0416c327f95',
    authSub: 'sub-atual',
    idUnidade: '7dcb553d-a6af-4ed1-a522-09e153bc8c03',
    nome: 'Usuario Teste',
    email: 'teste@empresa.com',
    perfil: 'TECNICO',
    empresa: {
      id: '53cfa36d-c9f5-4267-a67c-5fca9f95f037',
      nomeEmpresa: 'Empresa Teste',
      slug: 'empresa-teste',
    },
    cargos: [],
    permissoes: [],
  };
}

function buildCacheMock() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPrefix: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('EnsureUsuarioLocalUseCase', () => {
  it('nao faz auto-vinculo por email quando ALLOW_AUTH_SUB_LINK_BY_EMAIL nao esta ativo', async () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as any;
    const usuarios = {
      findByAuthSub: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn(),
      updateAuthSub: jest.fn(),
      ensureAccessContext: jest.fn(),
    } as any;

    const resolvePlatformOperatorAccess = {
      execute: jest.fn().mockResolvedValue(null),
    } as any;
    const authorizePlatformOperator = {
      isOperator: jest.fn().mockReturnValue(false),
      isProtectedOperatorEmail: jest.fn().mockReturnValue(false),
    } as any;
    const useCase = new EnsureUsuarioLocalUseCase(
      config,
      usuarios,
      resolvePlatformOperatorAccess,
      authorizePlatformOperator,
      buildCacheMock(),
    );

    await expect(
      useCase.execute({
        userId: 'novo-sub',
        email: 'teste@empresa.com',
        role: 'authenticated',
        emailConfirmedAt: '2026-05-10T10:00:00.000Z',
        appMetadata: null,
        userMetadata: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(usuarios.findByEmail).not.toHaveBeenCalled();
    expect(usuarios.updateAuthSub).not.toHaveBeenCalled();
  });

  it('permite auto-vinculo por email quando ALLOW_AUTH_SUB_LINK_BY_EMAIL=true', async () => {
    const local = buildUsuarioLocal();
    const config = {
      get: jest.fn().mockReturnValue('true'),
    } as any;
    const usuarios = {
      findByAuthSub: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...local, authSub: 'novo-sub' }),
      findByEmail: jest.fn().mockResolvedValue(local),
      updateAuthSub: jest.fn().mockResolvedValue(undefined),
      ensureAccessContext: jest.fn().mockResolvedValue(undefined),
    } as any;

    const resolvePlatformOperatorAccess = {
      execute: jest.fn().mockResolvedValue(null),
    } as any;
    const authorizePlatformOperator = {
      isOperator: jest.fn().mockReturnValue(false),
      isProtectedOperatorEmail: jest.fn().mockReturnValue(false),
    } as any;
    const useCase = new EnsureUsuarioLocalUseCase(
      config,
      usuarios,
      resolvePlatformOperatorAccess,
      authorizePlatformOperator,
      buildCacheMock(),
    );
    const result = await useCase.execute({
      userId: 'novo-sub',
      email: 'teste@empresa.com',
      role: 'authenticated',
      emailConfirmedAt: '2026-05-10T10:00:00.000Z',
      appMetadata: null,
      userMetadata: null,
    });

    expect(usuarios.findByEmail).toHaveBeenCalledWith(
      'teste@empresa.com',
      null,
    );
    expect(usuarios.updateAuthSub).toHaveBeenCalledWith(local.id, 'novo-sub');
    expect(result.authSub).toBe('novo-sub');
  });

  it('bloqueia configuracao insegura em producao quando ALLOW_AUTH_SUB_LINK_BY_EMAIL=true', async () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'ALLOW_AUTH_SUB_LINK_BY_EMAIL') return 'true';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    } as any;
    const usuarios = {
      findByAuthSub: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn(),
      updateAuthSub: jest.fn(),
      ensureAccessContext: jest.fn(),
    } as any;

    const resolvePlatformOperatorAccess = {
      execute: jest.fn().mockResolvedValue(null),
    } as any;
    const authorizePlatformOperator = {
      isOperator: jest.fn().mockReturnValue(false),
      isProtectedOperatorEmail: jest.fn().mockReturnValue(false),
    } as any;
    const useCase = new EnsureUsuarioLocalUseCase(
      config,
      usuarios,
      resolvePlatformOperatorAccess,
      authorizePlatformOperator,
      buildCacheMock(),
    );

    await expect(
      useCase.execute({
        userId: 'novo-sub',
        email: 'teste@empresa.com',
        role: 'authenticated',
        emailConfirmedAt: '2026-05-10T10:00:00.000Z',
        appMetadata: null,
        userMetadata: null,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(usuarios.findByEmail).not.toHaveBeenCalled();
  });

  it('bloqueia auto-vinculo por email sem confirmacao de email no auth provider', async () => {
    const config = {
      get: jest.fn().mockReturnValue('true'),
    } as any;
    const usuarios = {
      findByAuthSub: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn(),
      updateAuthSub: jest.fn(),
      ensureAccessContext: jest.fn(),
    } as any;

    const resolvePlatformOperatorAccess = {
      execute: jest.fn().mockResolvedValue(null),
    } as any;
    const authorizePlatformOperator = {
      isOperator: jest.fn().mockReturnValue(false),
      isProtectedOperatorEmail: jest.fn().mockReturnValue(false),
    } as any;
    const useCase = new EnsureUsuarioLocalUseCase(
      config,
      usuarios,
      resolvePlatformOperatorAccess,
      authorizePlatformOperator,
      buildCacheMock(),
    );

    await expect(
      useCase.execute({
        userId: 'novo-sub',
        email: 'teste@empresa.com',
        role: 'authenticated',
        emailConfirmedAt: null,
        appMetadata: null,
        userMetadata: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(usuarios.findByEmail).not.toHaveBeenCalled();
  });
});
