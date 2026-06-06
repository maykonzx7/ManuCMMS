"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGING = void 0;
exports.MESSAGING = {
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
};
//# sourceMappingURL=index.js.map