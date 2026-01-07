import { useEffect, useMemo, useState } from "react";
import { MapView } from "./MapView";


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
    latestRain?: number | null;
    latestWaterLevel?: number | null;
    latestRecordedAt?: string | null;
};

type RainReading = {
  station_id: string;
  rain_mm: number | null;
  recorded_at: string;
};

type WaterReading = {
  station_id: string;
  river_level_m: number | null;
  recorded_at: string;
};

export default function App() {

  const [stations, setStations] = useState<StationDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "rainfall" | "water_level">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStations() {
      try {

        const urls = [
          "/api/stations?limit=5000&page=1",
          "/api/readings/latest/rain",
          "/api/readings/latest/water_level"
        ];

        const data = await Promise.all(
          urls.map(async (url) => {
            const res = await fetch(url);
            if (!res.ok) {
              throw new Error(`Failed : ${url}`)
            }
            return res.json();
          })
        );

        //const res = await fetch("/api/stations?limit=5000&page=1");
        //if (!res.ok) throw new Error ("Failed to fetch stations from server!");
        //const data = await res.json();
        // after fetching data
        const stationsArr = Array.isArray(data[0]?.stations.stations) ? data[0].stations.stations : [];
        const rainFallArr = Array.isArray(data[1]?.items) ? data[1].items : [];
        const water_levelArr = Array.isArray(data[2]?.items) ? data[2].items : [];

        const rainMap = new Map<string, RainReading>(
          (rainFallArr as RainReading[]).map((r) => [r.station_id, r])
        );
        const waterLevelMap = new Map<string, WaterReading>(
          (water_levelArr as WaterReading[]).map((r) => [r.station_id, r])
        );

        const typed = stationsArr.map((s: StationDTO) => {
          
          const rainHit = s.stationType === "rainfall" ? rainMap.get(s.stationId) : undefined;
          const waterHit = s.stationType === "water_level" ? waterLevelMap.get(s.stationId) : undefined;

          return {
            ...s,
            latestRain : rainHit?.rain_mm ?? null,
            latestWaterLevel : waterHit?.river_level_m ?? null,
            latestRecordedAt: (rainHit ?? waterHit)?.recorded_at ?? null,
            
          };
        });

        const filtered = typed.filter(
          (s: StationDTO) => s.lat !== null && s.lon !== null && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lon))
        );

        setStations(filtered);


        //setStations(Array.isArray(data?.stations) ? data.stations : []);
      } catch (err) {
        setError("Could not load stations!");
      }
      finally {
        setLoading(false);
      }
    } 
    
    loadStations();

  },[])

  function stationsToGeoJSON(stations: StationDTO[]) {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(s.lon), Number(s.lat)],
        },
        properties: {
          id: s.stationId,
          name: s.name,
          state: s.state,
          district: s.district,
          lat: s.lat,
          lon: s.lon,
          stationType: s.stationType,
          latestRain: s.latestRain,
          latestWaterLevel: s.latestWaterLevel,
          latestRecordedAt: s.latestRecordedAt,
        },
    })),
  };
}

  const stationsByState = useMemo(() => {
    const grouped: Record<string, StationDTO[]> = {};
    for (const s of stations) {
      const key = s.state || "UNKNOWN";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    }
    Object.values(grouped).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return grouped;
  }, [stations]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.stationId === selectedId) ?? null,
    [stations, selectedId]
  );

  const isRain = selectedStation?.stationType === "rainfall";

  const focusCoord = useMemo<[number, number] | null>(() => {
    if (!selectedStation || selectedStation.lon == null || selectedStation.lat == null) return null;
    return [Number(selectedStation.lon), Number(selectedStation.lat)];
  }, [selectedStation]);

  const filteredStations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stations.filter((s) => {
      if (stateFilter !== "all" && s.state !== stateFilter) return false;
      if (typeFilter !== "all" && s.stationType !== typeFilter) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        (s.district ?? "").toLowerCase().includes(term) ||
        (s.state ?? "").toLowerCase().includes(term)
      );
    });
  }, [stations, search, stateFilter, typeFilter]);

  const stateOptions = useMemo(() => Object.keys(stationsByState).sort(), [stationsByState]);

  function handleSelectStation(id: string) {
    setSelectedId(id);
  }


  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;


  const totalStations = stations.length;
  const totalRain = stations.filter((s) => s.stationType === "rainfall").length;
  const totalWater = stations.filter((s) => s.stationType === "water_level").length;

  return (
    <div className="h-screen flex flex-col bg-bg0 text-text0 overflow-hidden">
      {/* Header (slimmer) */}
      <header className="h-12 flex items-center justify-between px-4 bg-bg1/80 border-s border-teal/40 text-white shrink-0">
        <div className="text-lg tracking-wide">Malaysia Water Conditions</div>
      </header>

      {/* Body takes remaining height */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar (fixed width via w-80) */}
        <aside className="w-80 shrink-0 bg-bg1/70 border-r border-teal/40 p-3 overflow-y-auto space-y-3">
          <div className="text-xl text-sky-300 mb-1">Stations</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded bg-panel/60 border border-teal/40 outline-none focus:shadow-glow text-sm"
            placeholder="Search name, state, district..."
          />
          <div className="flex gap-2 text-xs text-text1">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="flex-1 rounded bg-panel/60 border border-teal/40 px-2 py-2"
            >
              <option value="all">All states</option>
              {stateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="flex-1 rounded bg-panel/60 border border-teal/40 px-2 py-2"
            >
              <option value="all">All types</option>
              <option value="rainfall">Rainfall</option>
              <option value="water_level">Water level</option>
            </select>
          </div>

          <div className="space-y-1">
            {filteredStations.map((s) => (
              <button
                key={s.stationId}
                className={`w-full text-left px-3 py-2 rounded border border-transparent hover:border-teal/40 ${
                  selectedId === s.stationId ? "bg-teal/30" : "bg-panel/50"
                }`}
                onClick={() => handleSelectStation(s.stationId)}
              >
                <div className="flex items-center justify-between text-sm text-text0">
                  <span className="truncate">{s.name}</span>
                  <span
                    className={`ml-2 text-xs px-2 py-1 rounded ${
                      s.stationType === "rainfall" ? "bg-teal/30 text-teal2" : "bg-adv/30 text-adv"
                    }`}
                  >
                    {s.stationType === "rainfall" ? "Rain" : "Water"}
                  </span>
                </div>
                <div className="text-xs text-text1">
                  {s.state} · {s.district}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main area fills remaining width/height */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* Status strip (slimmer) */}
          <div className="h-12 shrink-0 flex items-center gap-6 px-6 bg-bg1/60 border-b border-white/60">
            <Stat pill="Active Stations" value={totalStations} className="text-ok" />
            <Stat pill="Rainfall" value={totalRain} className="text-adv" />
            <Stat pill="Water Level" value={totalWater} className="text-warn" />
          </div>

          {/* Map takes remaining space */}
          <div className="flex-1 min-h-0 px-3 py-2 overflow-hidden">
            <div className="relative h-full rounded-xl bg-panel/40 border border-white/40 shadow-glow flex items-center justify-center">
              {/* Legend */}
              <div className="absolute top-2 left-2 z-10 rounded bg-bg1/80 border border-white/60 px-3 py-2 text-xs text-text1 shadow-glow backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-slate-100 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                  <span>Stations</span>
                  <span> | Zoom in to view stations</span>
                </div>
              </div>
              <MapView
                geojson={stationsToGeoJSON(filteredStations)}
                onStationClick={handleSelectStation}
                focusCoord={focusCoord}
                focusId={selectedId}
              />
            </div>
          </div>

          {/* Bottom station detail tab */}
          
          <div className="min-h-24 shrink-0 px-4 py-2 bg-bg0/90 backdrop-blur-sm border-t border-white/60">
            {selectedStation ? (
              <div className="h-full grid grid-cols-3 gap-3 text-sm text-text1">
                <div className="rounded bg-bg1/70 border border-black/40 p-3">
                  <div className="text-text0 font-semibold text-base mb-1">{selectedStation.name}</div>
                  <div>ID: {selectedStation.stationId}</div>
                  <div>Type: {selectedStation.stationType}</div>
                  <div>State: {selectedStation.state}</div>
                  <div>District: {selectedStation.district}</div>
                </div>
                <div className="rounded bg-bg1/70 border border-black/40 p-3">
                  <div className="text-text0 font-semibold mb-1">Readings</div>
                  <div>Rainfall 1h: {isRain ? selectedStation.latestRain ?? "-" : "-"}</div>
                  {/*<div>Rainfall Midnight: —</div>*/}
                  <div>Water Level: {isRain ? "-" : selectedStation.latestWaterLevel ?? "-"}</div>
                  <div>Last Update: {selectedStation.latestRecordedAt ?? "-"}</div>
                </div>
                <div className="rounded bg-bg1/70 border border-black/40 p-3">
                  <div className="text-text0 font-semibold mb-1">Location</div>
                  <div>Lat: {selectedStation.lat ?? "—"}</div>
                  <div>Lon: {selectedStation.lon ?? "—"}</div>
                  <div>Source: {selectedStation.source}</div>
                </div>
              </div>
            ) : (
              <div className="h-full rounded bg-bg1/70 border border-black/40 p-3 text-sm text-text1 flex items-center">
                Select a station to view details.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ pill, value, className }: { pill: string; value: number; className?: string }) {
  return (
    <div className={"flex items-center gap-3 text-2xl " + (className ?? "")}>
      <span className="inline-block w-3 h-3 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
      <span className="font-semibold">{value}</span>
      <span className="opacity-90">{pill}</span>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg1/50 border border-teal/40 shadow-glow p-4">
      <div className="text-text1 text-sm">{title}</div>
      <div className="text-4xl mt-2 tracking-wide">{value}</div>
    </div>
  );
}
