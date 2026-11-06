import { expireOwnerSession, getOwnerSession } from "./ownerSession";
import { CATALOG_TAGS } from "./catalogApi";

const RESTAURANT_DEAL_TAGS = CATALOG_TAGS.map((tag) => ({
  value: tag.key,
  label: tag.label
}));

function restaurantDealTagLabel(tag) {
  if (tag && typeof tag === "object") {
    return tag.label || tag.key || tag.value || "Tag";
  }
  return RESTAURANT_DEAL_TAGS.find((item) => item.value === tag)?.label || String(tag || "");
}

function restaurantDealTagKey(tag) {
  if (typeof tag === "string") return tag.trim();
  if (tag && typeof tag === "object") {
    const key = tag.key || tag.value || tag.id;
    return typeof key === "string" ? key.trim() : "";
  }
  return "";
}

const pendingDealRequests = /* @__PURE__ */ new Map();

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
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function readText(record, keys, fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function readId(record) {
  for (const key of ["id", "_id", "dealId"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    const nested = asRecord(value);
    const objectId = nested?.$oid ?? nested?.oid;
    if (typeof objectId === "string" && objectId.trim()) return objectId.trim();
  }
  return "";
}

function readNumber(record, keys, fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readBoolean(record, keys, fallback = false) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (["true", "1", "yes"].includes(value.trim().toLowerCase())) return true;
      if (["false", "0", "no"].includes(value.trim().toLowerCase())) return false;
    }
  }
  return fallback;
}

function readBranchNames(record) {
  const value = record.branchName ?? record.BranchName ?? record.branches;
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (typeof entry === "number") return String(entry);
        const nested = asRecord(entry);
        return nested ? readText(nested, ["name", "branchName", "city", "shortName"]) : "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function mapDealTags(rawTags) {
  if (!Array.isArray(rawTags)) return [];
  return rawTags
    .map((tag) => {
      if (typeof tag === "string" && tag.trim()) {
        return {
          key: tag.trim(),
          label: restaurantDealTagLabel(tag.trim()),
          emoji: "",
          isActive: true
        };
      }
      const record = asRecord(tag);
      if (!record) return null;
      const key = restaurantDealTagKey(record);
      if (!key) return null;
      return {
        key,
        label: readText(record, ["label", "name", "title"], restaurantDealTagLabel(key)),
        emoji: readText(record, ["emoji", "icon"]),
        isActive: readBoolean(record, ["isActive", "active"], true)
      };
    })
    .filter(Boolean);
}

function mapDeal(value) {
  const record = asRecord(value);
  if (!record) return null;
  const id = readId(record);
  if (!id) return null;

  const rawItems = Array.isArray(record.items) ? record.items : [];
  const branchNames = readBranchNames(record);
  const originalPrice = readNumber(record, ["originalPrice"]);
  const dealPrice = readNumber(record, ["dealPrice", "price"]);
  const discountPercentRaw = readNumber(record, ["discountPercent", "discount"], NaN);
  const discountPercent = Number.isFinite(discountPercentRaw)
    ? discountPercentRaw
    : originalPrice > 0
      ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100)
      : 0;
  const tags = mapDealTags(record.tags);
  const displayOrder = readNumber(record, ["displayOrder", "sort"], 1);

  return {
    id,
    merchantId: readText(record, ["merchantId", "merchant_id"]),
    businessId: readText(record, ["bussinessId", "businessId", "business_id"]),
    branchId:
      record.branchId === null || record.branchId === undefined
        ? null
        : readText(record, ["branchId", "branch_id"]) || null,
    branchNames,
    branchName: branchNames[0] || "",
    showAllBranches: readBoolean(record, ["showAllBranches"]),
    name: readText(record, ["name", "title"]),
    slug: readText(record, ["slug"]),
    shortDescription: readText(record, ["shortDescription", "description"]),
    image: readText(record, ["image", "imageUrl"]),
    originalPrice,
    dealPrice,
    discountPercent,
    discountLabel:
      readText(record, ["discountLabel", "offerLabel"]) ||
      (discountPercent > 0 ? `${discountPercent}% OFF` : ""),
    startDate: readText(record, ["startDate"]),
    endDate: readText(record, ["endDate"]),
    tags,
    tagKeys: tags.map((tag) => tag.key),
    isActive: readBoolean(record, ["isActive"], true),
    termsAndConditions: readText(record, ["termsAndConditions"]),
    items: rawItems
      .map((item) => {
        const itemRecord = asRecord(item);
        if (!itemRecord) return null;
        const name = readText(itemRecord, ["name"]);
        if (!name) return null;
        const readOptions = (keys) => {
          const source = keys.map((key) => itemRecord[key]).find(Array.isArray);
          if (Array.isArray(source)) {
            return source
              .map((option) => {
                const optionRecord = asRecord(option);
                return optionRecord
                  ? { quantity: readNumber(optionRecord, ["quantity"], 1) }
                  : null;
              })
              .filter((option) => Boolean(option));
          }
          const legacyQuantity = keys
            .map((key) => itemRecord[key])
            .find(
              (entry) =>
                typeof entry === "number" ||
                (typeof entry === "string" && entry.trim())
            );
          if (typeof legacyQuantity === "number" && legacyQuantity > 0) {
            return [{ quantity: legacyQuantity }];
          }
          if (typeof legacyQuantity === "string" && Number(legacyQuantity) > 0) {
            return [{ quantity: Number(legacyQuantity) }];
          }
          return [];
        };
        const sizes = readOptions(["sizes", "size"]);
        const addons = readOptions(["addons", "addon", "addOn"]);
        const extras = readOptions(["extras", "extra"]);
        const productIdRaw = itemRecord.productId;
        return {
          id: readId(itemRecord) || undefined,
          name,
          quantity: readNumber(itemRecord, ["quantity"], 1),
          productId:
            productIdRaw === null || productIdRaw === undefined
              ? null
              : readText(itemRecord, ["productId", "product_id"]) || null,
          ...(sizes.length ? { sizes } : {}),
          ...(addons.length ? { addons } : {}),
          ...(extras.length ? { extras } : {})
        };
      })
      .filter((item) => Boolean(item)),
    displayOrder,
    sort: readNumber(record, ["sort", "displayOrder"], displayOrder),
    createdAt: readText(record, ["createdAt", "created_at", "createdOn"]),
    updatedAt: readText(record, ["updatedAt", "updated_at", "updatedOn", "modifiedAt"]),
    createdBy: readText(record, ["createdBy", "created_by"]),
    createdByType: readText(record, ["createdByType", "created_by_type"])
  };
}

