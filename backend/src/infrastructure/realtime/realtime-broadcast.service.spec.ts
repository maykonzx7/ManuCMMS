import { RealtimeBroadcastService } from './realtime-broadcast.service';

describe('RealtimeBroadcastService', () => {
  it('emite notificacao.nova para room do usuario', () => {
    const service = new RealtimeBroadcastService();
    const emit = jest.fn();
    service.attachServer({
      to: jest.fn().mockReturnValue({ emit }),
    } as never);

    service.emitNotificacaoNova('user-1', {
      id: 'n1',
      tipo: 'info',
      titulo: 'Teste',
      mensagem: 'Msg',
      fotoUrl: null,
      linkPath: null,
      lidaEm: null,
      createdAt: new Date().toISOString(),
    });

    expect(emit).toHaveBeenCalledWith('notificacao.nova', expect.objectContaining({ id: 'n1' }));
  });

  it('emite ordem_servico.status para room da unidade', () => {
    const service = new RealtimeBroadcastService();
    const emit = jest.fn();
    service.attachServer({
      to: jest.fn().mockReturnValue({ emit }),
    } as never);

    service.emitOrdemServicoStatus('unit-1', {
      id: 'os-1',
      idUnidade: 'unit-1',
      status: 'EM_EXECUCAO',
      updatedAt: new Date().toISOString(),
    });

    expect(emit).toHaveBeenCalledWith(
      'ordem_servico.status',
      expect.objectContaining({ id: 'os-1', status: 'EM_EXECUCAO' }),
    );
  });

  it('nao falha quando server nao foi anexado', () => {
    const service = new RealtimeBroadcastService();
    expect(() =>
      service.emitNotificacaoNova('user-1', {
        id: 'n1',
        tipo: 'info',
        titulo: 'Teste',
        mensagem: 'Msg',
        fotoUrl: null,
        linkPath: null,
        lidaEm: null,
        createdAt: new Date().toISOString(),
      }),
    ).not.toThrow();
  });
});
