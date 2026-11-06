import { expireOwnerSession, getOwnerSession } from "./ownerSession";
const CATALOG_TAGS = [
  { key: "featured", label: "Featured", emoji: "⭐" },
  { key: "popular", label: "Popular", emoji: "🔥" },
  { key: "new", label: "New", emoji: "🆕" },
  { key: "recommended", label: "Recommended", emoji: "❤️" },
  { key: "bestseller", label: "Best Seller", emoji: "🏷️" },
  { key: "deal", label: "Deal", emoji: "🎁" },
  { key: "spicy", label: "Spicy", emoji: "🌶️" },
  { key: "healthy", label: "Healthy", emoji: "🥗" },
  { key: "vegetarian", label: "Vegetarian", emoji: "🌱" },
  { key: "nonvegetarian", label: "Non-Vegetarian", emoji: "🥩" },
  { key: "limitedtime", label: "Limited Time", emoji: "⏰" },
  { key: "outofstock", label: "Out of Stock", emoji: "🔴" }
];
const CATEGORY_TAG_LABELS = [
  "Fresh & Tasty",
  "Made Fresh",
  "Delicious Choices",
  "Taste You Love",
  "Freshly Made",
  "Made with Love",
  "Best in Taste",
  "Perfectly Delicious",
  "Quality & Taste",
  "Simply Delicious",
  "Fresh & Delicious",
  "Taste the Difference"
];
const CATEGORY_TAGS = CATALOG_TAGS.map((tag, index) => ({
  key: tag.key,
  label: CATEGORY_TAG_LABELS[index]
}));
function catalogTagLabel(tag) {
  return CATALOG_TAGS.find((item) => item.key === tag)?.label || tag;
}
function categoryTagLabel(tag) {
  return CATEGORY_TAGS.find((item) => item.key === tag)?.label || catalogTagLabel(tag);
}
function normalizeCategoryTags(tags) {
  const normalized = tags.map((tag) => {
    const acceptedTag = CATALOG_TAGS.find((item) => item.key === tag);
    if (acceptedTag) return acceptedTag.key;
    const legacyCategoryTag = CATEGORY_TAGS.find(
      (item) => item.key === tag || item.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") === tag
    );
    return legacyCategoryTag?.key;
  }).filter((tag) => Boolean(tag));
  return Array.from(new Set(normalized)).slice(0, 1);
}
function authHeaders(json = false) {
  const session = getOwnerSession();
  const token = session?.token || (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null);
  return {
    Accept: "application/json",
    ...json ? { "Content-Type": "application/json" } : {},
    ...token ? { Authorization: `Bearer ${token}` } : {}
  };
}
function getFrontendDomainUrl() {
  const sessionDomain = getOwnerSession()?.owner?.frontendDomainUrl;
  const configuredRestaurantDomain = process.env.NEXT_PUBLIC_RESTAURANT_DOMAIN;
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const domain = typeof sessionDomain === "string" && sessionDomain.trim() || typeof configuredRestaurantDomain === "string" && configuredRestaurantDomain.trim() || browserOrigin || process.env.NEXT_PUBLIC_APP_URL || "";
  return domain.trim().replace(/\/$/, "");
}
function getPublicFrontendDomainUrl() {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  return browserOrigin || getFrontendDomainUrl();
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
      if (["true", "1", "yes", "active", "available"].includes(lower)) return true;
      if (["false", "0", "no", "inactive", "unavailable", "out_of_stock"].includes(lower)) return false;
    }
    if (typeof value === "number") return value !== 0;
  }
  return fallback;
}
function readId(row) {
  for (const key of ["id", "_id", "categoryId", "productId"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    const nested = asRecord(value);
    const oid = nested?.$oid || nested?.oid;
    if (typeof oid === "string" && oid.trim()) return oid.trim();
  }
  return "";
}
function collectLists(data) {
  const lists = [];
  const push = (value) => {
    if (Array.isArray(value)) lists.push(value);
  };
  push(data);
  const record = asRecord(data);
  if (record) {
    for (const key of [
      "categories",
      "products",
      "data",
      "items",
      "results",
      "list",
      "docs",
      "rows"
    ]) {
      push(record[key]);
    }
    const nested = asRecord(record.data);
    if (nested) {
      for (const key of ["categories", "products", "items", "results", "list", "docs", "rows"]) {
        push(nested[key]);
      }
    }
  }
  return lists;
}
function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item.trim();
    const record = asRecord(item);
    return record ? textValue(record, ["name", "label", "value", "tag"]) : "";
  }).filter(Boolean);
}
function extractUploadedImageUrl(data) {
  const record = asRecord(data);
  if (!record) return "";
  const nested = [record.data, record.image, record.result, record.upload, record].map(asRecord).find(Boolean) || record;
  return textValue(nested, ["url", "image", "imageUrl", "secure_url", "path", "profilePitcher"]);
}
function extractRecordId(data) {
  const record = asRecord(data);
  if (!record) return "";
  const nested = [record.category, record.product, record.data, record].map(asRecord).find(Boolean);
  return readId(nested || record);
}
function mapCategory(row) {
  const record = asRecord(row);
  if (!record) return null;
  const id = readId(record);
  if (!id) return null;
  const branchName = textValue(record, ["branchName", "branch", "branchId"]);
  return {
    id,
    name: textValue(record, ["name", "categoryName", "title"]),
    image: textValue(record, ["image", "imageUrl", "banner", "photo"]),
    description: textValue(record, ["description", "desc"]),
    icon: textValue(record, ["icon", "emoji"]) || "🍽️",
    isActive: boolValue(record, ["isActive", "active", "status"], true),
    showAllBranches: boolValue(record, ["showAllBranches"], false),
    order: numberValue(record, ["sort", "order", "displayOrder"], 0),
    branchId: branchName,
    branchName: branchName || void 0,
    itemCount: numberValue(record, ["itemCount", "count", "productCount"], 0),
    tags: normalizeCategoryTags(stringArray(record.tags)),
    createdAt: textValue(record, [
      "createdAt",
      "created_at",
      "createdOn",
      "created",
      "postedAt",
      "date"
    ]),
    updatedAt: textValue(record, ["updatedAt", "updated_at", "updatedOn", "modifiedAt"])
  };
}
function mapProduct(row) {
  const record = asRecord(row);
  if (!record) return null;
  const id = readId(record);
  if (!id) return null;
  const tags = stringArray(record.tags);
  const calories = numberValue(record, ["calories"], 0);
  const prep = numberValue(record, ["preparationTime"], 0);
  const sellingPrice = numberValue(
    record,
    ["sellingPrice", "price", "amount", "salePrice"],
    0
  );
  const discountPrice = numberValue(record, ["discountPrice"], 0);
  const branchName = textValue(record, ["branchName", "branch"]);
  let promotionalTag;
  if (boolValue(record, ["isFeatured"], false) || tags.includes("featured")) {
    promotionalTag = { type: "best_seller", text: "Best Seller" };
  } else if (tags.includes("new")) {
    promotionalTag = { type: "new", text: "New" };
  } else if (tags.includes("discount") || discountPrice > 0) {
    promotionalTag = { type: "discount", text: "Offer" };
  }
  const addonsRaw = Array.isArray(record.addons) ? record.addons : [];
  const availableAddons = addonsRaw.map((item, index) => {
    const addon = asRecord(item);
    if (!addon) return null;
    const name = textValue(addon, ["name", "title"]);
    if (!name) return null;
    return {
      id: textValue(addon, ["id", "_id"]) || `addon-${index}`,
      name,
      price: numberValue(addon, ["price"], 0)
    };
  }).filter((item) => Boolean(item));
  return {
    id,
    merchantId: textValue(record, ["merchantId", "merchant_id", "ownerId"]),
    name: textValue(record, ["name", "productName", "title"]),
    category: textValue(record, ["categoryId", "category", "category_id"]),
    price: discountPrice > 0 ? discountPrice : sellingPrice,
    originalPrice: discountPrice > 0 ? sellingPrice : void 0,
    rating: numberValue(record, ["rating", "avgRating"], 4.8),
    reviewsCount: numberValue(record, ["reviewsCount", "reviewCount"], 0),
    description: textValue(record, ["description", "desc"]),
    image: textValue(record, ["image", "imageUrl", "photo"]),
    isPopular: tags.includes("popular"),
    isFeatured: boolValue(record, ["isFeatured"], tags.includes("featured")),
    inStock: textValue(record, ["availabilityStatus"]).toLowerCase() !== "unavailable" && boolValue(record, ["inStock", "isActive"], true),
    tags,
    promotionalTag,
    calories: calories || void 0,
    prepTime: prep ? `${prep} mins` : textValue(record, ["prepTime"]),
    availableAddons,
    branchAvailability: branchName ? [branchName] : stringArray(record.branchAvailability || record.branchIds),
    sku: textValue(record, ["sku"]),
    costPrice: numberValue(record, ["costPrice"], 0),
    sellingPrice,
    discountPrice,
    tax: numberValue(record, ["tax"], 0),
    stockQuantity: numberValue(record, ["stockQuantity"], 0),
    recipe: textValue(record, ["recipe"]),
    notes: textValue(record, ["notes"]),
    allergens: stringArray(record.allergens),
    availableDays: stringArray(record.availableDays),
    availableFrom: textValue(record, ["availableFrom"]),
    availableTo: textValue(record, ["availableTo"]),
    preparationTime: prep,
    variants: Array.isArray(record.variants) ? record.variants : [],
    addons: Array.isArray(record.addons) ? record.addons : [],
    ingredients: Array.isArray(record.ingredients) ? record.ingredients : [],
    availabilityStatus: textValue(record, ["availabilityStatus"]) || "available",
    isActive: boolValue(record, ["isActive"], true),
    sort: numberValue(record, ["sort", "order"], 0),
    branchName,
    createdAt: textValue(record, [
      "createdAt",
      "created_at",
      "createdOn",
      "created",
      "postedAt",
      "date"
    ]),
    updatedAt: textValue(record, ["updatedAt", "updated_at", "updatedOn", "modifiedAt"])
  };
}
function mapList(data, mapper) {
  let best = [];
  for (const list of collectLists(data)) {
    const mapped = list.map(mapper).filter((item) => Boolean(item));
    if (mapped.length >= best.length) best = mapped;
  }
  return best;
}
async function catalogRequest(path, method, body) {
  try {
    const response = await fetch(path, {
      method,
      headers: authHeaders(Boolean(body)),
      ...body ? { body: JSON.stringify(body) } : {}
    });
    if (response.status === 401) {
      expireOwnerSession();
    }
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Catalog API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
function buildListQuery(params) {
  const query = new URLSearchParams();
  if (params.frontendDomainUrl) query.set("frontendDomainUrl", params.frontendDomainUrl);
  if (params.branchName) query.set("branchName", params.branchName);
  if (params.tag) query.set("tag", params.tag);
  return query.toString();
}
async function getCategories(params) {
  const result = await catalogRequest(
    `/api/restaurant/catalog/categories?${buildListQuery(params)}`,
    "GET"
  );
  return { ...result, categories: mapList(result.data, mapCategory) };
}
async function createCategory(payload) {
  return catalogRequest("/api/restaurant/catalog/categories", "POST", payload);
}
async function updateCategory(id, payload) {
  return catalogRequest(`/api/restaurant/catalog/categories/${encodeURIComponent(id)}`, "PUT", payload);
}
async function deleteCategory(id, frontendDomainUrl) {
  const query = new URLSearchParams({ frontendDomainUrl });
  return catalogRequest(
    `/api/restaurant/catalog/categories/${encodeURIComponent(id)}?${query.toString()}`,
    "DELETE"
  );
}
async function getProducts(params) {
  const result = await catalogRequest(
    `/api/restaurant/catalog/products?${buildListQuery(params)}`,
    "GET"
  );
  const payload = result.data && typeof result.data === "object" ? result.data : {};
  return {
    ...result,
    products: mapList(result.data, mapProduct),
    count: typeof payload.count === "number" ? payload.count : undefined,
    branch: payload.branch ?? null,
    frontendDomainUrl:
      typeof payload.frontendDomainUrl === "string" ? payload.frontendDomainUrl : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    success: payload.success === true
  };
}
async function getProduct(id, frontendDomainUrl, branchName) {
  const query = new URLSearchParams({ frontendDomainUrl });
  if (branchName) query.set("branchName", branchName);
  const result = await catalogRequest(
    `/api/restaurant/catalog/products/${encodeURIComponent(id)}?${query.toString()}`,
    "GET"
  );
  const product = mapProduct(result.data) || mapList(result.data, mapProduct)[0] || null;
  return { ...result, product };
}
async function createProduct(payload) {
  return catalogRequest("/api/restaurant/catalog/products", "POST", payload);
}
async function updateProduct(id, payload) {
  return catalogRequest(`/api/restaurant/catalog/products/${encodeURIComponent(id)}`, "PUT", payload);
}
async function deleteProduct(id, frontendDomainUrl = getFrontendDomainUrl()) {
  const query = new URLSearchParams({ frontendDomainUrl });
  return catalogRequest(
    `/api/restaurant/catalog/products/${encodeURIComponent(id)}?${query.toString()}`,
    "DELETE"
  );
}
async function uploadCatalogImage(file, type, frontendDomainUrl) {
  try {
    const body = new FormData();
    body.append("frontendDomainUrl", frontendDomainUrl);
    body.append("type", type);
    body.append("image", file);
    const response = await fetch("/api/restaurant/catalog/upload-image", {
      method: "POST",
      headers: authHeaders(),
      body
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      data,
      imageUrl: extractUploadedImageUrl(data)
    };
  } catch (error) {
    console.error("Catalog Upload API Error:", error);
    return { ok: false, status: 500, data: null, imageUrl: "" };
  }
}
function apiMessage(data, fallback) {
  const raw = data && typeof data === "object" && "message" in data ? String(data.message || "") : "";
  if (!raw || raw.includes("<")) return fallback;
  return raw;
}
export {
  CATALOG_TAGS,
  CATEGORY_TAGS,
  apiMessage,
  catalogTagLabel,
  categoryTagLabel,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  extractRecordId,
  extractUploadedImageUrl,
  getCategories,
  getFrontendDomainUrl,
  getProduct,
  getProducts,
  getPublicFrontendDomainUrl,
  updateCategory,
  updateProduct,
  uploadCatalogImage
};
