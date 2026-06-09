import { BadRequestException } from '@nestjs/common';
import { CancelarOrdemServicoUseCase } from './cancelar-ordem-servico.use-case';
import {
  buildOrdemLista,
  buildUnidade,
  UNIDADE_ID,
} from '../../../test/fixtures/ordem-servico.fixture';

describe('CancelarOrdemServicoUseCase', () => {
  const ordens = {
    findByIdInUnidade: jest.fn(),
    cancelar: jest.fn(),
  };
  const unidades = { findById: jest.fn() };
  const notificacoes = { emitOrdemServicoStatus: jest.fn() };

  const useCase = new CancelarOrdemServicoUseCase(
    ordens as never,
    unidades as never,
    notificacoes as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    unidades.findById.mockResolvedValue(buildUnidade());
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ status: 'ABERTA' }),
    );
    ordens.cancelar.mockResolvedValue(
      buildOrdemLista({ status: 'CANCELADA' }),
    );
  });

  it('só cancela OS ABERTA', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ status: 'EM_EXECUCAO' }),
    );

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        { observacaoCancelamento: 'Motivo válido com mais de vinte caracteres.' },
        'user-1',
      ),
    ).rejects.toThrow(/ABERTA/);
  });

  it('exige observação com no mínimo 20 caracteres', async () => {
    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        { observacaoCancelamento: 'curto' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancela OS aberta com observação válida', async () => {
    const result = await useCase.execute(
      UNIDADE_ID,
      '11111111-1111-4111-8111-111111111111',
      {
        observacaoCancelamento:
          'Equipamento substituído — OS não será mais necessária.',
      },
      'user-1',
    );

    expect(result.status).toBe('CANCELADA');
    expect(ordens.cancelar).toHaveBeenCalled();
  });
});
