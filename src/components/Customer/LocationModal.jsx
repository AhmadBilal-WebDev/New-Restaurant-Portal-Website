'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadLeaflet } from '@/shared/lib/loadLeaflet';
import {
  AlertCircle,
  Bike,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { getPublicFrontendDomainUrl } from '@/shared/lib/catalogApi';
import {
  checkBranchServiceArea,
  getPublicBranches,
  writeLocationSession
} from '@/shared/lib/publicBranchesApi';
import {
  isGeolocationSecureContext,
  requestCurrentPosition
} from '@/shared/lib/geolocation';

const ENGLISH_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ACCENT = "#E51B23";

function toNum(value, fallback = NaN) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function LocationPickerMap({
  branch,
  latitude,
  longitude,
  onPick,
  className = ""
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const branchMarkerRef = useRef(null);
  const polygonRef = useRef(null);
  const onPickRef = useRef(onPick);
  const leafletRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

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
    const branchLat = toNum(branch?.latitude, 31.52);
    const branchLng = toNum(branch?.longitude, 74.35);
    const map = L.map(containerRef.current, {
      center: [branchLat, branchLng],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer(ENGLISH_TILE_URL, {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19
    }).addTo(map);

    map.on("click", (event) => {
      onPickRef.current?.({
        latitude: event.latlng.lat.toFixed(5),
        longitude: event.latlng.lng.toFixed(5)
      });
    });

    mapRef.current = map;
    const t1 = window.setTimeout(() => map.invalidateSize(), 80);
    const t2 = window.setTimeout(() => map.invalidateSize(), 280);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      branchMarkerRef.current = null;
      polygonRef.current = null;
    };
  }, [leafletReady, branch?.id]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !branch) return;

    const branchLat = toNum(branch.latitude);
    const branchLng = toNum(branch.longitude);

    if (Number.isFinite(branchLat) && Number.isFinite(branchLng)) {
      if (!branchMarkerRef.current) {
        branchMarkerRef.current = L.circleMarker([branchLat, branchLng], {
          radius: 8,
          color: "#fff",
          weight: 2,
          fillColor: "#191919",
          fillOpacity: 1
        }).addTo(map);
        branchMarkerRef.current.bindTooltip(branch.name || "Restaurant", {
          permanent: true,
          direction: "top",
          offset: [0, -10],
          className: "loc-pin-tooltip"
        });
      } else {
        branchMarkerRef.current.setLatLng([branchLat, branchLng]);
      }
    }

    const polyPoints = (branch.servicePolygon || [])
      .map((p) => [toNum(p.latitude), toNum(p.longitude)])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

    if (polyPoints.length >= 3) {
      if (!polygonRef.current) {
        polygonRef.current = L.polygon(polyPoints, {
          color: ACCENT,
          weight: 2,
          fillColor: ACCENT,
          fillOpacity: 0.12
        }).addTo(map);
      } else {
        polygonRef.current.setLatLngs(polyPoints);
      }
    } else if (polygonRef.current) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    const userLat = toNum(latitude);
    const userLng = toNum(longitude);
    if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker([userLat, userLng], {
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: ACCENT,
          fillOpacity: 1
        }).addTo(map);
        userMarkerRef.current.bindTooltip("Your location", {
          permanent: true,
          direction: "top",
          offset: [0, -10],
          className: "loc-pin-tooltip"
        });
      } else {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      }
      map.setView([userLat, userLng], Math.max(map.getZoom(), 13));
    } else if (Number.isFinite(branchLat) && Number.isFinite(branchLng)) {
      if (polygonRef.current) {
        try {
          map.fitBounds(polygonRef.current.getBounds().pad(0.15));
        } catch {
          map.setView([branchLat, branchLng], 12);
        }
      } else {
        map.setView([branchLat, branchLng], 12);
      }
    }
  }, [leafletReady, branch, latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className={`z-0 h-56 w-full overflow-hidden rounded-2xl border border-[#E9E2D8] sm:h-64 ${className}`}
    />
  );
}

