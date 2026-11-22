# Hotel Offer Orchestrator

Aggregates overlapping hotel offers from two mock suppliers, dedupes by hotel name, keeps the cheapest offer per hotel, stores the result in Redis and supports price-range filtering inside Redis.

**Stack:** Node.js (TypeScript), Express, Temporal, Redis, Docker Compose

## Architecture

```
Client -> Express API -> Temporal workflow (hotelOfferWorkflow)
                           |- activity: fetchSupplierHotels('A')  \  parallel
                           |- activity: fetchSupplierHotels('B')  /
                           |- dedupe (cheapest per name)
                           '- activity: saveHotelsToRedis  -> Redis sorted set (score = price)
Price filter: API -> Redis ZRANGEBYSCORE hotels:<city> min max
```

- Mock suppliers (`/supplierA/hotels`, `/supplierB/hotels`) live in the same service.
- Each supplier call is its own activity with a retry policy (3 attempts, exponential backoff). If one supplier is down after retries, the workflow continues with the other; if both are down the API returns 502.
- Redis key `hotels:<city>` is a sorted set: score = price, member = hotel JSON, TTL 10 min.

## Run with Docker (recommended)

```bash
docker compose up --build
```

- API: http://localhost:3000
- Temporal UI: http://localhost:8080

`app` and `worker` restart automatically until Temporal is ready (first start can take ~30-60s).

## Run locally (without Docker for the app)

```bash
# terminal 1: Temporal dev server (needs the Temporal CLI)
temporal server start-dev
# terminal 2: Redis
docker run --rm -p 6379:6379 redis:7-alpine
# terminal 3/4
npm install
npm run dev
npm run dev:worker
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/hotels?city=delhi` | Deduplicated best-price hotels |
| GET | `/api/hotels?city=delhi&minPrice=5000&maxPrice=6000` | Same, filtered by price in Redis (both params optional, inclusive) |
| GET | `/supplierA/hotels`, `/supplierB/hotels` | Mock suppliers (`?city=` optional) |
| GET | `/health` | Health of Supplier A, Supplier B and Redis (503 if any is down) |
| POST | `/admin/supplier/:A\|B/down?value=true\|false` | Simulate a supplier outage |

Example response:

```json
[
  { "name": "Holtin", "price": 5340, "supplier": "Supplier B", "commissionPct": 20 },
  { "name": "Radison", "price": 5900, "supplier": "Supplier A", "commissionPct": 13 }
]
```

## Postman

Import `postman/hotel-offer-orchestrator.postman_collection.json`. It covers: overlaps (delhi), price filter, city with no results, missing city, supplier-down simulation, and `/health`.

## Configuration (env)

`PORT` (3000), `REDIS_URL`, `TEMPORAL_ADDRESS`, `SUPPLIER_BASE_URL`.
