export declare const MESSAGING: {
    readonly exchange: "manucmms.events";
    readonly queues: {
        readonly webhookDeliver: "manucmms.webhook.deliver";
        readonly emailSend: "manucmms.email.send";
        readonly osPreditiva: "manucmms.os.preditiva";
        readonly osPreditivaCriada: "manucmms.os.preditiva.created";
    };
    readonly routingKeys: {
        readonly webhookDeliver: "webhook.deliver";
        readonly emailSend: "email.send";
        readonly osPreditiva: "os.preditiva.create";
        readonly osPreditivaCriada: "os.preditiva.created";
    };
};
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
export type TelemetryReadingEvent = {
    version: 1;
    ativoId: string;
    valor: number;
    timestamp: string;
    origem: 'IOT' | 'SIMULACAO';
    correlationId?: string;
};
export type ManuCmmSEvent = WebhookDeliverEvent | EmailSendEvent | CriarOSPreditivaEvent | TelemetryReadingEvent;
