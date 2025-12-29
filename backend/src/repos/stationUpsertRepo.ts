import pool from "../db.js";

export type StationUpsert = {
    stationId: string;
    name: string;
    district: string | null;
    state?: string | null;
    stationType: "rainfall" | "water_level";
    source: string;
};



export async function upsertStation(items: StationUpsert []): Promise<number> {
    if (items.length == 0) return 0;

    const values: any [] = [];
    const placeholders: string[] = [];

    items.forEach((item, index) => {
        const base = index * 7;

        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);

        values.push(
            item.stationId,
            item.name,
            item.state ?? null,
            item.district ?? null,
            item.stationType,
            item.source,
            true
        );
    });


    const q = `
        INSERT INTO stations (station_id, name, state, district, station_type, source, is_active)
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (station_id)
        DO UPDATE SET
            name = EXCLUDED.name,
            state = COALESCE(EXCLUDED.state, stations.state),
            district = COALESCE(EXCLUDED.district, stations.district),
            station_type = EXCLUDED.station_type,
            source = EXCLUDED.source,
            is_active = TRUE
        `;
    
    await pool.query(q, values);
    return items.length;

}