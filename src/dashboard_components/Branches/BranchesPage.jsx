import { useCallback, useEffect, useMemo, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { getFrontendDomainUrl } from '@/shared/lib/catalogApi';
import { getOwnerBranches } from '@/shared/lib/branchesApi';
import { createBranchArea } from '@/shared/lib/areasApi';
import {
  BranchServiceAreaEditor,
  radiusToPolygon
} from '@/dashboard_components/Branches/BranchServiceAreaEditor';
import {
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  Store,
  Tag,
  X
} from "lucide-react";

const SURFACE =
  "rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14161B)]";

const INPUT =
  "w-full rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-input,#101216)] px-3 py-2 text-[var(--admin-text,#fff)] placeholder:text-[var(--admin-faint,#737373)] focus:outline-none focus:border-[var(--color-admin-accent,#FF5A1F)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)]";

function SkeletonPulse({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-xl bg-[var(--admin-hover,#1A1D24)] ${className}`} />
  );
}

function MetaChip({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0D0F12)] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-faint,#737373)]">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-xs font-bold text-[var(--admin-text,#fff)]"
        title={String(value ?? "—")}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--admin-border,#292D35)] py-2 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
        {label}
      </span>
      <div className="min-w-0 break-words text-sm text-[var(--admin-muted,#D4D4D4)] sm:text-right">
        {children}
      </div>
    </div>
  );
}

const BranchesPage = () => {
  const {
    branches,
    setBranches,
    orders,
    formatPrice,
    addBranch,
    updateBranch,
    addToast,
    adminTheme
  } = useRestaurant();
  const { isAllBranches, activeBranchFilter, liveBranches } = useBranchScope();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards");
  const [expandedId, setExpandedId] = useState("");
  const [detailBranch, setDetailBranch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [serviceBranch, setServiceBranch] = useState(null);
  const [serviceForm, setServiceForm] = useState({ radiusKm: 5, polygon: [] });
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [savingServiceArea, setSavingServiceArea] = useState(false);
  const [apiMeta, setApiMeta] = useState({
    count: null,
    accountType: "",
    accessAllBranches: false,
    hasMultipleBranches: false,
    showAllBranches: false,
    frontendDomainUrl: "",
    message: "",
    success: false,
    showAllBranchesButton: null
  });
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    address: "",
    phone: "",
    email: "",
    manager: "",
    openingHours: "11:00 AM - 11:30 PM",
    isOpen: true
  });

  const loadBranches = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    const domain = getFrontendDomainUrl();
    const result = await getOwnerBranches(domain);
    if (silent) setRefreshing(false);
    else setLoading(false);

    setApiMeta({
      count: typeof result.count === "number" ? result.count : result.branches?.length || 0,
      accountType: result.accountType || "",
      accessAllBranches: Boolean(result.accessAllBranches),
      hasMultipleBranches: Boolean(result.hasMultipleBranches),
      showAllBranches: Boolean(result.showAllBranches),
      frontendDomainUrl: result.frontendDomainUrl || domain,
      message: result.message || "",
      success: result.success === true || result.ok,
      showAllBranchesButton: result.showAllBranchesButton || null
    });

    if (!result.ok) {
      addToast("Load Failed", result.message || "Branches could not be loaded.", "error");
      return;
    }
    if (typeof setBranches === "function") {
      setBranches(result.branches);
    }
  };

  useEffect(() => {
    void loadBranches();
  }, []);

  const scopedBranches = useMemo(() => {
    const source = liveBranches.length ? liveBranches : branches;
    return isAllBranches ? source : source.filter((b) => b.id === activeBranchFilter);
  }, [liveBranches, branches, isAllBranches, activeBranchFilter]);

  const stats = useMemo(() => {
    const total = scopedBranches.length;
    let open = 0;
    let closed = 0;
    let active = 0;
    let revenue = 0;
    let orderCount = 0;
    for (const branch of scopedBranches) {
      if (branch.isOpen !== false) open += 1;
      else closed += 1;
      if (branch.isActive !== false) active += 1;
      const branchOrders = orders.filter((o) => o.branchId === branch.id);
      orderCount += branchOrders.length;
      revenue += branchOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      revenue += Number(branch.revenueToday) || 0;
      orderCount += Number(branch.ordersToday) || 0;
    }
    const openPct = total ? Math.round((open / total) * 100) : 0;
    return { total, open, closed, active, revenue, orderCount, openPct };
  }, [scopedBranches, orders]);

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedBranches.filter((branch) => {
      const haystack = [
        branch.name,
        branch.shortName,
        branch.branchCode,
        branch.slug,
        branch.id,
        branch.merchantId,
        branch.businessId,
        branch.city,
        branch.address,
        branch.phone,
        branch.manager
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      if (!matchesSearch) return false;
      if (statusFilter === "open") return branch.isOpen !== false;
      if (statusFilter === "closed") return branch.isOpen === false;
      if (statusFilter === "active") return branch.isActive !== false;
      return true;
    });
  }, [scopedBranches, searchQuery, statusFilter]);

  const revenueBars = useMemo(() => {
    const rows = scopedBranches
      .map((branch) => {
        const fromOrders = orders
          .filter((o) => o.branchId === branch.id)
          .reduce((acc, o) => acc + (o.total || 0), 0);
        const value = fromOrders || Number(branch.revenueToday) || 0;
        const orderCount =
          orders.filter((o) => o.branchId === branch.id).length ||
          Number(branch.ordersToday) ||
          0;
        return { label: branch.name, value, orderCount };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const max = Math.max(...rows.map((r) => r.value), 1);
    return { rows, max };
  }, [scopedBranches, orders]);

  const statusBars = useMemo(() => {
    const rows = [
      { label: "Open", value: stats.open, color: "from-emerald-700 via-emerald-500 to-emerald-300" },
      { label: "Closed", value: stats.closed, color: "from-red-700 via-red-500 to-red-300" },
      { label: "Active", value: stats.active, color: "from-sky-700 via-sky-500 to-sky-300" }
    ];
    const max = Math.max(...rows.map((r) => r.value), 1);
    return { rows, max };
  }, [stats]);

  const donutStyle = useMemo(() => {
    const total = Math.max(stats.total, 1);
    let cursor = 0;
    const segment = (value, color) => {
      const deg = (value / total) * 360;
      const start = cursor;
      cursor += deg;
      return `${color} ${start}deg ${cursor}deg`;
    };
    if (stats.total === 0) {
      return { background: "conic-gradient(var(--admin-border,#2A2F38) 0deg 360deg)" };
    }
    return {
      background: `conic-gradient(${[
        segment(stats.open, "#34d399"),
        segment(stats.closed, "#f87171")
      ].join(", ")})`
    };
  }, [stats]);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      shortName: "",
      address: "",
      phone: "",
      email: "",
      manager: "",
      openingHours: "11:00 AM - 11:30 PM",
      isOpen: true
    });
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setFormData({
      name: b.name || "",
      shortName: b.shortName || b.branchCode || "",
      address: b.address || "",
      phone: b.phone || "",
      email: b.email || "",
      manager: b.manager || "",
      openingHours: b.openingHours || b.operatingHours || "11:00 AM - 11:30 PM",
      isOpen: b.isOpen !== false
    });
    setEditingBranch(b);
    setDetailBranch(null);
    setIsModalOpen(true);
  };

  const openServiceArea = (branch) => {
    const existing = Array.isArray(branch.serviceAreas) ? branch.serviceAreas[0] : null;
    const lat = Number(branch.latitude);
    const lng = Number(branch.longitude);
    const radiusKm = existing?.radiusKm > 0 ? existing.radiusKm : 5;
    const polygon =
      existing?.polygon?.length >= 3
        ? existing.polygon
        : Number.isFinite(lat) && Number.isFinite(lng)
          ? radiusToPolygon(lat, lng, radiusKm)
          : [];
    setServiceBranch(branch);
    setServiceAreaId(existing?.id || "");
    setServiceForm({ radiusKm, polygon });
    setDetailBranch(null);
  };

  const handleServiceAreaChange = useCallback((next) => {
    setServiceForm({
      radiusKm: next.radiusKm,
      polygon: next.polygon || []
    });
  }, []);

  const handleSaveServiceArea = async () => {
    if (!serviceBranch?.id) return;
    if (!serviceBranch.latitude || !serviceBranch.longitude) {
      addToast(
        "Location missing",
        "Branch latitude/longitude is required from the API.",
        "error"
      );
      return;
    }
    if (!(Number(serviceForm.radiusKm) > 0)) {
      addToast("Radius required", "Set how many km around the restaurant you cover.", "error");
      return;
    }
    if (!Array.isArray(serviceForm.polygon) || serviceForm.polygon.length < 3) {
      addToast("Zone required", "Polygon needs at least 3 points around the restaurant.", "error");
      return;
    }

    setSavingServiceArea(true);
    const payload = {
      radiusKm: Number(serviceForm.radiusKm),
      polygon: serviceForm.polygon
    };
    const domain = getFrontendDomainUrl();
    // Backend upserts via PUT /branches/:id/areas (POST is not supported).
    const result = await createBranchArea(serviceBranch.id, payload, domain);
    setSavingServiceArea(false);

    if (!result.ok) {
      addToast("Save failed", result.message, "error");
      return;
    }

    const saved = {
      id: result.area?.id || serviceAreaId || `area_${Date.now()}`,
      radiusKm: payload.radiusKm,
      polygon: payload.polygon,
      isActive: true
    };
    if (typeof setBranches === "function") {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === serviceBranch.id
            ? {
                ...b,
                serviceAreas: [saved],
                areasServed: b.areasServed?.length ? b.areasServed : [b.city || b.name].filter(Boolean)
              }
            : b
        )
      );
    }
    addToast("Service area saved", `${serviceBranch.name} delivery zone updated.`, "success");
    setServiceBranch(null);
    void loadBranches({ silent: true });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editingBranch) {
      updateBranch(editingBranch.id, {
        name: formData.name,
        shortName: formData.shortName,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        manager: formData.manager,
        openingHours: formData.openingHours,
        operatingHours: formData.openingHours,
        isOpen: formData.isOpen
      });
      addToast("Branch Updated", `${formData.name} updated.`, "success");
    } else {
      addBranch({
        name: formData.name,
        shortName: formData.shortName,
        area: formData.shortName,
        city: formData.shortName || formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        manager: formData.manager,
        operatingHours: formData.openingHours,
        openingHours: formData.openingHours,
        isOpen: formData.isOpen,
        deliveryFee: 120,
        deliveryTime: "25-35 mins",
        minOrder: 500,
        rating: 4.8,
        areasServed: [formData.shortName || formData.name].filter(Boolean)
      });
      addToast("Branch Added", `${formData.name} activated.`, "success");
    }
    setIsModalOpen(false);
  };

  const renderBranchDetail = (branch) => {
    const branchOrders = orders.filter((o) => o.branchId === branch.id);
    const branchRevenue =
      branchOrders.reduce((acc, o) => acc + (o.total || 0), 0) ||
      Number(branch.revenueToday) ||
      0;
    return (
      <div className="space-y-4">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <FieldRow label="Branch ID">{branch.id || "—"}</FieldRow>
          <FieldRow label="Merchant ID">{branch.merchantId || "—"}</FieldRow>
          <FieldRow label="Business ID">{branch.businessId || "—"}</FieldRow>
          <FieldRow label="Branch code">{branch.branchCode || branch.shortName || "—"}</FieldRow>
          <FieldRow label="Slug">{branch.slug || "—"}</FieldRow>
          <FieldRow label="City / area">{branch.city || branch.area || "—"}</FieldRow>
          <FieldRow label="District">{branch.district || "—"}</FieldRow>
          <FieldRow label="Province">{branch.province || "—"}</FieldRow>
          <FieldRow label="Country">{branch.country || "—"}</FieldRow>
          <FieldRow label="Latitude">{branch.latitude || "—"}</FieldRow>
          <FieldRow label="Longitude">{branch.longitude || "—"}</FieldRow>
          <FieldRow label="Open">{branch.isOpen !== false ? "true" : "false"}</FieldRow>
          <FieldRow label="Active">{branch.isActive !== false ? "true" : "false"}</FieldRow>
          <FieldRow label="Manager">{branch.manager || "—"}</FieldRow>
          <FieldRow label="Phone">{branch.phone || "—"}</FieldRow>
          <FieldRow label="Email">{branch.email || "—"}</FieldRow>
          <FieldRow label="Hours">{branch.openingHours || branch.operatingHours || "—"}</FieldRow>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetaChip label="Orders" value={branchOrders.length || branch.ordersToday || 0} />
          <MetaChip label="Revenue" value={formatPrice(branchRevenue)} />
          <MetaChip label="Delivery fee" value={formatPrice(branch.deliveryFee || 0)} />
          <MetaChip label="Min order" value={formatPrice(branch.minOrder || 0)} />
          <MetaChip label="ETA" value={branch.deliveryTime || "—"} />
          <MetaChip label="Rating" value={branch.rating ?? "—"} />
          <MetaChip label="Free delivery" value={formatPrice(branch.freeDeliveryThreshold || 0)} />
          <MetaChip
            label="Service zones"
            value={(branch.serviceAreas || []).length || 0}
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Address
          </p>
          <p className="text-sm text-[var(--admin-muted,#D4D4D4)]">{branch.address || "—"}</p>
        </div>

        {(branch.serviceAreas || []).length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Service areas
            </p>
            <div className="space-y-2">
              {branch.serviceAreas.map((area, index) => (
                <div
                  key={area.id || index}
                  className="rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2 text-xs text-[var(--admin-muted,#D4D4D4)]"
                >
                  Radius {area.radiusKm || 0} km · {(area.polygon || []).length} polygon points
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openServiceArea(branch)}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[var(--color-admin-accent,#FF5A1F)]"
            >
              <MapPin className="h-3.5 w-3.5" />
              Edit on map
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-lg space-y-3">
            <SkeletonPulse className="h-10 w-56" />
            <SkeletonPulse className="h-4 w-full max-w-md" />
          </div>
          <SkeletonPulse className="h-11 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`${SURFACE} space-y-3 p-4`}>
              <SkeletonPulse className="h-3 w-20" />
              <SkeletonPulse className="h-8 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-[1500px] space-y-6 p-4 font-['Plus_Jakarta_Sans',sans-serif] sm:p-6 lg:p-8"
      data-admin-theme-context={adminTheme || "dark"}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 font-['Outfit',sans-serif] text-xl font-black tracking-tight text-[var(--admin-text,#fff)] sm:text-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
              <Building2 className="h-5 w-5" />
            </span>
            <span>Branches & Locations</span>
          </h2>
          <p className="mt-1.5 max-w-xl text-xs text-[var(--admin-subtle,#A3A3A3)] sm:text-sm">
            Multi-branch overview with live status, revenue mix, and full API payload details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadBranches({ silent: true })}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)] px-3.5 py-2.5 text-sm font-bold text-[var(--admin-muted,#D4D4D4)] transition-all hover:text-[var(--admin-text,#fff)] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_25%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-admin-accent-hover,#E04810)]"
          >
            <Plus className="h-4 w-4" />
            Add New Branch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <MetaChip label="API count" value={apiMeta.count ?? stats.total} />
        <MetaChip label="Account" value={apiMeta.accountType || "—"} />
        <MetaChip label="Access all" value={apiMeta.accessAllBranches ? "true" : "false"} />
        <MetaChip label="Multi branch" value={apiMeta.hasMultipleBranches ? "true" : "false"} />
        <MetaChip label="Show all" value={apiMeta.showAllBranches ? "true" : "false"} />
        <MetaChip label="Success" value={apiMeta.success ? "true" : "false"} />
        <MetaChip label="Domain" value={apiMeta.frontendDomainUrl || getFrontendDomainUrl()} />
      </div>

      {apiMeta.showAllBranchesButton?.show ? (
        <div className={`${SURFACE} flex flex-wrap items-center justify-between gap-3 p-4`}>
          <div>
            <p className="text-sm font-bold text-[var(--admin-text,#fff)]">
              {apiMeta.showAllBranchesButton.label}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--admin-faint,#737373)]">
              key: {apiMeta.showAllBranchesButton.key} · showAllBranches:{" "}
              {apiMeta.showAllBranchesButton.showAllBranches ? "true" : "false"}
            </p>
          </div>
          <span className="rounded-lg bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--color-admin-accent,#FF5A1F)]">
            Enabled
          </span>
        </div>
      ) : null}

      {apiMeta.message ? (
        <p className="text-xs text-[var(--admin-subtle,#A3A3A3)]">{apiMeta.message}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: "Total",
            value: stats.total,
            hint: "Locations",
            icon: Layers,
            tone: "text-[var(--color-admin-accent,#FF5A1F)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)]",
            filter: "all"
          },
          {
            label: "Open",
            value: stats.open,
            hint: `${stats.openPct}% live`,
            icon: CheckCircle2,
            tone: "text-emerald-400 bg-emerald-500/10",
            filter: "open"
          },
          {
            label: "Closed",
            value: stats.closed,
            hint: "Paused",
            icon: Power,
            tone: "text-red-400 bg-red-500/10",
            filter: "closed"
          },
          {
            label: "Orders",
            value: stats.orderCount,
            hint: "Across branches",
            icon: Tag,
            tone: "text-sky-400 bg-sky-500/10",
            filter: null
          },
          {
            label: "Revenue",
            value: formatPrice(stats.revenue),
            hint: "Tracked total",
            icon: Store,
            tone: "text-violet-400 bg-violet-500/10",
            filter: null
          }
        ].map((card) => {
          const Icon = card.icon;
          const isSelected = card.filter !== null && statusFilter === card.filter;
          return (
            <button
              key={card.label}
              type="button"
              disabled={card.filter === null}
              onClick={() => {
                if (card.filter === null) return;
                setStatusFilter((prev) => (prev === card.filter ? "all" : card.filter));
              }}
              className={`rounded-2xl border p-4 text-left transition-all sm:p-5 ${
                card.filter === null ? "cursor-default" : "cursor-pointer hover:-translate-y-0.5"
              } ${
                isSelected
                  ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)]"
                  : "border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--admin-faint,#737373)]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-xl font-black tabular-nums tracking-tight text-[var(--admin-text,#fff)] sm:text-2xl">
                    {card.value}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--admin-faint,#737373)]">{card.hint}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className={`${SURFACE} p-5 xl:col-span-3`}>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[var(--admin-text,#fff)]">Status mix</h3>
              <p className="mt-0.5 text-[12px] text-[var(--admin-faint,#737373)]">Open vs closed</p>
            </div>
            <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
              <div className="relative h-36 w-36 shrink-0 rounded-full" style={donutStyle}>
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)]">
                  <span className="text-2xl font-black tabular-nums text-[var(--admin-text,#fff)]">
                    {stats.openPct}%
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                    Open
                  </span>
                </div>
              </div>
              <div className="w-full space-y-2 text-xs">
                {[
                  { label: "Open", value: stats.open, color: "bg-emerald-400", filter: "open" },
                  { label: "Closed", value: stats.closed, color: "bg-red-400", filter: "closed" }
                ].map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    onClick={() =>
                      setStatusFilter((prev) => (prev === row.filter ? "all" : row.filter))
                    }
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                      statusFilter === row.filter
                        ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)]"
                        : "border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[var(--admin-muted,#D4D4D4)]">
                      <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                      {row.label}
                    </span>
                    <span className="font-bold tabular-nums text-[var(--admin-text,#fff)]">
                      {row.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`${SURFACE} space-y-5 p-5 xl:col-span-5`}>
            <div>
              <div className="text-sm font-bold text-[var(--admin-text,#fff)]">Revenue by branch</div>
              <div className="mt-0.5 text-[11px] text-[var(--admin-faint,#737373)]">
                Top locations by tracked revenue
              </div>
            </div>
            {revenueBars.rows.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--admin-faint,#737373)]">
                No revenue data yet.
              </p>
            ) : (
              <div className="space-y-3">
                {revenueBars.rows.map((row) => (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-[var(--admin-subtle,#A3A3A3)]">{row.label}</span>
                      <span className="font-bold tabular-nums text-[var(--admin-text,#fff)]">
                        {formatPrice(row.value)} · {row.orderCount} orders
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-surface,#101216)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C2410C] via-[var(--color-admin-accent,#FF5A1F)] to-[#FDBA74] transition-all duration-500"
                        style={{ width: `${(row.value / revenueBars.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${SURFACE} space-y-3 p-5 xl:col-span-4`}>
            <div className="text-sm font-bold text-[var(--admin-text,#fff)]">Status bars</div>
            <div className="flex h-32 items-end gap-2 sm:gap-3">
              {statusBars.rows.map((row) => (
                <div
                  key={row.label}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[10px] font-bold tabular-nums text-[var(--admin-subtle,#A3A3A3)] opacity-0 transition-opacity group-hover:opacity-100">
                    {row.value}
                  </span>
                  <div className="flex h-[96px] w-full items-end overflow-hidden rounded-t-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0E1116)]">
                    <div
                      className={`w-full rounded-t-lg bg-gradient-to-t ${row.color} transition-all duration-500`}
                      style={{
                        height: `${Math.max(row.value > 0 ? 12 : 0, (row.value / statusBars.max) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-center text-[9px] font-bold text-[var(--admin-faint,#737373)] sm:text-[10px]">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)] p-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle,#A3A3A3)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, code, slug, id, merchant..."
            className={`${INPUT} pl-10`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["all", "open", "closed", "active"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                statusFilter === key
                  ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]"
                  : "border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] text-[var(--admin-subtle,#A3A3A3)]"
              }`}
            >
              {key}
            </button>
          ))}
          <span className="rounded-md border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-1 text-[10px] font-extrabold uppercase text-[var(--admin-muted,#D4D4D4)]">
            {filteredBranches.length} shown
          </span>
          <div className="inline-flex rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`cursor-pointer rounded-lg p-2 ${viewMode === "cards" ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white" : "text-[var(--admin-subtle,#A3A3A3)]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("rows")}
              className={`cursor-pointer rounded-lg p-2 ${viewMode === "rows" ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white" : "text-[var(--admin-subtle,#A3A3A3)]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filteredBranches.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-[var(--admin-border,#343943)] bg-[var(--admin-elevated,#14171C)] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
            <Store className="h-6 w-6" />
          </div>
          <p className="mx-auto max-w-md text-sm text-[var(--admin-subtle,#A3A3A3)]">
            {scopedBranches.length === 0
              ? "No branches found. Add a location or refresh from the API."
              : "No branches match these filters."}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBranches.map((branch) => {
            const branchOrders = orders.filter((o) => o.branchId === branch.id);
            const branchRevenue =
              branchOrders.reduce((acc, o) => acc + (o.total || 0), 0) ||
              Number(branch.revenueToday) ||
              0;
            const expanded = expandedId === branch.id;
            const open = branch.isOpen !== false;
            return (
              <article
                key={branch.id}
                className={`${SURFACE} space-y-4 p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-hover,#3A404A)] ${!open ? "opacity-80" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-[var(--admin-text,#fff)]">
                        {branch.name}
                      </h3>
                      <p className="truncate font-mono text-[11px] text-[var(--admin-faint,#737373)]">
                        {branch.branchCode || branch.shortName || branch.slug || branch.id}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      open
                        ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                        : "border border-red-500/30 bg-red-500/15 text-red-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${open ? "animate-pulse bg-emerald-400" : "bg-red-400"}`}
                    />
                    {open ? "Live Open" : "Closed"}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-[var(--admin-muted,#D4D4D4)]">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-admin-accent,#FF5A1F)]" />
                    <span className="text-[var(--admin-subtle,#A3A3A3)]">
                      {branch.address || branch.city || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--admin-faint,#737373)]" />
                    <span>{branch.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--admin-faint,#737373)]" />
                    <span>{branch.openingHours || branch.operatingHours || "—"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] p-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                      Orders
                    </div>
                    <div className="mt-0.5 font-mono text-base font-extrabold text-[var(--admin-text,#fff)]">
                      {branchOrders.length || branch.ordersToday || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                      Revenue
                    </div>
                    <div className="mt-0.5 font-mono text-base font-extrabold text-emerald-400">
                      {formatPrice(branchRevenue)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                  <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 font-mono text-[var(--admin-subtle,#A3A3A3)]">
                    ID: {branch.id}
                  </div>
                  {branch.latitude && branch.longitude ? (
                    <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 font-mono text-[var(--admin-subtle,#A3A3A3)]">
                      Pin: {branch.latitude}, {branch.longitude}
                    </div>
                  ) : (
                    <div className="truncate rounded-lg border border-amber-500/30 px-2 py-1.5 text-amber-300">
                      No map coordinates yet
                    </div>
                  )}
                  {(branch.serviceAreas || [])[0]?.radiusKm ? (
                    <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                      Service radius: {(branch.serviceAreas || [])[0].radiusKm} km
                    </div>
                  ) : null}
                  {branch.slug ? (
                    <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                      slug: {branch.slug}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-[var(--admin-border,#292D35)] pt-3">
                  <button
                    type="button"
                    onClick={() => openServiceArea(branch)}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)] px-3 py-2 text-xs font-bold text-[var(--color-admin-accent,#FF5A1F)]"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Service area
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((prev) => (prev === branch.id ? "" : branch.id))
                    }
                    className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {expanded ? "Hide" : "Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateBranch(branch.id, { isOpen: !branch.isOpen });
                      addToast(
                        "Status Changed",
                        `${branch.name} is now ${!branch.isOpen ? "Open" : "Closed"}.`,
                        "info"
                      );
                    }}
                    className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${
                      open
                        ? "bg-red-500/10 text-red-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {open ? "Pause" : "Open"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(branch)}
                    className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>

                {expanded && (
                  <div className="animate-in fade-in border-t border-[var(--admin-border,#292D35)] pt-3 duration-200">
                    {renderBranchDetail(branch)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBranches.map((branch) => {
            const open = branch.isOpen !== false;
            const expanded = expandedId === branch.id;
            const branchOrders = orders.filter((o) => o.branchId === branch.id);
            const branchRevenue =
              branchOrders.reduce((acc, o) => acc + (o.total || 0), 0) ||
              Number(branch.revenueToday) ||
              0;
            return (
              <div
                key={branch.id}
                className={`${SURFACE} p-4 sm:p-5 ${!open ? "opacity-80" : ""}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-extrabold text-[var(--admin-text,#fff)]">
                          {branch.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            open
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {open ? "Open" : "Closed"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--admin-subtle,#A3A3A3)]">
                        {branch.address || branch.city || "—"} · {branch.branchCode || branch.slug || "—"}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--admin-faint,#737373)]">
                        {branch.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <span className="rounded-lg border border-[var(--admin-border,#292D35)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      {branchOrders.length || branch.ordersToday || 0} orders · {formatPrice(branchRevenue)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openServiceArea(branch)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)] px-3 py-2 text-xs font-bold text-[var(--color-admin-accent,#FF5A1F)]"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Service area
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((prev) => (prev === branch.id ? "" : branch.id))
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[var(--admin-border,#292D35)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(branch)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-4 border-t border-[var(--admin-border,#292D35)] pt-4">
                    {renderBranchDetail(branch)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {serviceBranch && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14161B)] shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border,#292D35)] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                  Delivery coverage
                </p>
                <h3 className="truncate text-lg font-black text-[var(--admin-text,#fff)]">
                  {serviceBranch.name} · service area
                </h3>
                <p className="mt-0.5 text-[11px] text-[var(--admin-faint,#737373)]">
                  Pin stays on restaurant coordinates from API. Set radius / polygon for where you
                  deliver.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setServiceBranch(null)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#A3A3A3)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <BranchServiceAreaEditor
                branchName={serviceBranch.name}
                latitude={serviceBranch.latitude}
                longitude={serviceBranch.longitude}
                radiusKm={serviceForm.radiusKm}
                polygon={serviceForm.polygon}
                onChange={handleServiceAreaChange}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border,#292D35)] p-4">
              <button
                type="button"
                onClick={() => setServiceBranch(null)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border,#292D35)] px-4 py-2.5 text-sm font-bold text-[var(--admin-muted,#D4D4D4)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveServiceArea()}
                disabled={savingServiceArea}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {savingServiceArea ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Save service area
              </button>
            </div>
          </div>
        </div>
      )}

      {detailBranch && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/70 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)] shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border,#292D35)] p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                  Full branch payload
                </p>
                <h3 className="truncate text-lg font-black text-[var(--admin-text,#fff)]">
                  {detailBranch.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailBranch(null)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#A3A3A3)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">{renderBranchDetail(detailBranch)}</div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border,#292D35)] p-4">
              <button
                type="button"
                onClick={() => openServiceArea(detailBranch)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_35%,transparent)] px-4 py-2 text-sm font-bold text-[var(--color-admin-accent,#FF5A1F)]"
              >
                <MapPin className="h-4 w-4" />
                Service area
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(detailBranch)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2 text-sm font-bold text-white"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDetailBranch(null)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border,#292D35)] px-4 py-2 text-sm font-bold text-[var(--admin-muted,#D4D4D4)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className={`${SURFACE} max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95`}>
            <div className="flex items-center justify-between border-b border-[var(--admin-border,#292D35)] pb-3">
              <h3 className="text-base font-black text-[var(--admin-text,#fff)]">
                {editingBranch ? "Configure Branch" : "Add New Branch"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-[var(--admin-subtle,#A3A3A3)] hover:bg-[var(--admin-hover,#252830)] hover:text-[var(--admin-text,#fff)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Branch Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Lahore"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Short Tag / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="DC-A02"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    placeholder="e.g. Ahmad Bilal"
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                  Physical Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, area, city"
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Phone / Hotline
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    placeholder="11:00 AM - 02:00 AM"
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--admin-border,#292D35)] pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-[var(--admin-hover,#252830)] px-4 py-2 font-bold text-[var(--admin-muted,#D4D4D4)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-5 py-2 font-extrabold text-white shadow-md shadow-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_20%,transparent)] hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                >
                  {editingBranch ? "Save Changes" : "Activate Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { BranchesPage };
