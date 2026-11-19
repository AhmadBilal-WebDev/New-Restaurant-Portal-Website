import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { getFrontendDomainUrl } from '@/shared/lib/catalogApi';
import { getRestaurantOrdersForBranches } from '@/shared/lib/restaurantOrdersApi';
import { OWNER_ORDERS_REFRESH_EVENT } from '@/shared/lib/restaurantNotificationsApi';
import { useOwnerNotifications } from '@/contexts/OwnerNotificationsContext';
import {
  Search,
  Download,
  Eye,
  Bike,
  X,
  Printer,
  Phone,
  MapPin,
  RefreshCw,
  Loader2,
  Mail,
  User,
  BadgeCheck,
  Navigation,
  Rows3,
  LayoutGrid
} from "lucide-react";

function statusSelectClass(status) {
  if (status === "received") return "bg-purple-500/20 text-purple-400";
  if (status === "confirmed") return "bg-blue-500/20 text-blue-400";
  if (status === "preparing") return "bg-amber-500/20 text-amber-400";
  if (status === "ready" || status === "out_for_delivery") return "bg-emerald-500/20 text-emerald-400";
  if (status === "delivered" || status === "completed") return "bg-neutral-500/15 text-neutral-500";
  return "bg-red-500/20 text-red-400";
}

function paymentLabel(method, status) {
  const m = String(method || "cod").toUpperCase();
  const s = String(status || "pending");
  return `${m} · ${s}`;
}

