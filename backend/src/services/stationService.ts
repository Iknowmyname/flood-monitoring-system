import {listStations, type StationRow} from "../repos/stationsRepository.js";

//Station Service DTO Type Alias
export type StationDTO = {
    stationId: string;
    name: string;
    state: string;
    district: string;
    lat: number | null;
    lon: number | null;
    stationType: string;
    source: string;
    isActive: boolean;
};

export type StationsParams = {
    state?: string;
    district?: string;
    page: number;
    limit: number;
};

export type ListStaitonsResult = {
    stations: StationDTO[];
    page: number;
    limit: number;
};



//Station Service DTO Function To Avoid Leaks of DB Schema Changes
function mapStationDTO(r: StationRow): StationDTO {
    return {

        stationId: r.station_id,
        name: r.name,
        state: r.state,
        district: r.district,
        lat: r.lat,
        lon: r.lon,
        stationType: r.station_type,
        source: r.source,
        isActive: r.is_active,
        
    };
}

//Calls listStations in Repo
export async function getActiveStations(params: StationsParams): Promise <ListStaitonsResult> {

    const page = params.page;
    const limit = params.limit;

    const offset = (page -1) * limit;

    const rows = await listStations({
        state: params.state,
        district: params.district,
        limit, 
        offset,
    });

    return {
        stations: rows.map(mapStationDTO),
        page,
        limit,
    };

}