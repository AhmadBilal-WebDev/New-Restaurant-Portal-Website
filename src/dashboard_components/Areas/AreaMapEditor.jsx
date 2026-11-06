'use client';

import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Eraser,
  Loader2,
  MapPinned,
  MousePointerClick,
  Search,
  Undo2
} from "lucide-react";
import { loadLeaflet } from '@/shared/lib/loadLeaflet';

const DEFAULT_CENTER = [31.47, 74.273];
const ACCENT = "#FF5A1F";

/** English-leaning street labels (better than default OSM local-script tiles). */
const ENGLISH_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ENGLISH_TILE_ATTR =
  "Tiles &copy; Esri &mdash; Source: Esri, OpenStreetMap contributors";

function toNum(value, fallback = NaN) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function addEnglishTiles(L, map) {
  return L.tileLayer(ENGLISH_TILE_URL, {
    attribution: ENGLISH_TILE_ATTR,
    maxZoom: 19
  }).addTo(map);
}

async function geocodePlace(query, city) {
  const params = new URLSearchParams({ q: query });
  if (city) params.set("city", city);
  const response = await fetch(`/api/geocode?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok || !data?.ok || !data?.result) {
    return { ok: false, message: data?.message || "Place not found." };
  }
  return { ok: true, result: data.result };
}

function AreaMapEditor({
  latitude,
  longitude,
  polygon = [],
  areaName = "",
  cityHint = "",
  onChange,
  mode = "polygon",
  onModeChange,
  className = ""
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const polygonRef = useRef(null);
  const vertexLayerRef = useRef(null);
  const modeRef = useRef(mode);
  const valueRef = useRef({ latitude, longitude, polygon });
  const onChangeRef = useRef(onChange);
  const fittedRef = useRef(false);
  const lastGeocodedNameRef = useRef("");
  const leafletRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState("");
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    valueRef.current = { latitude, longitude, polygon };
  }, [latitude, longitude, polygon]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled) return;
      leafletRef.current = L;
      setLeafletReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!leafletReady || !leafletRef.current) return;
    if (!containerRef.current || mapRef.current) return;

    const L = leafletRef.current;
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: true
    });

    addEnglishTiles(L, map);
    vertexLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (event) => {
      const { lat, lng } = event.latlng;
      const latStr = lat.toFixed(4);
      const lngStr = lng.toFixed(4);
      const current = valueRef.current;

      if (modeRef.current === "pin") {
        onChangeRef.current?.({
          latitude: latStr,
          longitude: lngStr,
          polygon: current.polygon || []
        });
        return;
      }

      onChangeRef.current?.({
        latitude: current.latitude || latStr,
        longitude: current.longitude || lngStr,
        polygon: [
          ...(Array.isArray(current.polygon) ? current.polygon : []),
          { latitude: latStr, longitude: lngStr }
        ]
      });
    });

    mapRef.current = map;
    fittedRef.current = false;

    const invalidate = () => {
      try {
        map.invalidateSize();
      } catch {
        /* ignore */
      }
    };
    const t1 = window.setTimeout(invalidate, 50);
    const t2 = window.setTimeout(invalidate, 250);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      polygonRef.current = null;
      vertexLayerRef.current = null;
    };
  }, [leafletReady]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const lat = toNum(latitude);
    const lng = toNum(longitude);
    const hasCenter = Number.isFinite(lat) && Number.isFinite(lng);
    const pinLabel = areaName.trim() || "Center pin";

    if (hasCenter) {
      if (!markerRef.current) {
        markerRef.current = L.circleMarker([lat, lng], {
          radius: 9,
          color: "#fff",
          weight: 2,
          fillColor: ACCENT,
          fillOpacity: 1
        }).addTo(map);
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }
      markerRef.current.unbindTooltip();
      markerRef.current.bindTooltip(pinLabel, {
        permanent: true,
        direction: "top",
        offset: [0, -10],
        className: "area-pin-tooltip"
      });
    } else if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    const points = (Array.isArray(polygon) ? polygon : [])
      .map((p) => [toNum(p.latitude), toNum(p.longitude)])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

    if (vertexLayerRef.current) {
      vertexLayerRef.current.clearLayers();
      points.forEach((pt, index) => {
        L.circleMarker(pt, {
          radius: 5,
          color: "#fff",
          weight: 2,
          fillColor: "#38bdf8",
          fillOpacity: 1
        })
          .bindTooltip(`Point ${index + 1}`, { direction: "top", offset: [0, -6] })
          .addTo(vertexLayerRef.current);
      });
    }

    if (points.length >= 3) {
      if (!polygonRef.current) {
        polygonRef.current = L.polygon(points, {
          color: ACCENT,
          weight: 2,
          fillColor: ACCENT,
          fillOpacity: 0.22
        }).addTo(map);
      } else {
        polygonRef.current.setLatLngs(points);
      }
    } else if (polygonRef.current) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    if (!fittedRef.current) {
      if (points.length >= 2) {
        try {
          const bounds = L.latLngBounds(points);
          if (hasCenter) bounds.extend([lat, lng]);
          map.fitBounds(bounds.pad(0.25));
          fittedRef.current = true;
        } catch {
          /* ignore */
        }
      } else if (hasCenter) {
        map.setView([lat, lng], 14);
        fittedRef.current = true;
      }
    }
  }, [leafletReady, latitude, longitude, polygon, areaName]);

  const flyToPin = (latStr, lngStr, zoom = 15) => {
    const map = mapRef.current;
    const lat = toNum(latStr);
    const lng = toNum(lngStr);
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo([lat, lng], zoom, { duration: 0.85 });
    fittedRef.current = true;
  };

  const applyGeocodeResult = (result, { keepPolygon = true } = {}) => {
    const current = valueRef.current;
    onChangeRef.current?.({
      latitude: result.latitude,
      longitude: result.longitude,
      polygon: keepPolygon ? current.polygon || [] : []
    });
    flyToPin(result.latitude, result.longitude, 15);
  };

  const locateByName = async (rawName) => {
    const query = String(rawName || "").trim();
    if (query.length < 2) {
      setLocateNote("Type an area name first (e.g. Johar Town).");
      return false;
    }
    setLocating(true);
    setLocateNote("");
    const result = await geocodePlace(query, cityHint);
    setLocating(false);
    if (!result.ok) {
      setLocateNote(result.message || "Could not find this area.");
      return false;
    }
    lastGeocodedNameRef.current = query.toLowerCase();
    // New place name → move pin there and clear old polygon so service zone can be redrawn.
    applyGeocodeResult(result.result, { keepPolygon: false });
    onModeChange?.("polygon");
    setLocateNote(
      `Pin on ${query}${cityHint ? ` · ${cityHint}` : ""}. Draw polygon where you deliver.`
    );
    return true;
  };

  // When area name changes, auto-point the center pin to that place.
  useEffect(() => {
    const name = String(areaName || "").trim();
    if (name.length < 3) return;
    const key = name.toLowerCase();
    if (key === lastGeocodedNameRef.current) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (key === lastGeocodedNameRef.current) return;
        setLocating(true);
        const result = await geocodePlace(name, cityHint);
        setLocating(false);
        if (!result.ok) {
          setLocateNote(`No map match for “${name}” yet — keep typing or click Find.`);
          return;
        }
        lastGeocodedNameRef.current = key;
        applyGeocodeResult(result.result, { keepPolygon: false });
        onModeChange?.("polygon");
        setLocateNote(`Pin on ${name}. Draw the streets/blocks you serve.`);
      })();
    }, 700);

    return () => window.clearTimeout(timer);
    // intentionally not depending on locate helpers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaName, cityHint]);

  const undoPoint = () => {
    const current = valueRef.current;
    onChange?.({
      latitude: current.latitude,
      longitude: current.longitude,
      polygon: (current.polygon || []).slice(0, -1)
    });
  };

  const clearPolygon = () => {
    const current = valueRef.current;
    onChange?.({
      latitude: current.latitude,
      longitude: current.longitude,
      polygon: []
    });
  };

  const useMapCenterAsPin = () => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    onChange?.({
      latitude: center.lat.toFixed(4),
      longitude: center.lng.toFixed(4),
      polygon: valueRef.current.polygon || []
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <style>{`
        .leaflet-tooltip.area-pin-tooltip {
          background: #14161b !important;
          border: 1px solid #292d35 !important;
          color: #fff !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          border-radius: 8px !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35) !important;
          padding: 4px 8px !important;
        }
        .leaflet-tooltip.area-pin-tooltip::before {
          border-top-color: #292d35 !important;
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onModeChange?.("polygon")}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
            mode === "polygon"
              ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]"
              : "border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#A3A3A3)]"
          }`}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          Draw polygon
        </button>
        <button
          type="button"
          onClick={() => onModeChange?.("pin")}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
            mode === "pin"
              ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]"
              : "border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#A3A3A3)]"
          }`}
        >
          <MapPinned className="h-3.5 w-3.5" />
          Set center pin
        </button>
        <button
          type="button"
          onClick={() => void locateByName(areaName)}
          disabled={locating || !String(areaName || "").trim()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--admin-subtle,#A3A3A3)] disabled:opacity-50"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          Find area on map
        </button>
        <button
          type="button"
          onClick={useMapCenterAsPin}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--admin-subtle,#A3A3A3)]"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Use map center
        </button>
        <button
          type="button"
          onClick={undoPoint}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--admin-subtle,#A3A3A3)]"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo point
        </button>
        <button
          type="button"
          onClick={clearPolygon}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-1.5 text-[11px] font-bold text-red-400"
        >
          <Eraser className="h-3.5 w-3.5" />
          Clear polygon
        </button>
      </div>

      <p className="text-[11px] text-[var(--admin-faint,#737373)]">
        Type an area name (e.g. Johar Town) — the orange pin jumps there so you can draw
        which streets get delivery. Map labels are English.
        {mode === "pin"
          ? " Pin mode: click map to fine-tune the center."
          : " Polygon mode: click corners around the service zone."}
      </p>
      {locateNote ? (
        <p className="text-[11px] font-medium text-[var(--color-admin-accent,#FF5A1F)]">
          {locateNote}
        </p>
      ) : null}

      <div
        ref={containerRef}
        className="z-0 h-72 w-full overflow-hidden rounded-xl border border-[var(--admin-border,#292D35)] sm:h-80"
      />
    </div>
  );
}

