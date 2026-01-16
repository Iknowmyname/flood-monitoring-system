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

export type ParamsListStations = {
    state?: string;
    district?: string;
    limit: number;
    offset: number;
}




export async function listStations(params: ParamsListStations): Promise<StationRow[]> {

    const where: string [] = ["is_active = TRUE"];
    const values: any[] = [];
    let index = 1;

    if (params.state) {
        where.push(`state = $${index++}`);
        values.push(params.state);
    }

    if (params.district) {
        where.push(`district = $${index++}`);
    }

    values.push(params.limit);
    const limitIndex = index++;
    values.push(params.offset)
    const offsetIndex = index++;

    const sqlQuery = (
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
        WHERE ${where.join(" AND ")}
        ORDER BY state, district, name
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex};
        `
    );

    const result = await pool.query<StationRow> (sqlQuery, values);

    return result.rows;

}

// Fetch all active stations for a given state (or all if state is undefined)
export async function listStationsByState(state?: string): Promise<Array<Pick<StationRow, "station_id" | "name" | "state" | "district" | "station_type">>> {
    const values: any[] = [];
    let where = "is_active = TRUE";

    if (state) {
        values.push(state);
        where += ` AND state = $${values.length}`;
    }

    const sqlQuery = `
        SELECT station_id, name, state, district, station_type
        FROM stations
        WHERE ${where};
    `;

    const result = await pool.query(sqlQuery, values);
    return result.rows;
}

