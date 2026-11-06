import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { getFrontendDomainUrl } from '@/shared/lib/catalogApi';
import { getOwnerProfile } from '@/shared/lib/ownerProfile';
import { CatalogImageField } from '@/dashboard_components/Layout/CatalogImageField';
import {
  createRestaurantDeal,
  deleteRestaurantDeal,
  getRestaurantDeals,
  restaurantDealApiMessage,
  restaurantDealTagKey,
  restaurantDealTagLabel,
  RESTAURANT_DEAL_TAGS,
  updateRestaurantDeal
} from '@/shared/lib/restaurantDealsApi';
import {
  BadgePercent,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit2,
  Eye,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Percent,
  Plus,
  Power,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  X
} from "lucide-react";

const INPUT =
  "w-full rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-input,#1D2128)] px-3.5 py-2 text-[var(--admin-text,#fff)] placeholder-[var(--admin-faint,#737373)] transition-colors focus:outline-none focus:border-[var(--color-admin-accent,#FF5A1F)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)]";

const SURFACE =
  "rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)]";

const emptyForm = (branchName, displayOrder) => ({
  name: "",
  branchName,
  showAllBranches: false,
  shortDescription: "",
  image: "",
  originalPrice: "",
  dealPrice: "",
  startDate: "",
  endDate: "",
  tags: [],
  isActive: true,
  termsAndConditions: "",
  items: [],
  displayOrder: String(displayOrder)
});

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 6e4);
  return local.toISOString().slice(0, 16);
}

