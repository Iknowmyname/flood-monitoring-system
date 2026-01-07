// backend/src/scrapers/publicInfobanjirScraper.ts
//
// This file scrapes PublicInfoBanjir pages using Playwright.
// IMPORTANT: There are TWO runtimes involved:
// 1) Node.js/TypeScript runtime (this file)
// 2) Browser runtime inside page.evaluate(...) (plain JavaScript executed in Chromium)
//
// We ONLY return JSON-serializable data from page.evaluate (strings, numbers, arrays, objects),
// because DOM nodes can't be passed back to Node.
//
// We target the real data table by id: #normaltable1

import { chromium } from "playwright";
import { parseMYDatetime } from "../utils/time.js";

/**
 * Rainfall "now-ish" row from PublicInfoBanjir rainfall page.
 * We care about:
 * - stationId (stable)
 * - stationName
 * - district
 * - lastUpdatedRaw (timestamp string from the site)
 * - rainFromMidnightMm (aggregate)
 * - rain1hNowMm (best "current" signal)
 */
export type RainNowRow = {
  stationId: string;
  stationName: string;
  district: string | null;
  lastUpdatedRaw: Date | null;          // "25/12/2025 12:15:00"
  rainfallMidnight: number | null;
  rain1hNowMm: number | null;      // td[12]
  dailyTotals: Array<{ dateRaw: string; totalMm: number | null }>; // from header dates + td[5..10]
  source: "publicinfobanjir";
};

/**
 * Water level "now-ish" row from PublicInfoBanjir water level page.
 * We care about:
 * - stationId (stable)
 * - stationName
 * - district
 * - basins (useful context)
 * - lastUpdatedRaw
 * - waterLevelM (the main measurement)
 */
export type WaterLevelNowRow = {
  stationId: string;
  stationName: string;
  district: string | null;
  mainBasin: string | null;
  subRiverBasin: string | null;
  lastUpdatedRaw: Date | null;          // e.g. "25/12/2025 12:15:00"
  waterLevelM: number | null;
  source: "publicinfobanjir";
};

/** Build rainfall URL (human-facing page) */
function rainfallUrl(stateCode: string) {
  return `https://publicinfobanjir.water.gov.my/hujan/data-hujan/?state=${encodeURIComponent(
    stateCode
  )}&lang=en`;
}

/** Build water level URL (human-facing page) */
function waterLevelUrl(stateCode: string) {
  return `https://publicinfobanjir.water.gov.my/aras-air/data-paras-air/?state=${encodeURIComponent(
    stateCode
  )}&lang=en`;
}

/**
 * Parse numeric value from cell text.
 * Examples:
 * - "2.0" => 2
 * - "2.0 mm" => 2
 * - "" or "No Data" => null
 * - "-9999.0" => null (often "invalid sensor" sentinel)
 */
