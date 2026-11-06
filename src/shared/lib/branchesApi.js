import { getOwnerSession } from "./ownerSession";
import { DEFAULT_WEEKLY_TIMETABLE } from '@/shared/data/seedData';
function authHeaders() {
  const session = getOwnerSession();
  const token = session?.token || (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null);
  return {
    Accept: "application/json",
    ...token ? { Authorization: `Bearer ${token}` } : {}
  };
}
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}
function textValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}
function numberValue(row, keys, fallback = 0) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return fallback;
}
function boolValue(row, keys, fallback = true) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.trim().toLowerCase();
      if (["true", "1", "open", "active", "live", "yes", "connected"].includes(lower)) return true;
      if (["false", "0", "closed", "inactive", "no", "disconnected"].includes(lower)) return false;
    }
    if (typeof value === "number") return value !== 0;
  }
  return fallback;
}
function isBranchRemoved(row) {
  const status = textValue(row, [
    "status",
    "branchStatus",
    "connectionStatus",
    "connectStatus",
    "accountStatus"
  ]).toLowerCase();
  if (["disconnected", "disconnect", "deleted", "removed", "unlinked"].includes(status)) {
    return true;
  }
  if (row.isDisconnected === true || row.disconnected === true || row.isDeleted === true) {
    return true;
  }
  if (row.isConnected === false || row.connected === false) return true;
  return false;
}
function isBranchDeactivated(row) {
  const status = textValue(row, ["status", "branchStatus", "accountStatus"]).toLowerCase();
  if (["inactive", "deactive", "deactivated", "disabled", "blocked", "suspended"].includes(status)) {
    return true;
  }
  if (row.isActive === false || row.active === false || row.enabled === false) return true;
  if (row.isDeactivated === true || row.deactivated === true) return true;
  return false;
}
function readId(row) {
  for (const key of ["id", "_id", "branchId", "locationId"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    const nested = asRecord(value);
    const oid = nested?.$oid || nested?.oid;
    if (typeof oid === "string" && oid.trim()) return oid.trim();
  }
  return "";
}
function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item.trim();
    const row = asRecord(item);
    if (!row) return "";
    return textValue(row, ["name", "area", "title", "label", "city"]);
  }).filter(Boolean);
}
function collectBranchRows(payload) {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  const lists = [];
  for (const key of ["branches", "data", "items", "results", "locations", "list"]) {
    const value = root[key];
    if (Array.isArray(value)) lists.push(value);
    else {
      const nested = asRecord(value);
      if (nested) {
        for (const nestedKey of ["branches", "data", "items", "results", "locations", "list"]) {
          if (Array.isArray(nested[nestedKey])) lists.push(nested[nestedKey]);
        }
      }
    }
  }
  if (lists.length) {
    return lists.sort((a, b) => b.length - a.length)[0];
  }
  if (readId(root) || textValue(root, ["name", "branchName", "title"])) return [root];
  return [];
}
function mapBranch(value) {
  const row = asRecord(value);
  if (!row) return null;
  if (isBranchRemoved(row)) return null;
  const id = readId(row);
  const name = textValue(row, ["name", "branchName", "title", "locationName", "storeName"]);
  if (!id && !name) return null;
  const deactivated = isBranchDeactivated(row);
  const city = textValue(row, ["city", "area", "town", "region"]) || "City";
  const shortName = textValue(row, ["shortName", "code", "slug", "branchCode", "short_name"]) || city || name;
  const address = textValue(row, ["address", "headAddress", "fullAddress", "location", "street"]) || city;
  const phone = textValue(row, ["phone", "contactNumber", "phoneNumber", "mobile", "whatsapp"]) || "";
  const statusText = textValue(row, ["status", "branchStatus"]).toLowerCase();
  const isOpen = deactivated || statusText === "closed" ? false : boolValue(row, ["isOpen", "open", "isLive"], true);
  const rawAreas = Array.isArray(row.areas)
    ? row.areas
    : Array.isArray(row.serviceAreas)
      ? row.serviceAreas
      : [];
  const areasServed = stringList(
    row.areasServed || row.deliveryAreas || (rawAreas.length && typeof rawAreas[0] === "string" ? rawAreas : [])
  );
  if (!areasServed.length && city && city !== "City") areasServed.push(city);
  const operatingHours = textValue(row, ["operatingHours", "openingHours", "hours", "timings", "businessHours"]) || "10:00 AM – 11:00 PM";
  const branchCode = textValue(row, ["branchCode", "code", "branch_code"]);
  const slug = textValue(row, ["slug"]);
  const latitude = textValue(row, ["latitude", "lat"]);
  const longitude = textValue(row, ["longitude", "lng", "lon", "long"]);
  const serviceAreas = rawAreas
    .map((item) => {
      if (typeof item === "string") {
        const label = item.trim();
        return label ? { id: "", name: label, radiusKm: 0, polygon: [] } : null;
      }
      const areaRow = asRecord(item);
      if (!areaRow) return null;
      const polygonRaw = Array.isArray(areaRow.polygon) ? areaRow.polygon : [];
      const polygon = polygonRaw
        .map((point) => {
          const p = asRecord(point);
          if (!p) return null;
          const plat = textValue(p, ["latitude", "lat"]);
          const plng = textValue(p, ["longitude", "lng", "lon"]);
          if (!plat || !plng) return null;
          return { latitude: plat, longitude: plng };
        })
        .filter(Boolean);
      return {
        id: readId(areaRow),
        name: textValue(areaRow, ["name", "areaName", "title"]) || "",
        radiusKm: numberValue(areaRow, ["radiusKm", "radius", "radius_km"], 0),
        polygon,
        isActive: boolValue(areaRow, ["isActive", "active"], true)
      };
    })
    .filter(Boolean);
  return {
    id: id || `branch_${name.toLowerCase().replace(/\s+/g, "_")}`,
    merchantId: textValue(row, ["merchantId", "merchant_id"]),
    businessId: textValue(row, ["bussinessId", "businessId", "business_id"]),
    branchCode,
    slug,
    name: name || shortName,
    shortName: branchCode || shortName,
    area: city === "City" && name ? name : city,
    address: address === "City" && name ? name : address,
    city: city === "City" && name ? name : city,
    district: textValue(row, ["district", "county"]),
    province: textValue(row, ["province", "state"]),
    country: textValue(row, ["country"]) || "Pakistan",
    latitude,
    longitude,
    phone,
    whatsapp: textValue(row, ["whatsapp", "whatsApp"]) || phone,
    googleMapsUrl: textValue(row, ["googleMapsUrl", "mapsUrl", "mapUrl", "locationUrl"]) || "",
    operatingHours,
    openingHours: operatingHours,
    weeklyTimetable: DEFAULT_WEEKLY_TIMETABLE,
    deliveryTime: textValue(row, ["deliveryTime", "estimatedDeliveryTime", "eta"]) || "25-35 mins",
    estimatedDeliveryTime: textValue(row, ["estimatedDeliveryTime", "deliveryTime", "eta"]) || "25-35 mins",
    deliveryFee: numberValue(row, ["deliveryFee", "delivery_fee", "shippingFee"], 150),
    freeDeliveryThreshold: numberValue(
      row,
      ["freeDeliveryThreshold", "freeDelivery", "free_delivery_threshold"],
      2e3
    ),
    minOrder: numberValue(row, ["minOrder", "minimumOrder", "min_order"], 500),
    rating: numberValue(row, ["rating", "avgRating", "stars"], 4.8),
    isOpen,
    isActive: !deactivated && boolValue(row, ["isActive", "active", "enabled"], true),
    areasServed: areasServed.length ? areasServed : name ? [name] : [],
    serviceAreas,
    isPopular: boolValue(row, ["isPopular", "popular"], true),
    email: textValue(row, ["email", "branchEmail", "contactEmail"]),
    manager: textValue(row, ["manager", "managerName", "branchManager"]),
    ordersToday: numberValue(row, ["ordersToday", "todayOrders"], 0),
    revenueToday: numberValue(row, ["revenueToday", "todayRevenue"], 0),
    createdAt: textValue(row, ["createdAt", "created_at", "createdOn"]),
    updatedAt: textValue(row, ["updatedAt", "updated_at", "updatedOn"])
  };
}
function mapOwnerBranches(payload) {
  const rows = collectBranchRows(payload);
  const mapped = rows.map(mapBranch).filter((b) => Boolean(b));
  const seen = /* @__PURE__ */ new Set();
  return mapped.filter((branch) => {
    if (seen.has(branch.id)) return false;
    seen.add(branch.id);
    return true;
  });
}
function readBranchesMeta(data) {
  const record = asRecord(data) || {};
  const showAll = asRecord(record.showAllBranchesButton);
  return {
    count: typeof record.count === "number" ? record.count : undefined,
    accountType: textValue(record, ["accountType", "account_type"]) || undefined,
    accessAllBranches: boolValue(record, ["accessAllBranches", "showAllBranches"], false),
    hasMultipleBranches: boolValue(record, ["hasMultipleBranches"], false),
    showAllBranches: boolValue(record, ["showAllBranches"], false),
    frontendDomainUrl: textValue(record, ["frontendDomainUrl"]) || undefined,
    message: textValue(record, ["message"]) || undefined,
    success: record.success === true,
    showAllBranchesButton: showAll
      ? {
          key: textValue(showAll, ["key"]) || "showAllBranches",
          label: textValue(showAll, ["label"]) || "Show All Branches",
          show: boolValue(showAll, ["show"], true),
          showAllBranches: boolValue(showAll, ["showAllBranches"], true),
          query: asRecord(showAll.query) || { showAllBranches: true }
        }
      : null
  };
}

async function getOwnerBranches(frontendDomainUrl) {
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(`/api/restaurant/owner/branches?${query.toString()}`, {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store"
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const meta = readBranchesMeta(data);
    return {
      ok: response.ok,
      status: response.status,
      data,
      branches: response.ok ? mapOwnerBranches(data) : [],
      ...meta
    };
  } catch (error) {
    console.error("Owner Branches API Error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      branches: [],
      count: undefined,
      accountType: undefined,
      accessAllBranches: false,
      hasMultipleBranches: false,
      showAllBranches: false,
      frontendDomainUrl: undefined,
      message: undefined,
      success: false,
      showAllBranchesButton: null
    };
  }
}
export {
  getOwnerBranches,
  mapOwnerBranches
};
