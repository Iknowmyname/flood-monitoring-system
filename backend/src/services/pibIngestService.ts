import { scrapeRainNowByState, scrapeWaterLevelNowByState } from "../scrapers/publicInfoBanjirScraper.js";
import { parseMYDatetime } from "../utils/time.js";
import { insertReadings, type Readings } from "../repos/readingsRepository.js";
import { upsertStation, type StationUpsert } from "../repos/stationUpsertRepo.js";

export async function ingestPIBState(stateCode: string) {
  // 1) Scrape both pages in parallel
  const [rainRows, wlRows] = await Promise.all([
    scrapeRainNowByState(stateCode),
    scrapeWaterLevelNowByState(stateCode),
  ]);

  // 2) Prepare stations upsert payload
  const stations: StationUpsert[] = [];

  for (const r of rainRows) {
    stations.push({
      stationId: r.stationId,
      name: r.stationName,
      district: r.district,
      state: stateCode,
      stationType: "rainfall",
      source: r.source,
    });
  }

  for (const w of wlRows) {
    stations.push({
      stationId: w.stationId,
      name: w.stationName,
      district: w.district,
      state: stateCode,
      stationType: "water_level",
      source: w.source,
    });
  }

  // 3) Deduplicate station_ids to avoid ON CONFLICT hitting the same key twice in one statement
  const stationMap = new Map<string, StationUpsert>();
  for (const s of stations) {
    if (!stationMap.has(s.stationId)) {
      stationMap.set(s.stationId, s);
    }
  }
  const dedupedStations = Array.from(stationMap.values());

  // 4) Upsert stations so metadata stays current
  const upsertedStations = await upsertStation(dedupedStations);

  // 5) Prepare readings insert payload (your wide-table design)
  const items: Readings[] = [];

  // Rain: only store 1-hour (Now) as your main “latest” signal
  for (const r of rainRows) {
    if (r.rain1hNowMm == null) continue;

    const dt = r.lastUpdatedRaw;
    if (!dt) continue;

    items.push({
      stationId: r.stationId,
      recordedAt: dt.toISOString(),
      rainMm: r.rain1hNowMm,
      riverLevelM: null,
      source: r.source,
    });
  }

  // Water level: store current water level
  for (const w of wlRows) {
    if (w.waterLevelM == null) continue;

    const dt = w.lastUpdatedRaw;
    if (!dt) continue;

    items.push({
      stationId: w.stationId,
      recordedAt: dt.toISOString(),
      rainMm: null,
      riverLevelM: w.waterLevelM,
      source: w.source,
    });
  }

  // 5) Insert readings (your repo already does ON CONFLICT upsert)
  const inserted = await insertReadings(items);

  return {
    state: stateCode,
    scraped: { rainRows: rainRows.length, waterLevelRows: wlRows.length },
    upsertedStations,
    preparedReadings: items.length,
    insertedReadings: inserted,
  };
}
