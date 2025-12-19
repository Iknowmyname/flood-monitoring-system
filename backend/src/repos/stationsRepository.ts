import pool from "../db.js";

export type StationRow = {

    station_id: string;
    name: string;
    state: string;
    district: string;
    lat: number | null;
    lon: number | null;
    station_type: string;
    source: string;
    is_active: boolean;
};

export async function listStations(): Promise<StationRow[]> {

    const result = await pool.query<StationRow>(
        `SELECT 
            station_id,
            name,
            state,
            district,
            lat,
            lon,
            station_type,
            source,
            is_active
        FROM stations
        WHERE is_active = TRUE
        ORDER BY state, district, name;
        `
    );

    return result.rows;

}

