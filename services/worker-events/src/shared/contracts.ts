export const MESSAGING = {
  exchange: 'manucmms.events',
  queues: {
    webhookDeliver: 'manucmms.webhook.deliver',
    emailSend: 'manucmms.email.send',
    osPreditiva: 'manucmms.os.preditiva',
    osPreditivaCriada: 'manucmms.os.preditiva.created',
  },
  routingKeys: {
    webhookDeliver: 'webhook.deliver',
    emailSend: 'email.send',
    osPreditiva: 'os.preditiva.create',
    osPreditivaCriada: 'os.preditiva.created',
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

export type OsPreditivaCriadaEvent = {
  version: 1;
  osId: string;
  ativoId: string;
  ativoNome: string;
  idUnidade: string;
  empresaId: string;
  idTecnico: string | null;
  status: 'ABERTA' | 'AGUARDANDO';
  origem: 'IOT' | 'SIMULACAO';
  correlationId?: string;
};
