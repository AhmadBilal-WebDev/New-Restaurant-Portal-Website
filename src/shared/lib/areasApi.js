import { getOwnerSession } from "./ownerSession";
import { getFrontendDomainUrl } from "./catalogApi";

function authHeaders(json = false) {
  const session = getOwnerSession();
  const token =
    session?.token ||
    (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null);
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

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

function boolValue(row, keys, fallback = true) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.trim().toLowerCase();
      if (["true", "1", "yes", "active"].includes(lower)) return true;
      if (["false", "0", "no", "inactive"].includes(lower)) return false;
    }
  }
  return fallback;
}

function readId(row) {
  for (const key of ["id", "_id", "areaId"]) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    const nested = asRecord(value);
    const oid = nested?.$oid || nested?.oid;
    if (typeof oid === "string" && oid.trim()) return oid.trim();
  }
  return "";
}

function coordString(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return value.trim();
  }
  return "";
}

function mapPolygonPoint(value) {
  const row = asRecord(value);
  if (!row) return null;
  const latitude = coordString(row.latitude ?? row.lat);
  const longitude = coordString(row.longitude ?? row.lng ?? row.lon);
  if (!latitude || !longitude) return null;
  return { latitude, longitude };
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

function mapArea(value, branchId = "") {
  const row = asRecord(value);
  if (!row) return null;
  const name = textValue(row, ["name", "areaName", "title", "town"]);
  const id = readId(row);
  const polygonRaw = Array.isArray(row.polygon)
    ? row.polygon
    : Array.isArray(row.coordinates)
      ? row.coordinates
      : Array.isArray(row.points)
        ? row.points
        : [];
  const polygon = polygonRaw.map(mapPolygonPoint).filter(Boolean);
  const radiusKm = numberValue(row, ["radiusKm", "radius", "radius_km"], 0);
  if (!id && !name && !polygon.length && !radiusKm) return null;
  return {
    id: id || `area_${Date.now()}`,
    branchId: textValue(row, ["branchId", "branch_id"]) || branchId,
    name: name || "Service area",
    latitude: coordString(row.latitude ?? row.lat) || "",
    longitude: coordString(row.longitude ?? row.lng ?? row.lon) || "",
    radiusKm,
    polygon,
    isActive: boolValue(row, ["isActive", "active", "enabled"], true),
    createdAt: textValue(row, ["createdAt", "created_at"]),
    updatedAt: textValue(row, ["updatedAt", "updated_at"])
  };
}

function collectAreas(payload) {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  for (const key of ["areas", "data", "items", "results", "list", "towns"]) {
    const value = root[key];
    if (Array.isArray(value)) return value;
    const nested = asRecord(value);
    if (nested) {
      for (const nestedKey of ["areas", "data", "items", "results", "list"]) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey];
      }
    }
  }
  if (
    readId(root) ||
    textValue(root, ["name", "areaName"]) ||
    Array.isArray(root.polygon) ||
    root.radiusKm != null
  ) {
    return [root];
  }
  return [];
}

function apiMessage(data, fallback) {
  const record = asRecord(data);
  const fromFields = textValue(record, ["message", "error", "detail"]);
  if (fromFields) {
    // Express HTML "Cannot POST ..." sometimes lands in message
    const plain = fromFields.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plain || fromFields;
  }
  if (typeof data === "string" && data.trim()) {
    return data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return fallback || "Request failed";
}

function buildAreaPayload(input) {
  const radiusRaw = input?.radiusKm;
  const radiusKm =
    typeof radiusRaw === "number" && Number.isFinite(radiusRaw)
      ? radiusRaw
      : Number(radiusRaw);
  return {
    radiusKm: Number.isFinite(radiusKm) ? radiusKm : 0,
    polygon: (Array.isArray(input.polygon) ? input.polygon : [])
      .map(mapPolygonPoint)
      .filter(Boolean)
  };
}

async function parseResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}

