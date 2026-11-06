import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { getSidebarButtons } from '@/shared/lib/ownerApi';
import { getOwnerIdentity, subscribeOwnerIdentity } from '@/shared/lib/ownerProfile';
import { tabIdToHref } from "../adminRoutes";
import { getStaffAccess, isStaffSession } from '@/shared/lib/staffAccess';
import {
  LayoutDashboard,
  Calculator,
  ShoppingBag,
  ChefHat,
  UtensilsCrossed,
  Tags,
  Store,
  Users,
  BarChart3,
  FileSpreadsheet,
  Settings,
  X,
  ChevronDown,
  BadgePercent,
  Bike,
  MessageSquare,
  Mail,
  Image,
  Clock,
  MapPin,
  Truck,
  Table2,
  Layers,
  Package,
  CalendarClock,
  TicketPercent,
  Wallet,
  Receipt,
  UserCircle,
  Palette,
  LifeBuoy,
  Shield,
  LogOut,
  Building2,
  Boxes
} from "lucide-react";
const apiKeyToTab = {
  overview: "dashboard",
  dashboard: "dashboard",
  analytics: "analytics",
  reports: "reports",
  poscounter: "counter",
  counterpanel: "counter",
  orders: "orders",
  kitchendisplay: "kitchen",
  kitchen: "kitchen",
  tablesreservations: "tables",
  opsdelivery: "ops_delivery",
  products: "products",
  categories: "categories",
  variantsaddons: "variants",
  dealscombos: "deals",
  availability: "availability",
  inventory: "inventory",
  deliveryriders: "riders",
  deliveryzones: "delivery_zones",
  branchhours: "timetables",
  branchtimetable: "timetables",
  banners: "hero_banners",
  herobanners: "hero_banners",
  couponsdiscounts: "coupons",
  reviews: "reviews",
  customerreviews: "reviews",
  subscribers: "subscribers",
  customers: "customers",
  branches: "branches",
  areas: "areas",
  areastowns: "areas",
  "areas-towns": "areas",
  areasandtowns: "areas",
  staffroles: "all_staff",
  "all-staff": "all_staff",
  "create-staff": "add_staff",
  addstaff: "add_staff",
  allstaff: "all_staff",
  payments: "payments",
  expenses: "expenses",
  profile: "settings",
  theme: "settings",
  support: "settings",
  security: "settings",
  settings: "settings"
};
const iconMap = {
  dashboard: LayoutDashboard,
  overview: LayoutDashboard,
  analytics: BarChart3,
  reports: FileSpreadsheet,
  operations: Boxes,
  counter: Calculator,
  poscounter: Calculator,
  orders: ShoppingBag,
  kitchen: ChefHat,
  kitchendisplay: ChefHat,
  tables: Table2,
  tablesreservations: Table2,
  ops_delivery: Truck,
  opsdelivery: Truck,
  catalog: UtensilsCrossed,
  products: UtensilsCrossed,
  categories: Tags,
  variants: Layers,
  variantsaddons: Layers,
  deals: BadgePercent,
  dealscombos: BadgePercent,
  availability: CalendarClock,
  inventory: Package,
  delivery: Bike,
  riders: Bike,
  deliveryriders: Bike,
  delivery_zones: MapPin,
  deliveryzones: MapPin,
  timetables: Clock,
  branchhours: Clock,
  marketing: Image,
  hero_banners: Image,
  banners: Image,
  coupons: TicketPercent,
  couponsdiscounts: TicketPercent,
  reviews: MessageSquare,
  subscribers: Mail,
  customers: UserCircle,
  branchmanagement: Building2,
  branches: Store,
  areas: MapPin,
  areastowns: MapPin,
  "areas-towns": MapPin,
  areasandtowns: MapPin,
  staff: Users,
  staffroles: Users,
  all_staff: Users,
  "all-staff": Users,
  add_staff: UserCircle,
  "create-staff": UserCircle,
  finance: Wallet,
  payments: Wallet,
  expenses: Receipt,
  settings: Settings,
  profile: UserCircle,
  theme: Palette,
  support: LifeBuoy,
  security: Shield,
  logout: LogOut
};
function readChildList(raw) {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.buttons)) return raw.buttons;
  if (Array.isArray(raw.children)) return raw.children;
  if (Array.isArray(raw.items)) return raw.items;
  return [];
}
function mapApiNode(raw) {
  if (!raw || typeof raw !== "object") return null;
  const key = String(raw.key || raw.id || "").trim();
  if (!key) return null;
  const label = String(raw.label || raw.name || key).trim();
  const children = readChildList(raw).map(mapApiNode).filter((node) => Boolean(node));
  const isLogout = key === "logout" || label.toLowerCase() === "log out";
  const mappedId = apiKeyToTab[key] || null;
  const id = children.length > 0 ? null : mappedId || (isLogout ? null : key);
  return {
    key,
    id,
    label,
    badge: raw.badge ?? null,
    isLogout,
    children
  };
}
/**
 * Settings API children (Profile/Theme/Support/Security) all resolve to the same
 * "settings" tab, which made every child look selected. Collapse those into one
 * Settings link — page-level SETTINGS MENU owns the tabs.
 */
