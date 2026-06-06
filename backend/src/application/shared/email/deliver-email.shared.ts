import type { IEmailPort, SendEmailInput } from '../../../domain/ports/email.port';
import type { EventPublisherService } from '../../../infrastructure/messaging/event-publisher.service';

export function canDeliverEmail(
  emailPort: IEmailPort,
  eventPublisher: EventPublisherService,
): boolean {
  return eventPublisher.isConfigured() || emailPort.isConfigured();
}

/** Publica na fila quando RabbitMQ está ativo; senão envia direto (fallback). */
export async function deliverTransactionalEmail(input: {
  emailPort: IEmailPort;
  eventPublisher: EventPublisherService;
  payload: SendEmailInput;
}): Promise<void> {
  const { emailPort, eventPublisher, payload } = input;

  if (eventPublisher.isConfigured()) {
    try {
      const published = await eventPublisher.publishEmailSend(payload);
      if (published) return;
    } catch {
      // Fila indisponível — tenta envio direto.
    }
  }

  if (!emailPort.isConfigured()) return;

  try {
    await emailPort.send(payload);
  } catch {
    // Notificação por email é best-effort.
  }
}
