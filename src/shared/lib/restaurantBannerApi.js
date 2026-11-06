import { expireOwnerSession, getOwnerSession } from "./ownerSession";
const RESTAURANT_BANNER_TAGS = [
  { value: "flat_discount", label: "Flat Discount" },
  { value: "combo_deal", label: "Combo Deal" },
  { value: "bogo", label: "Buy One, Get One (BOGO)" },
  { value: "limited_time", label: "Limited Time" },
  { value: "category_special", label: "Category Special" }
];
function restaurantBannerTagLabel(tag) {
  return RESTAURANT_BANNER_TAGS.find((item) => item.value === tag)?.label || tag.replace(/_/g, " ");
}
function restaurantBannerBranchesLabel(banner) {
  if (banner.showAllBranches) return "All branches";
  if (banner.branchNames.length) return banner.branchNames.join(", ");
  return banner.branchName || "—";
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
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function text(record, keys, fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return fallback;
}
function bool(record, key, fallback) {
  const value = record[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value !== 0;
  return fallback;
}
function number(record, key, fallback) {
  const value = record[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function readId(record) {
  const value = record.id || record._id || record.bannerId;
  if (typeof value === "string") return value;
  const nested = asRecord(value);
  return text(nested || {}, ["$oid", "oid"]);
}
function readBranchNames(record) {
  const raw = record.branchName ?? record.branchNames;
  if (Array.isArray(raw)) {
    return raw.map((item) => typeof item === "string" ? item.trim() : typeof item === "number" ? String(item) : "").filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return [];
}
function mapBanner(value) {
  const record = asRecord(value);
  if (!record) return null;
  const id = readId(record);
  if (!id) return null;
  const branchNames = readBranchNames(record);
  const tag = text(record, ["tag", "badge"]);
  const badge = text(record, ["badge", "tag"], tag);
  return {
    id,
    showAllBranches: bool(record, "showAllBranches", false),
    branchName: branchNames[0] || "",
    branchNames,
    title: text(record, ["title"]),
    shortText: text(record, ["shortText", "subtitle"]),
    description: text(record, ["description"]),
    image: text(record, ["image", "imageUrl"]),
    tag,
    badge,
    buttonText: text(record, ["buttonText", "ctaText"], "Order Now"),
    buttonLink: text(record, ["buttonLink", "orderUrl"]),
    secondaryButtonText: text(record, ["secondaryButtonText", "secondaryCtaText"]),
    secondaryButtonLink: text(record, ["secondaryButtonLink"]),
    displayOrder: number(record, "displayOrder", number(record, "sort", 0)),
    isActive: bool(record, "isActive", true),
    startDate: text(record, ["startDate"]),
    endDate: text(record, ["endDate"]),
    createdAt: text(record, ["createdAt"]),
    updatedAt: text(record, ["updatedAt"])
  };
}
function collectBanners(data) {
  const lists = [];
  const addList = (value) => {
    if (Array.isArray(value)) lists.push(value);
  };
  addList(data);
  const record = asRecord(data);
  if (record) {
    for (const key of ["banners", "data", "items", "results", "list", "docs", "rows"]) {
      addList(record[key]);
    }
    const nested = asRecord(record.data);
    if (nested) {
      for (const key of ["banners", "items", "results", "list", "docs", "rows"]) {
        addList(nested[key]);
      }
    }
    const single = mapBanner(record.banner || record.data || record);
    if (single) return [single];
  }
  return lists.map((list) => list.map(mapBanner).filter((item) => Boolean(item))).sort((a, b) => b.length - a.length)[0] || [];
}
async function request(path, method, body, publicRequest = false) {
  try {
    const response = await fetch(path, {
      method,
      headers: publicRequest ? { Accept: "application/json" } : authHeaders(body !== void 0),
      ...body !== void 0 ? { body: JSON.stringify(body) } : {},
      cache: "no-store"
    });
    if (response.status === 401 && !publicRequest) expireOwnerSession();
    let data = null;
    const responseText = await response.text();
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { message: responseText || "Backend returned a non-JSON response." };
    }
    return { ok: response.ok, status: response.status, data, banners: collectBanners(data) };
  } catch (error) {
    console.error("Restaurant Banner API Error:", error);
    return { ok: false, status: 500, data: null, banners: [] };
  }
}
async function getRestaurantBanners(domain, branchName) {
  const query = new URLSearchParams({ domain });
  if (branchName) query.set("branchName", branchName);
  return request(`/api/restaurant/banner?${query.toString()}`, "GET");
}
async function getPublicRestaurantBanners(domain) {
  const query = new URLSearchParams({ domain });
  return request(`/api/restaurant/banner/public?${query.toString()}`, "GET", void 0, true);
}
async function createRestaurantBanner(domain, payload) {
  const query = new URLSearchParams({ domain });
  return request(`/api/restaurant/banner?${query.toString()}`, "POST", payload);
}
async function updateRestaurantBanner(id, domain, payload) {
  const query = new URLSearchParams({ domain });
  return request(
    `/api/restaurant/banner/${encodeURIComponent(id)}?${query.toString()}`,
    "PUT",
    payload
  );
}
async function deleteRestaurantBanner(id, domain) {
  const query = new URLSearchParams({ domain });
  return request(
    `/api/restaurant/banner/${encodeURIComponent(id)}?${query.toString()}`,
    "DELETE"
  );
}
function bannerApiMessage(data, fallback) {
  const record = asRecord(data);
  const message = typeof record?.message === "string" ? record.message.trim() : "";
  return message && !message.includes("<") ? message : fallback;
}
export {
  RESTAURANT_BANNER_TAGS,
  bannerApiMessage,
  createRestaurantBanner,
  deleteRestaurantBanner,
  getPublicRestaurantBanners,
  getRestaurantBanners,
  restaurantBannerBranchesLabel,
  restaurantBannerTagLabel,
  updateRestaurantBanner
};
