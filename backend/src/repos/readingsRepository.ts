import pool from "../db.js";

export type Readings = {
    stationId: string;
    recordedAt: string;
    rainMm?: number | null;
    riverLevelM?: number | null;
    source: string;
};



export async function insertReadings(items:Readings[]): Promise<number> {

    if (items.length == 0) return 0;

    // Merge duplicate (station_id, recorded_at) pairs so ON CONFLICT runs once per key
    const merged = new Map<string, Readings>();
    for (const item of items) {
        const key = `${item.stationId}|${item.recordedAt}`;
        const existing = merged.get(key);

        if (existing) {
            merged.set(key, {
                ...existing,
                rainMm: existing.rainMm ?? item.rainMm ?? null,
                riverLevelM: existing.riverLevelM ?? item.riverLevelM ?? null,
                source: item.source ?? existing.source,
            });
        } else {
            merged.set(key, {
                ...item,
                rainMm: item.rainMm ?? null,
                riverLevelM: item.riverLevelM ?? null,
            });
        }
    }

    const deduped = Array.from(merged.values());

    const values: any[] = [];
    const placement: string[] = [];

    deduped.forEach((item,index) => {
        const base = index * 5;
        placement.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`)

        values.push(
            item.stationId,
            item.recordedAt,
            item.rainMm ?? null,
            item.riverLevelM ?? null,
            item.source
        );
    });

    const insertQuery = `
        INSERT INTO readings (station_id, recorded_at, rain_mm, river_level_m, source)
        VALUES ${placement.join(", ")}
        ON CONFLICT (station_id, recorded_at)
        DO UPDATE SET
            rain_mm = COALESCE(EXCLUDED.rain_mm, readings.rain_mm),
            river_level_m = COALESCE(EXCLUDED.river_level_m, readings.river_level_m),
            source = EXCLUDED.source
        `;

    const result = await pool.query(insertQuery, values);

    return deduped.length;

    
}
