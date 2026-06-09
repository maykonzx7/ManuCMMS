import { BadRequestException } from '@nestjs/common';
import { FecharOrdemServicoUseCase } from './fechar-ordem-servico.use-case';
import {
  buildOrdemLista,
  buildOrdemParaFechamento,
  buildUnidade,
  UNIDADE_ID,
} from '../../../test/fixtures/ordem-servico.fixture';

const MANAGED_FOTO = '/uploads/ordens-servico/foto.jpg';
const MANAGED_PROBLEMA = '/uploads/ordens-servico/problema.jpg';
const MANAGED_SOLUCAO = '/uploads/ordens-servico/solucao.jpg';

describe('FecharOrdemServicoUseCase (RN-02, RN-07, RN-13)', () => {
  const ordens = {
    findParaFechamento: jest.fn(),
    findByIdInUnidade: jest.fn(),
    fecharComEvidencias: jest.fn(),
    promoverProximaFilaTecnico: jest.fn().mockResolvedValue(null),
  };
  const unidades = { findById: jest.fn() };
  const usuarios = { listByUnidade: jest.fn().mockResolvedValue([]) };
  const notificacoes = {
    create: jest.fn(),
    emitOrdemServicoStatus: jest.fn(),
  };
  const integracaoWebhook = { enqueueOrdemServicoConcluida: jest.fn() };
  const emailPort = { isConfigured: () => false, send: jest.fn() };
  const eventPublisher = {
    isConfigured: () => false,
    publishEmailSend: jest.fn(),
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const managedUpload = {
    isManagedUrl: jest.fn((url: string | null | undefined) =>
      Boolean(url?.startsWith('/uploads/')),
    ),
    deleteIfStored: jest.fn(),
  };

  const useCase = new FecharOrdemServicoUseCase(
    ordens as never,
    unidades as never,
    usuarios as never,
    notificacoes as never,
    integracaoWebhook as never,
    emailPort as never,
    eventPublisher as never,
    config as never,
    managedUpload as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    unidades.findById.mockResolvedValue(buildUnidade());
    ordens.findParaFechamento.mockResolvedValue(
      buildOrdemParaFechamento({ tipo: 'PREVENTIVA' }),
    );
    ordens.findByIdInUnidade.mockResolvedValue(buildOrdemLista());
    ordens.fecharComEvidencias.mockResolvedValue(
      buildOrdemLista({ status: 'CONCLUIDA' }),
    );
  });

  it('exige assinatura digital (RN-02)', async () => {
    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        {
          descricaoSolucao: 'Serviço concluído',
          fotoAnexo: MANAGED_FOTO,
        },
        'user-1',
      ),
    ).rejects.toThrow(/RN-02/);
  });

  it('exige descricaoSolucao', async () => {
    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        { assinaturaDigital: 'data:image/png;base64,abc' },
        'user-1',
      ),
    ).rejects.toThrow(/descricaoSolucao/);
  });

  it('preventiva exige fotoAnexo (RN-02)', async () => {
    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        {
          descricaoSolucao: 'OK',
          assinaturaDigital: 'data:image/png;base64,abc',
        },
        'user-1',
      ),
    ).rejects.toThrow(/fotoAnexo/);
  });

  it('rejeita URL externa em fotoAnexo', async () => {
    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        {
          descricaoSolucao: 'OK',
          assinaturaDigital: 'data:image/png;base64,abc',
          fotoAnexo: 'https://cdn/foto.jpg',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('corretiva exige evidências de problema e solução (RN-13)', async () => {
    ordens.findParaFechamento.mockResolvedValue(
      buildOrdemParaFechamento({ tipo: 'CORRETIVA' }),
    );

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        {
          descricaoSolucao: 'Corrigido',
          assinaturaDigital: 'data:image/png;base64,abc',
        },
        'user-1',
      ),
    ).rejects.toThrow(/RN-13/);
  });

  it('valida pecasConsumidas (RN-07)', async () => {
    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        {
          descricaoSolucao: 'OK',
          assinaturaDigital: 'data:image/png;base64,abc',
          fotoAnexo: MANAGED_FOTO,
          pecasConsumidas: [{ pecaId: '', quantidade: 1 }],
        },
        'user-1',
      ),
    ).rejects.toThrow(/pecaId/);

    await expect(
      useCase.execute(
        UNIDADE_ID,
        '11111111-1111-4111-8111-111111111111',
        {
          descricaoSolucao: 'OK',
          assinaturaDigital: 'data:image/png;base64,abc',
          fotoAnexo: MANAGED_FOTO,
          pecasConsumidas: [{ pecaId: 'peca-1', quantidade: 0 }],
        },
        'user-1',
      ),
    ).rejects.toThrow(/quantidade/);
  });

  it('fecha preventiva com evidências válidas', async () => {
    const result = await useCase.execute(
      UNIDADE_ID,
      '11111111-1111-4111-8111-111111111111',
      {
        descricaoSolucao: 'Preventiva concluída',
        assinaturaDigital: 'data:image/png;base64,abc',
        fotoAnexo: MANAGED_FOTO,
        pecasConsumidas: [{ pecaId: 'peca-1', quantidade: 2 }],
      },
      'user-1',
    );

    expect(result.status).toBe('CONCLUIDA');
    expect(ordens.fecharComEvidencias).toHaveBeenCalledWith(
      expect.objectContaining({
        assinaturaDigital: 'data:image/png;base64,abc',
        pecasConsumidas: [{ pecaId: 'peca-1', quantidade: 2 }],
      }),
    );
    expect(integracaoWebhook.enqueueOrdemServicoConcluida).toHaveBeenCalled();
  });

  it('fecha corretiva com todas as evidências', async () => {
    ordens.findParaFechamento.mockResolvedValue(
      buildOrdemParaFechamento({ tipo: 'CORRETIVA' }),
    );
    ordens.findByIdInUnidade.mockResolvedValue(
      buildOrdemLista({
        tipo: 'CORRETIVA',
        fotoProblema: MANAGED_PROBLEMA,
        descricaoProblema: 'Vazamento',
      }),
    );

    await useCase.execute(
      UNIDADE_ID,
      '11111111-1111-4111-8111-111111111111',
      {
        descricaoSolucao: 'Vedação trocada',
        assinaturaDigital: 'data:image/png;base64,abc',
        fotoSolucao: MANAGED_SOLUCAO,
      },
      'user-1',
    );

    expect(ordens.fecharComEvidencias).toHaveBeenCalledWith(
      expect.objectContaining({
        fotoProblema: MANAGED_PROBLEMA,
        fotoSolucao: MANAGED_SOLUCAO,
      }),
    );
  });
});
