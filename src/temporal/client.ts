import { randomUUID } from 'crypto';
import { Client, Connection } from '@temporalio/client';
import { config } from '../config';
import { hotelOfferWorkflow } from './workflows';

let client: Client | undefined;

async function getClient(): Promise<Client> {
  if (!client) {
    const connection = await Connection.connect({ address: config.temporalAddress });
    client = new Client({ connection });
  }
  return client;
}

export async function runHotelWorkflow(city: string) {
  const c = await getClient();
  return c.workflow.execute(hotelOfferWorkflow, {
    taskQueue: config.taskQueue,
    workflowId: `hotel-offers-${city}-${randomUUID()}`,
    args: [{ city }],
  });
}
