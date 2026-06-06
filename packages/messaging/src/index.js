"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGING = void 0;
exports.connectAmqp = connectAmqp;
exports.setupTopology = setupTopology;
exports.publishEvent = publishEvent;
exports.consumeQueue = consumeQueue;
const amqp = __importStar(require("amqplib"));
const index_1 = require("../../contracts/src/index");
Object.defineProperty(exports, "MESSAGING", { enumerable: true, get: function () { return index_1.MESSAGING; } });
async function connectAmqp(url) {
    return amqp.connect(url, { timeout: 5000 });
}
async function setupTopology(channel) {
    await channel.assertExchange(index_1.MESSAGING.exchange, 'topic', { durable: true });
    const bindings = [
        {
            queue: index_1.MESSAGING.queues.webhookDeliver,
            key: index_1.MESSAGING.routingKeys.webhookDeliver,
        },
        {
            queue: index_1.MESSAGING.queues.emailSend,
            key: index_1.MESSAGING.routingKeys.emailSend,
        },
        {
            queue: index_1.MESSAGING.queues.osPreditiva,
            key: index_1.MESSAGING.routingKeys.osPreditiva,
        },
    ];
    for (const { queue, key } of bindings) {
        await channel.assertQueue(queue, { durable: true });
        await channel.bindQueue(queue, index_1.MESSAGING.exchange, key);
    }
}
async function publishEvent(channel, routingKey, payload) {
    const body = Buffer.from(JSON.stringify(payload));
    channel.publish(index_1.MESSAGING.exchange, routingKey, body, {
        persistent: true,
        contentType: 'application/json',
    });
}
async function consumeQueue(channel, queue, handler) {
    await channel.prefetch(10);
    await channel.consume(queue, (message) => {
        if (!message)
            return;
        void (async () => {
            try {
                const payload = JSON.parse(message.content.toString('utf8'));
                await handler(payload, message);
                channel.ack(message);
            }
            catch (error) {
                const requeue = !message.fields.redelivered;
                channel.nack(message, false, requeue);
                console.error(`[messaging] falha ao processar ${queue}:`, error);
            }
        })();
    });
}
//# sourceMappingURL=index.js.map