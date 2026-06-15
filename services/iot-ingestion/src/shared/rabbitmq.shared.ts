import * as amqp from 'amqplib';
import { MESSAGING } from './contracts';

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

export async function publishEvent<T extends Record<string, unknown>>(
  channel: amqp.Channel,
  routingKey: string,
  payload: T,
): Promise<void> {
  const body = Buffer.from(JSON.stringify(payload));
  channel.publish(MESSAGING.exchange, routingKey, body, {
    persistent: true,
    contentType: 'application/json',
  });
}
