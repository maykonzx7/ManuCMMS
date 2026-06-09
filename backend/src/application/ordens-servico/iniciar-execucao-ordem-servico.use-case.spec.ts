import { BadRequestException, ConflictException } from '@nestjs/common';
import { IniciarExecucaoOrdemServicoUseCase } from './iniciar-execucao-ordem-servico.use-case';
import {
  buildOrdemLista,
  buildUnidade,
  UNIDADE_ID,
} from '../../../test/fixtures/ordem-servico.fixture';

const MANAGED_URL = '/uploads/ordens-servico/evidencia.jpg';

describe('IniciarExecucaoOrdemServicoUseCase (RN-13)', () => {
  const ordens = {
    findByIdInUnidade: jest.fn(),
    iniciarExecucao: jest.fn(),
    tecnicoTemOsEmExecucao: jest.fn().mockResolvedValue(false),
  };
  const unidades = { findById: jest.fn() };
  const notificacoes = {
    markOrdemServicoAsReadForUsuario: jest.fn(),
    emitOrdemServicoStatus: jest.fn(),
  };
  const managedUpload = {
    isManagedUrl: jest.fn((url: string | null | undefined) =>
      Boolean(url?.startsWith('/uploads/')),
    ),
    deleteIfStored: jest.fn(),
  };

  const useCase = new IniciarExecucaoOrdemServicoUseCase(
    ordens as never,
    unidades as never,
    notificacoes as never,
    managedUpload as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    unidades.findById.mockResolvedValue(buildUnidade());
    ordens.iniciarExecucao.mockResolvedValue(
      buildOrdemLista({ status: 'EM_EXECUCAO' }),
    );
  });

  it('corretiva exige foto e descrição do problema ao iniciar (RN-13)', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ tipo: 'CORRETIVA', status: 'ABERTA' }),
    );

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        'user-1',
        {},
      ),
    ).rejects.toThrow(/RN-13/);

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        'user-1',
        {
          fotoProblema: MANAGED_URL,
        },
      ),
    ).rejects.toThrow(/descricaoProblema/);
  });

  it('rejeita URL externa em fotoProblema', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ tipo: 'CORRETIVA', status: 'ABERTA' }),
    );

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        'user-1',
        {
          fotoProblema: 'https://cdn/p.jpg',
          descricaoProblema: 'Motor superaquecendo',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('inicia corretiva com evidências do problema', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ tipo: 'CORRETIVA', status: 'ABERTA' }),
    );

    await useCase.execute(
      UNIDADE_ID,
      '11111111-1111-4111-8111-111111111111',
      'user-1',
      {
        fotoProblema: MANAGED_URL,
        descricaoProblema: 'Motor superaquecendo',
      },
    );

    expect(ordens.iniciarExecucao).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.any(String),
      UNIDADE_ID,
      'user-1',
      MANAGED_URL,
      'Motor superaquecendo',
    );
  });

  it('bloqueia início quando técnico já tem OS em execução', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({
        tipo: 'PREVENTIVA',
        status: 'ABERTA',
        idTecnico: 'tec-1',
      }),
    );
    ordens.tecnicoTemOsEmExecucao.mockResolvedValue(true);

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        'user-1',
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('bloqueia início de OS aguardando na fila', async () => {
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({ status: 'AGUARDANDO' }),
    );

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        'user-1',
        {},
      ),
    ).rejects.toThrow(/aguardando na fila/);
  });
});
