import { Logger } from '@nestjs/common';
import type { IEmailPort, SendEmailInput } from '../../../domain/ports/email.port';
import type { EventPublisherService } from '../../../infrastructure/messaging/event-publisher.service';

const logger = new Logger('deliverTransactionalEmail');

export function canDeliverEmail(
  emailPort: IEmailPort,
  eventPublisher: EventPublisherService,
): boolean {
  return emailPort.isConfigured() || eventPublisher.isConfigured();
}

/**
 * Prioriza envio direto quando o transporte está na API (Brevo/SMTP).
 * Fila RabbitMQ é fallback — evita perder e-mail quando o worker não tem BREVO_API_KEY.
 */
export async function deliverTransactionalEmail(input: {
  emailPort: IEmailPort;
  eventPublisher: EventPublisherService;
  payload: SendEmailInput;
}): Promise<void> {
  const { emailPort, eventPublisher, payload } = input;

  if (emailPort.isConfigured()) {
    try {
      await emailPort.send(payload);
      return;
    } catch (error) {
      logger.warn(
        `Envio direto falhou para ${payload.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (eventPublisher.isConfigured()) {
    try {
      const published = await eventPublisher.publishEmailSend(payload);
      if (published) return;
    } catch (error) {
      logger.warn(
        `Fila de email indisponível: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (!emailPort.isConfigured()) {
    logger.warn(
      `Email não entregue para ${payload.to}: transporte e fila indisponíveis.`,
    );
  }
}
