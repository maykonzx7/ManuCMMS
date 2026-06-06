import * as amqp from 'amqplib';
import { MESSAGING } from '../../contracts/src/index';
export { MESSAGING };
export type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
export declare function connectAmqp(url: string): Promise<AmqpConnection>;
export declare function setupTopology(channel: amqp.Channel): Promise<void>;
export declare function publishEvent<T extends Record<string, unknown>>(channel: amqp.Channel, routingKey: string, payload: T): Promise<void>;
export type MessageHandler = (payload: Record<string, unknown>, raw: amqp.ConsumeMessage) => Promise<void>;
export declare function consumeQueue(channel: amqp.Channel, queue: string, handler: MessageHandler): Promise<void>;
