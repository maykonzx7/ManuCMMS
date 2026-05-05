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
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_FROM_EMAIL'),
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

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const secure = (this.config.get<string>('SMTP_SECURE') ?? 'false') === 'true';
    const user = this.config.get<string>('SMTP_USER')?.trim() || undefined;
    const pass =
      this.config.get<string>('SMTP_PASSWORD')?.trim() || undefined;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }

  private buildFromAddress() {
    const fromEmail =
      this.config.get<string>('SMTP_FROM_EMAIL')?.trim() ||
      'no-reply@manucmms.local';
    const fromName =
      this.config.get<string>('SMTP_FROM_NAME')?.trim() || 'Equipe ManuCMMS';

    return `"${fromName}" <${fromEmail}>`;
  }
}
