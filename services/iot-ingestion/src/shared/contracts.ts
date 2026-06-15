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
