import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailDeliveryService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return this.brevoConfigured() || this.smtpConfigured();
  }

  async send(input: SendEmailInput): Promise<void> {
    if (this.brevoConfigured()) {
      await this.sendBrevoApi(input);
      return;
    }
    if (this.smtpConfigured()) {
      await this.sendSmtp(input);
      return;
    }
    throw new Error('Email não configurado no worker.');
  }

  private brevoConfigured(): boolean {
    return Boolean(this.config.get<string>('BREVO_API_KEY')?.trim());
  }

  private smtpConfigured(): boolean {
    return Boolean(
      this.config.get<string>('SMTP_HOST')?.trim() &&
        this.config.get<string>('SMTP_USER')?.trim(),
    );
  }

  private async sendBrevoApi(input: SendEmailInput): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY')!.trim();
    const fromEmail =
      this.config.get<string>('BREVO_SMTP_FROM_EMAIL')?.trim() ??
      this.config.get<string>('SMTP_FROM_EMAIL')?.trim() ??
      'no-reply@manucmms.local';
    const fromName =
      this.config.get<string>('BREVO_SMTP_FROM_NAME')?.trim() ??
      this.config.get<string>('SMTP_FROM_NAME')?.trim() ??
      'Equipe ManuCMMS';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.text,
        htmlContent: input.html ?? input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo API ${response.status}: ${body.slice(0, 200)}`);
    }
  }

  private async sendSmtp(input: SendEmailInput): Promise<void> {
    const transport = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });

    await transport.sendMail({
      from:
        this.config.get<string>('SMTP_FROM_EMAIL') ?? 'no-reply@manucmms.local',
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text,
    });
  }
}
