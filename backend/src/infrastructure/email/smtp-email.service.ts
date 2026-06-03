import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { IEmailPort, SendEmailInput } from '../../domain/ports/email.port';

@Injectable()
export class SmtpEmailService implements IEmailPort {
  private readonly logger = new Logger(SmtpEmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    const host = this.resolveSmtpHost();
    const fromEmail = this.resolveSmtpFromEmail();
    return Boolean(
      host && fromEmail && this.resolveSmtpUser() && this.resolveSmtpPassword(),
    );
  }

  async send(input: SendEmailInput) {
    if (!this.isConfigured()) {
      throw new Error('Servico SMTP nao configurado.');
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.buildFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    this.logger.log(`Email transacional enviado para ${input.to}.`);
  }

  async verifyConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { ok: false, message: 'SMTP nao configurado.' };
    }

    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { ok: true, message: 'SMTP validado com sucesso.' };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Falha ao validar SMTP.',
      };
    }
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.resolveSmtpHost();
    const port = this.resolveSmtpPort();
    const secure = this.resolveSmtpSecure();
    const user = this.resolveSmtpUser();
    const pass = this.resolveSmtpPassword();

    if (!host || !user || !pass) {
      throw new Error('Configuracao SMTP incompleta para envio de email.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    });

    return this.transporter;
  }

  private buildFromAddress() {
    const fromEmail = this.resolveSmtpFromEmail() || 'no-reply@manucmms.local';
    const fromName = this.resolveSmtpFromName() || 'Equipe ManuCMMS';

    return `"${fromName}" <${fromEmail}>`;
  }

  private resolveSmtpProvider() {
    return (this.config.get<string>('SMTP_PROVIDER') ?? '')
      .trim()
      .toUpperCase();
  }

  private resolveSmtpHost() {
    const host = this.firstDefinedByProvider('SMTP_HOST', 'BREVO_SMTP_HOST');
    if (host) {
      return host;
    }

    if (this.resolveSmtpProvider() === 'BREVO') {
      return 'smtp-relay.brevo.com';
    }

    return undefined;
  }

  private resolveSmtpPort() {
    const portRaw = this.firstDefinedByProvider('SMTP_PORT', 'BREVO_SMTP_PORT');
    if (!portRaw && this.resolveSmtpProvider() === 'BREVO') {
      return 587;
    }

    const parsedPort = Number(portRaw ?? '587');
    return Number.isFinite(parsedPort) ? parsedPort : 587;
  }

  private resolveSmtpSecure() {
    const secureRaw = this.firstDefinedByProvider(
      'SMTP_SECURE',
      'BREVO_SMTP_SECURE',
    );
    if (!secureRaw && this.resolveSmtpProvider() === 'BREVO') {
      return false;
    }

    return secureRaw === 'true';
  }

  private resolveSmtpUser() {
    return this.firstDefinedByProvider('SMTP_USER', 'BREVO_SMTP_LOGIN');
  }

  private resolveSmtpPassword() {
    return this.firstDefinedByProvider('SMTP_PASSWORD', 'BREVO_SMTP_KEY');
  }

  private resolveSmtpFromEmail() {
    return this.firstDefinedByProvider(
      'SMTP_FROM_EMAIL',
      'BREVO_SMTP_FROM_EMAIL',
    );
  }

  private resolveSmtpFromName() {
    return this.firstDefinedByProvider(
      'SMTP_FROM_NAME',
      'BREVO_SMTP_FROM_NAME',
    );
  }

  private firstDefinedByProvider(defaultKey: string, brevoKey: string) {
    if (this.resolveSmtpProvider() === 'BREVO') {
      return this.firstDefined(brevoKey, defaultKey);
    }

    return this.firstDefined(defaultKey, brevoKey);
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
