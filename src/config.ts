const port = Number(process.env.PORT ?? 3000);

export const config = {
  port,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  temporalAddress: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
  taskQueue: 'hotel-offers',
  supplierBaseUrl: process.env.SUPPLIER_BASE_URL ?? `http://localhost:${port}`,
};
