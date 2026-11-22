import Redis from 'ioredis';
import { config } from './config';
import { Hotel } from './types';

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });

const key = (city: string) => `hotels:${city.toLowerCase()}`;
const TTL_SECONDS = 600;

/**
 * Stores the deduplicated list as a sorted set:
 *   score  = price
 *   member = JSON of the hotel
 * so price filtering can be done natively with ZRANGEBYSCORE.
 */
export async function saveHotels(city: string, hotels: Hotel[]): Promise<void> {
  const k = key(city);
  const tx = redis.multi().del(k);
  if (hotels.length > 0) {
    const args: (string | number)[] = [];
    for (const h of hotels) args.push(h.price, JSON.stringify(h));
    tx.zadd(k, ...args);
    tx.expire(k, TTL_SECONDS);
  }
  await tx.exec();
}

/** Price filtering happens inside Redis (inclusive range). */
export async function getHotelsByPriceRange(
  city: string,
  min?: number,
  max?: number,
): Promise<Hotel[]> {
  const members = await redis.zrangebyscore(
    key(city),
    min === undefined ? '-inf' : min,
    max === undefined ? '+inf' : max,
  );
  return members.map((m) => JSON.parse(m) as Hotel);
}
