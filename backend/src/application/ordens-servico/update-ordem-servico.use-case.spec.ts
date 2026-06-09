import { BadRequestException } from '@nestjs/common';
import { UpdateOrdemServicoUseCase } from './update-ordem-servico.use-case';
import {
  buildOrdemLista,
  buildUnidade,
  UNIDADE_ID,
} from '../../../test/fixtures/ordem-servico.fixture';

describe('UpdateOrdemServicoUseCase (RN-15)', () => {
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const ordens = {
    findByIdInUnidade: jest.fn(),
    updateDados: jest.fn(),
    tecnicoTemOsEmExecucao: jest.fn().mockResolvedValue(false),
    promoverProximaFilaTecnico: jest.fn().mockResolvedValue(null),
  };
  const unidades = { findById: jest.fn() };
  const usuarios = { findByIdInUnidade: jest.fn() };
  const emailPort = {};
  const eventPublisher = {};
  const notificacoes = { create: jest.fn(), emitOrdemServicoStatus: jest.fn() };

  const useCase = new UpdateOrdemServicoUseCase(
    config as never,
    ordens as never,
    unidades as never,
    usuarios as never,
    emailPort as never,
    eventPublisher as never,
    notificacoes as never,
  );

  const osId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    unidades.findById.mockResolvedValue(buildUnidade());
    ordens.updateDados.mockImplementation(async (input) =>
      buildOrdemLista({ ...input, descricao: input.descricao ?? 'x' }),
    );
  });

  it('técnico não pode editar OS concluída (RN-15)', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ status: 'CONCLUIDA' }),
    );

    await expect(
      useCase.execute(
        UNIDADE_ID,
        osId,
        { descricao: 'Ajuste pós-fechamento' },
        'tec-1',
        'TECNICO',
      ),
    ).rejects.toThrow(/RN-15/);
  });

  it('gestor pode editar descrição de OS concluída', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ status: 'CONCLUIDA' }),
    );

    await useCase.execute(
      UNIDADE_ID,
      osId,
      { descricao: 'Correção de registro' },
      'gestor-1',
      'GESTOR',
    );

    expect(ordens.updateDados).toHaveBeenCalled();
  });

  it('não permite transferir técnico em OS concluída (RN-15)', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ status: 'CONCLUIDA', idTecnico: 'tec-1' }),
    );
    usuarios.findByIdInUnidade.mockResolvedValue({
      id: 'tec-2',
      nome: 'Técnico B',
      perfil: 'TECNICO',
      email: 'b@test.com',
    });

    await expect(
      useCase.execute(
        UNIDADE_ID,
        osId,
        { idTecnico: 'tec-2', motivoTransferencia: 'Reatribuição pós-auditoria' },
        'gestor-1',
        'GESTOR',
      ),
    ).rejects.toThrow(/RN-15/);
  });

  it('OS cancelada não pode ser alterada', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ status: 'CANCELADA' }),
    );

    await expect(
      useCase.execute(
        UNIDADE_ID,
        osId,
        { descricao: 'Tentativa inválida' },
        'gestor-1',
        'GESTOR',
      ),
    ).rejects.toThrow(/cancelada/);
  });
});
