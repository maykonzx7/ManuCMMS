export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export const EMAIL_PORT = Symbol('EMAIL_PORT');

export interface IEmailPort {
  isConfigured(): boolean;
  send(input: SendEmailInput): Promise<void>;
}
