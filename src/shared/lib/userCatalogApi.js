import { getPublicFrontendDomainUrl } from "./catalogApi";

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
      if (["true", "1", "yes", "active", "available"].includes(lower)) return true;
      if (["false", "0", "no", "inactive", "unavailable"].includes(lower)) return false;
    }
  }
  return fallback;
}

function readId(row) {
  for (const key of ["id", "_id", "productId", "categoryId"]) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string" && item.trim()) {
        return { key: item.trim(), label: item.trim(), emoji: "" };
      }
      const row = asRecord(item);
      if (!row) return null;
      const key = textValue(row, ["key", "slug", "id", "name"]);
      if (!key) return null;
      if (row.isActive === false) return null;
      return {
        key,
        label: textValue(row, ["label", "name", "title"]) || key,
        emoji: textValue(row, ["emoji", "icon"])
      };
    })
    .filter(Boolean);
}

function branchNames(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  const row = asRecord(value);
  if (row) {
    const name = textValue(row, ["name", "branchName"]);
    return name ? [name] : [];
  }
  return [];
}

function mapVariant(item, index) {
  const row = asRecord(item);
  if (!row) return null;
  const name = textValue(row, ["name", "title", "size"]);
  if (!name) return null;
  if (row.isActive === false) return null;
  return {
    id: textValue(row, ["id", "_id"]) || `variant-${index}`,
    name,
    size: textValue(row, ["size"]),
    portion: textValue(row, ["portion"]),
    price: numberValue(row, ["price", "sellingPrice"], 0),
    discountPrice:
      typeof row.discountPrice === "number" ? row.discountPrice : numberValue(row, ["discountPrice"], 0) || null,
    sku: textValue(row, ["sku"]),
    isActive: boolValue(row, ["isActive"], true)
  };
}

function mapAddon(item, index) {
  const row = asRecord(item);
  if (!row) return null;
  const name = textValue(row, ["name", "title"]);
  if (!name) return null;
  if (row.isActive === false) return null;
  return {
    id: textValue(row, ["id", "_id"]) || `addon-${index}`,
    name,
    price: numberValue(row, ["price"], 0),
    isRequired: boolValue(row, ["isRequired"], false),
    maxQuantity: numberValue(row, ["maxQuantity"], 1),
    isActive: boolValue(row, ["isActive"], true)
  };
}

function mapIngredient(item, index) {
  const row = asRecord(item);
  if (!row) return null;
  const name = textValue(row, ["name", "title"]);
  if (!name) return null;
  return {
    id: textValue(row, ["id", "_id"]) || `ingredient-${index}`,
    name,
    quantity: numberValue(row, ["quantity", "qty"], 0),
    unit: textValue(row, ["unit"]) || "pc"
  };
}

function resolvePromotionalTag(tagKeys, sellingPrice, originalPrice) {
  if (tagKeys.includes("bestseller") || tagKeys.includes("best_seller")) {
    return { type: "bestseller", text: "Best Seller" };
  }
  if (tagKeys.includes("new")) {
    return { type: "new", text: "New" };
  }
  if (tagKeys.includes("limitedtime") || tagKeys.includes("limited_time")) {
    return { type: "new", text: "Limited" };
  }
  if (tagKeys.includes("deal") || (originalPrice && originalPrice > sellingPrice)) {
    return { type: "discount", text: "Offer" };
  }
  return null;
}