function collapseDuplicateTabChildren(nodes) {
  return nodes.map((node) => {
    const children = collapseDuplicateTabChildren(node.children || []);
    if (children.length === 0) {
      return { ...node, children };
    }
    const leafChildren = children.every((child) => child.children.length === 0);
    const childTabIds = children.map((child) => child.id).filter(Boolean);
    const uniqueTabIds = Array.from(new Set(childTabIds));
    const parentTabId = apiKeyToTab[node.key] || node.id;
    const shouldCollapse =
      leafChildren &&
      uniqueTabIds.length === 1 &&
      (parentTabId === uniqueTabIds[0] ||
        uniqueTabIds[0] === "settings" ||
        node.key === "settings");
    if (shouldCollapse) {
      return {
        ...node,
        id: uniqueTabIds[0] || parentTabId || "settings",
        children: []
      };
    }
    return { ...node, children };
  });
}
function collectTabIds(nodes) {
  const ids = [];
  const walk = (list) => {
    for (const node of list) {
      if (node.isLogout) continue;
      if (node.id) ids.push(node.id);
      if (node.children.length) walk(node.children);
    }
  };
  walk(nodes);
  return Array.from(new Set(ids));
}
function findAncestorKeys(nodes, activeId, trail = []) {
  for (const node of nodes) {
    const nextTrail = [...trail, node.key];
    if (node.id === activeId) return nextTrail;
    if (node.children.length) {
      const found = findAncestorKeys(node.children, activeId, nextTrail);
      if (found) return found;
    }
  }
  return null;
}
function applyBadges(nodes, counts) {
  return nodes.map((node) => {
    const tabId = node.id || apiKeyToTab[node.key] || node.key;
    let badge = node.badge;
    if (tabId === "orders" && counts.orders > 0) badge = counts.orders;
    if (tabId === "reviews" && counts.reviews > 0) badge = counts.reviews;
    if (tabId === "subscribers" && counts.subscribers > 0) badge = counts.subscribers;
    return {
      ...node,
      badge,
      children: applyBadges(node.children, counts)
    };
  });
}
const AdminSidebar = ({
  isOpenMobile,
  onCloseMobile,
  onLogout,
  onTabsLoaded
}) => {
  const {
    config,
    activeAdminTab,
    orders,
    customerReviews,
    subscribers
  } = useRestaurant();
  const [apiSidebarTree, setApiSidebarTree] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [identity, setIdentity] = useState(getOwnerIdentity);
  const [expandedKeys, setExpandedKeys] = useState(/* @__PURE__ */ new Set());
  useEffect(() => {
    const unsubscribe = subscribeOwnerIdentity(() => setIdentity(getOwnerIdentity()));
    return () => {
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    async function loadApiButtons() {
      const staffSidebar = getStaffAccess()?.sidebar;
      if (isStaffSession() && Array.isArray(staffSidebar) && staffSidebar.length > 0) {
        const tree = collapseDuplicateTabChildren(
          staffSidebar.map(mapApiNode).filter((node) => Boolean(node))
        );
        if (tree.length > 0) {
          setApiSidebarTree(tree);
          setIsApiLoading(false);
          return;
        }
      }
      const result = await getSidebarButtons();
      if (result.ok && result.data) {
        const items = Array.isArray(result.data) ? result.data : Array.isArray(result.data.sidebar) ? result.data.sidebar : [];
        const tree = collapseDuplicateTabChildren(
          items.map(mapApiNode).filter((node) => Boolean(node))
        );
        if (tree.length > 0) setApiSidebarTree(tree);
      }
      setIsApiLoading(false);
    }
    loadApiButtons();
  }, []);
  const activeOrdersCount = orders.filter(
    (o) => o.status === "received" || o.status === "preparing" || o.status === "ready"
  ).length;
  const pendingReviewsCount = customerReviews.filter((r) => r.status === "pending").length;
  const navTree = useMemo(
    () => applyBadges(apiSidebarTree, {
      orders: activeOrdersCount,
      reviews: pendingReviewsCount,
      subscribers: subscribers?.length || 0
    }),
    [apiSidebarTree, activeOrdersCount, pendingReviewsCount, subscribers]
  );
  const allowedTabIds = useMemo(() => collectTabIds(navTree), [navTree]);
  useEffect(() => {
    if (isApiLoading) return;
    onTabsLoaded?.(allowedTabIds);
  }, [isApiLoading, allowedTabIds, onTabsLoaded]);
  useEffect(() => {
    if (!activeAdminTab || activeAdminTab === "dashboard" || navTree.length === 0) return;
    const trail = findAncestorKeys(navTree, activeAdminTab);
    if (!trail || trail.length < 2) return;
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      trail.slice(0, -1).forEach((key) => next.add(key));
      return next;
    });
  }, [activeAdminTab, navTree]);
  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const resolveIcon = (node) => {
    const tabId = node.id || apiKeyToTab[node.key] || node.key;
    return iconMap[tabId] || iconMap[node.key] || LayoutDashboard;
  };
  const labelClassForDepth = (depth) => depth === 0 ? "truncate text-[14px] font-semibold tracking-tight font-['Outfit',sans-serif]" : "truncate text-[13.5px] font-medium tracking-tight font-['Plus_Jakarta_Sans',sans-serif]";
  const renderNodeHeader = (node, depth) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedKeys.has(node.key);
    const Icon = resolveIcon(node);
    const isActive = Boolean(node.id && activeAdminTab === node.id);
    const childActive = hasChildren && Boolean(
      findAncestorKeys(node.children, activeAdminTab) || node.children.some((child) => child.id === activeAdminTab)
    );
    const labelClass = labelClassForDepth(depth);
    if (node.isLogout) {
      return <button
        type="button"
        onClick={() => onLogout?.()}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
      >
          <LogOut className="w-[18px] h-[18px]" />
          <span className={labelClass}>{node.label}</span>
        </button>;
    }
    if (hasChildren) {
      return <button
        type="button"
        onClick={() => toggleExpanded(node.key)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer`}
      >
          <div className="flex items-center gap-3 min-w-0">
            <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${childActive || isExpanded ? "bg-[#FF5A1F]/15 text-[#FF5A1F]" : "bg-transparent text-neutral-500 group-hover:text-neutral-300"}`}
      >
              <Icon className="w-[17px] h-[17px]" />
            </span>
            <span className={labelClass}>{node.label}</span>
          </div>
          <ChevronDown
        className={`w-4 h-4 shrink-0 text-neutral-500 transition-transform duration-300 ease-out ${isExpanded ? "rotate-180 text-neutral-300" : ""}`}
      />
        </button>;
    }
    if (!node.id) {
      return <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-500">
          <Icon className="w-[17px] h-[17px] shrink-0" />
          <span className={labelClass}>{node.label}</span>
        </div>;
    }
    return <Link
      href={tabIdToHref(node.id)}
      onClick={onCloseMobile}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${isActive ? "bg-[#FF5A1F] !text-white border border-[#FF5A1F]" : ""}`}
    >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
      className={`w-[17px] h-[17px] shrink-0 transition-colors ${isActive ? "!text-white" : "text-neutral-500 group-hover:text-neutral-300"}`}
    />
          <span className={`${labelClass} ${isActive ? "!text-white" : ""}`}>{node.label}</span>
        </div>
        {node.badge !== void 0 && node.badge !== null && <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] ${isActive ? "bg-white/20 !text-white" : "bg-[#191B20] text-neutral-300 group-hover:bg-[#252830]"}`}
    >
            {node.badge}
          </span>}
      </Link>;
  };
  const renderChildrenTree = (node, depth, animateIn) => <div className="sidebar-tree relative ml-[18px] mt-1 mb-2 pl-1">
      {node.children.map((child, index) => {
    const isLast = index === node.children.length - 1;
    const childExpanded = expandedKeys.has(child.key);
    const childHasKids = child.children.length > 0;
    return <div
      key={child.key}
      className={`sidebar-tree-item relative ${animateIn ? "animate-[sidebar-item-in_0.28s_ease-out_both]" : ""}`}
      style={{ animationDelay: `${index * 45}ms` }}
    >
            {
      /* Sibling trunk: full item height (header + nested), so next child stays connected */
    }
            {!isLast ? <span
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 bottom-0 w-0 border-l-[1.5px] border-[#5A6170]"
    /> : null}

            {
      /* Header row only — elbow uses 50% of this row, never nested height */
    }
            <div className="relative pl-[26px]">
              <span
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 h-1/2 w-[16px] border-l-[1.5px] border-b-[1.5px] border-[#5A6170] rounded-bl-[10px]"
    />
              <span
      aria-hidden
      className="pointer-events-none absolute left-[14px] top-1/2 w-0 h-0 -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[6px] border-l-[#5A6170]"
    />
              <div className="py-[3px]">{renderNodeHeader(child, depth + 1)}</div>
            </div>

            {childHasKids ? <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${childExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
                <div className="overflow-hidden min-h-0">
                  {renderChildrenTree(child, depth + 1, childExpanded)}
                </div>
              </div> : null}
          </div>;
  })}
    </div>;
  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedKeys.has(node.key);
    if (!hasChildren) {
      return <div key={node.key} className="mb-0.5">
          {renderNodeHeader(node, depth)}
        </div>;
    }
    return <div key={node.key} className="mb-0.5">
        {renderNodeHeader(node, depth)}
        <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
          <div className="overflow-hidden min-h-0">
            {renderChildrenTree(node, depth, isExpanded)}
          </div>
        </div>
      </div>;
  };
  return <>
      {isOpenMobile && <div
    onClick={onCloseMobile}
    className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
    aria-hidden="true"
  />}

      <aside
    className={`fixed lg:sticky top-0 left-0 h-screen z-50 w-[274px] bg-[#101216] border-r border-[#292D35] flex flex-col transition-transform duration-300 ease-in-out shrink-0 overflow-hidden ${isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
  >
        <div className="h-[74px] px-5 flex items-center justify-between border-b border-[#292D35] shrink-0 bg-[#101216] select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#E04810] text-white flex items-center justify-center font-black tracking-tighter text-[10px] shadow-md shadow-[#FF5A1F]/20 uppercase">
              {(identity.restaurantName || config.name || "R").slice(0, 2)}
            </div>

            <div className="leading-tight min-w-0">
              <div className="text-white font-extrabold text-[15px] tracking-tight truncate max-w-[150px] font-['Outfit',sans-serif]">
                {identity.restaurantName || config.name}
              </div>
              <div className="text-neutral-400 text-[11px] font-medium tracking-wide font-['Plus_Jakarta_Sans',sans-serif]">
                {config.name}
              </div>
            </div>
          </div>

          <button
    onClick={onCloseMobile}
    className="lg:hidden text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-[#191B20] cursor-pointer"
    aria-label="Close Sidebar"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-3.5 space-y-1 select-none font-['Plus_Jakarta_Sans',sans-serif]">
          {isApiLoading ? <div className="px-3 py-6 space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="h-10 bg-[#191B20] rounded-xl w-full" />)}
            </div> : navTree.length === 0 ? <div className="px-3 py-6 text-xs text-neutral-500 text-center">
              No menu items available from backend.
            </div> : navTree.map((node) => renderNode(node))}
        </nav>

        <div className="p-3 border-t border-[#292D35] bg-[#101216] shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-[#FF5A1F] text-white font-black text-xs flex items-center justify-center uppercase">
              {(identity.ownerFirstName || "O").charAt(0)}
              {(identity.ownerLastName || "").charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-white truncate font-['Outfit',sans-serif]">
                {[identity.ownerFirstName, identity.ownerLastName].filter(Boolean).join(" ") || "Owner"}
              </div>
              <div className="text-[11px] text-neutral-500 truncate font-['Plus_Jakarta_Sans',sans-serif]">
                {identity.ownerEmail || "No email"}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>;
};
export {
  AdminSidebar
};
