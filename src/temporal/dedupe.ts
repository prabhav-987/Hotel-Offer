import type { Hotel } from '../types';

/**
 * Pure + deterministic (safe to use inside a Temporal workflow).
 * Dedupes by normalized hotel name and keeps the cheapest offer.
 * On equal price the first list wins (Supplier A).
 */
export function pickBestOffers(...lists: Hotel[][]): Hotel[] {
  const best = new Map<string, Hotel>();
  for (const list of lists) {
    for (const hotel of list) {
      const key = hotel.name.trim().toLowerCase();
      const current = best.get(key);
      if (!current || hotel.price < current.price) best.set(key, hotel);
    }
  }
  return [...best.values()].sort(
    (x, y) => x.price - y.price || x.name.localeCompare(y.name),
  );
}
