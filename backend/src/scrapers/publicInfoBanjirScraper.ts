// backend/src/scrapers/publicInfobanjirScraper.ts
// This file scrapes PublicInfoBanjir pages using Playwright.

import { chromium } from "playwright";
import { parseMYDatetime } from "../utils/time.js";


export type RainNowRow = {
  stationId: string;
  stationName: string;
  district: string | null;
  lastUpdatedRaw: Date | null;         
  rainfallMidnight: number | null;
  rain1hNowMm: number | null;     
  dailyTotals: Array<{ dateRaw: string; totalMm: number | null }>; // from header dates + td[5..10]
  source: "publicinfobanjir";
};


export type WaterLevelNowRow = {
  stationId: string;
  stationName: string;
  district: string | null;
  mainBasin: string | null;
  subRiverBasin: string | null;
  lastUpdatedRaw: Date | null;         
  waterLevelM: number | null;
  source: "publicinfobanjir";
};

/* Rainfall URL with State Filter*/
function rainfallUrl(stateCode: string) {
  return `https://publicinfobanjir.water.gov.my/hujan/data-hujan/?state=${encodeURIComponent(
    stateCode
  )}&lang=en`;
}

/* Water-Level URL with State Filter*/
function waterLevelUrl(stateCode: string) {
  return `https://publicinfobanjir.water.gov.my/aras-air/data-paras-air/?state=${encodeURIComponent(
    stateCode
  )}&lang=en`;
}

/* Parse numeric value from cell text.*/
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


/*Extract all rows of the #normaltable1 table as string[][].*/

async function extractNormalTableRows(page: any): Promise<string[][]> {

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

const SCRAPE_TIMEOUT = Number(process.env.SCRAPE_TIMEOUT_MS);
const SCRAPE_RETRIES = Number(process.env.SCRAPE_RETRIES);


async function retryScraper<T> (fn: () => Promise<T>, retries: number, stateCode: string ) {

  let lastError;

  for(let attempt = 1; attempt <= retries + 1; attempt ++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[scrape] ${stateCode} attempt ${attempt} failed`, err);
      if (attempt > retries) {
        break;
      }

    }
  }
  throw lastError;

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

  return retryScraper (async () => {
    const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(rainfallUrl(stateCode), { waitUntil: "domcontentloaded", timeout: SCRAPE_TIMEOUT });

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

  }, SCRAPE_RETRIES, `rain ${stateCode}` );
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

  return retryScraper (async () => {

    const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = waterLevelUrl(stateCode);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: SCRAPE_TIMEOUT });

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
  }, SCRAPE_RETRIES, `water ${stateCode}`) ;
  
}
