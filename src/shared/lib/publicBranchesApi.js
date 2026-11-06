import { getPublicFrontendDomainUrl } from "./catalogApi";

const LOCATION_SESSION_KEY = "bite_location_selection";

function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return null;
}

function textValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(row, keys, fallback = 0) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return fallback;
}

function boolValue(row, keys, fallback = true) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.trim().toLowerCase();
      if (["true", "1", "yes", "active", "open"].includes(lower)) return true;
      if (["false", "0", "no", "inactive", "closed"].includes(lower)) return false;
    }
  }
  return fallback;
}

function readId(row) {
  for (const key of ["id", "_id", "branchId"]) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function mapPolygonPoint(value) {
  const row = asRecord(value);
  if (!row) return null;
  const latitude = textValue(row, ["latitude", "lat"]);
  const longitude = textValue(row, ["longitude", "lng", "lon"]);
  if (!latitude || !longitude) return null;
  return { latitude, longitude };
}

function mapPublicBranch(value) {
  const row = asRecord(value);
  if (!row) return null;
  const id = readId(row);
  const name = textValue(row, ["name", "branchName", "title"]);
  if (!id && !name) return null;
  const polygonRaw = Array.isArray(row.servicePolygon)
    ? row.servicePolygon
    : Array.isArray(row.polygon)
      ? row.polygon
      : [];
  return {
    id: id || `branch_${name.toLowerCase().replace(/\s+/g, "_")}`,
    name: name || "Branch",
    shortName: textValue(row, ["shortName", "branchCode", "slug"]) || name,
    slug: textValue(row, ["slug"]),
    branchCode: textValue(row, ["branchCode", "code"]),
    address: textValue(row, ["address", "fullAddress"]) || textValue(row, ["city"]),
    city: textValue(row, ["city", "area"]),
    area: textValue(row, ["city", "area", "district"]),
    district: textValue(row, ["district"]),
    province: textValue(row, ["province", "state"]),
    country: textValue(row, ["country"]) || "Pakistan",
    phone: textValue(row, ["contactNumber", "phone", "phoneNumber"]),
    countryCode: textValue(row, ["countryCode"]) || "+92",
    openingTime: textValue(row, ["openingTime", "openTime"]) || "10:00",
    closingTime: textValue(row, ["closingTime", "closeTime"]) || "23:00",
    latitude: textValue(row, ["latitude", "lat"]),
    longitude: textValue(row, ["longitude", "lng", "lon"]),
    serviceRadiusKm: numberValue(row, ["serviceRadiusKm", "radiusKm", "radius"], 0),
    servicePolygon: polygonRaw.map(mapPolygonPoint).filter(Boolean),
    isActive: boolValue(row, ["isActive", "active"], true),
    isOpen: boolValue(row, ["isOpen", "open"], true),
    rating: numberValue(row, ["rating"], 4.8),
    deliveryTime: textValue(row, ["deliveryTime"]) || "25-35 mins",
    areasServed: [textValue(row, ["city", "area", "name"])].filter(Boolean)
  };
}

function collectBranches(payload) {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  for (const key of ["branches", "data", "items", "results", "list"]) {
    if (Array.isArray(root[key])) return root[key];
  }
  return [];
}

async function getPublicBranches(frontendDomainUrl = getPublicFrontendDomainUrl()) {
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(`/api/restaurant/branches/public?${query}`, {
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
    const branches = response.ok
      ? collectBranches(data).map(mapPublicBranch).filter(Boolean)
      : [];
    return {
      ok: response.ok,
      status: response.status,
      data,
      branches,
      message:
        asRecord(data)?.message ||
        (response.ok ? "Branches fetched successfully" : "Branches could not be loaded.")
    };
  } catch (error) {
    console.error("Public branches error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      branches: [],
      message: "Branches API is not reachable."
    };
  }
}

async function checkBranchServiceArea(
  branchId,
  latitude,
  longitude,
  frontendDomainUrl = getPublicFrontendDomainUrl()
) {
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(
      `/api/restaurant/branches/${encodeURIComponent(branchId)}/check-service-area?${query}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          latitude: String(latitude),
          longitude: String(longitude)
        }),
        cache: "no-store"
      }
    );
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const record = asRecord(data) || {};
    const allowed =
      record.allowed === true ||
      record.inServiceArea === true ||
      record.inside === true;
    return {
      ok: response.ok,
      status: response.status,
      data,
      allowed: response.ok ? allowed : false,
      message:
        textValue(record, ["message", "error", "detail"]) ||
        (response.ok
          ? allowed
            ? "Location is within service area"
            : "This location is outside the restaurant service area"
          : "Could not check service area.")
    };
  } catch (error) {
    console.error("check-service-area error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      allowed: false,
      message: "Service area check failed."
    };
  }
}

function readLocationSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LOCATION_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.branchId || !parsed.orderMode) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocationSession(selection) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(selection));
  } catch {
    /* ignore */
  }
}

function clearLocationSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LOCATION_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export {
  LOCATION_SESSION_KEY,
  checkBranchServiceArea,
  clearLocationSession,
  getPublicBranches,
  mapPublicBranch,
  readLocationSession,
  writeLocationSession
};
