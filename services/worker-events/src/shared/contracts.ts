export const MESSAGING = {
  exchange: 'manucmms.events',
  queues: {
    webhookDeliver: 'manucmms.webhook.deliver',
    emailSend: 'manucmms.email.send',
    osPreditiva: 'manucmms.os.preditiva',
  },
  routingKeys: {
    webhookDeliver: 'webhook.deliver',
    emailSend: 'email.send',
    osPreditiva: 'os.preditiva.create',
  },
} as const;

export type WebhookDeliverEvent = {
  version: 1;
  eventoId: string;
  empresaId: string;
  webhookUrl: string;
  payload: Record<string, unknown>;
  correlationId?: string;
};

export type EmailSendEvent = {
  version: 1;
  to: string;
  subject: string;
  text: string;
  html?: string;
  correlationId?: string;
};

export type CriarOSPreditivaEvent = {
  version: 1;
  ativoId: string;
  idUnidade: string;
  empresaId: string;
  valorLeitura: number;
  limiteTemp: number;
  motivo: string;
  origem: 'IOT' | 'SIMULACAO';
  correlationId?: string;
};
