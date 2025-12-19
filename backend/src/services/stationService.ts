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

//Station Service DTO Function To Avoid Leaks of DB Schame Changes
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

//Calls listStations in Repo and calls map to Service Station DTO 
export async function getActiveStations(): Promise <StationDTO[]> {

    const rows = await listStations();
    return rows.map(mapStationDTO);

}