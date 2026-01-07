

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


async function fetchStations() {
    try {
        const res = await fetch("http://localhost:3000/api/stations?limit=5000&page=1");
        if (!res.ok) throw new Error("Failed fetch");

        const data = await res.json();

        const stationsArray = Array.isArray(data?.stations.stations) ? data.stations.stations : [];

        const filtered = stationsArray.filter(
                  (s: StationDTO) => s.lat !== null && s.lon !== null && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lon))
                );

        console.log(filtered);




        
    } catch (err) {
        console.error(err);
    } finally {
        console.log("End");
    }
}

fetchStations();