function collectDeals(data, depth = 0) {
  if (depth > 5) return [];
  if (Array.isArray(data)) {
    const mapped = data.map(mapDeal).filter((deal) => Boolean(deal));
    if (mapped.length) return mapped;
    for (const entry of data) {
      const nested = collectDeals(entry, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  }
  const record = asRecord(data);
  if (!record) return [];
  if (record.deal) {
    const single = mapDeal(record.deal);
    if (single) return [single];
  }
  for (const key of [
    "deals",
    "data",
    "results",
    "list",
    "docs",
    "rows",
    "result",
    "payload"
  ]) {
    const candidate = record[key];
    if (candidate !== undefined) {
      const nested = collectDeals(candidate, depth + 1);
      if (nested.length) return nested;
    }
  }
  const maybeDeal = mapDeal(record);
  if (maybeDeal && (record.name || record.dealPrice !== undefined)) return [maybeDeal];
  return [];
}

function readListMeta(data) {
  const record = asRecord(data) || {};
  return {
    count: typeof record.count === "number" ? record.count : undefined,
    branch: record.branch ?? null,
    message: typeof record.message === "string" ? record.message : undefined,
    success: record.success === true,
    frontendDomainUrl:
      typeof record.frontendDomainUrl === "string" ? record.frontendDomainUrl : undefined
  };
}

async function request(path, method, payload, publicRequest = false) {
  try {
    const response = await fetch(path, {
      method,
      headers: publicRequest
        ? { Accept: "application/json" }
        : authHeaders(payload !== undefined),
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      cache: "no-store"
    });
    if (response.status === 401 && !publicRequest) expireOwnerSession();
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || "Backend returned a non-JSON response." };
    }
    return {
      ok: response.ok,
      status: response.status,
      data,
      deals: collectDeals(data),
      ...readListMeta(data)
    };
  } catch (error) {
    console.error("Restaurant Deals API Error:", error);
    return {
      ok: false,
      status: 500,
      data: null,
      deals: [],
      count: undefined,
      branch: null,
      message: undefined,
      success: false
    };
  }
}

function dealsPath(domain, branchName) {
  const query = new URLSearchParams({ domain });
  if (branchName) query.set("branchName", branchName);
  return `/api/restaurant/deals?${query.toString()}`;
}

function getRestaurantDeals(domain, branchName) {
  const path = dealsPath(domain, branchName);
  const pendingRequest = pendingDealRequests.get(path);
  if (pendingRequest) return pendingRequest;
  const requestPromise = request(path, "GET").finally(() => {
    pendingDealRequests.delete(path);
  });
  pendingDealRequests.set(path, requestPromise);
  return requestPromise;
}

/** Branch query value expected by public deals API (matches backend branch.name). */
function getPublicDealBranchName(branchOrName) {
  if (!branchOrName) return "";
  if (typeof branchOrName === "string") return branchOrName.trim();
  const record = asRecord(branchOrName);
  if (!record) return "";
  return (
    readText(record, ["name", "branchName"]) ||
    readText(record, ["city", "shortName", "code", "branchCode"]) ||
    ""
  );
}

function getPublicRestaurantDeals(domain, branchName) {
  const query = new URLSearchParams();
  if (domain) query.set("domain", String(domain).trim());
  const branch = typeof branchName === "string" ? branchName.trim() : getPublicDealBranchName(branchName);
  if (branch) query.set("branchName", branch);
  return request(`/api/restaurant/deals/public?${query.toString()}`, "GET", undefined, true);
}

function createRestaurantDeal(domain, payload) {
  return request(dealsPath(domain), "POST", payload);
}

function updateRestaurantDeal(id, domain, payload) {
  return request(
    `/api/restaurant/deals/${encodeURIComponent(id)}?${new URLSearchParams({ domain }).toString()}`,
    "PUT",
    payload
  );
}

function deleteRestaurantDeal(id, domain) {
  return request(
    `/api/restaurant/deals/${encodeURIComponent(id)}?${new URLSearchParams({ domain }).toString()}`,
    "DELETE"
  );
}

function restaurantDealApiMessage(data, fallback) {
  const record = asRecord(data);
  const message = typeof record?.message === "string" ? record.message.trim() : "";
  return message && !message.includes("<") ? message : fallback;
}

export {
  RESTAURANT_DEAL_TAGS,
  createRestaurantDeal,
  deleteRestaurantDeal,
  getPublicDealBranchName,
  getPublicRestaurantDeals,
  getRestaurantDeals,
  restaurantDealApiMessage,
  restaurantDealTagKey,
  restaurantDealTagLabel,
  updateRestaurantDeal
};
