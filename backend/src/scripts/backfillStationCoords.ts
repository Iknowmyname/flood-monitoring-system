import "dotenv/config";
import pool from "../db.js";

const SOURCE_URL =
  "https://publicinfobanjir.water.gov.my/wp-content/themes/enlighten/data/latestreadingstrendabc.json";

type ApiRow = {
  b?: string; // station name
  e?: string; // district
  f?: string; // state
  c?: string | number; // lat
  d?: string | number; // lon
};

// normalize strings for matching: lowercase, trim, collapse internal whitespace, replace underscores
const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();

// Canonicalize names/districts to title case; uppercase any parenthetical content
const toTitleCase = (s?: string | null) =>
  (s ?? "")
    .toLowerCase()
    .replace(/\b([a-z])(\S*)/g, (_m, c, rest) => c.toUpperCase() + rest)
    .replace(/\(([^)]*)\)/g, (_m, inner) => `(${inner.toUpperCase()})`)
    .trim();

const stateMap: Record<string, string> = {
  // Full names -> codes
  "KEDAH": "KDH",
  "KELANTAN": "KEL",
  "TERENGGANU": "TRG",
  "PAHANG": "PHG",
  "SELANGOR": "SEL",
  "PERAK": "PRK",
  "PERLIS": "PLS",
  "PULAU PINANG": "PNG",
  "PENANG": "PNG",
  "WILAYAH PERSEKUTUAN": "WLP",
  "KUALA LUMPUR": "WLP",
  "PUTRAJAYA": "WLH",
  "LABUAN": "WLP",
  "NEGERI SEMBILAN": "NSN",
  "MELAKA": "MLK",
  "MALACCA": "MLK",
  "JOHOR": "JHR",
  "SABAH": "SAB",
  "SARAWAK": "SRK",
};

const canonicalState = (s?: string | null) => {
  const up = (s ?? "").trim().toUpperCase();
  return stateMap[up] ?? up;
};
const makeKey = (name: string, state: string, district: string) =>
  `${norm(name)}|${norm(state)}|${norm(district)}`;
const makeKeyNoDistrict = (name: string, state: string) => `${norm(name)}|${norm(state)}`;

async function fetchSource(): Promise<ApiRow[]> {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ApiRow[];
}

async function main() {
  const rows = await fetchSource();

  const lookupFull = new Map<string, { lat: number; lon: number }>();
  const lookupNameState = new Map<string, { lat: number; lon: number }>();
  for (const r of rows) {
    const name = toTitleCase(r.b);
    const district = toTitleCase(r.e);
    const state = canonicalState(r.f);
    const lat = Number(r.c);
    const lon = Number(r.d);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const coords = { lat, lon };
    lookupFull.set(makeKey(name, state, district), coords);
    lookupNameState.set(makeKeyNoDistrict(name, state), coords);
  }


  const { rows: stations } = await pool.query<{
    station_id: string;
    name: string;
    state: string | null;
    district: string | null;
  }>("SELECT station_id, name, state, district FROM stations WHERE lat IS NULL OR lon IS NULL");

  let matched = 0;
  let updated = 0;

  for (const s of stations) {
    const keyFull = makeKey(toTitleCase(s.name), canonicalState(s.state), toTitleCase(s.district));
    const keyNoDistrict = makeKeyNoDistrict(toTitleCase(s.name), canonicalState(s.state));

    const hit = lookupFull.get(keyFull) ?? lookupNameState.get(keyNoDistrict);
    if (!hit) continue;
    matched++;
    const result = await pool.query(
      "UPDATE stations SET lat = $1, lon = $2 WHERE station_id = $3",
      [hit.lat, hit.lon, s.station_id]
    );
    updated += result.rowCount ?? 0;
  }

  console.log(
    `Backfill complete. Stations needing coords: ${stations.length}. Matched: ${matched}. Updated: ${updated}.`
  );
}

main()
  .catch((err) => {
    console.error("backfillStationCoords failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void pool.end();
  });
