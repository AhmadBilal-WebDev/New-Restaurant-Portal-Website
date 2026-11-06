const TAB_TO_PATH = {
  dashboard: "dashboard",
  counter: "counter",
  orders: "orders",
  kitchen: "kitchen",
  pos: "pos",
  products: "products",
  categories: "categories",
  deals: "deals",
  hero_banners: "hero-banners",
  "hero-banners": "hero-banners",
  timetables: "timetables",
  branches: "branches",
  areas: "areas",
  "areas-towns": "areas",
  areastowns: "areas",
  riders: "riders",
  reviews: "reviews",
  subscribers: "subscribers",
  staff: "staff",
  all_staff: "staff",
  "all-staff": "staff",
  add_staff: "staff/add",
  "create-staff": "staff/add",
  "add-staff": "staff/add",
  analytics: "analytics",
  reports: "reports",
  settings: "settings",
  payments: "payments",
  expenses: "expenses",
  customers: "customers",
  coupons: "coupons",
  delivery_zones: "delivery-zones",
  variants: "variants",
  availability: "availability",
  inventory: "inventory",
  tables: "tables",
  ops_delivery: "ops-delivery"
};
const PATH_TO_TAB = {
  dashboard: "dashboard",
  counter: "counter",
  orders: "orders",
  kitchen: "kitchen",
  pos: "pos",
  products: "products",
  categories: "categories",
  deals: "deals",
  "hero-banners": "hero_banners",
  timetables: "timetables",
  branches: "branches",
  areas: "areas",
  "areas-towns": "areas",
  riders: "riders",
  reviews: "reviews",
  subscribers: "subscribers",
  staff: "all_staff",
  "staff/add": "add_staff",
  "all-staff": "all_staff",
  "add-staff": "add_staff",
  analytics: "analytics",
  reports: "reports",
  settings: "settings",
  payments: "payments",
  expenses: "expenses",
  customers: "customers",
  coupons: "coupons",
  "delivery-zones": "delivery_zones",
  variants: "variants",
  availability: "availability",
  inventory: "inventory",
  tables: "tables",
  "ops-delivery": "ops_delivery"
};
function tabIdToHref(tabId) {
  const normalized = String(tabId || "").trim();
  if (!normalized) return "/admin/dashboard";
  const mapped = TAB_TO_PATH[normalized];
  if (mapped) return `/admin/${mapped}`;
  return `/admin/${normalized.replace(/_/g, "-")}`;
}
function pathnameToTabId(pathname) {
  const raw = String(pathname || "");
  const withoutQuery = raw.split("?")[0].split("#")[0];
  let rest = withoutQuery.replace(/^\/admin\/?/, "").replace(/\/+$/, "");
  if (!rest) return "dashboard";
  if (PATH_TO_TAB[rest]) return PATH_TO_TAB[rest];
  return rest.replace(/-/g, "_");
}
function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
export {
  isAdminPath,
  pathnameToTabId,
  tabIdToHref
};
