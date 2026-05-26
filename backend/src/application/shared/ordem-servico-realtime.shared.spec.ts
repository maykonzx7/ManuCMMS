import { publishOrdemServicoStatus } from './ordem-servico-realtime.shared';

describe('publishOrdemServicoStatus', () => {
  it('encaminha payload para NotificacaoService.emitOrdemServicoStatus', () => {
    const emitOrdemServicoStatus = jest.fn();
    const notificacoes = { emitOrdemServicoStatus } as never;

    publishOrdemServicoStatus(notificacoes, 'unit-1', {
      id: 'os-1',
      status: 'CONCLUIDA',
      tipo: 'PREVENTIVA',
      prioridade: 'ALTA',
      idAtivo: 'ativo-1',
      idTecnico: 'tec-1',
    });

    expect(emitOrdemServicoStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'os-1',
        idUnidade: 'unit-1',
        status: 'CONCLUIDA',
        tipo: 'PREVENTIVA',
        prioridade: 'ALTA',
        idAtivo: 'ativo-1',
        idTecnico: 'tec-1',
      }),
    );
  });
});
