// Logic for scraping data from PublicInfoBanjir by state and upsert stations and readings into Postgres
import {scrapeRainNowByState,scrapeWaterLevelNowByState,fetchJsonFallback,type RainNowRow,type WaterLevelNowRow,type RainFallbackRow,type WaterFallbackRow,} from "../scrapers/publicInfoBanjirScraper.js";
import { parseMYDatetime } from "../utils/time.js";
import { insertReadings, type Readings } from "../repos/readingsRepository.js";
import { upsertStation, type StationUpsert } from "../repos/stationUpsertRepo.js";
import { listStationsByState } from "../repos/stationsRepository.js";

export async function ingestPIBState(stateCode: string) {
  let rainRows;
  let wlRows;
  let mode: "playwright" | "json-fallback" = "playwright";

  try {
    // 1) Scrape both pages in parallel
    [rainRows, wlRows] = await Promise.all([
      scrapeRainNowByState(stateCode),
      scrapeWaterLevelNowByState(stateCode),
    ]);
  } catch (err) {
    mode = "json-fallback";
    const fallback = await fetchJsonFallback(stateCode);
    rainRows = fallback.rain;
    wlRows = fallback.water;
    console.warn(`[ingest] fallback mode for ${stateCode}`, err);
  }

  let upsertedStations = 0;
  const items: Readings[] = [];

  if (mode === "playwright") {
    // 2) Prepare stations upsert payload
    const stations: StationUpsert[] = [];

    for (const r of rainRows as Array<{ stationId: string; stationName: string; district: string | null; source: string }>) {
      stations.push({
        stationId: r.stationId,
        name: r.stationName,
        district: r.district,
        state: stateCode,
        stationType: "rainfall",
        source: r.source,
      });
    }

    for (const w of wlRows as Array<{ stationId: string; stationName: string; district: string | null; source: string }>) {
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
    upsertedStations = await upsertStation(dedupedStations);

    // 5) Prepare readings insert payload 
    for (const r of rainRows as Array<RainNowRow>) {
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
    for (const w of wlRows as Array<WaterLevelNowRow>) {
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
  } else {
    // Fallback path: match by name/state/district to existing stations; skip if no match
    const existing = await listStationsByState(stateCode);
    const byNameState = new Map<string, string>();
    const byNameStateDistrict = new Map<string, string>();

    for (const s of existing) {
      const name = (s.name ?? "").toLowerCase();
      const state = (s.state ?? "").toLowerCase();
      const district = (s.district ?? "").toLowerCase();
      byNameState.set(`${name}|${state}`, s.station_id);
      byNameStateDistrict.set(`${name}|${state}|${district}`, s.station_id);
    }

    const findId = (name: string, state: string, district: string | null) =>
      byNameStateDistrict.get(`${name.toLowerCase()}|${state.toLowerCase()}|${(district ?? "").toLowerCase()}`) ??
      byNameState.get(`${name.toLowerCase()}|${state.toLowerCase()}`);

    for (const r of rainRows as Array<RainFallbackRow>) {
      if (r.rainMm == null) continue;
      if (!r.recordedAt) continue;
      const stationId = findId(r.stationName, r.state, r.district);
      if (!stationId) continue;
      items.push({
        stationId,
        recordedAt: r.recordedAt.toISOString(),
        rainMm: r.rainMm,
        riverLevelM: null,
        source: "publicinfobanjir",
      });
    }

    for (const w of wlRows as Array<WaterFallbackRow>) {
      if (w.waterLevelM == null) continue;
      if (!w.recordedAt) continue;
      const stationId = findId(w.stationName, w.state, w.district);
      if (!stationId) continue;
      items.push({
        stationId,
        recordedAt: w.recordedAt.toISOString(),
        rainMm: null,
        riverLevelM: w.waterLevelM,
        source: "publicinfobanjir",
      });
    }
  }

  // 5) Insert ingested water-level and rainfall readings 
  const inserted = await insertReadings(items);

  return {
    state: stateCode,
    scraped: { rainRows: rainRows.length, waterLevelRows: wlRows.length },
    upsertedStations,
    preparedReadings: items.length,
    insertedReadings: inserted,
  };
}
