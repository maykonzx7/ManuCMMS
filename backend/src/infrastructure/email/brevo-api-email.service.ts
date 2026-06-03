import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IEmailPort, SendEmailInput } from '../../domain/ports/email.port';

type BrevoSendResponse = {
  messageId?: string;
};

@Injectable()
export class BrevoApiEmailService implements IEmailPort {
  private readonly logger = new Logger(BrevoApiEmailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.resolveApiKey() && this.resolveFromEmail());
  }

  async send(input: SendEmailInput) {
    const apiKey = this.resolveApiKey();
    const fromEmail = this.resolveFromEmail();
    if (!apiKey || !fromEmail) {
      throw new Error('Brevo API nao configurada.');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          email: fromEmail,
          name: this.resolveFromName(),
        },
        to: [{ email: input.to.trim().toLowerCase() }],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Brevo API respondeu ${response.status}${body ? `: ${body.slice(0, 240)}` : ''}`,
      );
    }

    const payload = (await response.json().catch(() => ({}))) as BrevoSendResponse;
    this.logger.log(
      `Email transacional enviado via Brevo API para ${input.to}${payload.messageId ? ` (${payload.messageId})` : ''}.`,
    );
  }

  async verifyConnection(): Promise<{ ok: boolean; message: string }> {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
      return { ok: false, message: 'BREVO_API_KEY ausente.' };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return {
          ok: false,
          message: `Brevo API invalida (${response.status})${body ? `: ${body.slice(0, 120)}` : ''}`,
        };
      }

      return { ok: true, message: 'Brevo API conectada (HTTPS).' };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao validar Brevo API.',
      };
    }
  }

  private resolveApiKey() {
    return this.firstDefined('BREVO_API_KEY', 'BREVO_API_KEY_V3');
  }

  private resolveFromEmail() {
    return this.firstDefined(
      'BREVO_SMTP_FROM_EMAIL',
      'SMTP_FROM_EMAIL',
      'BREVO_FROM_EMAIL',
    );
  }

  private resolveFromName() {
    return (
      this.firstDefined(
        'BREVO_SMTP_FROM_NAME',
        'SMTP_FROM_NAME',
        'BREVO_FROM_NAME',
      ) ?? 'Equipe ManuCMMS'
    );
  }

  private firstDefined(...keys: string[]) {
    for (const key of keys) {
      const value = this.config.get<string>(key)?.trim();
      if (value) {
        return value;
      }
    }
    return undefined;
  }
}
