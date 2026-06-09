import type {
  OrdemServicoListaItem,
  OrdemServicoParaFechamento,
} from '../../src/domain/entities/ordem-servico';

export const UNIDADE_ID = '7dcb553d-a6af-4ed1-a522-09e153bc8c03';
export const EMPRESA_ID = '53cfa36d-c9f5-4267-a67c-5fca9f95f037';

export function buildUnidade(overrides: Record<string, unknown> = {}) {
  return {
    id: UNIDADE_ID,
    nome: 'Unidade Teste',
    empresaId: EMPRESA_ID,
    empresaSlug: 'empresa-teste',
    slaCorretivaHoras: null,
    slaPreventivaHoras: null,
    slaPreditivaHoras: null,
    ...overrides,
  };
}

export function buildOrdemLista(
  overrides: Partial<OrdemServicoListaItem> = {},
): OrdemServicoListaItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idAtivo: '22222222-2222-4222-8222-222222222222',
    ativoNome: 'Motor A',
    idTecnico: null,
    tipo: 'PREVENTIVA',
    prioridade: 'MEDIA',
    status: 'EM_EXECUCAO',
    descricao: 'Manutenção preventiva',
    fotoAnexo: null,
    fotoProblema: null,
    descricaoProblema: null,
    fotoSolucao: null,
    descricaoSolucao: null,
    dataLimiteSla: null,
    statusSla: 'NO_PRAZO',
    assinaturaDigital: null,
    observacaoCancelamento: null,
    dataAbertura: new Date('2026-06-01T10:00:00Z'),
    dataFechamento: null,
    idCriadoPorUsuario: null,
    criadoPorNome: null,
    idIniciadoPorUsuario: null,
    iniciadoPorNome: null,
    idFinalizadoPorUsuario: null,
    finalizadoPorNome: null,
    transferencias: [],
    ...overrides,
  };
}

export function buildOrdemParaFechamento(
  overrides: Partial<OrdemServicoParaFechamento> = {},
): OrdemServicoParaFechamento {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idAtivo: '22222222-2222-4222-8222-222222222222',
    tipo: 'PREVENTIVA',
    status: 'EM_EXECUCAO',
    ...overrides,
  };
}
