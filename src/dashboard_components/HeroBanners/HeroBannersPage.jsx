import { useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { getFrontendDomainUrl } from '@/shared/lib/catalogApi';
import { getOwnerProfile } from '@/shared/lib/ownerProfile';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { CatalogImageField } from '@/dashboard_components/Layout/CatalogImageField';
import {
  bannerApiMessage,
  createRestaurantBanner,
  deleteRestaurantBanner,
  getRestaurantBanners,
  RESTAURANT_BANNER_TAGS,
  restaurantBannerBranchesLabel,
  restaurantBannerTagLabel,
  updateRestaurantBanner
} from '@/shared/lib/restaurantBannerApi';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Eye,
  Image,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Plus,
  Power,
  Sparkles,
  Trash2
} from "lucide-react";
import heroMealImg from '@/assets/images/hero_burger_meal_1789195599245.jpg';

const BANNER_SECTIONS = [
  { value: "#categories-section", label: "Explore Categories" },
  { value: "#deals-section", label: "Sizzling Combo Deals" },
  { value: "#brand-story-section", label: "Good Food. No Shortcuts." },
  { value: "#newsletter-section", label: "Order & Weekly Flash Deals" }
];

const PRIMARY_BUTTON_TEXTS = [
  "Order Now",
  "Grab Deal",
  "Shop Now",
  "Get Offer",
  "View Menu",
  "Grab Offer"
];

const SECONDARY_BUTTON_TEXTS = [
  "Explore Menu",
  "View Combos",
  "Browse Categories",
  "See Offers",
  "Learn More"
];

const SURFACE =
  "rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14161B)]";

const emptyForm = (branchName, displayOrder) => ({
  showAllBranches: false,
  branchName,
  title: "",
  shortText: "",
  description: "",
  image: "",
  tag: "",
  buttonText: "",
  buttonLink: "",
  secondaryButtonText: "",
  secondaryButtonLink: "",
  displayOrder,
  isActive: true,
  startDate: "",
  endDate: ""
});

function SkeletonPulse({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--admin-hover,#1A1D24)] ${className}`}
    />
  );
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 6e4);
  return local.toISOString().slice(0, 16);
}

function dateApiValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function bannerScheduleState(banner, now = Date.now()) {
  if (!banner.isActive) return "blocked";
  if (banner.startDate) {
    const start = new Date(banner.startDate).getTime();
    if (Number.isFinite(start) && start > now) return "scheduled";
  }
  if (banner.endDate) {
    const end = new Date(banner.endDate).getTime();
    if (Number.isFinite(end) && end < now) return "expired";
  }
  return "live";
}

function bannerPayload(banner, displayOrder = banner.displayOrder) {
  return {
    showAllBranches: banner.showAllBranches,
    branchName: banner.showAllBranches
      ? banner.branchNames.length
        ? banner.branchNames
        : banner.branchName
      : banner.branchName || banner.branchNames[0] || "",
    title: banner.title,
    shortText: banner.shortText,
    description: banner.description,
    image: banner.image,
    tag: banner.tag,
    buttonText: banner.buttonText,
    buttonLink: banner.buttonLink,
    secondaryButtonText: banner.secondaryButtonText,
    secondaryButtonLink: banner.secondaryButtonLink,
    displayOrder,
    isActive: banner.isActive,
    startDate: banner.startDate,
    endDate: banner.endDate
  };
}

