import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  geojson: any;
  onStationClick?: (id: string) => void;
  focusCoord?: [number, number] | null;
  focusId?: string | null;
};

export function MapView({ geojson, onStationClick, focusCoord, focusId }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [popup, setPopup] = useState<{
    coord: [number, number];
    name: string;
    stationType: string;
    latestRain?: number | null;
    latestWaterLevel?: number | null;
    latestRecordedAt?: string | null;
  } | null>(null);

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [101.9758, 4.2105], // Malaysia
      zoom: 6,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource("stations", {
        type: "geojson",
        data: geojson,
        cluster: false,
      });

      // Hide noisy label layers; keep only country/state labels if present
      const styleLayers = map.getStyle().layers ?? [];
      for (const layer of styleLayers) {
        if (layer.type !== "symbol") continue;
        const keep =
          layer.id.includes("country") ||
          layer.id.includes("state") ||
          layer.id.includes("admin") ||
          layer.id.includes("boundary-label");
        if (!keep) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }

      // Glow layer (static)
      map.addLayer({
        id: "stations-glow",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4, 6,
            7, 9,
            9, 11
          ],
          "circle-color": "#ffffff",
          "circle-opacity": 0.6,
          "circle-blur": 0.8,
        },
      });

      // INDIVIDUAL STATIONS
      map.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4, 3,
            7, 5,
            9, 7
          ],
          "circle-color": [
            "case",
            ["==", ["get", "id"], focusId ?? ""],
            "#22c55e", // green for focused
            "#f8fafc", // near-white default
          ],
          "circle-opacity": 1,
          "circle-stroke-color": "#2b2b2bff",
          "circle-stroke-width": 1.5,
          "circle-blur": 0.05,
        },
      });

      // Station labels
      map.addLayer({
        id: "station-labels",
        type: "symbol",
        source: "stations",
        minzoom: 7.5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#e2e8f0",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1,
        },
      });

      // Click handlers
      map.on("click", "stations", (e) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        const coords =
          feature?.geometry?.type === "Point" ? (feature.geometry.coordinates as [number, number]) : null;
        const props = feature?.properties ?? {};
        if (coords) {
          map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 8) });
          setPopup({
            coord: coords,
            name: props.name ?? "",
            stationType: props.stationType ?? "",
            latestRain:
              props.latestRain !== undefined && props.latestRain !== null
                ? Number(props.latestRain)
                : null,
            latestWaterLevel:
              props.latestWaterLevel !== undefined && props.latestWaterLevel !== null
                ? Number(props.latestWaterLevel)
                : null,
            latestRecordedAt: props.latestRecordedAt ?? null,
          });
        }
        if (id && onStationClick) onStationClick(id);
      });

      map.on("mouseenter", "stations", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stations", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [geojson]);

  // Update source data when geojson changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      map.resize();
      const src = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson as any);
      }
    };

    if (map.isStyleLoaded()) {
      update();
    } else {
      map.once("load", update);
    }
  }, [geojson]);

  // Focus on a coordinate when provided (e.g., sidebar selection)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusCoord) return;
    map.easeTo({ center: focusCoord, zoom: Math.max(map.getZoom(), 10) });
  }, [focusCoord]);

  // When focusId changes (e.g., sidebar click), open popup for that station if present in geojson
  useEffect(() => {
    if (!focusId || !geojson?.features) return;
    const feature = geojson.features.find((f: any) => f?.properties?.id === focusId);
    if (!feature) return;
    const coords =
      feature.geometry?.type === "Point" ? (feature.geometry.coordinates as [number, number]) : null;
    const props = feature.properties ?? {};
    if (!coords) return;
    setPopup({
      coord: coords,
      name: props.name ?? "",
      stationType: props.stationType ?? "",
      latestRain:
        props.latestRain !== undefined && props.latestRain !== null ? Number(props.latestRain) : null,
      latestWaterLevel:
        props.latestWaterLevel !== undefined && props.latestWaterLevel !== null
          ? Number(props.latestWaterLevel)
          : null,
      latestRecordedAt: props.latestRecordedAt ?? null,
    });
  }, [focusId, geojson]);

  // Render popup when state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    if (!popup) return;

    const popupHtml = `
      <div style="
        min-width: 200px;
        font-family: 'Inter', system-ui, sans-serif;
        background: #0b1220;
        color: #f8fafc;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 10px 12px;
        box-shadow: 0 8px 18px rgba(0,0,0,0.35);
      ">
        <div style="font-weight: 700; margin-bottom: 6px; letter-spacing: 0.3px;">${popup.name || "Station"}</div>
        <div style="opacity: 0.9; margin-bottom: 4px;">Type: ${popup.stationType || "—"}</div>
        <div style="opacity: 0.9; margin-bottom: 4px;">${
          popup.stationType === "rainfall"
            ? `Rainfall: ${popup.latestRain ?? "—"} mm`
            : `Water Level: ${popup.latestWaterLevel ?? "—"} m`
        }</div>
        <div style="opacity: 0.9;">Recorded at: ${popup.latestRecordedAt ?? "—"}</div>
      </div>
    `;

    const p = new maplibregl.Popup({
      closeButton: true,
      closeOnMove: false,
      anchor: "bottom",
      offset: 12,
      className: "minimal-popup",
    })
      .setLngLat(popup.coord)
      .setHTML(popupHtml)
      .addTo(map);

    p.on("close", () => setPopup(null));
    popupRef.current = p;
  }, [popup]);

  return <div ref={containerRef} className="h-full w-full rounded-xl" />;
}
