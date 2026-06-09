import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrdemServicoUseCase } from './create-ordem-servico.use-case';
import {
  buildOrdemLista,
  buildUnidade,
  UNIDADE_ID,
} from '../../../test/fixtures/ordem-servico.fixture';

describe('CreateOrdemServicoUseCase (RN-10)', () => {
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const ordens = { create: jest.fn() };
  const unidades = { findById: jest.fn() };
  const ativos = {
    existsInUnidade: jest.fn(),
    getStatusInUnidade: jest.fn(),
  };
  const usuarios = { listByUnidade: jest.fn().mockResolvedValue([]) };
  const emailPort = {};
  const eventPublisher = {};
  const notificacoes = { create: jest.fn(), emitOrdemServicoStatus: jest.fn() };

  const useCase = new CreateOrdemServicoUseCase(
    config as never,
    ordens as never,
    unidades as never,
    ativos as never,
    usuarios as never,
    emailPort as never,
    eventPublisher as never,
    notificacoes as never,
  );

  const bodyBase = {
    idAtivo: '22222222-2222-4222-8222-222222222222',
    tipo: 'PREVENTIVA',
    descricao: 'Troca de filtro',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    unidades.findById.mockResolvedValue(buildUnidade());
    ativos.existsInUnidade.mockResolvedValue(true);
    ativos.getStatusInUnidade.mockResolvedValue('OPERACIONAL');
    ordens.create.mockResolvedValue(buildOrdemLista({ status: 'ABERTA' }));
  });

  it('bloqueia nova OS quando ativo em manutenção (RN-10)', async () => {
    ativos.getStatusInUnidade.mockResolvedValue('MANUTENCAO');

    await expect(
      useCase.execute(UNIDADE_ID, bodyBase, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(ordens.create).not.toHaveBeenCalled();
  });

  it('bloqueia OS para ativo inativo', async () => {
    ativos.getStatusInUnidade.mockResolvedValue('INATIVO');

    await expect(
      useCase.execute(UNIDADE_ID, bodyBase, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita tipo inválido', async () => {
    await expect(
      useCase.execute(
        UNIDADE_ID,
        { ...bodyBase, tipo: 'INVALIDO' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita descrição vazia', async () => {
    await expect(
      useCase.execute(UNIDADE_ID, { ...bodyBase, descricao: '  ' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita ativo inexistente na unidade', async () => {
    ativos.existsInUnidade.mockResolvedValue(false);

    await expect(
      useCase.execute(UNIDADE_ID, bodyBase, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cria OS preventiva com sucesso', async () => {
    const ordem = await useCase.execute(UNIDADE_ID, bodyBase, 'user-1');

    expect(ordem.status).toBe('ABERTA');
    expect(ordens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'PREVENTIVA',
        prioridade: 'MEDIA',
        idUnidade: UNIDADE_ID,
      }),
    );
  });
});