function CustomerAvatar({ name, image, size = "md" }) {
  const dims =
    size === "lg"
      ? "w-14 h-14 text-base"
      : size === "sm"
        ? "w-8 h-8 text-[10px]"
        : "w-9 h-9 text-xs";
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  if (image) {
    return (
      <img
        src={image}
        alt={name || "Customer"}
        className={`${dims} rounded-full object-cover border border-[#292D35] bg-[#101216] shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dims} rounded-full bg-[#252830] border border-[#292D35] text-neutral-300 font-bold flex items-center justify-center shrink-0`}
    >
      {initial}
    </div>
  );
}

function VariantLine({ variant }) {
  if (!variant) return null;
  const parts = [variant.name, variant.size, variant.portion ? `Portion ${variant.portion}` : ""]
    .filter(Boolean);
  if (!parts.length) return null;
  return <div className="text-[10px] text-neutral-400 mt-0.5">Variant: {parts.join(" · ")}</div>;
}

function AddonsList({ addons, formatPrice }) {
  if (!Array.isArray(addons) || !addons.length) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {addons.map((addon) => (
        <li key={addon.addonId || addon.name} className="text-[10px] text-neutral-400 flex justify-between gap-3">
          <span>
            + {addon.name}
            {addon.quantity > 1 ? ` ×${addon.quantity}` : ""}
          </span>
          <span className="font-mono text-neutral-300 shrink-0">
            {formatPrice(addon.lineTotal ?? addon.price ?? 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const OrdersPage = ({ initialSelectedOrder }) => {
  const {
    riders,
    formatPrice,
    addToast,
    config
  } = useRestaurant();
  const { liveBranches, activeBranchFilter, isAllBranches } = useBranchScope();
  const { clearOrderNotifications } = useOwnerNotifications();

  const [apiOrders, setApiOrders] = useState([]);
  const [localOverrides, setLocalOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(
    initialSelectedOrder || null
  );
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState(() => {
    if (typeof window === "undefined") return "rows";
    return window.localStorage.getItem("ros-orders-layout") === "cards"
      ? "cards"
      : "rows";
  });
  const clearedNotifsRef = useRef(false);

  const setLayout = (mode) => {
    setLayoutMode(mode);
    try {
      window.localStorage.setItem("ros-orders-layout", mode);
    } catch {
      // ignore
    }
  };

  const resolveBranchApiName = useCallback((branch) => {
    if (!branch) return "";
    return (
      branch.shortName ||
      branch.branchCode ||
      branch.city ||
      branch.branchName ||
      branch.name ||
      ""
    ).trim();
  }, []);

  const branchNames = useMemo(() => {
    if (isAllBranches) {
      return liveBranches.map(resolveBranchApiName).filter(Boolean);
    }
    const active = liveBranches.find((b) => b.id === activeBranchFilter);
    const name = resolveBranchApiName(active);
    return name ? [name] : [];
  }, [liveBranches, activeBranchFilter, isAllBranches, resolveBranchApiName]);

  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    const domain = getFrontendDomainUrl();
    const result = await getRestaurantOrdersForBranches({
      frontendDomainUrl: domain,
      branchNames
    });
    if (result.ok) {
      setApiOrders(result.orders || []);
      setLocalOverrides({});
    } else {
      setApiOrders([]);
      setError(result.message || "Failed to load orders.");
      if (!silent) {
        addToast("Orders Load Failed", result.message || "Could not fetch orders.", "error");
      }
    }
    setLoading(false);
  }, [branchNames, addToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Opening Orders page clears order notification badges (bell + sidebar)
  useEffect(() => {
    if (clearedNotifsRef.current) return;
    clearedNotifsRef.current = true;
    void clearOrderNotifications();
  }, [clearOrderNotifications]);

  useEffect(() => {
    let timer = null;
    const onRefresh = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        loadOrders({ silent: true });
      }, 800);
    };
    window.addEventListener(OWNER_ORDERS_REFRESH_EVENT, onRefresh);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(OWNER_ORDERS_REFRESH_EVENT, onRefresh);
    };
  }, [loadOrders]);

  const orders = useMemo(() => {
    return apiOrders.map((order) => {
      const override = localOverrides[order.orderId];
      return override ? { ...order, ...override } : order;
    });
  }, [apiOrders, localOverrides]);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (o.orderNumber || "").toLowerCase().includes(q) ||
      (o.customerName || "").toLowerCase().includes(q) ||
      (o.customerEmail || "").toLowerCase().includes(q) ||
      (o.customerPhone || "").includes(searchQuery.trim()) ||
      (o.customerContactNumber || "").includes(searchQuery.trim());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = orders.filter((o) => o.status === "received").length;
  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const deliveryCount = orders.filter((o) => o.status === "ready" || o.status === "out_for_delivery").length;
  const completedCount = orders.filter((o) => o.status === "delivered" || o.status === "completed").length;
  const totalCount = orders.length;

  const handleExportCSV = () => {
    const headers = [
      "Order #",
      "Customer",
      "Email",
      "Phone",
      "Branch",
      "Area",
      "Address",
      "Mode",
      "Items",
      "Subtotal",
      "Tax",
      "Delivery",
      "Discount",
      "Total",
      "Payment Method",
      "Payment Status",
      "Rider",
      "Status",
      "Date"
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.customerEmail,
      o.customerPhone,
      o.branchName,
      o.selectedArea,
      o.customerAddress,
      o.orderMode,
      o.itemCount,
      o.subtotal,
      o.tax ?? 0,
      o.deliveryFee,
      o.discount ?? 0,
      o.total,
      o.paymentMethod,
      o.paymentStatus,
      o.assignedRiderName || "Unassigned",
      o.status,
      o.createdAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `restaurantos_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Report Exported", "Orders CSV downloaded successfully.", "success");
  };

  const patchOrderLocally = (orderId, patch) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || {}), ...patch }
    }));
    if (selectedOrder && selectedOrder.orderId === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, ...patch } : prev));
    }
  };

  const handleStatusUpdate = (orderId, status) => {
    patchOrderLocally(orderId, { status });
    addToast(
      "Order Status Updated",
      `Order moved to "${String(status).replace(/_/g, " ").toUpperCase()}".`,
      "info"
    );
  };

  const handleRiderAssign = (orderId, riderId) => {
    const rider = riders.find((r) => r.id === riderId);
    if (!rider) return;
    patchOrderLocally(orderId, {
      assignedRiderId: rider.id,
      assignedRiderName: rider.name,
      assignedRiderPhone: rider.phone
    });
    addToast("Rider Assigned", `${rider.name} assigned to order.`, "success");
  };

  const lineName = (item) => item?.product?.name || item?.name || "Item";
  const lineTotal = (item) =>
    typeof item?.totalPrice === "number"
      ? item.totalPrice
      : typeof item?.lineTotal === "number"
        ? item.lineTotal
        : (Number(item?.unitPrice) || Number(item?.price) || 0) * (Number(item?.quantity) || 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Orders Management
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Compact list — open View for full order details.
          </p>
          {branchNames.length > 0 && (
            <p className="text-[10px] text-neutral-500 mt-1">
              Branch: {isAllBranches ? "All live branches" : branchNames[0]}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 self-start sm:self-auto ml-auto">
          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#191B20] hover:bg-[#252830] border border-[#292D35] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#FF5A1F]" /> : <RefreshCw className="w-4 h-4 text-[#FF5A1F]" />}
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#252830] hover:bg-[#30343C] border border-[#292D35] text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#FF5A1F]" />
            <span className="hidden sm:inline">Export Orders (.CSV)</span>
            <span className="sm:hidden">Export</span>
          </button>
          <div
            className="inline-flex items-center rounded-xl border border-[#292D35] bg-[#191B20] p-1 shrink-0"
            role="group"
            aria-label="Orders layout"
          >
            <button
              type="button"
              onClick={() => setLayout("rows")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                layoutMode === "rows"
                  ? "bg-[#FF5A1F] text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Row view"
            >
              <Rows3 className="w-3.5 h-3.5" />
              Rows
            </button>
            <button
              type="button"
              onClick={() => setLayout("cards")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                layoutMode === "cards"
                  ? "bg-[#FF5A1F] text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Cards view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "all", label: "Total", count: totalCount, active: "border-[#FF5A1F]", labelClass: "text-neutral-400" },
          { key: "received", label: "New / Pending", count: pendingCount, active: "border-purple-500", labelClass: "text-purple-400" },
          { key: "confirmed", label: "Confirmed", count: confirmedCount, active: "border-blue-500", labelClass: "text-blue-400" },
          { key: "preparing", label: "In Kitchen", count: preparingCount, active: "border-amber-500", labelClass: "text-amber-400" },
          { key: "ready", label: "Out for Delivery", count: deliveryCount, active: "border-emerald-500", labelClass: "text-emerald-400" },
          { key: "delivered", label: "Delivered", count: completedCount, active: "border-neutral-400", labelClass: "text-neutral-400" }
        ].map((stat) => (
          <div
            key={stat.key}
            onClick={() => setStatusFilter(stat.key)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              statusFilter === stat.key
                ? `bg-[#191B20] ${stat.active} shadow-sm`
                : "bg-[#191B20]/60 border-[#292D35] hover:border-[#404550]"
            }`}
          >
            <div className={`text-[10px] uppercase font-bold ${stat.labelClass}`}>{stat.label}</div>
            <div className="text-xl font-extrabold text-white mt-1">{stat.count}</div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order #, name, email, or phone..."
          className="w-full bg-[#191B20] border border-[#292D35] rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#FF5A1F]"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-[#292D35] bg-[#14171C] py-12 text-center text-neutral-400 text-xs">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF5A1F]" />
            Loading orders…
          </span>
        </div>
      )}

      {!loading && filteredOrders.length === 0 && (
        <div className="rounded-2xl border border-[#292D35] bg-[#14171C] py-12 text-center text-neutral-400 text-xs">
          No orders found matching the filter criteria.
        </div>
      )}

      {!loading && filteredOrders.length > 0 && layoutMode === "rows" && (
        <div className="bg-[#14171C] border border-[#292D35] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#292D35]/60">
          {filteredOrders.map((order) => {
            const phone = order.customerPhone || order.customerContactNumber || "";
            const pay = String(order.paymentMethod || "cod").toUpperCase();
            return (
              <div
                key={order.orderId}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 min-h-[52px] hover:bg-[#191B20]/50 transition-colors"
              >
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[150px_minmax(160px,1.1fr)_minmax(140px,1fr)_64px_96px_128px] items-center gap-x-3 gap-y-1.5">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-white text-[11px] sm:text-xs truncate">
                      {order.orderNumber}
                    </div>
                    <div className="text-[9px] uppercase text-neutral-500 truncate">
                      {order.orderMode || order.channel || "order"}
                    </div>
                  </div>

                  <div className="min-w-0 flex items-center gap-2">
                    <CustomerAvatar
                      name={order.customerName}
                      image={order.customerImage}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-semibold text-neutral-200 truncate flex items-center gap-1">
                        <span className="truncate">{order.customerName || "—"}</span>
                        {order.customerIsVerified && (
                          <BadgeCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[9px] text-neutral-500 truncate">
                        {order.branchName || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 hidden sm:block text-[10px] text-neutral-400 leading-snug">
                    {phone ? (
                      <div className="flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span className="truncate">{phone}</span>
                      </div>
                    ) : (
                      <div className="truncate">{order.selectedArea || order.customerAddress || "—"}</div>
                    )}
                    <div className="truncate mt-0.5">
                      {pay}
                      {order.paymentStatus ? ` · ${order.paymentStatus}` : ""}
                      {order.selectedArea ? ` · ${order.selectedArea}` : ""}
                    </div>
                  </div>

                  <div className="text-[10px] text-neutral-400 tabular-nums hidden sm:block">
                    {order.itemCount || 0} items
                  </div>

                  <div className="font-mono font-black text-white text-[11px] sm:text-xs tabular-nums">
                    {formatPrice(order.total)}
                  </div>

                  <div className="hidden sm:block min-w-0">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.orderId, e.target.value)}
                      className={`admin-select w-full px-2.5 py-1 pr-7 rounded-full text-[9px] font-black uppercase border border-transparent cursor-pointer ${statusSelectClass(order.status)}`}
                    >
                      <option value="received">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="sm:hidden flex items-center justify-between gap-2">
                    <span className="text-[10px] text-neutral-400 truncate min-w-0">
                      {phone || order.selectedArea || "—"} · {order.itemCount || 0} items · {pay}
                    </span>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.orderId, e.target.value)}
                      className={`admin-select shrink-0 px-2.5 py-1 pr-7 rounded-full text-[9px] font-black uppercase border border-transparent cursor-pointer ${statusSelectClass(order.status)}`}
                    >
                      <option value="received">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceOpen(false);
                    setSelectedOrder(order);
                  }}
                  className="inline-flex items-center gap-1.5 shrink-0 h-8 px-2.5 sm:px-3 rounded-lg bg-[#1D2128] hover:bg-[#FF5A1F]/15 border border-[#292D35] hover:border-[#FF5A1F]/40 text-neutral-200 hover:text-[#FF5A1F] text-[11px] font-bold transition-colors cursor-pointer"
                  title="View details"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredOrders.length > 0 && layoutMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredOrders.map((order) => (
            <div
              key={order.orderId}
              className="rounded-2xl border border-[#292D35] bg-[#14171C] p-3.5 flex flex-col gap-3 hover:border-[#404550] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-white text-sm truncate">
                    {order.orderNumber}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                    {(order.orderMode || order.channel || "order").toString().toUpperCase()}
                    {order.createdAt ? ` · ${order.createdAt}` : ""}
                  </div>
                </div>
                <div className="font-mono font-black text-[#FF5A1F] text-sm shrink-0">
                  {formatPrice(order.total)}
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <CustomerAvatar name={order.customerName} image={order.customerImage} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {order.customerName || "—"}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    {order.branchName || "—"} · {order.itemCount || 0} items
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <select
                  value={order.status}
                  onChange={(e) => handleStatusUpdate(order.orderId, e.target.value)}
                  className={`admin-select flex-1 min-w-0 px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase border border-transparent cursor-pointer ${statusSelectClass(order.status)}`}
                >
                  <option value="received">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceOpen(false);
                    setSelectedOrder(order);
                  }}
                  className="inline-flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-lg bg-[#1D2128] hover:bg-[#FF5A1F]/15 border border-[#292D35] hover:border-[#FF5A1F]/40 text-neutral-200 hover:text-[#FF5A1F] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && !isInvoiceOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#191B20] border border-[#292D35] rounded-t-2xl sm:rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#292D35]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white font-mono">
                    {selectedOrder.orderNumber}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30">
                    {selectedOrder.orderMode || selectedOrder.channel}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-transparent ${statusSelectClass(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {selectedOrder.branchName} • {selectedOrder.createdAt}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(true)}
                  className="p-1.5 rounded-lg bg-[#252830] text-neutral-300 hover:text-white"
                  title="Print Receipt"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#252830]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer */}
            <div className="p-3.5 rounded-xl bg-[#101216] border border-[#292D35] space-y-3">
              <div className="text-neutral-500 font-bold uppercase text-[10px]">Customer</div>
              <div className="flex items-start gap-3">
                <CustomerAvatar
                  name={selectedOrder.customerName}
                  image={selectedOrder.customerImage}
                  size="lg"
                />
                <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white font-bold text-sm">{selectedOrder.customerName}</span>
                    {selectedOrder.customerIsVerified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                    {selectedOrder.customerGender && (
                      <span className="text-[10px] text-neutral-500 capitalize">
                        · {selectedOrder.customerGender}
                      </span>
                    )}
                  </div>
                  {selectedOrder.customerEmail && (
                    <div className="text-neutral-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <a href={`mailto:${selectedOrder.customerEmail}`} className="hover:text-[#FF5A1F] break-all">
                        {selectedOrder.customerEmail}
                      </a>
                    </div>
                  )}
                  <div className="text-neutral-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <a href={`tel:${selectedOrder.customerPhone.replace(/\s/g, "")}`} className="hover:text-[#FF5A1F]">
                      {selectedOrder.customerPhone}
                    </a>
                  </div>
                  {selectedOrder.customerId && (
                    <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                      <User className="w-3 h-3" />
                      ID: {selectedOrder.customerId}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery / location */}
            <div className="p-3.5 rounded-xl bg-[#101216] border border-[#292D35] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-neutral-500 font-bold uppercase text-[10px]">Delivery Address</div>
                <div className="text-neutral-300 flex items-start gap-1.5 mt-1 leading-snug">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0 mt-0.5" />
                  <span>{selectedOrder.customerAddress}</span>
                </div>
                {selectedOrder.selectedArea && (
                  <div className="text-[11px] text-neutral-400 mt-1.5 pl-5">
                    Area: {selectedOrder.selectedArea}
                  </div>
                )}
              </div>
              <div>
                <div className="text-neutral-500 font-bold uppercase text-[10px]">Coordinates</div>
                {selectedOrder.latitude && selectedOrder.longitude ? (
                  <div className="mt-1 space-y-1">
                    <div className="text-neutral-300 font-mono text-[11px]">
                      {selectedOrder.latitude}, {selectedOrder.longitude}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(`${selectedOrder.latitude},${selectedOrder.longitude}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#FF5A1F] hover:underline"
                    >
                      <Navigation className="w-3 h-3" />
                      Open in Maps
                    </a>
                  </div>
                ) : (
                  <div className="text-neutral-500 mt-1">Not provided</div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Order Items ({selectedOrder.itemCount}
                {selectedOrder.uniqueItemsCount ? ` · ${selectedOrder.uniqueItemsCount} unique` : ""})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item) => (
                  <div
                    key={item.id || `${item.productId}-${item.name}`}
                    className="p-3 rounded-xl bg-[#101216] border border-[#292D35]/60 text-xs"
                  >
                    <div className="flex gap-3">
                      {item.image || item.product?.image ? (
                        <img
                          src={item.image || item.product.image}
                          alt={lineName(item)}
                          className="w-14 h-14 rounded-lg object-cover border border-[#292D35] shrink-0 bg-[#191B20]"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#191B20] border border-[#292D35] shrink-0 flex items-center justify-center text-neutral-600 text-[10px]">
                          N/A
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-white">
                              {item.quantity}× {lineName(item)}
                            </div>
                            {item.sku && (
                              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">SKU: {item.sku}</div>
                            )}
                          </div>
                          <div className="font-mono font-bold text-white shrink-0">
                            {formatPrice(lineTotal(item))}
                          </div>
                        </div>
                        <VariantLine variant={item.variant} />
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          Unit: {formatPrice(item.unitPrice ?? item.basePrice ?? 0)}
                          {item.lineSubtotal != null && (
                            <> · Subtotal: {formatPrice(item.lineSubtotal)}</>
                          )}
                        </div>
                        <AddonsList addons={item.addons} formatPrice={formatPrice} />
                        {item.notes ? (
                          <div className="text-[10px] text-amber-400/90 mt-1">Note: {item.notes}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-3 rounded-xl bg-[#101216] text-xs text-neutral-400">
                    No line items returned for this order.
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes ? (
              <div className="p-3 rounded-xl bg-[#101216] border border-[#292D35] text-xs">
                <div className="text-neutral-500 font-bold uppercase text-[10px] mb-1">Order Notes</div>
                <div className="text-neutral-300">{selectedOrder.notes}</div>
              </div>
            ) : null}

            {/* Financials */}
            <div className="p-3.5 rounded-xl bg-[#101216] border border-[#292D35] space-y-1.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white font-mono">{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="text-white font-mono">{formatPrice(selectedOrder.tax ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-white font-mono">{formatPrice(selectedOrder.deliveryFee)}</span>
              </div>
              {(selectedOrder.discount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono">−{formatPrice(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#292D35] text-[11px] text-neutral-500">
                <span>Payment</span>
                <span className="uppercase">{paymentLabel(selectedOrder.paymentMethod, selectedOrder.paymentStatus)}</span>
              </div>
              <div className="flex justify-between pt-1 text-white font-black text-sm">
                <span>Grand Total ({selectedOrder.currency || "PKR"})</span>
                <span className="text-[#FF5A1F] font-mono text-base">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Status history */}
            {Array.isArray(selectedOrder.statusHistory) && selectedOrder.statusHistory.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#101216] border border-[#292D35] space-y-2">
                <div className="text-neutral-500 font-bold uppercase text-[10px]">Status History</div>
                <ul className="space-y-2">
                  {selectedOrder.statusHistory.map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="text-white font-semibold capitalize">{entry.status}</div>
                        {entry.note && <div className="text-[10px] text-neutral-400 mt-0.5">{entry.note}</div>}
                      </div>
                      <div className="text-[10px] text-neutral-500 shrink-0">{entry.at}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rider + status */}
            <div className="pt-2 border-t border-[#292D35] space-y-3">
              <div>
                <div className="text-[11px] font-bold text-neutral-400 uppercase mb-1.5">
                  Assign Rider
                </div>
                <select
                  value={selectedOrder.assignedRiderId || ""}
                  onChange={(e) => handleRiderAssign(selectedOrder.orderId, e.target.value)}
                  className="admin-field admin-select w-full rounded-xl px-3 py-2 text-xs focus:border-[#FF5A1F] cursor-pointer"
                >
                  <option value="">Assign Delivery Rider</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({(r.vehicleType || "bike").toUpperCase()})
                    </option>
                  ))}
                </select>
                {selectedOrder.assignedRiderName && (
                  <div className="text-[10px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                    <Bike className="w-3 h-3" />
                    <span>
                      {selectedOrder.assignedRiderName}
                      {selectedOrder.assignedRiderPhone
                        ? ` · ${selectedOrder.assignedRiderPhone}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] font-bold text-neutral-400 uppercase mb-1.5">
                  Update Status
                </div>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusUpdate(selectedOrder.orderId, e.target.value)}
                  className={`admin-select w-full px-3 py-2 rounded-xl text-[11px] font-black uppercase border border-transparent cursor-pointer mb-2 ${statusSelectClass(selectedOrder.status)}`}
                >
                  <option value="received">Pending / Received</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedOrder.orderId, "confirmed")}
                    className="py-2 rounded-xl bg-[#101216] hover:bg-blue-600 hover:text-white border border-[#292D35] text-neutral-300 transition-colors cursor-pointer"
                  >
                    Confirm Order
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedOrder.orderId, "preparing")}
                    className="py-2 rounded-xl bg-[#101216] hover:bg-amber-500 hover:text-black border border-[#292D35] text-neutral-300 transition-colors cursor-pointer"
                  >
                    Send to Kitchen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedOrder.orderId, "ready")}
                    className="py-2 rounded-xl bg-[#101216] hover:bg-emerald-500 hover:text-black border border-[#292D35] text-neutral-300 transition-colors cursor-pointer"
                  >
                    Out for Delivery
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isInvoiceOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <span className="font-sans font-bold text-sm text-neutral-900">Official Tax Invoice</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#E51B23] text-white rounded-lg font-sans font-bold text-xs shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div id="print-area" className="space-y-4 p-2">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black font-sans tracking-tight">{config.name}</h2>
                <div className="text-[11px] text-neutral-600">{selectedOrder.branchName}</div>
                <div className="text-[10px] text-neutral-500">
                  Order #{selectedOrder.orderNumber} • {selectedOrder.createdAt}
                </div>
              </div>

              <div className="border-t border-dashed border-neutral-300 pt-2 space-y-1">
                <div>Customer: <strong>{selectedOrder.customerName}</strong></div>
                {selectedOrder.customerEmail && (
                  <div>Email: <strong>{selectedOrder.customerEmail}</strong></div>
                )}
                <div>Phone: <strong>{selectedOrder.customerPhone}</strong></div>
                <div>Address: <strong>{selectedOrder.customerAddress}</strong></div>
                {selectedOrder.selectedArea && (
                  <div>Area: <strong>{selectedOrder.selectedArea}</strong></div>
                )}
                {selectedOrder.assignedRiderName && (
                  <div>
                    Rider: <strong>{selectedOrder.assignedRiderName}</strong> ({selectedOrder.assignedRiderPhone})
                  </div>
                )}
                <div>
                  Payment: <strong>{paymentLabel(selectedOrder.paymentMethod, selectedOrder.paymentStatus)}</strong>
                </div>
              </div>

              <div className="border-t border-dashed border-neutral-300 pt-2 space-y-2">
                {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item) => (
                  <div key={item.id || item.name} className="space-y-0.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div>{item.quantity}× {lineName(item)}</div>
                        {item.variant?.name && (
                          <div className="text-[10px] text-neutral-500">
                            {[item.variant.name, item.variant.size].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {Array.isArray(item.addons) && item.addons.map((addon) => (
                          <div key={addon.addonId || addon.name} className="text-[10px] text-neutral-500">
                            + {addon.name}
                            {addon.quantity > 1 ? ` ×${addon.quantity}` : ""} ({formatPrice(addon.lineTotal ?? addon.price ?? 0)})
                          </div>
                        ))}
                      </div>
                      <div className="font-bold shrink-0">{formatPrice(lineTotal(item))}</div>
                    </div>
                  </div>
                )) : (
                  <div className="flex justify-between">
                    <div>Order items</div>
                    <div>{formatPrice(selectedOrder.subtotal)}</div>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-neutral-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Tax:</span>
                  <span>{formatPrice(selectedOrder.tax ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{formatPrice(selectedOrder.deliveryFee)}</span>
                </div>
                {(selectedOrder.discount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>−{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-neutral-900 pt-2">
                  <span>TOTAL ({selectedOrder.currency || "PKR"}):</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-neutral-300 text-[10px] text-neutral-500">
                Thank you for dining with {config.name}!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export {
  OrdersPage
};
