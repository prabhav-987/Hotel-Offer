import { ApplicationFailure, log, proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import { pickBestOffers } from './dedupe';
import type { Hotel } from '../types';

const { fetchSupplierHotels, saveHotelsToRedis } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    maximumAttempts: 3,
    initialInterval: '500 milliseconds',
    backoffCoefficient: 2,
  },
});

export async function hotelOfferWorkflow(input: { city: string }): Promise<Hotel[]> {
  const { city } = input;

  // Call both suppliers in parallel; one failing must not sink the other.
  const [a, b] = await Promise.allSettled([
    fetchSupplierHotels('A', city),
    fetchSupplierHotels('B', city),
  ]);

  const lists: Hotel[][] = [];
  if (a.status === 'fulfilled') lists.push(a.value);
  else log.warn('Supplier A failed after retries', { error: String(a.reason) });
  if (b.status === 'fulfilled') lists.push(b.value);
  else log.warn('Supplier B failed after retries', { error: String(b.reason) });

  if (lists.length === 0) {
    throw ApplicationFailure.nonRetryable('Both suppliers are unavailable', 'SuppliersDown');
  }

  const best = pickBestOffers(...lists);
  await saveHotelsToRedis(city, best);
  return best;
}