function parseNumberMaybe(s: string): number | null {
  const txt = (s ?? "").trim();
  if (!txt) return null;

  const m = txt.replace(",", "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  if (!Number.isFinite(n)) return null;

  if (n <= -9999) return null;
  return n;
}

/**
 * Extract all rows of the #normaltable1 table as string[][].
 * Each row becomes an array of td text.
 * We do NOT assume header structure because the header uses rowspan/colspan.
 */
async function extractNormalTableRows(page: any): Promise<string[][]> {
  // Wait until the data table exists and has body cells.
  await page.waitForSelector("#normaltable1 tbody tr td", { timeout: 30_000 });

  const rows = await page.evaluate(`
    (() => {
      const table = document.querySelector("#normaltable1");
      if (!table) return [];

      const normalize = (s) => (s ?? "").trim().replace(/\\s+/g, " ");

      const trs = Array.from(table.querySelectorAll("tbody tr"));

      return trs
        .map(tr => Array.from(tr.querySelectorAll("td")).map(td => normalize(td.textContent ?? "")))
        .filter(cells => cells.length > 0);
    })()
  `);

  return rows;
}



async function extractRainTable(page: any): Promise<{
  dailyDates: string[];
  rows: string[][];
}> {
  await page.waitForSelector("#normaltable1 tbody tr td", { timeout: 30_000 });

  const result = await page.evaluate(`
    (() => {
      const table = document.querySelector("#normaltable1");
      if (!table) return { dailyDates: [], rows: [] };

      const normalize = (s) => (s ?? "").trim().replace(/\\s+/g, " ");
      const dateRegex = /^\\d{2}\\/\\d{2}\\/\\d{4}$/;

      // 1) Daily dates from header row that contains date-like th's
      const theadTrs = Array.from(table.querySelectorAll("thead tr"));

      let dailyDates = [];
      for (const tr of theadTrs) {
        const thTexts = Array.from(tr.querySelectorAll("th"))
          .map(th => normalize(th.textContent ?? ""))
          .filter(Boolean);

        const dateTexts = thTexts.filter(t => dateRegex.test(t));
        if (dateTexts.length >= 5) {
          dailyDates = dateTexts;
          break;
        }
      }

      // 2) Body rows
      const bodyTrs = Array.from(table.querySelectorAll("tbody tr"));
      const rows = bodyTrs
        .map(tr => Array.from(tr.querySelectorAll("td")).map(td => normalize(td.textContent ?? "")))
        .filter(cells => cells.length > 0);

      return { dailyDates, rows };
    })()
  `);

  return result;
}


/**
 * Rainfall table column mapping (tbody):
 * 0 No.
 * 1 Station ID
 * 2 Station
 * 3 District
 * 4 Last Updated
 * 5..10 Daily Rainfall (6 columns; dates come from thead date row)
 * 11 Rainfall from Midnight (ignored for UI)
 * 12 Total 1 Hour (Now)  <-- main "current" value
 */
export async function scrapeRainNowByState(stateCode: string): Promise<RainNowRow[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(rainfallUrl(stateCode), { waitUntil: "domcontentloaded", timeout: 60_000 });

    const { dailyDates, rows } = await extractRainTable(page);

    const out: RainNowRow[] = [];

    for (const cells of rows) {
      if (cells.length < 13) continue;

      const stationId = cells[1] ?? "";
      const stationName = cells[2] ?? "";
      const district = cells[3] ?? null;
      const lastUpdatedRaw = parseMYDatetime(cells[4] ?? "");
      const rainfallMidnight = parseNumberMaybe(cells[11] ?? "");
      const rain1hNowMm = parseNumberMaybe(cells[12] ?? "");

      if (!stationId || !stationName) continue;

      // Map the 6 daily columns to their dates
      const dailyTotals = dailyDates.slice(0, 6).map((dateRaw, i) => {
        const cellIdx = 5 + i; // daily values start at td[5]
        return {
          dateRaw,
          totalMm: parseNumberMaybe(cells[cellIdx] ?? ""),
        };
      });


      out.push({
        stationId,
        stationName,
        district,
        lastUpdatedRaw,
        rainfallMidnight,
        rain1hNowMm,
        dailyTotals,
        source: "publicinfobanjir",
      });
    }

    return out;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
/**
 * Scrape water level values for a single state (e.g. "KEL").
 * Water level table mapping from your header:
 * 0 No.
 * 1 Station ID
 * 2 Station Name
 * 3 District
 * 4 Main Basin
 * 5 Sub River Basin
 * 6 Last Updated
 * 7 Water Level (m) (Graph)
 * 8 Normal threshold
 * 9 Alert threshold
 * 10 Warning threshold
 * 11 Danger threshold
 */
export async function scrapeWaterLevelNowByState(stateCode: string): Promise<WaterLevelNowRow[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = waterLevelUrl(stateCode);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const rawRows = await extractNormalTableRows(page);

    const out: WaterLevelNowRow[] = [];

    for (const cells of rawRows) {
      // Need at least 12 cells for water level table.
      if (cells.length < 12) continue;

      const stationId = cells[1] ?? "";
      const stationName = cells[2] ?? "";
      const district = cells[3] ?? null;
      const mainBasin = cells[4] ?? null;
      const subRiverBasin = cells[5] ?? null;
      const lastUpdatedRaw = parseMYDatetime(cells[6] ?? "");
      const waterLevelM = parseNumberMaybe(cells[7] ?? "");

      if (!stationId || !stationName) continue;

      out.push({
        stationId,
        stationName,
        district,
        mainBasin,
        subRiverBasin,
        lastUpdatedRaw,
        waterLevelM,
        source: "publicinfobanjir",
      });
    }

    return out;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
