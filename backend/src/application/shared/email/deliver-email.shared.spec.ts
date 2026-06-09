import { deliverTransactionalEmail } from './deliver-email.shared';

describe('deliverTransactionalEmail', () => {
  const payload = {
    to: 'tecnico@test.com',
    subject: 'Teste',
    text: 'Corpo',
  };

  it('prioriza envio direto quando emailPort está configurado', async () => {
    const emailPort = {
      isConfigured: () => true,
      send: jest.fn().mockResolvedValue(undefined),
    };
    const eventPublisher = {
      isConfigured: () => true,
      publishEmailSend: jest.fn(),
    };

    await deliverTransactionalEmail({
      emailPort: emailPort as never,
      eventPublisher: eventPublisher as never,
      payload,
    });

    expect(emailPort.send).toHaveBeenCalledWith(payload);
    expect(eventPublisher.publishEmailSend).not.toHaveBeenCalled();
  });

  it('usa fila quando envio direto falha e RabbitMQ está ativo', async () => {
    const emailPort = {
      isConfigured: () => true,
      send: jest.fn().mockRejectedValue(new Error('smtp down')),
    };
    const eventPublisher = {
      isConfigured: () => true,
      publishEmailSend: jest.fn().mockResolvedValue(true),
    };

    await deliverTransactionalEmail({
      emailPort: emailPort as never,
      eventPublisher: eventPublisher as never,
      payload,
    });

    expect(eventPublisher.publishEmailSend).toHaveBeenCalledWith(payload);
  });

  it('publica na fila quando só RabbitMQ está configurado', async () => {
    const emailPort = {
      isConfigured: () => false,
      send: jest.fn(),
    };
    const eventPublisher = {
      isConfigured: () => true,
      publishEmailSend: jest.fn().mockResolvedValue(true),
    };

    await deliverTransactionalEmail({
      emailPort: emailPort as never,
      eventPublisher: eventPublisher as never,
      payload,
    });

    expect(eventPublisher.publishEmailSend).toHaveBeenCalledWith(payload);
    expect(emailPort.send).not.toHaveBeenCalled();
  });
});