const LocationModal = ({
  isOpen,
  onClose,
  branches: fallbackBranches = [],
  currentSelection,
  onSelectBranch,
  isFirstVisit = false,
  cartCount = 0,
  onClearCart
}) => {
  const { config } = useRestaurant();
  const [publicBranches, setPublicBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(
    currentSelection?.branchId || ""
  );
  const [orderMode, setOrderMode] = useState(currentSelection?.orderMode || "delivery");
  const [searchQuery, setSearchQuery] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [userLat, setUserLat] = useState(currentSelection?.latitude || "");
  const [userLng, setUserLng] = useState(currentSelection?.longitude || "");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [coverage, setCoverage] = useState(null);
  const [showCartWarning, setShowCartWarning] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState(null);
  const [gpsSecureContext, setGpsSecureContext] = useState(true);

  const branches = publicBranches.length ? publicBranches : fallbackBranches;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function load() {
      setLoadingBranches(true);
      const result = await getPublicBranches(getPublicFrontendDomainUrl());
      if (cancelled) return;
      setLoadingBranches(false);
      if (result.ok && result.branches.length) {
        setPublicBranches(result.branches);
        setSelectedBranchId((prev) => {
          if (prev && result.branches.some((b) => b.id === prev)) return prev;
          if (
            currentSelection?.branchId &&
            result.branches.some((b) => b.id === currentSelection.branchId)
          ) {
            return currentSelection.branchId;
          }
          return result.branches[0].id;
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentSelection?.branchId]);

  useEffect(() => {
    if (!isOpen) return;
    setOrderMode(currentSelection?.orderMode || "delivery");
    setUserLat(currentSelection?.latitude || "");
    setUserLng(currentSelection?.longitude || "");
    setCoverage(null);
    setGpsSecureContext(isGeolocationSecureContext());
  }, [isOpen, currentSelection]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) || branches[0] || null,
    [branches, selectedBranchId]
  );

  const previousBranch =
    branches.find((b) => b.id === currentSelection?.branchId) || branches[0];

  const filteredBranches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return branches;
    return branches.filter((branch) =>
      [branch.name, branch.address, branch.city, branch.district, branch.branchCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [branches, searchQuery]);

  const runCoverageCheck = useCallback(
    async (branchId, lat, lng) => {
      if (!branchId || !lat || !lng) {
        setCoverage(null);
        return null;
      }
      setIsChecking(true);
      const result = await checkBranchServiceArea(
        branchId,
        lat,
        lng,
        getPublicFrontendDomainUrl()
      );
      setIsChecking(false);
      const next = {
        allowed: result.allowed,
        message: result.message,
        ok: result.ok
      };
      setCoverage(next);
      return next;
    },
    []
  );

  const applyUserLocation = useCallback(
    async (lat, lng) => {
      const latStr = String(lat);
      const lngStr = String(lng);
      setUserLat(latStr);
      setUserLng(lngStr);
      // Coverage check is for delivery only; pick-up just needs the pin.
      if (orderMode === "delivery" && selectedBranchId) {
        await runCoverageCheck(selectedBranchId, latStr, lngStr);
      } else {
        setCoverage(
          orderMode === "pickup"
            ? { allowed: true, message: "Location set for pick-up.", ok: true }
            : null
        );
      }
    },
    [selectedBranchId, runCoverageCheck, orderMode]
  );

  const applyBranchChange = (branchId) => {
    setSelectedBranchId(branchId);
    setCoverage(null);
    if (orderMode === "delivery" && userLat && userLng) {
      void runCoverageCheck(branchId, userLat, userLng);
    }
  };

  const handleSelectBranchWithCartCheck = (branchId) => {
    if (cartCount > 0 && branchId !== currentSelection?.branchId) {
      setPendingBranchId(branchId);
      setShowCartWarning(true);
      return;
    }
    applyBranchChange(branchId);
  };

  const handleConfirmCartWarning = () => {
    if (pendingBranchId) {
      onClearCart?.();
      applyBranchChange(pendingBranchId);
    }
    setShowCartWarning(false);
    setPendingBranchId(null);
  };

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const result = await requestCurrentPosition();
      if (!result.ok) {
        setCoverage({
          allowed: false,
          message: result.message,
          ok: false
        });
        return;
      }
      await applyUserLocation(result.latitude, result.longitude);
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddressSearch = async () => {
    const q = addressQuery.trim();
    if (q.length < 3) return;
    setIsSearching(true);
    try {
      const cityHint = activeBranch?.city || activeBranch?.name || "";
      const params = new URLSearchParams({ q });
      if (cityHint) params.set("city", cityHint);
      const response = await fetch(`/api/geocode?${params}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const data = await response.json();
      if (!data?.ok || !data?.result) {
        setCoverage({
          allowed: false,
          message: "Address / location not found. Try another search.",
          ok: false
        });
        return;
      }
      await applyUserLocation(data.result.latitude, data.result.longitude);
    } catch {
      setCoverage({
        allowed: false,
        message: "Address search failed. Try again.",
        ok: false
      });
    } finally {
      setIsSearching(false);
    }
  };

  const hasCustomerLocation = Boolean(userLat && userLng);
  // Delivery + Pick-up both require customer pin (GPS / search / map).
  // Delivery also requires in-coverage; pick-up only needs a valid location pin.
  const canConfirm =
    Boolean(selectedBranchId) &&
    hasCustomerLocation &&
    (orderMode === "pickup" || coverage?.allowed === true);

  const handleConfirm = () => {
    if (!canConfirm || !activeBranch) return;
    if (cartCount > 0 && selectedBranchId !== currentSelection?.branchId) {
      setPendingBranchId(selectedBranchId);
      setShowCartWarning(true);
      return;
    }

    const selection = {
      branchId: selectedBranchId,
      branchName: activeBranch.name,
      selectedArea: activeBranch.city || activeBranch.area || activeBranch.name,
      orderMode,
      latitude: userLat || "",
      longitude: userLng || "",
      allowed: orderMode === "pickup" ? true : coverage?.allowed === true
    };
    writeLocationSession(selection);
    onSelectBranch(selection);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4">
      <style>{`
        .leaflet-tooltip.loc-pin-tooltip {
          background: #191919 !important;
          border: none !important;
          color: #fff !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
        }
        .leaflet-tooltip.loc-pin-tooltip::before {
          border-top-color: #191919 !important;
        }
      `}</style>

      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        onClick={() => {
          if (!isFirstVisit) onClose();
        }}
      />

      {showCartWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-red-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-[#191919]">Clear cart & change branch?</h3>
            <p className="text-xs leading-relaxed text-neutral-600">
              Switching from <strong>{previousBranch?.name || "current branch"}</strong> clears{" "}
              <strong>{cartCount}</strong> cart item(s).
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCartWarning(false);
                  setPendingBranchId(null);
                }}
                className="flex-1 rounded-2xl border border-[#EEE7DC] py-2.5 text-xs font-bold text-neutral-700"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleConfirmCartWarning}
                className="flex-1 rounded-2xl bg-[#E51B23] py-2.5 text-xs font-bold text-white"
              >
                Clear & switch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#E9E2D8] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#E9E2D8] bg-[#FFF9EF] p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E51B23] text-white shadow-md">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#E51B23]">
                {config.name || "Restaurant"}
              </p>
              <h2 className="font-['Outfit'] text-xl font-black tracking-tight text-[#191919] sm:text-2xl">
                Choose branch & your location
              </h2>
              <p className="mt-0.5 text-xs text-[#777777] sm:text-sm">
                {orderMode === "pickup"
                  ? "Select a branch and set your current location — required even for pick-up."
                  : "Select a branch, then set your location so we can check delivery coverage."}
              </p>
            </div>
          </div>
          {!isFirstVisit && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9E2D8] bg-white text-neutral-500"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 no-scrollbar sm:p-6">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-neutral-800">
              Order type
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#EEE7DC] bg-[#FAF6F0] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setOrderMode("delivery");
                  setCoverage(null);
                  if (userLat && userLng && selectedBranchId) {
                    void runCoverageCheck(selectedBranchId, userLat, userLng);
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition-all sm:text-sm ${
                  orderMode === "delivery"
                    ? "bg-[#E51B23] text-white shadow-md"
                    : "text-neutral-600 hover:bg-white/60"
                }`}
              >
                <Bike className="h-4 w-4" />
                Delivery
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderMode("pickup");
                  setCoverage(
                    userLat && userLng
                      ? { allowed: true, message: "Location set for pick-up.", ok: true }
                      : null
                  );
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition-all sm:text-sm ${
                  orderMode === "pickup"
                    ? "bg-[#191919] text-white shadow-md"
                    : "text-neutral-600 hover:bg-white/60"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                Pick-Up
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search branches by city, code, or address..."
              className="w-full rounded-2xl border border-[#E9E2D8] bg-[#FAF6F0] py-2.5 pl-10 pr-4 text-xs text-[#191919] focus:border-[#E51B23] focus:bg-white focus:outline-none sm:text-sm"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-800">
                Branches {loadingBranches ? "" : `(${filteredBranches.length})`}
              </label>
            </div>

            {loadingBranches ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E9E2D8] py-10 text-xs font-bold text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading branches...
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E9E2D8] py-10 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
                <p className="text-sm font-bold text-[#191919]">No branches found</p>
              </div>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {filteredBranches.map((branch) => {
                  const selected = branch.id === selectedBranchId;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleSelectBranchWithCartCheck(branch.id)}
                      className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                        selected
                          ? "border-[#E51B23] bg-[#FFF9EF] shadow-md ring-2 ring-[#E51B23]/15"
                          : "border-[#E9E2D8] bg-white hover:border-[#E51B23]/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            selected
                              ? "bg-[#E51B23] text-white"
                              : "border-2 border-neutral-300 bg-white"
                          }`}
                        >
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-[#191919]">{branch.name}</h3>
                            {branch.branchCode ? (
                              <span className="rounded-md bg-[#191919]/5 px-1.5 py-0.5 text-[10px] font-bold text-[#555]">
                                {branch.branchCode}
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                branch.isActive !== false
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {branch.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-[#555]">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E51B23]" />
                            <span>{branch.address || branch.city}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-neutral-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {branch.openingTime} – {branch.closingTime}
                            </span>
                            {branch.serviceRadiusKm ? (
                              <span>Radius {branch.serviceRadiusKm} km</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeBranch ? (
            <div className="space-y-3 rounded-2xl border border-[#E9E2D8] bg-[#FAF6F0] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    {orderMode === "pickup" ? "Your location (required for pick-up)" : "Delivery location (required)"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#777]">
                    {orderMode === "pickup"
                      ? "Tell us where you are now — use GPS, search, or tap the map."
                      : "Use GPS, search an address, or tap the map — location is required for delivery."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDetectLocation()}
                  disabled={isLocating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9E2D8] bg-white px-3 py-2 text-xs font-bold text-[#191919] disabled:opacity-50"
                >
                  {isLocating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E51B23]" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5 text-[#E51B23]" />
                  )}
                  Use my GPS
                </button>
              </div>

              {!gpsSecureContext ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-semibold text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    This page is on HTTP, so phone GPS may be blocked. Use{" "}
                    <code className="rounded bg-white px-1">npm run dev:https</code> and open the
                    HTTPS URL, or tap the map / search to set your pin.
                  </span>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddressSearch();
                      }
                    }}
                    placeholder="Search area / address..."
                    className="w-full rounded-xl border border-[#E9E2D8] bg-white py-2.5 pl-9 pr-3 text-xs text-[#191919] focus:border-[#E51B23] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddressSearch()}
                  disabled={isSearching || addressQuery.trim().length < 3}
                  className="rounded-xl bg-[#191919] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isSearching ? "Searching..." : "Find"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-[#E9E2D8] bg-white px-3 py-2">
                  <p className="text-[#777]">Your latitude</p>
                  <p className="font-mono font-bold text-[#191919]">{userLat || "—"}</p>
                </div>
                <div className="rounded-xl border border-[#E9E2D8] bg-white px-3 py-2">
                  <p className="text-[#777]">Your longitude</p>
                  <p className="font-mono font-bold text-[#191919]">{userLng || "—"}</p>
                </div>
              </div>

              <LocationPickerMap
                branch={activeBranch}
                latitude={userLat}
                longitude={userLng}
                onPick={(point) => void applyUserLocation(point.latitude, point.longitude)}
              />

              {!hasCustomerLocation && !isChecking ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {orderMode === "pickup"
                      ? "Set your current location to continue with pick-up."
                      : "Set your current or delivery location to continue."}
                  </span>
                </div>
              ) : null}

              {isChecking ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#E9E2D8] bg-white px-3 py-2.5 text-xs font-semibold text-neutral-600">
                  <Loader2 className="h-4 w-4 animate-spin text-[#E51B23]" />
                  Checking service area...
                </div>
              ) : null}

              {coverage && !isChecking ? (
                <div
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                    coverage.allowed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {coverage.allowed ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {coverage.allowed
                      ? coverage.message || "OK — we can serve this location."
                      : coverage.message || "Out of service / address location not found."}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E9E2D8] bg-[#FFF9EF] p-4 sm:flex-row sm:p-5">
          <div className="text-center text-xs text-[#555] sm:text-left">
            {activeBranch ? (
              <>
                Ordering from:{" "}
                <strong className="text-[#191919]">
                  {activeBranch.name} · {orderMode === "pickup" ? "Pick-Up" : "Delivery"}
                </strong>
              </>
            ) : (
              "Select a branch to continue"
            )}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {!isFirstVisit && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-[#E9E2D8] bg-white px-4 py-2.5 text-xs font-bold text-[#555] sm:flex-none"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#E51B23] px-6 py-2.5 text-xs font-extrabold text-white shadow-glow-red transition-all hover:-translate-y-0.5 hover:bg-[#B90F16] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:text-sm"
            >
              <span>Confirm location</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LocationModal };