function mapUserProduct(row) {
  const record = asRecord(row);
  if (!record) return null;
  const id = readId(record);
  if (!id) return null;

  const displayTags = normalizeTags(record.tags);
  const tagKeys = displayTags.map((tag) => tag.key);
  const sellingPrice = numberValue(record, ["sellingPrice", "price"], 0);
  const discountPrice = numberValue(record, ["discountPrice"], 0);
  const originalPrice =
    discountPrice > 0
      ? sellingPrice + discountPrice
      : numberValue(record, ["originalPrice", "costPrice"], 0) > sellingPrice
        ? numberValue(record, ["originalPrice", "costPrice"], 0)
        : void 0;
  const prep = numberValue(record, ["preparationTime"], 0);
  const calories = numberValue(record, ["calories"], 0);
  const categoryRow = asRecord(record.category);
  const categoryId =
    textValue(record, ["categoryId"]) ||
    (categoryRow ? readId(categoryRow) : "") ||
    textValue(record, ["category"]);
  const variants = (Array.isArray(record.variants) ? record.variants : [])
    .map(mapVariant)
    .filter(Boolean);
  const addons = (Array.isArray(record.addons) ? record.addons : [])
    .map(mapAddon)
    .filter(Boolean);
  const ingredients = (Array.isArray(record.ingredients) ? record.ingredients : [])
    .map(mapIngredient)
    .filter(Boolean);
  const allergens = Array.isArray(record.allergens)
    ? record.allergens.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const availabilityStatus = textValue(record, ["availabilityStatus"]) || "available";
  const isActive = boolValue(record, ["isActive"], true);
  const stockQuantity = numberValue(record, ["stockQuantity"], 0);
  const inStock =
    isActive &&
    availabilityStatus.toLowerCase() !== "unavailable" &&
    !tagKeys.includes("outofstock") &&
    stockQuantity !== 0;

  return {
    id,
    name: textValue(record, ["name", "productName", "title"]),
    slug: textValue(record, ["slug"]),
    sku: textValue(record, ["sku"]),
    description: textValue(record, ["description", "desc"]),
    image: textValue(record, ["image", "imageUrl", "photo"]),
    category: categoryId,
    categoryName: categoryRow ? textValue(categoryRow, ["name", "title"]) : "",
    price: sellingPrice,
    originalPrice: originalPrice && originalPrice > sellingPrice ? originalPrice : void 0,
    sellingPrice,
    discountPrice,
    tax: numberValue(record, ["tax"], 0),
    rating: numberValue(record, ["rating", "avgRating"], 4.8),
    reviewsCount: numberValue(record, ["reviewsCount", "reviewCount"], 0),
    tags: tagKeys,
    displayTags,
    promotionalTag: resolvePromotionalTag(tagKeys, sellingPrice, originalPrice),
    isPopular: tagKeys.includes("popular") || boolValue(record, ["isRecommended"], false),
    isFeatured: boolValue(record, ["isFeatured"], tagKeys.includes("featured")),
    isRecommended: boolValue(record, ["isRecommended"], false),
    isBestseller: tagKeys.includes("bestseller") || tagKeys.includes("best_seller"),
    isNew: tagKeys.includes("new"),
    inStock,
    isActive,
    availabilityStatus,
    availableDays: Array.isArray(record.availableDays)
      ? record.availableDays.map((day) => String(day).toLowerCase())
      : [],
    availableFrom: textValue(record, ["availableFrom"]),
    availableTo: textValue(record, ["availableTo"]),
    calories: calories || void 0,
    prepTime: prep ? `${prep} mins` : "",
    preparationTime: prep,
    allergens,
    ingredients,
    recipe: textValue(record, ["recipe"]),
    notes: textValue(record, ["notes"]),
    stockQuantity,
    variants,
    addons,
    availableAddons: addons,
    branchName: branchNames(record.branchName),
    showAllBranches: boolValue(record, ["showAllBranches"], false),
    sort: numberValue(record, ["sort", "displayOrder"], 0)
  };
}

function mapUserCategory(row) {
  const record = asRecord(row);
  if (!record) return null;
  const id = readId(record);
  if (!id) return null;
  const displayTags = normalizeTags(record.tags);
  return {
    id,
    name: textValue(record, ["name", "categoryName", "title"]),
    slug: textValue(record, ["slug"]),
    description: textValue(record, ["description", "desc"]),
    image: textValue(record, ["image", "imageUrl", "banner", "photo"]),
    isActive: boolValue(record, ["isActive"], true),
    isFeatured: boolValue(record, ["isFeatured"], false),
    showAllBranches: boolValue(record, ["showAllBranches"], false),
    branchName: branchNames(record.branchName),
    order: numberValue(record, ["sort", "displayOrder", "order"], 0),
    itemCount: numberValue(record, ["productsCount", "itemCount", "count"], 0),
    tags: displayTags.map((tag) => tag.key),
    displayTags,
    products: Array.isArray(record.products) ? record.products : []
  };
}

function apiMessage(data, fallback) {
  const record = asRecord(data);
  if (!record) return fallback;
  return textValue(record, ["message", "error", "msg"]) || fallback;
}

async function requestUserCatalog(path, params) {
  const query = new URLSearchParams();
  if (params.frontendDomainUrl) query.set("frontendDomainUrl", params.frontendDomainUrl);
  if (params.branchName) query.set("branchName", params.branchName);

  try {
    const response = await fetch(`${path}?${query.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { message: "Empty response from backend" };
    } catch {
      data = { message: text || "Backend returned non-JSON response." };
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      data: { message: error instanceof Error ? error.message : "Network error" }
    };
  }
}

async function getUserCatalogCategories(params = {}) {
  const frontendDomainUrl = params.frontendDomainUrl || getPublicFrontendDomainUrl();
  const result = await requestUserCatalog("/api/restaurant/user/catalog/categories", {
    frontendDomainUrl,
    branchName: params.branchName
  });
  const record = asRecord(result.data) || {};
  const list = Array.isArray(record.categories) ? record.categories : [];
  return {
    ...result,
    message: apiMessage(result.data, ""),
    count: typeof record.count === "number" ? record.count : list.length,
    branch: asRecord(record.branch),
    categories: list.map(mapUserCategory).filter(Boolean).sort((a, b) => a.order - b.order)
  };
}

async function getUserCatalogProducts(params = {}) {
  const frontendDomainUrl = params.frontendDomainUrl || getPublicFrontendDomainUrl();
  const result = await requestUserCatalog("/api/restaurant/user/catalog/products", {
    frontendDomainUrl,
    branchName: params.branchName
  });
  const record = asRecord(result.data) || {};
  const list = Array.isArray(record.products) ? record.products : [];
  return {
    ...result,
    message: apiMessage(result.data, ""),
    count: typeof record.count === "number" ? record.count : list.length,
    branch: asRecord(record.branch),
    products: list
      .map(mapUserProduct)
      .filter(Boolean)
      .sort((a, b) => a.sort - b.sort)
  };
}

export {
  getUserCatalogCategories,
  getUserCatalogProducts,
  mapUserCategory,
  mapUserProduct,
  apiMessage as userCatalogApiMessage
};
