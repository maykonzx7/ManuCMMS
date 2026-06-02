import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthorizePlatformOperatorUseCase } from './authorize-platform-operator.use-case';

function buildUser() {
  return {
    userId: 'fdf9f576-99f6-442d-a2e7-43f34e7fe998',
    email: 'owner@manucmms.com',
    role: 'authenticated',
    emailConfirmedAt: '2026-05-16T12:00:00.000Z',
    appMetadata: {},
    userMetadata: {},
  };
}

describe('AuthorizePlatformOperatorUseCase', () => {
  it('permite operador com claim forte em app_metadata', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as any;
    const useCase = new AuthorizePlatformOperatorUseCase(config);

    expect(() =>
      useCase.execute({
        ...buildUser(),
        appMetadata: { platform_owner: true },
      }),
    ).not.toThrow();
  });

  it('bloqueia quando email nao foi confirmado', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as any;
    const useCase = new AuthorizePlatformOperatorUseCase(config);

    expect(() =>
      useCase.execute({
        ...buildUser(),
        emailConfirmedAt: null,
        appMetadata: { platform_owner: true },
      }),
    ).toThrow(ForbiddenException);
  });

  it('permite fallback por email somente quando explicitamente habilitado', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_ALLOW_EMAIL_FALLBACK') return 'true';
        if (key === 'PLATFORM_OWNER_EMAILS')
          return 'owner@manucmms.com,ops@manucmms.com';
        return undefined;
      }),
    } as any;
    const useCase = new AuthorizePlatformOperatorUseCase(config);

    expect(() => useCase.execute(buildUser())).not.toThrow();
  });

  it('falha se fallback estiver desabilitado e claim forte ausente', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_ALLOW_EMAIL_FALLBACK') return 'false';
        return undefined;
      }),
    } as any;
    const useCase = new AuthorizePlatformOperatorUseCase(config);

    expect(() => useCase.execute(buildUser())).toThrow(ForbiddenException);
  });

  it('falha com erro de configuracao quando fallback ativo sem allowlist', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PLATFORM_ALLOW_EMAIL_FALLBACK') return 'true';
        if (key === 'PLATFORM_OWNER_EMAILS') return '';
        return undefined;
      }),
    } as any;
    const useCase = new AuthorizePlatformOperatorUseCase(config);

    expect(() => useCase.execute(buildUser())).toThrow(
      InternalServerErrorException,
    );
  });
});
