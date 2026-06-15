import * as amqp from 'amqplib';
import { MESSAGING } from './contracts';

export type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export async function connectAmqp(url: string): Promise<AmqpConnection> {
  return amqp.connect(url, { timeout: 5000 });
}

export async function setupTopology(channel: amqp.Channel): Promise<void> {
  await channel.assertExchange(MESSAGING.exchange, 'topic', { durable: true });

  const bindings: Array<{ queue: string; key: string }> = [
    {
      queue: MESSAGING.queues.webhookDeliver,
      key: MESSAGING.routingKeys.webhookDeliver,
    },
    {
      queue: MESSAGING.queues.emailSend,
      key: MESSAGING.routingKeys.emailSend,
    },
    {
      queue: MESSAGING.queues.osPreditiva,
      key: MESSAGING.routingKeys.osPreditiva,
    },
    {
      queue: MESSAGING.queues.osPreditivaCriada,
      key: MESSAGING.routingKeys.osPreditivaCriada,
    },
  ];

  for (const { queue, key } of bindings) {
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, MESSAGING.exchange, key);
  }
}

export type MessageHandler = (
  payload: Record<string, unknown>,
  raw: amqp.ConsumeMessage,
) => Promise<void>;

export async function consumeQueue(
  channel: amqp.Channel,
  queue: string,
  handler: MessageHandler,
): Promise<void> {
  await channel.prefetch(10);
  await channel.consume(queue, (message: amqp.ConsumeMessage | null) => {
    if (!message) return;

    void (async () => {
      try {
        const payload = JSON.parse(
          message.content.toString('utf8'),
        ) as Record<string, unknown>;
        await handler(payload, message);
        channel.ack(message);
      } catch (error) {
        const requeue = !message.fields.redelivered;
        channel.nack(message, false, requeue);
        console.error(`[messaging] falha ao processar ${queue}:`, error);
      }
    })();
  });
}
