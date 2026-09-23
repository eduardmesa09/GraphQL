import { PubSub } from "graphql-subscriptions";

export const pubsub = new PubSub();

/** Un canal por orden: un suscriptor solo recibe lo suyo. */
export const orderTopic = (orderId: string) => `ORDER_CHANGED:${orderId}`;