function AreaMiniMap({ latitude, longitude, polygon = [], areaName = "", className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map = null;

    void loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return;

      const lat = toNum(latitude, DEFAULT_CENTER[0]);
      const lng = toNum(longitude, DEFAULT_CENTER[1]);
      const points = (Array.isArray(polygon) ? polygon : [])
        .map((p) => [toNum(p.latitude), toNum(p.longitude)])
        .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      });

      addEnglishTiles(L, map);

      if (Number.isFinite(toNum(latitude)) && Number.isFinite(toNum(longitude))) {
        const marker = L.circleMarker([lat, lng], {
          radius: 5,
          color: "#fff",
          weight: 1.5,
          fillColor: ACCENT,
          fillOpacity: 1
        }).addTo(map);
        if (areaName) {
          marker.bindTooltip(areaName, {
            permanent: true,
            direction: "top",
            offset: [0, -8],
            className: "area-pin-tooltip"
          });
        }
      }

      if (points.length >= 3) {
        const poly = L.polygon(points, {
          color: ACCENT,
          weight: 2,
          fillColor: ACCENT,
          fillOpacity: 0.25
        }).addTo(map);
        map.fitBounds(poly.getBounds().pad(0.2));
      } else if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points).pad(0.3));
      }

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      } else if (map) {
        map.remove();
      }
    };
  }, [latitude, longitude, polygon, areaName]);

  return (
    <div
      ref={containerRef}
      className={`h-28 w-full overflow-hidden rounded-xl border border-[var(--admin-border,#292D35)] ${className}`}
    />
  );
}

export { AreaMapEditor, AreaMiniMap };