async function getBranchAreas(branchId, frontendDomainUrl = getFrontendDomainUrl()) {
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(
      `/api/restaurant/owner/branches/${encodeURIComponent(branchId)}/areas?${query}`,
      {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store"
      }
    );
    const result = await parseResponse(response);
    // Some backends expose POST/PUT/DELETE before GET list is ready.
    if (result.status === 404) {
      return {
        ok: true,
        status: 404,
        data: result.data,
        areas: [],
        message: "",
        listUnsupported: true
      };
    }
    return {
      ...result,
      areas: result.ok
        ? collectAreas(result.data)
            .map((row) => mapArea(row, branchId))
            .filter(Boolean)
        : [],
      message: apiMessage(result.data, result.ok ? "" : "Areas could not be loaded.")
    };
  } catch (error) {
    console.error("Areas GET error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      areas: [],
      message: "Areas API is not reachable."
    };
  }
}

async function createBranchArea(
  branchId,
  input,
  frontendDomainUrl = getFrontendDomainUrl()
) {
  // Backend exposes PUT on /branches/:id/areas (POST returns Cannot POST).
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(
      `/api/restaurant/owner/branches/${encodeURIComponent(branchId)}/areas?${query}`,
      {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(buildAreaPayload(input)),
        cache: "no-store"
      }
    );
    const result = await parseResponse(response);
    const mapped =
      mapArea(asRecord(result.data)?.area || asRecord(result.data)?.data || result.data, branchId) ||
      (result.ok ? mapArea({ ...buildAreaPayload(input), id: `temp_${Date.now()}` }, branchId) : null);
    return {
      ...result,
      area: mapped,
      message: apiMessage(
        result.data,
        result.ok ? "Area saved successfully." : "Area could not be saved."
      )
    };
  } catch (error) {
    console.error("Areas PUT (create/upsert) error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      area: null,
      message: "Areas API is not reachable."
    };
  }
}

async function updateBranchArea(
  branchId,
  areaId,
  input,
  frontendDomainUrl = getFrontendDomainUrl()
) {
  // Backend only accepts PUT on /branches/:id/areas (no /areas/:areaId route).
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(
      `/api/restaurant/owner/branches/${encodeURIComponent(branchId)}/areas?${query}`,
      {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(buildAreaPayload(input)),
        cache: "no-store"
      }
    );
    const result = await parseResponse(response);
    const mapped =
      mapArea(asRecord(result.data)?.area || asRecord(result.data)?.data || result.data, branchId) ||
      (result.ok
        ? mapArea({ ...buildAreaPayload(input), id: areaId || `temp_${Date.now()}` }, branchId)
        : null);
    return {
      ...result,
      area: mapped,
      message: apiMessage(
        result.data,
        result.ok ? "Area updated successfully." : "Area could not be updated."
      )
    };
  } catch (error) {
    console.error("Areas PUT error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      area: null,
      message: "Areas API is not reachable."
    };
  }
}

async function deleteBranchArea(
  branchId,
  _areaId,
  frontendDomainUrl = getFrontendDomainUrl()
) {
  // Backend accepts DELETE on /branches/:id/areas (collection).
  // /areas/:areaId returns "Cannot DELETE".
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(
      `/api/restaurant/owner/branches/${encodeURIComponent(branchId)}/areas?${query}`,
      {
        method: "DELETE",
        headers: authHeaders(),
        cache: "no-store"
      }
    );
    const result = await parseResponse(response);
    return {
      ...result,
      message: apiMessage(
        result.data,
        result.ok ? "Area deleted successfully." : "Area could not be deleted."
      )
    };
  } catch (error) {
    console.error("Areas DELETE error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      message: "Areas API is not reachable."
    };
  }
}

export {
  createBranchArea,
  deleteBranchArea,
  getBranchAreas,
  mapArea,
  updateBranchArea
};