function dateApiValue(value, endOfDay = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (endOfDay && value.length === 10) date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dealBranches(deal) {
  if (Array.isArray(deal.branchNames) && deal.branchNames.length) return deal.branchNames;
  if (typeof deal.branchName === "string" && deal.branchName.trim()) {
    return deal.branchName.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

function dealDiscountPct(deal) {
  if (typeof deal.discountPercent === "number" && deal.discountPercent > 0) {
    return Math.round(deal.discountPercent);
  }
  if (deal.originalPrice > 0 && deal.dealPrice >= 0) {
    return Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100);
  }
  return 0;
}

function dealSavings(deal) {
  return Math.max(0, Number(deal.originalPrice || 0) - Number(deal.dealPrice || 0));
}

function dealScheduleState(deal, now = Date.now()) {
  if (!deal.isActive) return "inactive";
  const start = deal.startDate ? new Date(deal.startDate).getTime() : 0;
  const end = deal.endDate ? new Date(deal.endDate).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isFinite(start) && start > now) return "scheduled";
  if (Number.isFinite(end) && end < now) return "expired";
  return "live";
}

function dealPayload(form) {
  return {
    name: form.name.trim(),
    branchName: form.branchName.trim(),
    showAllBranches: form.showAllBranches,
    shortDescription: form.shortDescription.trim(),
    image: form.image.trim(),
    originalPrice: Number(form.originalPrice),
    dealPrice: Number(form.dealPrice),
    startDate: dateApiValue(form.startDate),
    endDate: dateApiValue(form.endDate, true),
    tags: form.tags
      .filter((tag) => RESTAURANT_DEAL_TAGS.some((option) => option.value === tag))
      .slice(0, 1),
    isActive: form.isActive,
    termsAndConditions: form.termsAndConditions.trim(),
    items: form.items.filter((item) => item.name.trim() && item.quantity > 0),
    displayOrder: Number(form.displayOrder) || 1
  };
}

function toForm(deal) {
  const branches = dealBranches(deal);
  return {
    name: deal.name || "",
    branchName: branches[0] || deal.branchName || "",
    showAllBranches: Boolean(deal.showAllBranches),
    shortDescription: deal.shortDescription || "",
    image: deal.image || "",
    originalPrice: String(deal.originalPrice ?? ""),
    dealPrice: String(deal.dealPrice ?? ""),
    startDate: dateInputValue(deal.startDate),
    endDate: dateInputValue(deal.endDate),
    tags: (deal.tagKeys || deal.tags || [])
      .map((tag) => restaurantDealTagKey(tag))
      .filter(Boolean)
      .slice(0, 1),
    isActive: deal.isActive !== false,
    termsAndConditions: deal.termsAndConditions || "",
    items: (deal.items || []).map((item) => ({ ...item })),
    displayOrder: String(deal.displayOrder ?? deal.sort ?? 1)
  };
}

function payloadFromDeal(deal) {
  return {
    name: deal.name,
    branchName: deal.showAllBranches
      ? dealBranches(deal).join(", ") || deal.branchName || ""
      : dealBranches(deal)[0] || deal.branchName || "",
    showAllBranches: Boolean(deal.showAllBranches),
    shortDescription: deal.shortDescription || "",
    image: deal.image || "",
    originalPrice: Number(deal.originalPrice) || 0,
    dealPrice: Number(deal.dealPrice) || 0,
    startDate: deal.startDate || "",
    endDate: deal.endDate || "",
    tags: (deal.tagKeys || []).length
      ? deal.tagKeys
      : (deal.tags || []).map((tag) => restaurantDealTagKey(tag)).filter(Boolean),
    isActive: deal.isActive !== false,
    termsAndConditions: deal.termsAndConditions || "",
    items: deal.items || [],
    displayOrder: Number(deal.displayOrder || deal.sort) || 1
  };
}

function SkeletonPulse({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--admin-hover,#1A1D24)] ${className}`} />;
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

const DealsPage = () => {
  const { formatPrice, addToast, adminTheme } = useRestaurant();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;
  const { liveBranches, primaryBranchId, isAllBranches } = useBranchScope();
  const branchName =
    liveBranches.find((branch) => branch.id === primaryBranchId)?.city ||
    liveBranches.find((branch) => branch.id === primaryBranchId)?.shortName ||
    liveBranches.find((branch) => branch.id === primaryBranchId)?.name ||
    liveBranches[0]?.city ||
    liveBranches[0]?.shortName ||
    liveBranches[0]?.name ||
    "";

  const [deals, setDeals] = useState([]);
  const [apiMeta, setApiMeta] = useState({
    count: null,
    branch: null,
    message: "",
    success: false
  });
  const [domain, setDomain] = useState(getFrontendDomainUrl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards");
  const [expandedId, setExpandedId] = useState("");
  const [detailDeal, setDetailDeal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [dealToDelete, setDealToDelete] = useState(null);
  const [form, setForm] = useState(() => emptyForm(branchName, 1));
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [sizeOptions, setSizeOptions] = useState([]);
  const [addonOptions, setAddonOptions] = useState([]);
  const [extraOptions, setExtraOptions] = useState([]);
  const [sizeQuantity, setSizeQuantity] = useState("");
  const [addonQuantity, setAddonQuantity] = useState("");
  const [extraQuantity, setExtraQuantity] = useState("");

  const loadDeals = useCallback(async (frontendDomainUrl) => {
    setLoading(true);
    const result = await getRestaurantDeals(frontendDomainUrl);
    setLoading(false);
    if (!result.ok) {
      setDeals([]);
      setApiMeta({ count: 0, branch: null, message: "", success: false });
      addToastRef.current(
        "Load Failed",
        restaurantDealApiMessage(result.data, "Deals could not be loaded."),
        "error"
      );
      return;
    }
    const sorted = result.deals.sort((first, second) => first.displayOrder - second.displayOrder);
    setDeals(sorted);
    setApiMeta({
      count: typeof result.count === "number" ? result.count : sorted.length,
      branch: result.branch ?? null,
      message: result.message || "Deals fetched successfully",
      success: result.success !== false
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let resolvedDomain = getFrontendDomainUrl();
      const profileResult = await getOwnerProfile();
      if (profileResult.ok && profileResult.data && typeof profileResult.data === "object") {
        const raw = profileResult.data;
        for (const candidate of [raw.profile, raw.data, raw.owner, raw]) {
          if (!candidate || typeof candidate !== "object") continue;
          const profileDomain = candidate.frontendDomainUrl;
          if (typeof profileDomain === "string" && profileDomain.trim()) {
            resolvedDomain = profileDomain.trim().replace(/\/$/, "");
            break;
          }
        }
      }
      if (cancelled) return;
      setDomain(resolvedDomain);
      await loadDeals(resolvedDomain);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDeals]);

  const openCreateModal = () => {
    setEditingDeal(null);
    setForm(emptyForm(branchName, deals.length + 1));
    setNewItemName("");
    setNewItemQuantity("1");
    setSizeOptions([]);
    setAddonOptions([]);
    setExtraOptions([]);
    setSizeQuantity("");
    setAddonQuantity("");
    setExtraQuantity("");
    setIsModalOpen(true);
  };

  const openEditModal = (deal) => {
    setEditingDeal(deal);
    setForm(toForm(deal));
    setNewItemName("");
    setNewItemQuantity("1");
    setSizeOptions([]);
    setAddonOptions([]);
    setExtraOptions([]);
    setSizeQuantity("");
    setAddonQuantity("");
    setExtraQuantity("");
    setDetailDeal(null);
    setIsModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.image.trim() || !form.originalPrice || !form.dealPrice) {
      addToast("Required Fields", "Enter the deal name, image, original price, and deal price.", "error");
      return;
    }
    if (!form.showAllBranches && !form.branchName.trim()) {
      addToast("Branch Required", "Select a branch or enable all branches.", "error");
      return;
    }
    if (form.items.length === 0) {
      addToast("Items Required", "Add at least one item to this deal.", "error");
      return;
    }
    setSaving(true);
    const payload = dealPayload(form);
    const result = editingDeal
      ? await updateRestaurantDeal(editingDeal.id, domain, payload)
      : await createRestaurantDeal(domain, payload);
    setSaving(false);
    if (!result.ok) {
      addToast("Save Failed", restaurantDealApiMessage(result.data, "Deal could not be saved."), "error");
      return;
    }
    setIsModalOpen(false);
    addToast(editingDeal ? "Deal Updated" : "Deal Added", `${payload.name} saved successfully.`, "success");
    await loadDeals(domain);
  };

  const handleToggleActive = async (deal) => {
    if (togglingId) return;
    setTogglingId(deal.id);
    const payload = payloadFromDeal(deal);
    const result = await updateRestaurantDeal(deal.id, domain, {
      ...payload,
      isActive: !deal.isActive
    });
    setTogglingId("");
    if (!result.ok) {
      addToast("Update Failed", restaurantDealApiMessage(result.data, "Deal status could not be updated."), "error");
      return;
    }
    await loadDeals(domain);
  };

  const handleDelete = async () => {
    if (!dealToDelete || deleting) return;
    setDeleting(true);
    const result = await deleteRestaurantDeal(dealToDelete.id, domain);
    setDeleting(false);
    if (!result.ok) {
      addToast("Delete Failed", restaurantDealApiMessage(result.data, "Deal could not be deleted."), "error");
      return;
    }
    addToast("Deal Deleted", `${dealToDelete.name} was deleted.`, "success");
    setDealToDelete(null);
    if (detailDeal?.id === dealToDelete.id) setDetailDeal(null);
    await loadDeals(domain);
  };

  const addItem = () => {
    const name = newItemName.trim();
    const quantity = Number(newItemQuantity);
    if (!name || !Number.isInteger(quantity) || quantity < 1) return;
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          name,
          quantity,
          ...(sizeOptions.length ? { sizes: sizeOptions } : {}),
          ...(addonOptions.length ? { addons: addonOptions } : {}),
          ...(extraOptions.length ? { extras: extraOptions } : {})
        }
      ]
    }));
    setNewItemName("");
    setNewItemQuantity("1");
    setSizeOptions([]);
    setAddonOptions([]);
    setExtraOptions([]);
  };

  const addQuantityOption = (quantityValue, setOptions, clearQuantity) => {
    const quantity = Number(quantityValue);
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setOptions((current) => [...current, { quantity }]);
    clearQuantity();
  };

  const renderOptionQuantities = (label, options, setOptions) => (
    <div className="space-y-1">
      {options.map((option, index) => (
        <div
          key={`${option.quantity}-${index}`}
          className="flex items-center justify-between rounded-md bg-[var(--admin-surface,#101216)] px-2 py-1 text-[11px] text-[var(--admin-muted,#D4D4D4)]"
        >
          <span>Quantity: {option.quantity}</span>
          <button
            type="button"
            onClick={() =>
              setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))
            }
            className="cursor-pointer text-[var(--admin-faint,#737373)] transition-colors hover:text-red-400"
            title={`Remove ${label.toLowerCase()} quantity ${option.quantity}`}
            aria-label={`Remove ${label.toLowerCase()} quantity ${option.quantity}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );

  const stats = useMemo(() => {
    const now = Date.now();
    let active = 0;
    let inactive = 0;
    let live = 0;
    let scheduled = 0;
    let expired = 0;
    let savings = 0;
    let allBranches = 0;
    for (const deal of deals) {
      if (deal.isActive) active += 1;
      else inactive += 1;
      const state = dealScheduleState(deal, now);
      if (state === "live") live += 1;
      if (state === "scheduled") scheduled += 1;
      if (state === "expired") expired += 1;
      savings += dealSavings(deal);
      if (deal.showAllBranches) allBranches += 1;
    }
    const activePct = deals.length ? Math.round((active / deals.length) * 100) : 0;
    const avgDiscount = deals.length
      ? Math.round(deals.reduce((sum, deal) => sum + dealDiscountPct(deal), 0) / deals.length)
      : 0;
    return {
      total: deals.length,
      active,
      inactive,
      live,
      scheduled,
      expired,
      savings,
      allBranches,
      activePct,
      avgDiscount
    };
  }, [deals]);

  const discountBars = useMemo(() => {
    const rows = [...deals]
      .map((deal) => ({
        label: deal.name || "Deal",
        value: dealDiscountPct(deal),
        savings: dealSavings(deal)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const max = Math.max(...rows.map((row) => row.value), 1);
    return { rows, max };
  }, [deals]);

  const scheduleBars = useMemo(() => {
    const rows = [
      { label: "Live", value: stats.live, color: "from-emerald-700 via-emerald-500 to-emerald-300" },
      { label: "Scheduled", value: stats.scheduled, color: "from-sky-700 via-sky-500 to-sky-300" },
      { label: "Expired", value: stats.expired, color: "from-amber-700 via-amber-500 to-amber-300" },
      { label: "Inactive", value: stats.inactive, color: "from-red-700 via-red-500 to-red-300" }
    ];
    const max = Math.max(...rows.map((row) => row.value), 1);
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
        segment(stats.active, "#34d399"),
        segment(stats.inactive, "#f87171")
      ].join(", ")})`
    };
  }, [stats]);

  const visibleDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    return deals.filter((deal) => {
      const branches = dealBranches(deal);
      const haystack = [
        deal.name,
        deal.shortDescription,
        deal.slug,
        deal.id,
        deal.merchantId,
        deal.businessId,
        ...branches,
        ...(deal.tags || []).map((tag) => restaurantDealTagLabel(tag))
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesBranch =
        isAllBranches ||
        deal.showAllBranches ||
        branches.some(
          (name) => name.toLowerCase() === branchName.toLowerCase()
        ) ||
        (typeof deal.branchName === "string" &&
          deal.branchName.toLowerCase() === branchName.toLowerCase());
      if (!matchesSearch || !matchesBranch) return false;
      if (statusFilter === "active") return deal.isActive;
      if (statusFilter === "inactive") return !deal.isActive;
      if (statusFilter === "live") return dealScheduleState(deal, now) === "live";
      if (statusFilter === "scheduled") return dealScheduleState(deal, now) === "scheduled";
      if (statusFilter === "expired") return dealScheduleState(deal, now) === "expired";
      return true;
    });
  }, [deals, searchQuery, statusFilter, isAllBranches, branchName]);

  const renderDealDetailBody = (deal) => {
    const branches = dealBranches(deal);
    const schedule = dealScheduleState(deal);
    return (
      <div className="space-y-4">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <FieldRow label="Deal ID">{deal.id || "—"}</FieldRow>
          <FieldRow label="Merchant ID">{deal.merchantId || "—"}</FieldRow>
          <FieldRow label="Business ID">{deal.businessId || "—"}</FieldRow>
          <FieldRow label="Branch ID">{deal.branchId ?? "null"}</FieldRow>
          <FieldRow label="Slug">{deal.slug || "—"}</FieldRow>
          <FieldRow label="Sort / Order">
            sort {deal.sort ?? "—"} · display {deal.displayOrder ?? "—"}
          </FieldRow>
          <FieldRow label="Active">{deal.isActive ? "true" : "false"}</FieldRow>
          <FieldRow label="Schedule">{schedule}</FieldRow>
          <FieldRow label="Show all branches">{deal.showAllBranches ? "true" : "false"}</FieldRow>
          <FieldRow label="Branches">
            {deal.showAllBranches
              ? branches.length
                ? `All · ${branches.join(", ")}`
                : "All branches"
              : branches.join(", ") || "—"}
          </FieldRow>
          <FieldRow label="Created by">
            {deal.createdBy || "—"}
            {deal.createdByType ? ` (${deal.createdByType})` : ""}
          </FieldRow>
          <FieldRow label="Created">{formatShortDate(deal.createdAt)}</FieldRow>
          <FieldRow label="Updated">{formatShortDate(deal.updatedAt)}</FieldRow>
          <FieldRow label="Start">{formatShortDate(deal.startDate)}</FieldRow>
          <FieldRow label="End">{formatShortDate(deal.endDate)}</FieldRow>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Short description
          </p>
          <p className="text-sm text-[var(--admin-muted,#D4D4D4)]">
            {deal.shortDescription || "—"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetaChip label="Original" value={formatPrice(deal.originalPrice || 0)} />
          <MetaChip label="Deal price" value={formatPrice(deal.dealPrice || 0)} />
          <MetaChip label="You save" value={formatPrice(dealSavings(deal))} />
          <MetaChip
            label="Discount"
            value={deal.discountLabel || `${dealDiscountPct(deal)}% OFF`}
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(deal.tags || []).length === 0 ? (
              <span className="text-xs text-[var(--admin-faint,#737373)]">None</span>
            ) : (
              (deal.tags || []).map((tag) => {
                const key = restaurantDealTagKey(tag) || restaurantDealTagLabel(tag);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0D0F12)] px-2 py-1 text-[11px] font-bold text-[var(--admin-muted,#D4D4D4)]"
                  >
                    <Tag className="h-3 w-3 text-[var(--color-admin-accent,#FF5A1F)]" />
                    {typeof tag === "object" && tag.emoji ? `${tag.emoji} ` : ""}
                    {restaurantDealTagLabel(tag)}
                    {typeof tag === "object" && tag.isActive === false ? " · off" : ""}
                  </span>
                );
              })
            )}
          </div>
        </div>

        <div className={`${SURFACE} p-3`}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Items ({(deal.items || []).length})
          </p>
          {(deal.items || []).length === 0 ? (
            <p className="text-xs text-[var(--admin-faint,#737373)]">None</p>
          ) : (
            <ul className="space-y-2">
              {(deal.items || []).map((item, index) => (
                <li
                  key={`${item.id || item.name}-${index}`}
                  className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2 text-xs text-[var(--admin-muted,#D4D4D4)]"
                >
                  <div className="font-bold text-[var(--admin-text,#fff)]">
                    {item.quantity} × {item.name}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--admin-faint,#737373)]">
                    itemId: {item.id || "—"} · productId: {item.productId ?? "null"}
                  </div>
                  {[
                    ...(item.sizes || []).map((option) => `Size qty: ${option.quantity}`),
                    ...(item.addons || []).map((option) => `Addon qty: ${option.quantity}`),
                    ...(item.extras || []).map((option) => `Extra qty: ${option.quantity}`)
                  ].length > 0 && (
                    <div className="mt-1 text-[10px] text-[var(--admin-subtle,#A3A3A3)]">
                      {[
                        ...(item.sizes || []).map((option) => `Size qty: ${option.quantity}`),
                        ...(item.addons || []).map((option) => `Addon qty: ${option.quantity}`),
                        ...(item.extras || []).map((option) => `Extra qty: ${option.quantity}`)
                      ].join(" · ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${SURFACE} p-3`}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Terms & conditions
          </p>
          <p className="text-sm text-[var(--admin-muted,#D4D4D4)]">
            {deal.termsAndConditions || "—"}
          </p>
        </div>

        {deal.image ? (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Image URL
            </p>
            <p className="break-all text-[11px] text-[var(--admin-subtle,#A3A3A3)]">{deal.image}</p>
          </div>
        ) : null}
      </div>
    );
  };

  const scheduleBadge = (deal) => {
    const state = dealScheduleState(deal);
    const styles = {
      live: "bg-emerald-500/90 text-white",
      scheduled: "bg-sky-500/90 text-white",
      expired: "bg-amber-500/90 text-white",
      inactive: "bg-neutral-700 text-neutral-200"
    };
    return (
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${styles[state]}`}>
        {state}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-lg space-y-3">
            <div className="flex items-center gap-2.5">
              <SkeletonPulse className="h-10 w-10 rounded-xl" />
              <SkeletonPulse className="h-7 w-56" />
            </div>
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
              <BadgePercent className="h-5 w-5" />
            </span>
            <span>Deals & Combos</span>
          </h2>
          <p className="mt-1.5 max-w-xl text-xs text-[var(--admin-subtle,#A3A3A3)] sm:text-sm">
            Publish combo offers with full pricing, branches, schedule, and item breakdown — theme-aware for dark & light.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          title="Create a new deal"
          className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_25%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-admin-accent-hover,#E04810)] sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add New Deal
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <MetaChip label="API count" value={apiMeta.count ?? stats.total} />
        <MetaChip
          label="Branch"
          value={apiMeta.branch ?? ((isAllBranches ? "All" : branchName) || "null")}
        />
        <MetaChip label="Domain" value={domain || getFrontendDomainUrl()} />
        <MetaChip label="Success" value={apiMeta.success ? "true" : "false"} />
        <MetaChip label="Message" value={apiMeta.message || "—"} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Total",
            value: stats.total,
            hint: "All deals",
            icon: Layers,
            tone: "text-[var(--color-admin-accent,#FF5A1F)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)]",
            filter: "all"
          },
          {
            label: "Active",
            value: stats.active,
            hint: `${stats.activePct}% enabled`,
            icon: CheckCircle2,
            tone: "text-emerald-400 bg-emerald-500/10",
            filter: "active"
          },
          {
            label: "Live now",
            value: stats.live,
            hint: `${stats.scheduled} scheduled`,
            icon: Sparkles,
            tone: "text-sky-400 bg-sky-500/10",
            filter: "live"
          },
          {
            label: "Expired",
            value: stats.expired,
            hint: "Past end date",
            icon: Clock,
            tone: "text-amber-300 bg-amber-500/10",
            filter: "expired"
          },
          {
            label: "Inactive",
            value: stats.inactive,
            hint: "Hidden",
            icon: Ban,
            tone: "text-red-400 bg-red-500/10",
            filter: "inactive"
          },
          {
            label: "Avg Off",
            value: `${stats.avgDiscount}%`,
            hint: `Save ${formatPrice(stats.savings)}`,
            icon: Percent,
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
                  : "border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)] hover:border-[var(--admin-hover,#3A404A)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--admin-faint,#737373)]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-[var(--admin-text,#fff)] sm:text-3xl">
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
              <p className="mt-0.5 text-[12px] text-[var(--admin-faint,#737373)]">Active vs inactive</p>
            </div>
            <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
              <div className="relative h-36 w-36 shrink-0 rounded-full" style={donutStyle}>
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)]">
                  <span className="text-2xl font-black tabular-nums text-[var(--admin-text,#fff)]">
                    {stats.activePct}%
                  </span>
                  <span className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                    Active
                  </span>
                </div>
              </div>
              <div className="w-full space-y-2 text-xs">
                {[
                  { label: "Active", value: stats.active, color: "bg-emerald-400", filter: "active" },
                  { label: "Inactive", value: stats.inactive, color: "bg-red-400", filter: "inactive" },
                  { label: "All branches", value: stats.allBranches, color: "bg-sky-400", filter: null }
                ].map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    disabled={row.filter === null}
                    onClick={() => {
                      if (row.filter === null) return;
                      setStatusFilter((prev) => (prev === row.filter ? "all" : row.filter));
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
                      row.filter === null ? "cursor-default" : "cursor-pointer"
                    } ${
                      statusFilter === row.filter
                        ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)]"
                        : "border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[var(--admin-muted,#D4D4D4)]">
                      <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                      {row.label}
                    </span>
                    <span className="font-bold tabular-nums text-[var(--admin-text,#fff)]">{row.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`${SURFACE} space-y-5 p-5 xl:col-span-5`}>
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--admin-text,#fff)]">
                <Wallet className="h-4 w-4 text-[var(--color-admin-accent,#FF5A1F)]" />
                Biggest discounts
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--admin-faint,#737373)]">
                Top deals by % off
              </div>
            </div>
            {discountBars.rows.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--admin-faint,#737373)]">No deals yet.</p>
            ) : (
              <div className="space-y-3">
                {discountBars.rows.map((row) => (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-[var(--admin-subtle,#A3A3A3)]">{row.label}</span>
                      <span className="font-bold tabular-nums text-[var(--admin-text,#fff)]">
                        {row.value}% · {formatPrice(row.savings)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-surface,#101216)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C2410C] via-[var(--color-admin-accent,#FF5A1F)] to-[#FDBA74] transition-all duration-500"
                        style={{ width: `${(row.value / discountBars.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${SURFACE} space-y-3 p-5 xl:col-span-4`}>
            <div className="text-sm font-bold text-[var(--admin-text,#fff)]">Schedule mix</div>
            <div className="flex h-32 items-end gap-2 sm:gap-3">
              {scheduleBars.rows.map((row) => (
                <div key={row.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-bold tabular-nums text-[var(--admin-subtle,#A3A3A3)] opacity-0 transition-opacity group-hover:opacity-100">
                    {row.value}
                  </span>
                  <div className="flex h-[96px] w-full items-end overflow-hidden rounded-t-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0E1116)]">
                    <div
                      className={`w-full rounded-t-lg bg-gradient-to-t ${row.color} transition-all duration-500`}
                      style={{
                        height: `${Math.max(row.value > 0 ? 12 : 0, (row.value / scheduleBars.max) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-center text-[9px] font-bold leading-tight text-[var(--admin-faint,#737373)] sm:text-[10px]">
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
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle,#A3A3A3)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name, slug, id, branch, tags..."
            className={`${INPUT} pl-10`}
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {["all", "active", "live", "scheduled", "expired", "inactive"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                statusFilter === key
                  ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]"
                  : "border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] text-[var(--admin-subtle,#A3A3A3)]"
              }`}
            >
              {key}
            </button>
          ))}
          <span className="rounded-md border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-1 text-[10px] font-extrabold uppercase text-[var(--admin-muted,#D4D4D4)]">
            {visibleDeals.length} shown
          </span>
          <div className="inline-flex rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Card view"
              className={`cursor-pointer rounded-lg p-2 transition-colors ${viewMode === "cards" ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white" : "text-[var(--admin-subtle,#A3A3A3)]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("rows")}
              title="Row view"
              className={`cursor-pointer rounded-lg p-2 transition-colors ${viewMode === "rows" ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white" : "text-[var(--admin-subtle,#A3A3A3)]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {visibleDeals.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-[var(--admin-border,#343943)] bg-[var(--admin-elevated,#14171C)] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
            <BadgePercent className="h-6 w-6" />
          </div>
          <p className="mx-auto max-w-md text-sm text-[var(--admin-subtle,#A3A3A3)]">
            {deals.length === 0
              ? "No deals found. Click “Add New Deal” to create one."
              : "No deals match these filters."}
          </p>
          {deals.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Create deal
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDeals.map((deal) => {
            const branches = dealBranches(deal);
            const expanded = expandedId === deal.id;
            const pct = dealDiscountPct(deal);
            return (
              <article
                key={deal.id}
                className={`group overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  deal.isActive
                    ? "border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)]"
                    : "border-[var(--admin-border,#292D35)]/60 bg-[var(--admin-elevated,#14171C)] opacity-80"
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-hover,#1D2128)]">
                  {deal.image ? (
                    <img
                      src={deal.image}
                      alt={deal.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--admin-faint,#737373)]">
                      <BadgePercent className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {scheduleBadge(deal)}
                    {pct > 0 && (
                      <span className="rounded-md bg-[var(--color-admin-accent,#FF5A1F)] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                        {deal.discountLabel || `${pct}% OFF`}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
                    <h3 className="line-clamp-1 text-base font-black text-white">{deal.name}</h3>
                    <p className="line-clamp-1 text-[11px] text-white/75">{deal.shortDescription}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-lg font-black tabular-nums text-[var(--admin-text,#fff)]">
                        {formatPrice(deal.dealPrice)}
                      </p>
                      <p className="text-[11px] text-[var(--admin-faint,#737373)] line-through">
                        {formatPrice(deal.originalPrice)}
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-bold text-[var(--admin-faint,#737373)]">
                      <div>Save {formatPrice(dealSavings(deal))}</div>
                      <div>Order #{deal.displayOrder ?? deal.sort ?? "—"}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(deal.tags || []).map((tag) => {
                      const key = restaurantDealTagKey(tag) || restaurantDealTagLabel(tag);
                      return (
                        <span
                          key={key}
                          className="rounded-full bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-admin-accent,#FF5A1F)]"
                        >
                          {typeof tag === "object" && tag.emoji ? `${tag.emoji} ` : ""}
                          {restaurantDealTagLabel(tag)}
                        </span>
                      );
                    })}
                  </div>

                  <div className="space-y-1 text-xs text-[var(--admin-muted,#D4D4D4)]">
                    {(deal.items || []).slice(0, 3).map((item, index) => (
                      <div key={`${item.name}-${index}`}>
                        {item.quantity} × {item.name}
                      </div>
                    ))}
                    {(deal.items || []).length > 3 && (
                      <div className="text-[10px] text-[var(--admin-faint,#737373)]">
                        +{(deal.items || []).length - 3} more items
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                    <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 font-mono text-[var(--admin-subtle,#A3A3A3)]">
                      ID: {deal.id}
                    </div>
                    {deal.slug ? (
                      <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                        slug: {deal.slug}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1 truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {deal.showAllBranches
                        ? branches.length
                          ? `All · ${branches.join(", ")}`
                          : "All branches"
                        : branches.join(", ") || "—"}
                    </div>
                    <div className="flex items-center gap-1 truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatShortDate(deal.startDate)} → {formatShortDate(deal.endDate)}
                    </div>
                  </div>

                  {deal.termsAndConditions ? (
                    <p className="line-clamp-2 text-[11px] text-[var(--admin-faint,#737373)]">
                      {deal.termsAndConditions}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId((prev) => (prev === deal.id ? "" : deal.id))}
                      className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]"
                    >
                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {expanded ? "Hide" : "Details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailDeal(deal)}
                      className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[var(--admin-border,#292D35)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]"
                      title="Full panel"
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(deal)}
                      className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(togglingId)}
                      onClick={() => void handleToggleActive(deal)}
                      className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60 ${
                        deal.isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-[var(--admin-hover,#1D2128)] text-[var(--admin-subtle,#A3A3A3)]"
                      }`}
                      title={deal.isActive ? "Deactivate deal" : "Activate deal"}
                    >
                      {togglingId === deal.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDealToDelete(deal)}
                      className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 border-t border-[var(--admin-border,#292D35)] pt-3 duration-200">
                      {renderDealDetailBody(deal)}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDeals.map((deal) => {
            const branches = dealBranches(deal);
            const expanded = expandedId === deal.id;
            const pct = dealDiscountPct(deal);
            return (
              <div
                key={deal.id}
                className={`${SURFACE} p-4 transition-all hover:border-[var(--admin-hover,#3A404A)] sm:p-5 ${!deal.isActive ? "opacity-75" : ""}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="relative h-28 w-full shrink-0 self-start overflow-hidden rounded-xl bg-[var(--admin-hover,#1D2128)] sm:h-24 sm:w-36">
                    {deal.image ? (
                      <img src={deal.image} alt={deal.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--admin-faint,#737373)]">
                        <BadgePercent className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {scheduleBadge(deal)}
                      {pct > 0 && (
                        <span className="rounded-full bg-[var(--color-admin-accent,#FF5A1F)] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                          {deal.discountLabel || `${pct}% OFF`}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-[var(--admin-faint,#737373)]">
                        {deal.id}
                      </span>
                    </div>
                    <h3 className="truncate text-base font-black text-[var(--admin-text,#fff)]">
                      {deal.name}
                    </h3>
                    <p className="line-clamp-2 text-xs text-[var(--admin-subtle,#A3A3A3)]">
                      {deal.shortDescription}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-black text-[var(--admin-text,#fff)]">
                        {formatPrice(deal.dealPrice)}
                      </span>
                      <span className="text-[var(--admin-faint,#737373)] line-through">
                        {formatPrice(deal.originalPrice)}
                      </span>
                      <span className="text-[var(--admin-faint,#737373)]">
                        {deal.showAllBranches
                          ? branches.length
                            ? `All · ${branches.join(", ")}`
                            : "All branches"
                          : branches.join(", ") || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
                    <button
                      type="button"
                      onClick={() => setExpandedId((prev) => (prev === deal.id ? "" : deal.id))}
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border,#292D35)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {expanded ? "Hide" : "All fields"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(deal)}
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(togglingId)}
                      onClick={() => void handleToggleActive(deal)}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60 ${
                        deal.isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-[var(--admin-hover,#1D2128)] text-[var(--admin-subtle,#A3A3A3)]"
                      }`}
                    >
                      {togglingId === deal.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {deal.isActive ? "Active" : "Inactive"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDealToDelete(deal)}
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-4 animate-in fade-in border-t border-[var(--admin-border,#292D35)] pt-4 duration-200">
                    {renderDealDetailBody(deal)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            aria-label="Close deal form"
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />
          <div
            className={`relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)] shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-[var(--admin-border,#292D35)] p-5">
              <h3 className="text-lg font-black text-[var(--admin-text,#fff)]">
                {editingDeal ? "Edit Combo Deal" : "Create New Combo Deal"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-[var(--admin-subtle,#A3A3A3)] transition-colors hover:bg-[var(--admin-hover,#252830)] hover:text-[var(--admin-text,#fff)]"
                aria-label="Close deal form"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">Deal Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Family Burger Deal"
                  className={INPUT}
                />
              </div>
              <label className="flex items-center gap-2 text-[var(--admin-muted,#D4D4D4)]">
                <input
                  type="checkbox"
                  checked={form.showAllBranches}
                  onChange={(event) =>
                    setForm({ ...form, showAllBranches: event.target.checked })
                  }
                />
                Show this deal at all branches
              </label>
              {!form.showAllBranches && (
                <div>
                  <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">Branch *</label>
                  <select
                    required
                    value={form.branchName}
                    onChange={(event) => setForm({ ...form, branchName: event.target.value })}
                    className={INPUT}
                  >
                    <option value="">Select a branch</option>
                    {liveBranches.map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.city || branch.shortName || branch.name}
                      >
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                  Short Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.shortDescription}
                  onChange={(event) =>
                    setForm({ ...form, shortDescription: event.target.value })
                  }
                  placeholder="2 Burgers + Fries + 2 Drinks"
                  className={`${INPUT} resize-y`}
                />
              </div>
              <CatalogImageField
                label="Deal Image *"
                imageUrl={form.image}
                showUrlInput={false}
                onImageChange={(url) => setForm({ ...form, image: url })}
                uploadType="product"
                frontendDomainUrl={domain}
                onError={(message) => addToast("Upload Failed", message, "error")}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="font-bold text-[var(--admin-muted,#D4D4D4)]">
                  Original Price *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.originalPrice}
                    onChange={(event) =>
                      setForm({ ...form, originalPrice: event.target.value })
                    }
                    placeholder="1200"
                    className={`${INPUT} mt-1`}
                  />
                </label>
                <label className="font-bold text-[var(--admin-muted,#D4D4D4)]">
                  Deal Price *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.dealPrice}
                    onChange={(event) => setForm({ ...form, dealPrice: event.target.value })}
                    placeholder="899"
                    className={`${INPUT} mt-1`}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="font-bold text-[var(--admin-muted,#D4D4D4)]">
                  <Calendar className="mr-1 inline h-3.5 w-3.5" />
                  Start Date
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                    className={`${INPUT} mt-1`}
                  />
                </label>
                <label className="font-bold text-[var(--admin-muted,#D4D4D4)]">
                  <Calendar className="mr-1 inline h-3.5 w-3.5" />
                  End Date
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                    className={`${INPUT} mt-1`}
                  />
                </label>
              </div>
              <fieldset>
                <legend className="mb-2 block font-bold text-[var(--admin-muted,#D4D4D4)]">Deal Tags</legend>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[var(--admin-muted,#D4D4D4)]">
                    <input
                      type="radio"
                      name="deal-tag"
                      checked={form.tags.length === 0}
                      onChange={() => setForm({ ...form, tags: [] })}
                    />
                    No tag
                  </label>
                  {RESTAURANT_DEAL_TAGS.map((tag) => (
                    <label
                      key={tag.value}
                      className="flex cursor-pointer items-center gap-2 text-[var(--admin-muted,#D4D4D4)]"
                    >
                      <input
                        type="radio"
                        name="deal-tag"
                        checked={form.tags[0] === tag.value}
                        onChange={() => setForm({ ...form, tags: [tag.value] })}
                      />
                      {tag.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                  Items in Deal *
                </label>
                <div className="space-y-3 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_auto]">
                    <input
                      value={newItemName}
                      onChange={(event) => setNewItemName(event.target.value)}
                      placeholder="Item name (e.g. Burger)"
                      className={INPUT}
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={newItemQuantity}
                      onChange={(event) => setNewItemQuantity(event.target.value)}
                      placeholder="Quantity"
                      className={INPUT}
                      aria-label="Item quantity"
                    />
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!newItemName.trim()}
                      title="Add item to deal"
                      className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--color-admin-accent-hover,#E04810)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> Add Item
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="space-y-2 rounded-lg border border-[var(--admin-border,#292D35)] p-2">
                      <label className="block font-bold text-[var(--admin-muted,#D4D4D4)]">Size</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={sizeQuantity}
                          onChange={(event) => setSizeQuantity(event.target.value)}
                          placeholder="Quantity"
                          className={`${INPUT} min-w-0`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            addQuantityOption(sizeQuantity, setSizeOptions, () => setSizeQuantity(""))
                          }
                          title="Add size quantity"
                          className="cursor-pointer rounded-lg bg-[var(--admin-hover,#252830)] px-3 font-bold text-white transition-colors hover:bg-[var(--color-admin-accent,#FF5A1F)]"
                        >
                          Add
                        </button>
                      </div>
                      {renderOptionQuantities("Size", sizeOptions, setSizeOptions)}
                    </div>

                    <div className="space-y-2 rounded-lg border border-[var(--admin-border,#292D35)] p-2">
                      <label className="block font-bold text-[var(--admin-muted,#D4D4D4)]">Add-on</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={addonQuantity}
                          onChange={(event) => setAddonQuantity(event.target.value)}
                          placeholder="Quantity"
                          className={`${INPUT} min-w-0`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            addQuantityOption(addonQuantity, setAddonOptions, () =>
                              setAddonQuantity("")
                            )
                          }
                          title="Add add-on quantity"
                          className="cursor-pointer rounded-lg bg-[var(--admin-hover,#252830)] px-3 font-bold text-white transition-colors hover:bg-[var(--color-admin-accent,#FF5A1F)]"
                        >
                          Add
                        </button>
                      </div>
                      {renderOptionQuantities("Add-on", addonOptions, setAddonOptions)}
                    </div>

                    <div className="space-y-2 rounded-lg border border-[var(--admin-border,#292D35)] p-2">
                      <label className="block font-bold text-[var(--admin-muted,#D4D4D4)]">Extra</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={extraQuantity}
                          onChange={(event) => setExtraQuantity(event.target.value)}
                          placeholder="Quantity"
                          className={`${INPUT} min-w-0`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            addQuantityOption(extraQuantity, setExtraOptions, () =>
                              setExtraQuantity("")
                            )
                          }
                          title="Add extra quantity"
                          className="cursor-pointer rounded-lg bg-[var(--admin-hover,#252830)] px-3 font-bold text-white transition-colors hover:bg-[var(--color-admin-accent,#FF5A1F)]"
                        >
                          Add
                        </button>
                      </div>
                      {renderOptionQuantities("Extra", extraOptions, setExtraOptions)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {form.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex justify-between rounded-lg bg-[var(--admin-hover,#1D2128)] px-3 py-2 text-[var(--admin-muted,#D4D4D4)]"
                    >
                      <span>
                        {item.quantity} × {item.name}
                        {[
                          ...(item.sizes || []).map((option) => `Size quantity: ${option.quantity}`),
                          ...(item.addons || []).map((option) => `Add-on quantity: ${option.quantity}`),
                          ...(item.extras || []).map((option) => `Extra quantity: ${option.quantity}`)
                        ]
                          .map((detail) => ` · ${detail}`)
                          .join("")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            items: form.items.filter((_, itemIndex) => itemIndex !== index)
                          })
                        }
                        className="cursor-pointer text-[var(--admin-faint,#737373)] transition-colors hover:text-red-400"
                        title={`Remove ${item.name}`}
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block font-bold text-[var(--admin-muted,#D4D4D4)]">
                  Terms & Conditions
                </label>
                <textarea
                  rows={2}
                  value={form.termsAndConditions}
                  onChange={(event) =>
                    setForm({ ...form, termsAndConditions: event.target.value })
                  }
                  placeholder="Dine-in only. Not valid with other offers."
                  className={`${INPUT} resize-y`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="font-bold text-[var(--admin-muted,#D4D4D4)]">
                  Display Order
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.displayOrder}
                    onChange={(event) =>
                      setForm({ ...form, displayOrder: event.target.value })
                    }
                    className={`${INPUT} mt-1`}
                  />
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-[var(--admin-muted,#D4D4D4)]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  />
                  Active on website
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--admin-border,#292D35)] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-[var(--admin-hover,#1D2128)] px-4 py-2 text-[var(--admin-muted,#D4D4D4)] hover:text-[var(--admin-text,#fff)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  title={editingDeal ? "Save deal changes" : "Create deal"}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-6 py-2 font-bold text-white hover:bg-[var(--color-admin-accent-hover,#E04810)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingDeal ? "Save Changes" : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailDeal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)] shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border,#292D35)] p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                  Full API payload
                </p>
                <h3 className="truncate text-lg font-black text-[var(--admin-text,#fff)]">
                  {detailDeal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailDeal(null)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#A3A3A3)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">{renderDealDetailBody(detailDeal)}</div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border,#292D35)] p-4">
              <button
                type="button"
                onClick={() => openEditModal(detailDeal)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2 text-sm font-bold text-white"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDetailDeal(null)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border,#292D35)] px-4 py-2 text-sm font-bold text-[var(--admin-muted,#D4D4D4)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {dealToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            className="fixed inset-0 bg-black/70"
            onClick={() => !deleting && setDealToDelete(null)}
          />
          <div className={`relative z-10 w-full max-w-sm ${SURFACE} p-5`}>
            <h3 className="font-black text-[var(--admin-text,#fff)]">Delete deal?</h3>
            <p className="mt-2 text-sm text-[var(--admin-subtle,#A3A3A3)]">
              Delete “{dealToDelete.name}” from the restaurant deals?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDealToDelete(null)}
                className="cursor-pointer rounded-lg bg-[var(--admin-hover,#252830)] px-4 py-2 text-[var(--admin-muted,#D4D4D4)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { DealsPage };
