import express from 'express';
import { config } from './config';
import { logger } from './logger';
import { redis, getHotelsByPriceRange } from './redis';
import { supplierRouter } from './mocks/suppliers';
import { runHotelWorkflow } from './temporal/client';

const app = express();
app.use(express.json());
app.use(supplierRouter); // mock supplier endpoints live in the same service

const toNum = (v: unknown) => (v === undefined || v === '' ? undefined : Number(v));

// GET /api/hotels?city=delhi[&minPrice=..][&maxPrice=..]
app.get('/api/hotels', async (req, res) => {
  const city = String(req.query.city ?? '').trim().toLowerCase();
  if (!city) {
    res.status(400).json({ error: 'city query param is required' });
    return;
  }

  const min = toNum(req.query.minPrice);
  const max = toNum(req.query.maxPrice);
  if ((min !== undefined && Number.isNaN(min)) || (max !== undefined && Number.isNaN(max))) {
    res.status(400).json({ error: 'minPrice and maxPrice must be numbers' });
    return;
  }
  if (min !== undefined && max !== undefined && min > max) {
    res.status(400).json({ error: 'minPrice cannot be greater than maxPrice' });
    return;
  }

  try {
    // Temporal orchestrates: fetch A+B in parallel -> dedupe -> save to Redis
    const hotels = await runHotelWorkflow(city);

    const filtered = min !== undefined || max !== undefined;
    // Price filtering is executed inside Redis (ZRANGEBYSCORE)
    const result = filtered ? await getHotelsByPriceRange(city, min, max) : hotels;

    res.json(result);
  } catch (err) {
    logger.error('Request failed', { city, error: String(err) });
    res.status(502).json({ error: 'Unable to fetch hotel offers', detail: String(err) });
  }
});

// Health: reports both suppliers + Redis
app.get('/health', async (_req, res) => {
  const checkSupplier = async (id: 'A' | 'B') => {
    try {
      const r = await fetch(`${config.supplierBaseUrl}/supplier${id}/hotels?city=delhi`, {
        signal: AbortSignal.timeout(2000),
      });
      return r.ok ? 'up' : 'down';
    } catch {
      return 'down';
    }
  };
  const checkRedis = async () => {
    try {
      return (await redis.ping()) === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  };

  const [supplierA, supplierB, redisStatus] = await Promise.all([
    checkSupplier('A'),
    checkSupplier('B'),
    checkRedis(),
  ]);
  const healthy = supplierA === 'up' && supplierB === 'up' && redisStatus === 'up';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    suppliers: { supplierA, supplierB },
    redis: redisStatus,
  });
});

app.listen(config.port, () => logger.info('API listening', { port: config.port }));
