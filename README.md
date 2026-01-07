# Flood Monitoring Backend

TypeScript/Express backend for ingesting rainfall and water-level data from PublicInfoBanjir, persisting to Postgres, and exposing latest readings. Uses Playwright for scraping and BullMQ + Redis for scheduled ingestion jobs.

## Stack
- Node.js + TypeScript (ES modules), Express
- PostgreSQL via `pg`
- Redis + BullMQ (queues, repeat jobs)
- Playwright (headless Chromium scraping)
- dotenv for environment configuration

## Setup
1) Install dependencies:
   ```bash
   npm install
   ```
2) Configure env vars in `backend/.env` (example for local dev — replace with your own credentials/hosts):
   ```
   DATABASE_URL=postgresql://<db_user>:<db_pass>@localhost:5432/<db_name>
   REDIS_URL=redis://localhost:6379
   ```
3) Ensure Postgres and Redis are running and accessible at the URLs above.

## Running
- API server (Express + scheduler):
  ```bash
  npm run dev
  ```
  This mounts the API and registers repeat ingestion jobs (every 10 minutes, staggered per state).
- Worker (processes ingest jobs):
  ```bash
  npm run worker
  ```
  Keep at least one worker running so scheduled jobs execute.

## Ingestion pipeline
1) `initSchedulers` registers repeat BullMQ jobs for each state (10-minute interval, 30-second staggering).
2) The worker consumes jobs and calls `ingestPIBState`.
3) `ingestPIBState` scrapes rainfall and water-level pages via Playwright, dedupes stations, upserts station metadata, and upserts readings (rain_mm/river_level_m) in Postgres.
4) Readings are conflict-safe on `(station_id, recorded_at)`; stations are upserted by `station_id`.

## API surface
- `GET /api/stations` — station metadata.
- `GET /api/readings/latest/rain?state=XXX&limit=1000` — latest rainfall per station (distinct on station).
- `GET /api/readings/latest/water_level?state=XXX&limit=1000` — latest water level per station.

Manual ingestion endpoints were removed; ingestion now runs via the scheduled BullMQ jobs only.

## Notes
- The old manual ingest controllers/routes are kept locally under `backend/backup/` (gitignored) for reference.
- Bull Board is mounted if configured in `queue/bullBoard.ts`; ensure Redis is reachable before starting the server.
