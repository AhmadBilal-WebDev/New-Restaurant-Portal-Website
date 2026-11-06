'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, MousePointerClick, Undo2 } from "lucide-react";
import { loadLeaflet } from '@/shared/lib/loadLeaflet';

const ACCENT = "#FF5A1F";
const ENGLISH_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

function toNum(value, fallback = NaN) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Approximate circle as polygon points around restaurant pin. */
function radiusToPolygon(lat, lng, radiusKm, steps = 32) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(radiusKm > 0)) return [];
  const earth = 6371;
  const points = [];
  for (let i = 0; i < steps; i += 1) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;
    const ang = radiusKm / earth;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(bearing)
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(ang) * Math.cos(lat1),
        Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2)
      );
    points.push({
      latitude: ((lat2 * 180) / Math.PI).toFixed(4),
      longitude: ((lng2 * 180) / Math.PI).toFixed(4)
    });
  }
  return points;
}

function BranchServiceAreaEditor({
  branchName = "Restaurant",
  latitude,
  longitude,
  radiusKm = 5,
  polygon = [],
  onChange,
  className = ""
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pinRef = useRef(null);
  const circleRef = useRef(null);
  const polygonRef = useRef(null);
  const vertexLayerRef = useRef(null);
  const valueRef = useRef({ radiusKm, polygon });
  const onChangeRef = useRef(onChange);
  const drawModeRef = useRef(false);
  const fittedRef = useRef(false);
  const leafletRef = useRef(null);
  const [drawMode, setDrawMode] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  const lat = toNum(latitude);
  const lng = toNum(longitude);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    valueRef.current = { radiusKm, polygon };
  }, [radiusKm, polygon]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

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
    if (!hasPin) return;

    const L = leafletRef.current;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer(ENGLISH_TILE_URL, {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19
    }).addTo(map);

    vertexLayerRef.current = L.layerGroup().addTo(map);

    // Restaurant pin is fixed — never moves with clicks.
    pinRef.current = L.circleMarker([lat, lng], {
      radius: 10,
      color: "#fff",
      weight: 3,
      fillColor: ACCENT,
      fillOpacity: 1
    }).addTo(map);
    pinRef.current.bindTooltip(branchName || "Restaurant", {
      permanent: true,
      direction: "top",
      offset: [0, -12],
      className: "area-pin-tooltip"
    });

    map.on("click", (event) => {
      if (!drawModeRef.current) return;
      const { lat: clickLat, lng: clickLng } = event.latlng;
      const current = valueRef.current;
      const nextPolygon = [
        ...(Array.isArray(current.polygon) ? current.polygon : []),
        {
          latitude: clickLat.toFixed(4),
          longitude: clickLng.toFixed(4)
        }
      ];
      onChangeRef.current?.({
        radiusKm: current.radiusKm,
        polygon: nextPolygon
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
    const t2 = window.setTimeout(invalidate, 300);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
      circleRef.current = null;
      polygonRef.current = null;
      vertexLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, hasPin, lat, lng, branchName]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !hasPin) return;

    const radiusMeters = Math.max(0, Number(radiusKm) || 0) * 1000;
    if (radiusMeters > 0) {
      if (!circleRef.current) {
        circleRef.current = L.circle([lat, lng], {
          radius: radiusMeters,
          color: ACCENT,
          weight: 2,
          fillColor: ACCENT,
          fillOpacity: 0.12,
          dashArray: "6 6"
        }).addTo(map);
      } else {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(radiusMeters);
      }
    } else if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
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
          color: "#38bdf8",
          weight: 2,
          fillColor: "#38bdf8",
          fillOpacity: 0.18
        }).addTo(map);
      } else {
        polygonRef.current.setLatLngs(points);
      }
    } else if (polygonRef.current) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    if (!fittedRef.current) {
      try {
        if (circleRef.current) {
          map.fitBounds(circleRef.current.getBounds().pad(0.15));
        } else if (points.length >= 2) {
          map.fitBounds(L.latLngBounds(points).pad(0.2));
        } else {
          map.setView([lat, lng], 13);
        }
        fittedRef.current = true;
      } catch {
        map.setView([lat, lng], 13);
        fittedRef.current = true;
      }
    }
  }, [leafletReady, hasPin, lat, lng, radiusKm, polygon]);

  const applyRadius = (nextRadius) => {
    const safe = Math.max(0, Math.min(100, Number(nextRadius) || 0));
    const generated = hasPin ? radiusToPolygon(lat, lng, safe) : [];
    fittedRef.current = false;
    onChange?.({
      radiusKm: safe,
      polygon: generated
    });
    setDrawMode(false);
  };

  const undoPoint = () => {
    const current = valueRef.current;
    onChange?.({
      radiusKm: current.radiusKm,
      polygon: (current.polygon || []).slice(0, -1)
    });
  };

  const clearPolygon = () => {
    const current = valueRef.current;
    onChange?.({
      radiusKm: current.radiusKm,
      polygon: hasPin ? radiusToPolygon(lat, lng, Number(current.radiusKm) || 0) : []
    });
    setDrawMode(false);
  };

  const hint = useMemo(() => {
    if (!hasPin) return "This branch has no latitude/longitude from the API yet.";
    if (drawMode) return "Click the map to shape a custom zone. Restaurant pin stays fixed.";
    return "Restaurant pin is fixed. Adjust radius (km) around it, or draw a custom polygon.";
  }, [hasPin, drawMode]);

  if (!hasPin) {
    return (
      <div
        className={`rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-6 text-sm text-amber-200 ${className}`}
      >
        Branch location coordinates are missing. Latitude & longitude must come from the
        branches API before a service area can be set.
      </div>
    );
  }

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
          padding: 4px 8px !important;
        }
        .leaflet-tooltip.area-pin-tooltip::before {
          border-top-color: #292d35 !important;
        }
      `}</style>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Service radius (km around restaurant)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={Math.max(1, Math.min(50, Number(radiusKm) || 5))}
              onChange={(e) => applyRadius(e.target.value)}
              className="h-2 w-full cursor-pointer accent-[var(--color-admin-accent,#FF5A1F)]"
            />
            <input
              type="number"
              min={1}
              max={100}
              value={Number(radiusKm) || 0}
              onChange={(e) => applyRadius(e.target.value)}
              className="w-20 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-input,#101216)] px-2 py-2 text-sm font-bold tabular-nums text-[var(--admin-text,#fff)]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDrawMode((v) => !v)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-bold ${
              drawMode
                ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]"
                : "border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#A3A3A3)]"
            }`}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            {drawMode ? "Drawing…" : "Draw custom"}
          </button>
          <button
            type="button"
            onClick={undoPoint}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-2 text-[11px] font-bold text-[var(--admin-subtle,#A3A3A3)]"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={clearPolygon}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-2 text-[11px] font-bold text-red-400"
          >
            <Eraser className="h-3.5 w-3.5" />
            Reset zone
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[var(--admin-faint,#737373)]">{hint}</p>

      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-2">
          <p className="text-[var(--admin-faint,#737373)]">Restaurant lat</p>
          <p className="font-mono font-bold text-[var(--admin-text,#fff)]">{latitude}</p>
        </div>
        <div className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-2">
          <p className="text-[var(--admin-faint,#737373)]">Restaurant lng</p>
          <p className="font-mono font-bold text-[var(--admin-text,#fff)]">{longitude}</p>
        </div>
        <div className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-2">
          <p className="text-[var(--admin-faint,#737373)]">Radius</p>
          <p className="font-mono font-bold text-[var(--admin-text,#fff)]">{radiusKm} km</p>
        </div>
        <div className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-2">
          <p className="text-[var(--admin-faint,#737373)]">Polygon points</p>
          <p className="font-mono font-bold text-[var(--admin-text,#fff)]">
            {(polygon || []).length}
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="z-0 h-72 w-full overflow-hidden rounded-xl border border-[var(--admin-border,#292D35)] sm:h-96"
      />
    </div>
  );
}

export { BranchServiceAreaEditor, radiusToPolygon };
