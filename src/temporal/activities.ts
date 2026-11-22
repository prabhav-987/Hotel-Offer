import { config } from '../config';
import { logger } from '../logger';
import { saveHotels } from '../redis';
import type { Hotel, SupplierHotel, SupplierId } from '../types';

export async function fetchSupplierHotels(
  supplier: SupplierId,
  city: string,
): Promise<Hotel[]> {
  const url = `${config.supplierBaseUrl}/supplier${supplier}/hotels?city=${encodeURIComponent(city)}`;
  logger.info('Calling supplier', { supplier, city, url });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Supplier ${supplier} responded with ${res.status}`);

    const data = (await res.json()) as SupplierHotel[];
    logger.info('Supplier responded', { supplier, count: data.length });

    return data.map((h) => ({
      name: h.name,
      price: h.price,
      supplier: `Supplier ${supplier}`,
      commissionPct: h.commissionPct,
    }));
  } catch (err) {
    logger.error('Supplier call failed', { supplier, city, error: String(err) });
    throw err; // let Temporal retry per the workflow's retry policy
  }
}

export async function saveHotelsToRedis(city: string, hotels: Hotel[]): Promise<void> {
  await saveHotels(city, hotels);
  logger.info('Saved deduplicated hotels to Redis', { city, count: hotels.length });
}
