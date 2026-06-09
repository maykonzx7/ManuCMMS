import { ForbiddenException } from '@nestjs/common';
import { EnforceUnidadeScopeUseCase } from './enforce-unidade-scope.use-case';

describe('EnforceUnidadeScopeUseCase (RN-08)', () => {
  const unidades = { findById: jest.fn() };
  const useCase = new EnforceUnidadeScopeUseCase(unidades as never);

  const usuario = {
    id: 'user-1',
    idUnidade: 'unidade-a',
    cargos: [],
    empresa: { id: 'empresa-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('nega acesso sem contexto de unidade', async () => {
    await expect(
      useCase.execute(undefined, 'unidade-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('nega acesso a unidade fora do escopo do usuário', async () => {
    unidades.findById.mockResolvedValue({
      id: 'unidade-b',
      empresaId: 'empresa-1',
    });

    await expect(
      useCase.execute(usuario as never, 'unidade-b'),
    ).rejects.toThrow(/nao pertence ao contexto/);
  });

  it('permite acesso à própria unidade', async () => {
    unidades.findById.mockResolvedValue({
      id: 'unidade-a',
      empresaId: 'empresa-1',
    });

    await expect(
      useCase.execute(usuario as never, 'unidade-a'),
    ).resolves.toBeUndefined();
  });

  it('nega unidade de outra empresa', async () => {
    unidades.findById.mockResolvedValue({
      id: 'unidade-a',
      empresaId: 'empresa-outra',
    });

    await expect(
      useCase.execute(usuario as never, 'unidade-a'),
    ).rejects.toThrow(/outra empresa/);
  });

  it('permite gestor acessar outra unidade da mesma empresa', async () => {
    unidades.findById.mockResolvedValue({
      id: 'unidade-b',
      empresaId: 'empresa-1',
    });

    await expect(
      useCase.execute(
        { ...usuario, perfil: 'GESTOR' } as never,
        'unidade-b',
      ),
    ).resolves.toBeUndefined();
  });

  it('permite escopo corporativo (cargo sem unidade)', async () => {
    unidades.findById.mockResolvedValue({
      id: 'unidade-b',
      empresaId: 'empresa-1',
    });

    await expect(
      useCase.execute(
        {
          ...usuario,
          idUnidade: 'unidade-a',
          cargos: [{ idUnidade: null }],
        } as never,
        'unidade-b',
      ),
    ).resolves.toBeUndefined();
  });
});
