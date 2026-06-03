import { Injectable } from '@nestjs/common';
import type { IEmailPort, SendEmailInput } from '../../domain/ports/email.port';
import { BrevoApiEmailService } from './brevo-api-email.service';
import { SmtpEmailService } from './smtp-email.service';

/**
 * Prefer Brevo HTTP API (porta 443) sobre SMTP.
 * Render free tier bloqueia portas SMTP 25/465/587 — daí o timeout no verify SMTP.
 */
@Injectable()
export class EmailDeliveryService implements IEmailPort {
  constructor(
    private readonly brevoApi: BrevoApiEmailService,
    private readonly smtp: SmtpEmailService,
  ) {}

  isConfigured() {
    return this.brevoApi.isConfigured() || this.smtp.isConfigured();
  }

  async send(input: SendEmailInput) {
    if (this.brevoApi.isConfigured()) {
      return this.brevoApi.send(input);
    }
    return this.smtp.send(input);
  }

  async verifyConnection(): Promise<{ ok: boolean; message: string }> {
    if (this.brevoApi.isConfigured()) {
      return this.brevoApi.verifyConnection();
    }
    if (this.smtp.isConfigured()) {
      return this.smtp.verifyConnection();
    }
    return {
      ok: false,
      message:
        'Email nao configurado. Defina BREVO_API_KEY (Render free) ou SMTP.',
    };
  }

  activeTransport(): 'brevo-api' | 'smtp' | 'none' {
    if (this.brevoApi.isConfigured()) return 'brevo-api';
    if (this.smtp.isConfigured()) return 'smtp';
    return 'none';
  }
}
