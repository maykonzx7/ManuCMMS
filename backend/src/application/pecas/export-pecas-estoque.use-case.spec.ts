import { BadRequestException } from '@nestjs/common';
import { ExportPecasEstoqueUseCase } from './export-pecas-estoque.use-case';
import { buildUnidade, UNIDADE_ID } from '../../../test/fixtures/ordem-servico.fixture';

describe('ExportPecasEstoqueUseCase', () => {
  const pecas = {
    listByUnidade: jest.fn(),
    listMovimentacoes: jest.fn(),
  };
  const unidades = { findById: jest.fn() };

  const useCase = new ExportPecasEstoqueUseCase(
    pecas as never,
    unidades as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    unidades.findById.mockResolvedValue(buildUnidade({ nome: 'Matriz' }));
    pecas.listByUnidade.mockResolvedValue([
      {
        id: 'p1',
        idUnidade: UNIDADE_ID,
        codigo: 'ROL-001',
        nome: 'Rolamento',
        quantidadeEstoque: 2,
        quantidadeMinima: 5,
      },
    ]);
    pecas.listMovimentacoes.mockResolvedValue([
      {
        pecaId: 'p1',
        pecaCodigo: 'ROL-001',
        pecaNome: 'Rolamento',
        ordemServicoId: 'os-1',
        quantidade: 1,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
    ]);
  });

  it('normaliza formato pdf e csv', () => {
    expect(useCase.normalizeFormato('pdf')).toBe('pdf');
    expect(useCase.normalizeFormato('excel')).toBe('csv');
    expect(() => useCase.normalizeFormato('json')).toThrow(BadRequestException);
  });

  it('gera PDF analitico de estoque', async () => {
    const payload = await useCase.execute(UNIDADE_ID);
    const pdf = useCase.buildPdf(payload);
    expect(pdf.length).toBeGreaterThan(100);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('gera CSV com inventario e movimentacoes', async () => {
    const payload = await useCase.execute(UNIDADE_ID);
    const csv = useCase.buildCsv(payload);
    expect(csv).toContain('ROL-001');
    expect(csv).toContain('INVENTARIO');
    expect(csv).toContain('MOVIMENTACOES');
  });
});
