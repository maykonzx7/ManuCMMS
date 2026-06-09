import type { ConfigService } from '@nestjs/config';
import type { IEmailPort, SendEmailInput } from '../../../domain/ports/email.port';
import type { EventPublisherService } from '../../../infrastructure/messaging/event-publisher.service';
import { resolveFrontendBaseUrl } from '../frontend-link.shared';
import { resolveOrdemServicoEmailLink } from '../ordem-servico-link.shared';
import { deliverTransactionalEmail } from './deliver-email.shared';

export function resolveOsEmailContext(config: ConfigService) {
  const frontendNgrokBaseUrl = config.get<string>('FRONTEND_NGROK_PUBLIC_BASE_URL');
  const frontendPublicBaseUrl = config.get<string>('FRONTEND_PUBLIC_BASE_URL');
  return {
    frontendBaseUrl: resolveFrontendBaseUrl({
      frontendNgrokBaseUrl,
      frontendPublicBaseUrl,
    }),
    frontendNgrokBaseUrl,
    frontendPublicBaseUrl,
  };
}

export function resolveOsLink(
  config: ConfigService,
  ordemId: string,
): string | null {
  const ctx = resolveOsEmailContext(config);
  return resolveOrdemServicoEmailLink({
    frontendNgrokBaseUrl: ctx.frontendNgrokBaseUrl,
    frontendPublicBaseUrl: ctx.frontendPublicBaseUrl,
    ordemId,
  });
}

export async function sendOsTransactionalEmail(input: {
  config: ConfigService;
  emailPort: IEmailPort;
  eventPublisher: EventPublisherService;
  payload: SendEmailInput;
}): Promise<void> {
  await deliverTransactionalEmail({
    emailPort: input.emailPort,
    eventPublisher: input.eventPublisher,
    payload: input.payload,
  });
}