const HeroBannersPage = () => {
  const { addToast, adminTheme } = useRestaurant();
  const { liveBranches, primaryBranchId, isAllBranches } = useBranchScope();
  const branchName =
    liveBranches.find((branch) => branch.id === primaryBranchId)?.shortName ||
    liveBranches.find((branch) => branch.id === primaryBranchId)?.name ||
    liveBranches[0]?.shortName ||
    liveBranches[0]?.name ||
    "";

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [bannerToDelete, setBannerToDelete] = useState(null);
  const [togglingId, setTogglingId] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorStep, setEditorStep] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [chartRange, setChartRange] = useState("monthly");
  const [viewMode, setViewMode] = useState("cards");
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState(() => emptyForm(branchName, 1));
  const [frontendDomainUrl, setFrontendDomainUrl] = useState(getFrontendDomainUrl);
  const frontendDomainUrlRef = useRef(frontendDomainUrl);
  const loadSequence = useRef(0);
  const editorTopRef = useRef(null);

  const EDITOR_STEPS = [
    { id: 0, label: "Content", hint: "Title, copy & image" },
    { id: 1, label: "Actions", hint: "Buttons & links" },
    { id: 2, label: "Schedule", hint: "Branch & timing" }
  ];

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-input,#0F1217)] px-3.5 py-2.5 text-sm text-[var(--admin-text,#fff)] placeholder:text-[var(--admin-faint,#737373)] transition-colors focus:outline-none focus:border-[var(--color-admin-accent,#FF5A1F)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)]";

  const chipClass = (active) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
      active
        ? "bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] border-[var(--color-admin-accent,#FF5A1F)] text-[var(--color-admin-accent,#FF5A1F)]"
        : "bg-[var(--admin-surface,#151920)] border-[var(--admin-border,#2A2F38)] text-[var(--admin-subtle,#A3A3A3)] hover:text-[var(--admin-text,#fff)]"
    }`;

  const closeEditor = () => {
    if (saving) return;
    setIsEditorOpen(false);
    setEditingBanner(null);
    setEditorStep(0);
  };

  const scrollEditorTop = () => {
    requestAnimationFrame(() => {
      editorTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const resolveFrontendDomainUrl = async () => {
    const result = await getOwnerProfile();
    if (result.ok && result.data && typeof result.data === "object") {
      const raw = result.data;
      const candidates = [raw.profile, raw.data, raw.owner, raw];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const value = candidate.frontendDomainUrl;
        if (typeof value === "string" && value.trim()) {
          const resolved = value.trim().replace(/\/$/, "");
          frontendDomainUrlRef.current = resolved;
          setFrontendDomainUrl(resolved);
          return resolved;
        }
      }
    }
    return frontendDomainUrlRef.current;
  };

  const loadBanners = async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    const result = await getRestaurantBanners(
      frontendDomainUrlRef.current,
      !isAllBranches && branchName ? branchName : undefined
    );
    if (sequence !== loadSequence.current) return;
    setLoading(false);
    if (!result.ok) {
      setBanners([]);
      addToast("Load Failed", bannerApiMessage(result.data, "Banners could not be loaded."), "error");
      return;
    }
    setBanners(result.banners.sort((a, b) => a.displayOrder - b.displayOrder));
  };

  useEffect(() => {
    void (async () => {
      await resolveFrontendDomainUrl();
      await loadBanners();
    })();
  }, [branchName, isAllBranches]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openAdd = () => {
    setEditingBanner(null);
    setForm(emptyForm(branchName, banners.length + 1));
    setEditorStep(0);
    setIsEditorOpen(true);
    scrollEditorTop();
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setForm({
      showAllBranches: banner.showAllBranches,
      branchName: banner.branchName || banner.branchNames[0] || branchName,
      title: banner.title,
      shortText: banner.shortText,
      description: banner.description,
      image: banner.image,
      tag: banner.tag,
      buttonText: banner.buttonText,
      buttonLink: banner.buttonLink,
      secondaryButtonText: banner.secondaryButtonText,
      secondaryButtonLink: banner.secondaryButtonLink,
      displayOrder: banner.displayOrder,
      isActive: banner.isActive,
      startDate: dateInputValue(banner.startDate),
      endDate: dateInputValue(banner.endDate)
    });
    setEditorStep(0);
    setIsEditorOpen(true);
    scrollEditorTop();
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.image.trim()) {
      setEditorStep(0);
      addToast("Required Fields", "Enter a banner title and upload an image.", "error");
      return;
    }
    if (!form.buttonText.trim() || !form.secondaryButtonText.trim()) {
      setEditorStep(1);
      addToast("Buttons Required", "Pick primary and secondary button text.", "error");
      return;
    }
    if (!form.showAllBranches && !form.branchName.trim()) {
      setEditorStep(2);
      addToast("Branch Required", "Select a branch for this banner.", "error");
      return;
    }
    const payload = {
      ...form,
      title: form.title.trim(),
      shortText: form.shortText.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      tag: form.tag.trim(),
      buttonText: form.buttonText.trim(),
      buttonLink: form.buttonLink.trim(),
      secondaryButtonText: form.secondaryButtonText.trim(),
      secondaryButtonLink: form.secondaryButtonLink.trim(),
      branchName: form.showAllBranches
        ? liveBranches.map((b) => b.shortName || b.name).filter(Boolean)
        : form.branchName.trim(),
      startDate: dateApiValue(form.startDate),
      endDate: dateApiValue(form.endDate)
    };
    setSaving(true);
    const result = editingBanner
      ? await updateRestaurantBanner(editingBanner.id, frontendDomainUrlRef.current, payload)
      : await createRestaurantBanner(frontendDomainUrlRef.current, payload);
    setSaving(false);
    if (!result.ok) {
      addToast("Save Failed", bannerApiMessage(result.data, "Banner could not be saved."), "error");
      return;
    }
    setEditingBanner(null);
    setIsEditorOpen(false);
    setEditorStep(0);
    addToast(
      editingBanner ? "Banner Updated" : "Banner Added",
      `${payload.title} saved successfully.`,
      "success"
    );
    await loadBanners();
  };

  const handleDelete = async () => {
    if (!bannerToDelete) return;
    const banner = bannerToDelete;
    setDeletingId(banner.id);
    const result = await deleteRestaurantBanner(banner.id, frontendDomainUrlRef.current);
    if (!result.ok) {
      setDeletingId("");
      addToast("Delete Failed", bannerApiMessage(result.data, "Banner could not be deleted."), "error");
      return;
    }
    setDeletingId("");
    setBannerToDelete(null);
    addToast("Banner Deleted", `${banner.title} was deleted.`, "success");
    await loadBanners();
  };

  const handleToggleActive = async (banner) => {
    setTogglingId(banner.id);
    const result = await updateRestaurantBanner(
      banner.id,
      frontendDomainUrlRef.current,
      bannerPayload({ ...banner, isActive: !banner.isActive })
    );
    setTogglingId("");
    if (!result.ok) {
      addToast(
        "Update Failed",
        bannerApiMessage(result.data, "Banner status could not be updated."),
        "error"
      );
      return;
    }
    addToast(
      banner.isActive ? "Banner Deactivated" : "Banner Activated",
      `${banner.title} is now ${banner.isActive ? "inactive" : "active"}.`,
      "success"
    );
    await loadBanners();
  };

  const stats = useMemo(() => {
    const stamp = Date.now();
    const total = banners.length;
    let live = 0;
    let blocked = 0;
    let scheduled = 0;
    let expired = 0;
    let allBranches = 0;
    for (const banner of banners) {
      const state = bannerScheduleState(banner, stamp);
      if (state === "live") live += 1;
      else if (state === "blocked") blocked += 1;
      else if (state === "scheduled") scheduled += 1;
      else expired += 1;
      if (banner.showAllBranches) allBranches += 1;
    }
    const livePct = total ? Math.round((live / total) * 100) : 0;
    return { total, live, blocked, scheduled, expired, allBranches, livePct };
  }, [banners]);

  const filteredBanners = useMemo(() => {
    if (statusFilter === "all") return banners;
    const stamp = Date.now();
    return banners.filter((banner) => {
      const state = bannerScheduleState(banner, stamp);
      if (statusFilter === "active") return state === "live";
      if (statusFilter === "blocked") return state === "blocked";
      if (statusFilter === "scheduled") return state === "scheduled";
      return state === "expired";
    });
  }, [banners, statusFilter]);

  const tagBars = useMemo(() => {
    const counts = new Map();
    for (const banner of banners) {
      const label = restaurantBannerTagLabel(banner.tag || banner.badge || "Untagged");
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const max = Math.max(...rows.map((row) => row.value), 1);
    return { rows, max };
  }, [banners]);

  const chartSeries = useMemo(() => {
    const buckets = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (chartRange === "weekly") {
      for (let i = 6; i >= 0; i -= 1) {
        const day = new Date(cursor);
        day.setDate(cursor.getDate() - i);
        const start = day.getTime();
        const end = start + 864e5;
        buckets.push({
          label: day.toLocaleDateString(undefined, { weekday: "short" }),
          start,
          end
        });
      }
    } else if (chartRange === "monthly") {
      for (let i = 5; i >= 0; i -= 1) {
        const month = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
        const next = new Date(cursor.getFullYear(), cursor.getMonth() - i + 1, 1);
        buckets.push({
          label: month.toLocaleDateString(undefined, { month: "short" }),
          start: month.getTime(),
          end: next.getTime()
        });
      }
    } else {
      for (let i = 4; i >= 0; i -= 1) {
        const year = cursor.getFullYear() - i;
        buckets.push({
          label: String(year),
          start: new Date(year, 0, 1).getTime(),
          end: new Date(year + 1, 0, 1).getTime()
        });
      }
    }
    const values = buckets.map(
      (bucket) =>
        banners.filter((banner) => {
          const created = new Date(banner.createdAt || banner.startDate || 0).getTime();
          return Number.isFinite(created) && created >= bucket.start && created < bucket.end;
        }).length
    );
    return {
      labels: buckets.map((bucket) => bucket.label),
      values,
      title:
        chartRange === "weekly"
          ? "Banners created · last 7 days"
          : chartRange === "monthly"
            ? "Banners created · last 6 months"
            : "Banners created · last 5 years"
    };
  }, [banners, chartRange]);

  const chartMax = Math.max(...chartSeries.values, 1);

  const donutStyle = useMemo(() => {
    const total = Math.max(stats.total, 1);
    const liveDeg = (stats.live / total) * 360;
    const blockedDeg = (stats.blocked / total) * 360;
    const scheduledDeg = (stats.scheduled / total) * 360;
    const expiredDeg = (stats.expired / total) * 360;
    let cursor = 0;
    const segment = (deg, color) => {
      const start = cursor;
      cursor += deg;
      return `${color} ${start}deg ${cursor}deg`;
    };
    if (stats.total === 0) {
      return { background: "conic-gradient(var(--admin-border,#2A2F38) 0deg 360deg)" };
    }
    return {
      background: `conic-gradient(${[
        segment(liveDeg, "#34d399"),
        segment(blockedDeg, "#f87171"),
        segment(scheduledDeg, "#fbbf24"),
        segment(expiredDeg, "#94a3b8")
      ].join(", ")})`
    };
  }, [stats]);

  const previewImage = form.image || heroMealImg.src;
  const previewTag = form.tag ? restaurantBannerTagLabel(form.tag) : "";

  const statusMeta = (state) => {
    if (state === "live") {
      return { label: "Active", className: "bg-emerald-500/15 text-emerald-400" };
    }
    if (state === "scheduled") {
      return { label: "Scheduled", className: "bg-amber-500/15 text-amber-300" };
    }
    if (state === "expired") {
      return { label: "Expired", className: "bg-slate-500/20 text-slate-300" };
    }
    return { label: "Blocked", className: "bg-red-500/15 text-red-300" };
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-lg space-y-3">
            <div className="flex items-center gap-2.5">
              <SkeletonPulse className="h-10 w-10 rounded-xl" />
              <SkeletonPulse className="h-7 w-44" />
            </div>
            <SkeletonPulse className="h-4 w-full max-w-md" />
          </div>
          <SkeletonPulse className="h-11 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`${SURFACE} space-y-3 p-4`}>
              <SkeletonPulse className="h-3 w-20" />
              <SkeletonPulse className="h-8 w-12" />
              <SkeletonPulse className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={editorTopRef}
      className="mx-auto max-w-[1500px] space-y-6 p-4 font-['Plus_Jakarta_Sans',sans-serif] sm:p-6 lg:p-8"
      data-admin-theme-context={adminTheme || "dark"}
    >
      {isEditorOpen ? (
        <div className="animate-in fade-in space-y-5 duration-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                title="Back to banners"
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-elevated,#151920)] text-[var(--admin-muted,#D4D4D4)] transition-all hover:border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_50%,transparent)] hover:text-[var(--admin-text,#fff)] disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-['Outfit',sans-serif] text-xl font-black tracking-tight text-[var(--admin-text,#fff)] sm:text-2xl">
                    {editingBanner ? "Edit Banner" : "New Banner"}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                    <Sparkles className="h-3 w-3" />
                    Live preview
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--admin-subtle,#A3A3A3)] sm:text-sm">
                  Build the homepage hero step by step — preview updates as you type.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-elevated,#151920)] px-4 py-2.5 text-sm font-bold text-[var(--admin-muted,#D4D4D4)] transition-all hover:text-[var(--admin-text,#fff)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="banner-editor-form"
                disabled={saving}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--color-admin-accent-hover,#E04810)] disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingBanner ? "Save Changes" : "Publish Banner"}
              </button>
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {EDITOR_STEPS.map((step, index) => {
              const done = editorStep > step.id;
              const active = editorStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setEditorStep(step.id)}
                  className={`group flex min-w-[9.5rem] flex-1 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_60%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] to-transparent"
                      : done
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-[var(--admin-border,#2A2F38)] bg-[var(--admin-elevated,#14171C)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                      active
                        ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white"
                        : done
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-[var(--admin-hover,#1D2128)] text-[var(--admin-faint,#737373)]"
                    }`}
                  >
                    {done && !active ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-black ${active ? "text-[var(--admin-text,#fff)]" : "text-[var(--admin-muted,#D4D4D4)]"}`}
                    >
                      {step.label}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--admin-faint,#737373)]">
                      {step.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <form
              id="banner-editor-form"
              onSubmit={(event) => void handleSave(event)}
              className={`${SURFACE} space-y-5 p-4 sm:p-5`}
            >
              {editorStep === 0 && (
                <div className="animate-in fade-in space-y-4 duration-200">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)] sm:col-span-2">
                      Title *
                      <input
                        required
                        value={form.title}
                        placeholder="e.g. Weekend Burger Feast"
                        onChange={(event) => updateForm("title", event.target.value)}
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)] sm:col-span-2">
                      Short Text
                      <input
                        value={form.shortText}
                        placeholder="One-line hook under the title"
                        onChange={(event) => updateForm("shortText", event.target.value)}
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)] sm:col-span-2">
                      Description
                      <textarea
                        rows={3}
                        value={form.description}
                        placeholder="Describe the offer, menu item, or promotion..."
                        onChange={(event) => updateForm("description", event.target.value)}
                        className={`${fieldClass} min-h-[5rem] resize-y`}
                      />
                    </label>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">Promo Tag</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateForm("tag", "")} className={chipClass(!form.tag)}>
                        None
                      </button>
                      {RESTAURANT_BANNER_TAGS.map((tag) => (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => updateForm("tag", tag.value)}
                          className={chipClass(form.tag === tag.value)}
                        >
                          {form.tag === tag.value && <Check className="h-3 w-3" />}
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-[var(--admin-border,#343943)] bg-[var(--admin-surface,#0F1217)]/80 p-4">
                    <CatalogImageField
                      label="Banner Image *"
                      imageUrl={form.image}
                      showUrlInput={false}
                      onImageChange={(url) => updateForm("image", url)}
                      uploadType="banner"
                      frontendDomainUrl={frontendDomainUrl}
                      onError={(message) => addToast("Upload Failed", message, "error")}
                    />
                    {!form.image && (
                      <p className="mt-2 text-[11px] text-[var(--admin-faint,#737373)]">
                        Upload a wide food photo for the best homepage look.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {editorStep === 1 && (
                <div className="animate-in fade-in space-y-5 duration-200">
                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      Primary Button Text *
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PRIMARY_BUTTON_TEXTS.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => updateForm("buttonText", text)}
                          className={chipClass(form.buttonText === text)}
                        >
                          {form.buttonText === text && <Check className="h-3 w-3" />}
                          {text}
                        </button>
                      ))}
                      {form.buttonText && !PRIMARY_BUTTON_TEXTS.includes(form.buttonText) && (
                        <button type="button" className={chipClass(true)}>
                          <Check className="h-3 w-3" />
                          {form.buttonText}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      Primary Button Link
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BANNER_SECTIONS.map((section) => (
                        <button
                          key={section.value}
                          type="button"
                          onClick={() => updateForm("buttonLink", section.value)}
                          className={`${chipClass(form.buttonLink === section.value)} w-full justify-between`}
                        >
                          <span>{section.label}</span>
                          {form.buttonLink === section.value && (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-[var(--admin-border,#2A2F38)]" />

                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      Secondary Button Text *
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SECONDARY_BUTTON_TEXTS.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => updateForm("secondaryButtonText", text)}
                          className={chipClass(form.secondaryButtonText === text)}
                        >
                          {form.secondaryButtonText === text && <Check className="h-3 w-3" />}
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      Secondary Button Link
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BANNER_SECTIONS.map((section) => (
                        <button
                          key={`sec-${section.value}`}
                          type="button"
                          onClick={() => updateForm("secondaryButtonLink", section.value)}
                          className={`${chipClass(form.secondaryButtonLink === section.value)} w-full justify-between`}
                        >
                          <span>{section.label}</span>
                          {form.secondaryButtonLink === section.value && (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editorStep === 2 && (
                <div className="animate-in fade-in space-y-4 duration-200">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateForm("showAllBranches", !form.showAllBranches)}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        form.showAllBranches
                          ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)]"
                          : "border-[var(--admin-border,#2A2F38)] bg-[var(--admin-surface,#0F1217)]"
                      }`}
                    >
                      <MapPin
                        className={`mt-0.5 h-4 w-4 shrink-0 ${form.showAllBranches ? "text-[var(--color-admin-accent,#FF5A1F)]" : "text-[var(--admin-faint,#737373)]"}`}
                      />
                      <span>
                        <span className="block text-xs font-black text-[var(--admin-text,#fff)]">
                          All branches
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--admin-faint,#737373)]">
                          Show this banner everywhere
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm("isActive", !form.isActive)}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        form.isActive
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-[var(--admin-border,#2A2F38)] bg-[var(--admin-surface,#0F1217)]"
                      }`}
                    >
                      <Power
                        className={`mt-0.5 h-4 w-4 shrink-0 ${form.isActive ? "text-emerald-400" : "text-[var(--admin-faint,#737373)]"}`}
                      />
                      <span>
                        <span className="block text-xs font-black text-[var(--admin-text,#fff)]">
                          {form.isActive ? "Active now" : "Inactive"}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--admin-faint,#737373)]">
                          Toggle visibility on the site
                        </span>
                      </span>
                    </button>
                  </div>

                  <label className="block text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Branch
                    <select
                      value={form.branchName}
                      disabled={form.showAllBranches}
                      onChange={(event) => updateForm("branchName", event.target.value)}
                      className={`${fieldClass} cursor-pointer disabled:opacity-50`}
                    >
                      <option value="">Select a branch</option>
                      {liveBranches.map((branch) => (
                        <option key={branch.id} value={branch.shortName || branch.name}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Display Order
                    <input
                      type="number"
                      min="0"
                      value={form.displayOrder}
                      placeholder="e.g. 1"
                      onChange={(event) => updateForm("displayOrder", Number(event.target.value))}
                      className={fieldClass}
                    />
                  </label>

                  <div className={`${SURFACE} space-y-3 p-4`}>
                    <div className="flex items-center gap-2 text-xs font-black text-[var(--admin-muted,#D4D4D4)]">
                      <CalendarRange className="h-4 w-4 text-[var(--color-admin-accent,#FF5A1F)]" />
                      Schedule (optional)
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-bold text-[var(--admin-subtle,#A3A3A3)]">
                        Starts At
                        <input
                          type="datetime-local"
                          value={form.startDate}
                          onChange={(event) => updateForm("startDate", event.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-xs font-bold text-[var(--admin-subtle,#A3A3A3)]">
                        Ends At
                        <input
                          type="datetime-local"
                          value={form.endDate}
                          onChange={(event) => updateForm("endDate", event.target.value)}
                          className={fieldClass}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--admin-border,#2A2F38)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={editorStep === 0 || saving}
                  onClick={() => setEditorStep((step) => (step > 0 ? step - 1 : step))}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-elevated,#151920)] px-4 py-2.5 text-sm font-bold text-[var(--admin-muted,#D4D4D4)] transition-all disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                {editorStep < 2 ? (
                  <button
                    type="button"
                    onClick={() => setEditorStep((step) => (step < 2 ? step + 1 : step))}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)] disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {editingBanner ? "Save Changes" : "Publish Banner"}
                  </button>
                )}
              </div>
            </form>

            <aside className="h-fit space-y-3 xl:sticky xl:top-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--admin-subtle,#A3A3A3)]">
                <Eye className="h-3.5 w-3.5 text-[var(--color-admin-accent,#FF5A1F)]" />
                Homepage preview
              </div>
              <div className="overflow-hidden rounded-2xl border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-surface,#0A0C10)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-[16/10] sm:aspect-[16/9] xl:aspect-[4/5] 2xl:aspect-[16/11]">
                  <img
                    src={previewImage}
                    alt={form.title || "Banner preview"}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
                  {previewTag && (
                    <span className="absolute left-3 top-3 rounded-md bg-[var(--color-admin-accent,#FF5A1F)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                      {previewTag}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 sm:p-5">
                    <h3 className="line-clamp-2 text-lg font-black leading-tight text-white drop-shadow-md sm:text-xl">
                      {form.title.trim() || "Your banner title"}
                    </h3>
                    <p className="line-clamp-2 text-xs text-neutral-200/90 sm:text-sm">
                      {form.shortText.trim() ||
                        form.description.trim() ||
                        "Short text and description appear here as guests see them."}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center rounded-lg bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-1.5 text-[11px] font-bold text-white shadow-md">
                        {form.buttonText || "Primary CTA"}
                      </span>
                      <span className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
                        {form.secondaryButtonText || "Secondary CTA"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--admin-border,#1F242C)] bg-[var(--admin-elevated,#11151B)] px-3 py-2.5 text-[10px] text-[var(--admin-faint,#737373)]">
                  <span
                    className={`rounded-md px-2 py-0.5 font-bold ${form.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--admin-hover,#252830)] text-[var(--admin-subtle,#A3A3A3)]"}`}
                  >
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="truncate">
                    {form.showAllBranches ? "All branches" : form.branchName || "No branch"}
                  </span>
                  <span className="ml-auto tabular-nums">Order #{form.displayOrder}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2.5 font-['Outfit',sans-serif] text-xl font-black tracking-tight text-[var(--admin-text,#fff)] sm:text-2xl">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
                  <Image className="h-5 w-5" />
                </span>
                <span>Hero Banners</span>
              </h2>
              <p className="mt-1.5 max-w-xl text-xs text-[var(--admin-subtle,#A3A3A3)] sm:text-sm">
                Track active, blocked, and scheduled homepage banners — theme-aware for dark & light.
              </p>
            </div>
            <button
              type="button"
              title="Add a homepage banner"
              onClick={openAdd}
              className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_25%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-admin-accent-hover,#E04810)] sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add Banner
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {[
              {
                label: "Total",
                value: stats.total,
                hint: "All banners",
                icon: Layers,
                tone: "text-[var(--color-admin-accent,#FF5A1F)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)]",
                filter: "all"
              },
              {
                label: "Active",
                value: stats.live,
                hint: `${stats.livePct}% live now`,
                icon: CheckCircle2,
                tone: "text-emerald-400 bg-emerald-500/10",
                filter: "active"
              },
              {
                label: "Blocked",
                value: stats.blocked,
                hint: "Hidden from storefront",
                icon: Ban,
                tone: "text-red-400 bg-red-500/10",
                filter: "blocked"
              },
              {
                label: "Scheduled",
                value: stats.scheduled,
                hint: "Starts later",
                icon: CalendarClock,
                tone: "text-amber-300 bg-amber-500/10",
                filter: "scheduled"
              },
              {
                label: "All Branches",
                value: stats.allBranches,
                hint: `${stats.expired} expired`,
                icon: MapPin,
                tone: "text-sky-400 bg-sky-500/10",
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
                  <div className="flex items-start justify-between gap-3">
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
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className={`${SURFACE} p-5`}>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[var(--admin-text,#fff)]">Status mix</h3>
                  <p className="mt-0.5 text-[12px] text-[var(--admin-faint,#737373)]">
                    Active vs blocked vs schedule
                  </p>
                </div>
                <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
                  <div
                    className="relative h-36 w-36 shrink-0 rounded-full shadow-[0_0_40px_color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)]"
                    style={donutStyle}
                  >
                    <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)]">
                      <span className="text-2xl font-black tabular-nums text-[var(--admin-text,#fff)]">
                        {stats.livePct}%
                      </span>
                      <span className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="w-full space-y-2 text-xs">
                    {[
                      { label: "Active", value: stats.live, color: "bg-emerald-400", filter: "active" },
                      { label: "Blocked", value: stats.blocked, color: "bg-red-400", filter: "blocked" },
                      {
                        label: "Scheduled",
                        value: stats.scheduled,
                        color: "bg-amber-400",
                        filter: "scheduled"
                      },
                      { label: "Expired", value: stats.expired, color: "bg-slate-400", filter: "expired" }
                    ].map((row) => (
                      <button
                        key={row.label}
                        type="button"
                        onClick={() =>
                          setStatusFilter((prev) => (prev === row.filter ? "all" : row.filter))
                        }
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
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

              <div className={`${SURFACE} space-y-5 p-5 xl:col-span-2`}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-sm font-bold text-[var(--admin-text,#fff)]">
                      Banner creation trend
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--admin-faint,#737373)]">
                      {chartSeries.title}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ["weekly", "Weekly"],
                      ["monthly", "Monthly"],
                      ["yearly", "Yearly"]
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setChartRange(key)}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all ${
                          chartRange === key
                            ? "border-[var(--color-admin-accent,#FF5A1F)] bg-[var(--color-admin-accent,#FF5A1F)] text-white shadow-md shadow-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_25%,transparent)]"
                            : "border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] text-[var(--admin-subtle,#A3A3A3)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex h-44 items-end gap-1.5 sm:gap-2.5">
                  {chartSeries.values.map((count, index) => (
                    <div
                      key={`${chartSeries.labels[index]}-${index}`}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="text-[10px] font-bold tabular-nums text-[var(--admin-subtle,#A3A3A3)] opacity-0 transition-opacity group-hover:opacity-100">
                        {count}
                      </span>
                      <div className="flex h-[140px] w-full items-end overflow-hidden rounded-t-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0E1116)]">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-[#C2410C] via-[var(--color-admin-accent,#FF5A1F)] to-[#FDBA74] transition-all duration-500 group-hover:brightness-110"
                          style={{
                            height: `${Math.max(count > 0 ? 10 : 0, (count / chartMax) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="max-w-full truncate text-[9px] font-bold text-[var(--admin-faint,#737373)] sm:text-[10px]">
                        {chartSeries.labels[index]}
                      </span>
                    </div>
                  ))}
                </div>

                {tagBars.rows.length > 0 && (
                  <div className="space-y-3 border-t border-[var(--admin-border,#292D35)] pt-2">
                    <div className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      Tag distribution
                    </div>
                    {tagBars.rows.map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="truncate pr-2 text-[var(--admin-subtle,#A3A3A3)]">
                            {row.label}
                          </span>
                          <span className="font-bold tabular-nums text-[var(--admin-text,#fff)]">
                            {row.value}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-surface,#101216)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-admin-accent,#FF5A1F)] to-[#FDBA74] transition-all"
                            style={{ width: `${(row.value / tagBars.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)] p-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {["all", "active", "blocked", "scheduled", "expired"].map((key) => (
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
                {filteredBanners.length} shown
              </span>
            </div>
            <div className="inline-flex self-start rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] p-1 sm:self-auto">
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

          {filteredBanners.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-[var(--admin-border,#343943)] bg-[var(--admin-elevated,#14171C)] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
                <Image className="h-6 w-6" />
              </div>
              <p className="mx-auto max-w-md text-sm text-[var(--admin-subtle,#A3A3A3)]">
                {banners.length === 0
                  ? "No admin banners yet. The homepage shows default food imagery until you publish one."
                  : "No banners match this filter."}
              </p>
              {banners.length === 0 && (
                <button
                  type="button"
                  onClick={openAdd}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                >
                  <Plus className="h-4 w-4" />
                  Create your first banner
                </button>
              )}
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBanners.map((banner) => {
                const state = bannerScheduleState(banner);
                const meta = statusMeta(state);
                const branches = restaurantBannerBranchesLabel(banner);
                const tagLabel = restaurantBannerTagLabel(banner.tag || banner.badge);
                return (
                  <article
                    key={banner.id}
                    className={`group overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                      state === "blocked" || state === "expired"
                        ? "border-[var(--admin-border,#292D35)]/60 bg-[var(--admin-elevated,#14171C)] opacity-80"
                        : "border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)]"
                    }`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-hover,#1D2128)]">
                      <img
                        src={banner.image || heroMealImg.src}
                        alt={banner.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>
                          {meta.label}
                        </span>
                        {tagLabel ? (
                          <span className="rounded-md bg-[var(--color-admin-accent,#FF5A1F)] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                            {tagLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
                        <h3 className="line-clamp-1 text-base font-black text-white">{banner.title}</h3>
                        <p className="line-clamp-1 text-[11px] text-white/75">
                          {banner.shortText || banner.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--admin-subtle,#A3A3A3)]">
                        <MapPin className="h-3 w-3 shrink-0 text-[var(--color-admin-accent,#FF5A1F)]" />
                        <span className="truncate">{branches}</span>
                        <span className="ml-auto tabular-nums">#{banner.displayOrder}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-[var(--admin-muted,#D4D4D4)]">
                        {banner.buttonText && (
                          <span className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-1">
                            {banner.buttonText}
                          </span>
                        )}
                        {banner.secondaryButtonText && (
                          <span className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-1">
                            {banner.secondaryButtonText}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--admin-faint,#737373)]">
                        <span>Starts {formatShortDate(banner.startDate)}</span>
                        <span>Ends {formatShortDate(banner.endDate)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(togglingId)}
                          onClick={() => void handleToggleActive(banner)}
                          className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                            banner.isActive
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-[var(--admin-hover,#252830)] text-[var(--admin-muted,#D4D4D4)]"
                          }`}
                        >
                          {togglingId === banner.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          {banner.isActive ? "On" : "Off"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(banner)}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(deletingId)}
                          onClick={() => setBannerToDelete(banner)}
                          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBanners.map((banner) => {
                const state = bannerScheduleState(banner);
                const meta = statusMeta(state);
                const branches = restaurantBannerBranchesLabel(banner);
                const tagLabel = restaurantBannerTagLabel(banner.tag || banner.badge);
                return (
                  <div
                    key={banner.id}
                    className={`${SURFACE} flex flex-col gap-4 p-4 transition-all hover:border-[var(--admin-hover,#3A404A)] sm:gap-5 sm:p-5 lg:flex-row ${
                      state === "blocked" || state === "expired" ? "opacity-75" : ""
                    }`}
                  >
                    <div className="group relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-[var(--admin-hover,#1D2128)] sm:h-44 lg:h-36 lg:w-72">
                      <img
                        src={banner.image || heroMealImg.src}
                        alt={banner.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-80" />
                      {tagLabel && (
                        <span className="absolute left-2 top-2 rounded-md bg-[var(--color-admin-accent,#FF5A1F)] px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                          {tagLabel}
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 text-[10px] font-bold tabular-nums text-white/90">
                        Order #{banner.displayOrder}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>
                          {meta.label}
                        </span>
                        <span className="inline-flex max-w-full items-center gap-1 text-[10px] text-[var(--admin-subtle,#A3A3A3)]">
                          <MapPin className="h-3 w-3 shrink-0 text-[var(--color-admin-accent,#FF5A1F)]" />
                          <span className="truncate">{branches}</span>
                        </span>
                      </div>
                      <h3 className="truncate text-base font-black text-[var(--admin-text,#fff)] sm:text-lg">
                        {banner.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-[var(--admin-subtle,#A3A3A3)]">
                        {banner.shortText || banner.description || "No description"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-[var(--admin-muted,#D4D4D4)]">
                        {banner.buttonText && (
                          <span className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-1">
                            {banner.buttonText}
                          </span>
                        )}
                        {banner.secondaryButtonText && (
                          <span className="rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-1">
                            {banner.secondaryButtonText}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] text-[var(--admin-faint,#737373)]">
                        <span>Starts {formatShortDate(banner.startDate)}</span>
                        <span>Ends {formatShortDate(banner.endDate)}</span>
                        {banner.updatedAt && <span>Updated {formatShortDate(banner.updatedAt)}</span>}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:justify-center">
                      <button
                        type="button"
                        title={banner.isActive ? "Deactivate banner" : "Activate banner"}
                        disabled={Boolean(togglingId)}
                        onClick={() => void handleToggleActive(banner)}
                        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                          banner.isActive
                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-[var(--admin-hover,#252830)] text-[var(--admin-muted,#D4D4D4)]"
                        }`}
                      >
                        {togglingId === banner.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                        {banner.isActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(banner)}
                        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(deletingId)}
                        onClick={() => setBannerToDelete(banner)}
                        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 transition-all hover:bg-red-500/25 disabled:opacity-50"
                      >
                        {deletingId === banner.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {bannerToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => !deletingId && setBannerToDelete(null)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-banner-title"
            aria-describedby="delete-banner-description"
            className={`relative z-10 w-full max-w-md ${SURFACE} animate-in zoom-in-95 p-6 shadow-2xl`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 id="delete-banner-title" className="text-base font-black text-[var(--admin-text,#fff)]">
                  Delete this banner?
                </h3>
                <p
                  id="delete-banner-description"
                  className="mt-1 text-sm text-[var(--admin-subtle,#A3A3A3)]"
                >
                  Are you sure you want to delete “{bannerToDelete.title}”? This action cannot be
                  undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setBannerToDelete(null)}
                className="cursor-pointer rounded-xl bg-[var(--admin-hover,#252830)] px-4 py-2 text-sm font-bold text-[var(--admin-muted,#D4D4D4)] transition-colors hover:text-[var(--admin-text,#fff)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void handleDelete()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
              >
                {deletingId && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { HeroBannersPage };
