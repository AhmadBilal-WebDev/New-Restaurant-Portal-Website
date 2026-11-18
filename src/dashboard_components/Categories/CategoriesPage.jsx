import { useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { CatalogImageField } from '@/dashboard_components/Layout/CatalogImageField';
import { getOwnerProfile } from '@/shared/lib/ownerProfile';
import {
  apiMessage,
  CATEGORY_TAGS,
  createCategory,
  deleteCategory,
  getCategories,
  getFrontendDomainUrl,
  updateCategory
} from '@/shared/lib/catalogApi';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Layers,
  ArrowUp,
  ArrowDown,
  Loader2,
  Power,
  CheckCircle2,
  Ban,
  Package,
  FolderOpen,
  ImageIcon,
  Tag,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  MapPin
} from "lucide-react";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatCategoryDate(value) {
  if (value === void 0 || value === null || value === "") return "—";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}/${MONTHS[date.getMonth()]}/${date.getFullYear()}`;
}
function SkeletonPulse({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-[#252830] ${className}`} />;
}
const CategoriesPage = () => {
  const { categories, setCategories, products, addToast } = useRestaurant();
  const { primaryBranchId, liveBranches, isAllBranches, activeBranchFilter } = useBranchScope();
  const branchName = liveBranches.find((b) => b.id === primaryBranchId)?.name || liveBranches[0]?.name || "";
  const categoryBranchName = (category) => liveBranches.find((branch) => branch.id === category.branchId || branch.name === category.branchId)?.name || category.branchName || branchName;
  const resolveBranchId = (value) => {
    if (!value) return void 0;
    const byId = liveBranches.find((b) => b.id === value);
    if (byId) return byId.id;
    const byName = liveBranches.find(
      (b) => b.name.toLowerCase() === value.toLowerCase() || b.shortName?.toLowerCase() === value.toLowerCase()
    );
    return byName?.id || value;
  };
  const visibleCategories = categories.filter((c) => {
    if (isAllBranches || c.showAllBranches) return true;
    const resolved = resolveBranchId(c.branchId || c.branchName);
    return resolved === activeBranchFilter || c.branchId === branchName || c.branchName === branchName;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingCategoryId, setTogglingCategoryId] = useState("");
  const [frontendDomainUrl, setFrontendDomainUrl] = useState(getFrontendDomainUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards");
  const loadingRef = useRef(false);
  const frontendDomainUrlRef = useRef(frontendDomainUrl);
  const resolveFrontendDomainUrl = async () => {
    const result = await getOwnerProfile();
    if (result.ok && result.data && typeof result.data === "object") {
      const raw = result.data;
      const nested = raw.profile ?? raw.data ?? raw.owner;
      const profile = nested && typeof nested === "object" ? nested : raw;
      const profileDomain = profile.frontendDomainUrl;
      if (typeof profileDomain === "string" && profileDomain.trim()) {
        const resolved = profileDomain.trim().replace(/\/$/, "");
        frontendDomainUrlRef.current = resolved;
        setFrontendDomainUrl(resolved);
        return resolved;
      }
    }
    return frontendDomainUrlRef.current;
  };
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    sort: 1,
    isActive: true,
    showAllBranches: false,
    branchName: "",
    tags: []
  });
  const buildPayload = () => {
    const allBranches = formData.showAllBranches === true;
    return {
      frontendDomainUrl: frontendDomainUrlRef.current,
      showAllBranches: allBranches,
      name: formData.name.trim(),
      branchName: allBranches ? "" : String(formData.branchName || "").trim(),
      description: formData.description.trim(),
      image: formData.image.trim(),
      sort: formData.sort,
      isActive: formData.isActive,
      tags: formData.tags
    };
  };
  const loadCategories = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const result = await getCategories({
        frontendDomainUrl: frontendDomainUrlRef.current,
        ...(isAllBranches
          ? { showAllBranches: true }
          : branchName
            ? { showAllBranches: false, branchName }
            : { showAllBranches: true })
      });
      if (result.ok) {
        const mapped = result.categories.map((cat) => ({
          ...cat,
          branchId: resolveBranchId(cat.branchId) || cat.branchId
        }));
        setCategories(mapped);
      } else {
        addToast("Load Failed", apiMessage(result.data, "Categories could not be loaded."), "error");
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };
  useEffect(() => {
    void (async () => {
      await resolveFrontendDomainUrl();
      await loadCategories();
    })();
  }, [branchName, isAllBranches]);
  const handleOpenAdd = () => {
    const defaultBranch = !isAllBranches && branchName ? branchName : liveBranches[0]?.name || "";
    setFormData({
      name: "",
      description: "",
      image: "",
      sort: visibleCategories.length + 1,
      isActive: true,
      showAllBranches: isAllBranches,
      branchName: isAllBranches ? "" : defaultBranch,
      tags: []
    });
    setEditingCategory(null);
    setIsModalOpen(true);
  };
  const handleOpenEdit = (c) => {
    const tags = c.tags || [];
    const catBranch = categoryBranchName(c) || "";
    setFormData({
      name: c.name,
      description: c.description || "",
      image: c.image,
      sort: c.order ?? 1,
      isActive: c.isActive !== false,
      showAllBranches: c.showAllBranches === true,
      branchName: c.showAllBranches === true ? "" : catBranch || branchName || liveBranches[0]?.name || "",
      tags
    });
    setEditingCategory(c);
    setIsModalOpen(true);
  };
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (!formData.showAllBranches && !String(formData.branchName || "").trim()) {
      addToast("Branch Required", "Select a branch, or choose All Branches.", "error");
      return;
    }
    if (!formData.image.trim()) {
      addToast("Image Required", "Upload a category banner before saving.", "error");
      return;
    }
    setSaving(true);
    const payload = buildPayload();
    const result = editingCategory ? await updateCategory(editingCategory.id, payload) : await createCategory(payload);
    setSaving(false);
    if (!result.ok) {
      addToast("Save Failed", apiMessage(result.data, "Category could not be saved."), "error");
      return;
    }
    await loadCategories();
    addToast(
      editingCategory ? "Category Updated" : "Category Added",
      `${formData.name} saved successfully.`,
      "success"
    );
    setIsModalOpen(false);
  };
  const handleMove = async (index, direction) => {
    const scoped = [...visibleCategories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scoped.length) return;
    const current = scoped[index];
    const swap = scoped[targetIndex];
    const currentSort = current.order ?? index + 1;
    const swapSort = swap.order ?? targetIndex + 1;
    const [first, second] = await Promise.all([
      updateCategory(current.id, {
        frontendDomainUrl: frontendDomainUrlRef.current,
        showAllBranches: current.showAllBranches === true,
        name: current.name,
        branchName: current.showAllBranches === true ? "" : categoryBranchName(current),
        description: current.description || "",
        image: current.image,
        sort: swapSort,
        isActive: current.isActive !== false,
        tags: current.tags || []
      }),
      updateCategory(swap.id, {
        frontendDomainUrl: frontendDomainUrlRef.current,
        showAllBranches: swap.showAllBranches === true,
        name: swap.name,
        branchName: swap.showAllBranches === true ? "" : categoryBranchName(swap),
        description: swap.description || "",
        image: swap.image,
        sort: currentSort,
        isActive: swap.isActive !== false,
        tags: swap.tags || []
      })
    ]);
    if (!first.ok || !second.ok) {
      addToast("Reorder Failed", "Could not update category order.", "error");
      return;
    }
    await loadCategories();
    addToast("Categories Reordered", "Display order updated.", "info");
  };
  const handleToggleActive = async (cat) => {
    if (togglingCategoryId) return;
    setTogglingCategoryId(cat.id);
    const payload = {
      frontendDomainUrl: frontendDomainUrlRef.current,
      showAllBranches: cat.showAllBranches === true,
      name: cat.name,
      branchName: cat.showAllBranches === true ? "" : categoryBranchName(cat),
      description: cat.description || "",
      image: cat.image,
      sort: cat.order ?? 1,
      isActive: cat.isActive === false,
      tags: cat.tags || []
    };
    const result = await updateCategory(cat.id, payload);
    setTogglingCategoryId("");
    if (!result.ok) {
      addToast("Update Failed", apiMessage(result.data, "Status could not be updated."), "error");
      return;
    }
    await loadCategories();
    addToast("Status Updated", `${cat.name} is now ${payload.isActive ? "active" : "inactive"}.`, "info");
  };
  const handleDeleteWithWarning = (cat) => {
    setCategoryToDelete(cat);
  };
  const handleConfirmDelete = async () => {
    if (!categoryToDelete || deleting) return;
    setDeleting(true);
    const result = await deleteCategory(categoryToDelete.id, frontendDomainUrlRef.current);
    setDeleting(false);
    if (!result.ok) {
      addToast("Delete Failed", apiMessage(result.data, "Category could not be deleted."), "error");
      return;
    }
    await loadCategories();
    addToast("Category Deleted", `${categoryToDelete.name} removed.`, "info");
    setCategoryToDelete(null);
  };
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return visibleCategories.filter((cat) => {
      const isActive = cat.isActive !== false;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
      if (!query) return true;
      const branchLabel = categoryBranchName(cat).toLowerCase();
      return cat.name.toLowerCase().includes(query) || (cat.description || "").toLowerCase().includes(query) || branchLabel.includes(query);
    });
  }, [visibleCategories, searchQuery, statusFilter, liveBranches, branchName]);
  const stats = useMemo(() => {
    const total = visibleCategories.length;
    const active = visibleCategories.filter((c) => c.isActive !== false).length;
    const blocked = total - active;
    const withImage = visibleCategories.filter((c) => Boolean(c.image)).length;
    const tagged = visibleCategories.filter((c) => (c.tags || []).length > 0).length;
    const productCounts = visibleCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: products.filter((p) => p.category === cat.id).length,
      isActive: cat.isActive !== false
    }));
    const totalProducts = productCounts.reduce((sum, row) => sum + row.count, 0);
    const emptyCategories = productCounts.filter((row) => row.count === 0).length;
    const topByProducts = [...productCounts].sort((a, b) => b.count - a.count).slice(0, 5);
    const maxProductCount = Math.max(...topByProducts.map((row) => row.count), 1);
    const activePct = total > 0 ? Math.round(active / total * 100) : 0;
    return {
      total,
      active,
      blocked,
      withImage,
      tagged,
      totalProducts,
      emptyCategories,
      topByProducts,
      maxProductCount,
      activePct
    };
  }, [visibleCategories, products]);
  const donutStyle = {
    background: `conic-gradient(#00D084 0% ${stats.activePct}%, #EF4444 ${stats.activePct}% 100%)`
  };
  const inputClass = "w-full bg-[#101216] border border-[#292D35] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#FF5A1F] focus:ring-[3px] focus:ring-[#FF5A1F]/15 transition-all";
  const renderCategoryActions = (cat) => {
    const isCategoryActive = cat.isActive !== false;
    const originalIndex = visibleCategories.findIndex((c) => c.id === cat.id);
    return <div className="flex items-center gap-1">
        <button
      disabled={originalIndex <= 0}
      onClick={() => handleMove(originalIndex, "up")}
      className="p-1.5 rounded-lg bg-[#14171C] text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer transition-all hover:bg-[#252830]"
      title="Move Earlier"
    >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
      disabled={originalIndex < 0 || originalIndex >= visibleCategories.length - 1}
      onClick={() => handleMove(originalIndex, "down")}
      className="p-1.5 rounded-lg bg-[#14171C] text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer transition-all hover:bg-[#252830]"
      title="Move Later"
    >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
      type="button"
      disabled={Boolean(togglingCategoryId)}
      onClick={() => void handleToggleActive(cat)}
      className={`p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 ${isCategoryActive ? "text-emerald-400 hover:bg-emerald-500/10" : "text-neutral-400 hover:bg-[#252830] hover:text-white"}`}
      title={isCategoryActive ? "Deactivate category" : "Activate category"}
    >
          {togglingCategoryId === cat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
        </button>
        <button
      onClick={() => handleOpenEdit(cat)}
      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#252830] transition-all cursor-pointer"
      title="Edit category"
    >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
      onClick={() => handleDeleteWithWarning(cat)}
      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-[#252830] transition-all cursor-pointer"
      title="Delete category"
    >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>;
  };
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {
    /* Header */
  }
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 font-['Outfit',sans-serif]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F]">
              <Layers className="w-5 h-5" />
            </span>
            <span>Menu Categories</span>
          </h2>
          <p className="mt-1.5 text-[13px] text-neutral-400 max-w-xl">
            Track catalog health, reorder collections, and control what customers see on the storefront.
          </p>
        </div>

        <button
    onClick={handleOpenAdd}
    title="Add a category"
    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] !text-white text-sm font-bold transition-all shadow-md shadow-[#FF5A1F]/20 shrink-0 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
  >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {
    /* Stats cards */
  }
      {loading ? <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((n) => <div key={n} className="rounded-2xl border border-[#292D35] bg-[#191B20] p-4 sm:p-5 space-y-3">
              <SkeletonPulse className="h-3 w-24" />
              <SkeletonPulse className="h-8 w-16" />
              <SkeletonPulse className="h-3 w-32" />
            </div>)}
        </div> : <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[
    {
      label: "Total Categories",
      value: stats.total,
      hint: "Click to show all",
      icon: FolderOpen,
      tone: "text-[#FF5A1F] bg-[#FF5A1F]/10",
      filter: "all"
    },
    {
      label: "Active",
      value: stats.active,
      hint: `${stats.activePct}% visible online`,
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
      filter: "inactive"
    },
    {
      label: "Linked Products",
      value: stats.totalProducts,
      hint: `${stats.emptyCategories} empty categories`,
      icon: Package,
      tone: "text-sky-400 bg-sky-500/10",
      filter: null
    }
  ].map((card) => {
    const Icon = card.icon;
    const isSelected = card.filter !== null && statusFilter === card.filter;
    return <button
      key={card.label}
      type="button"
      disabled={card.filter === null}
      onClick={() => {
        if (card.filter === null) return;
        setStatusFilter((prev) => prev === card.filter ? "all" : card.filter);
      }}
      className={`text-left rounded-2xl border p-4 sm:p-5 transition-all ${card.filter === null ? "cursor-default" : "cursor-pointer hover:border-[#3A404A]"} ${isSelected ? "border-[#FF5A1F]/50 bg-[#FF5A1F]/10" : "border-[#292D35] bg-[#191B20]"}`}
    >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-neutral-500">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
                      {card.value}
                    </p>
                    <p className="mt-1 text-[12px] text-neutral-500">{card.hint}</p>
                  </div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                </div>
              </button>;
  })}
        </div>}

      {
    /* Charts row */
  }
      {loading ? <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-[#292D35] bg-[#191B20] p-5 space-y-4">
            <SkeletonPulse className="h-4 w-28" />
            <SkeletonPulse className="h-3 w-40" />
            <div className="flex items-center gap-5 pt-2">
              <SkeletonPulse className="h-28 w-28 rounded-full" />
              <div className="flex-1 space-y-3">
                <SkeletonPulse className="h-10 w-full" />
                <SkeletonPulse className="h-10 w-full" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 rounded-2xl border border-[#292D35] bg-[#191B20] p-5 space-y-4">
            <SkeletonPulse className="h-4 w-40" />
            <SkeletonPulse className="h-3 w-52" />
            {[1, 2, 3, 4].map((n) => <div key={n} className="space-y-2">
                <SkeletonPulse className="h-3 w-1/2" />
                <SkeletonPulse className="h-2 w-full" />
              </div>)}
          </div>
        </div> : stats.total > 0 ? <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-[#292D35] bg-[#191B20] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white font-['Outfit',sans-serif]">Status Mix</h3>
              <p className="text-[12px] text-neutral-500 mt-0.5">Active vs blocked categories</p>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0 rounded-full" style={donutStyle}>
                <div className="absolute inset-[18px] rounded-full bg-[#191B20] flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white font-['Outfit',sans-serif]">
                    {stats.activePct}%
                  </span>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <button
    type="button"
    onClick={() => setStatusFilter((prev) => prev === "active" ? "all" : "active")}
    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border transition-colors cursor-pointer ${statusFilter === "active" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-[#14171C] border-[#292D35]/70 hover:border-[#3A404A]"}`}
  >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="text-[13px] text-neutral-300 font-medium">Active</span>
                  </div>
                  <span className="text-sm font-bold text-white">{stats.active}</span>
                </button>
                <button
    type="button"
    onClick={() => setStatusFilter((prev) => prev === "inactive" ? "all" : "inactive")}
    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border transition-colors cursor-pointer ${statusFilter === "inactive" ? "bg-red-500/10 border-red-500/30" : "bg-[#14171C] border-[#292D35]/70 hover:border-[#3A404A]"}`}
  >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="text-[13px] text-neutral-300 font-medium">Blocked</span>
                  </div>
                  <span className="text-sm font-bold text-white">{stats.blocked}</span>
                </button>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> {stats.withImage} with image
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> {stats.tagged} tagged
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-[#292D35] bg-[#191B20] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white font-['Outfit',sans-serif]">
                Products by Category
              </h3>
              <p className="text-[12px] text-neutral-500 mt-0.5">
                Top collections ranked by linked dishes
              </p>
            </div>

            <div className="space-y-3">
              {stats.topByProducts.map((row, index) => <div key={row.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-500 w-4">
                        {index + 1}.
                      </span>
                      <span className="truncate font-semibold text-neutral-200">{row.name}</span>
                      {!row.isActive ? <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-300 font-bold">
                          Blocked
                        </span> : null}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-white">
                      {row.count} items
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#101216] overflow-hidden border border-[#292D35]/60">
                    <div
    className="h-full rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF8A4C] transition-all duration-500"
    style={{
      width: `${Math.max(6, row.count / stats.maxProductCount * 100)}%`
    }}
  />
                  </div>
                </div>)}
            </div>
          </div>
        </div> : null}

      {
    /* Toolbar: search + status chips + view toggle */
  }
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
    type="search"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search categories, branch..."
    className="w-full bg-[#191B20] border border-[#292D35] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#FF5A1F] transition-colors"
  />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Blocked" }
  ].map((chip) => <button
    key={chip.id}
    type="button"
    onClick={() => setStatusFilter(chip.id)}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${statusFilter === chip.id ? "bg-[#FF5A1F] border-[#FF5A1F] !text-white" : "bg-[#191B20] border-[#292D35] text-neutral-400 hover:text-white"}`}
  >
              {chip.label}
            </button>)}

          <div className="ml-1 inline-flex rounded-xl border border-[#292D35] bg-[#191B20] p-1">
            <button
    type="button"
    onClick={() => setViewMode("cards")}
    title="Card view"
    className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === "cards" ? "bg-[#FF5A1F] !text-white" : "text-neutral-400 hover:text-white"}`}
  >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
    type="button"
    onClick={() => setViewMode("rows")}
    title="Row view"
    className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === "rows" ? "bg-[#FF5A1F] !text-white" : "text-neutral-400 hover:text-white"}`}
  >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {
    /* Category list */
  }
      {loading ? viewMode === "cards" ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <div key={n} className="rounded-2xl border border-[#292D35] bg-[#191B20] p-4 space-y-3">
                <SkeletonPulse className="aspect-video w-full" />
                <SkeletonPulse className="h-4 w-2/3" />
                <SkeletonPulse className="h-3 w-full" />
                <SkeletonPulse className="h-3 w-1/2" />
                <div className="flex justify-between pt-2">
                  <SkeletonPulse className="h-8 w-16" />
                  <SkeletonPulse className="h-8 w-24" />
                </div>
              </div>)}
          </div> : <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((n) => <div
    key={n}
    className="rounded-2xl border border-[#292D35] bg-[#191B20] p-3 flex items-center gap-3"
  >
                <SkeletonPulse className="h-14 w-20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonPulse className="h-4 w-40" />
                  <SkeletonPulse className="h-3 w-64 max-w-full" />
                </div>
                <SkeletonPulse className="h-8 w-28" />
              </div>)}
          </div> : visibleCategories.length === 0 ? <div className="rounded-2xl border border-dashed border-[#292D35] bg-[#191B20]/60 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-neutral-300">No categories yet</p>
          <p className="mt-1 text-xs text-neutral-500">
            Click &quot;Add New Category&quot; to create your first collection.
          </p>
        </div> : filteredCategories.length === 0 ? <div className="rounded-2xl border border-dashed border-[#292D35] bg-[#191B20]/60 py-14 text-center">
          <p className="text-sm font-semibold text-neutral-300">No matching categories</p>
          <p className="mt-1 text-xs text-neutral-500">
            Try another search or clear the active/blocked filter.
          </p>
        </div> : viewMode === "cards" ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => {
    const itemCount = products.filter((p) => p.category === cat.id).length;
    const isCategoryActive = cat.isActive !== false;
    const postedOn = formatCategoryDate(cat.createdAt || cat.updatedAt);
    const branchLabel = cat.showAllBranches ? "All Branches" : categoryBranchName(cat) || "—";
    return <div
      key={cat.id}
      className={`bg-[#191B20] border rounded-2xl p-4 flex flex-col justify-between transition-all group ${isCategoryActive ? "border-[#292D35] hover:border-[#FF5A1F]/40" : "border-[#292D35]/50 opacity-70"}`}
    >
                <div>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-[#101216] mb-3">
                    {cat.image ? <img
      src={cat.image}
      alt={cat.name}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    /> : <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <ImageIcon className="w-8 h-8" />
                      </div>}
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/70 backdrop-blur-xs flex items-center justify-center text-lg">
                      {cat.icon || "🍽️"}
                    </div>
                    <span
      className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${isCategoryActive ? "bg-emerald-500 !text-white" : "bg-neutral-800 text-neutral-400"}`}
    >
                      {isCategoryActive ? "Active" : "Blocked"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-white text-[15px] group-hover:text-[#FF5A1F] transition-colors font-['Outfit',sans-serif] truncate">
                      {cat.name}
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#101216] border border-[#292D35] text-neutral-300 shrink-0">
                      {itemCount} items
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {cat.description || `Browse our signature selection of fresh ${cat.name}.`}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#14171C] border border-[#292D35] px-2 py-1 text-neutral-400">
                      <CalendarDays className="w-3 h-3 text-[#FF5A1F]" />
                      {postedOn}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#14171C] border border-[#292D35] px-2 py-1 text-neutral-400 max-w-full">
                      <MapPin className="w-3 h-3 text-[#FF5A1F] shrink-0" />
                      <span className="truncate">{branchLabel}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end mt-4 pt-3 border-t border-[#292D35]/60">
                  {renderCategoryActions(cat)}
                </div>
              </div>;
  })}
        </div> : <div className="space-y-2">
          {filteredCategories.map((cat) => {
    const itemCount = products.filter((p) => p.category === cat.id).length;
    const isCategoryActive = cat.isActive !== false;
    const postedOn = formatCategoryDate(cat.createdAt || cat.updatedAt);
    const branchLabel = cat.showAllBranches ? "All Branches" : categoryBranchName(cat) || "—";
    return <div
      key={cat.id}
      className={`rounded-2xl border bg-[#191B20] p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${isCategoryActive ? "border-[#292D35] hover:border-[#FF5A1F]/35" : "border-[#292D35]/50 opacity-70"}`}
    >
                <div className="relative h-16 w-full sm:w-24 shrink-0 overflow-hidden rounded-xl bg-[#101216]">
                  {cat.image ? <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-neutral-600">
                      <ImageIcon className="w-5 h-5" />
                    </div>}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white text-[15px] font-['Outfit',sans-serif] truncate">
                      {cat.name}
                    </h3>
                    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCategoryActive ? "bg-emerald-500/15 text-emerald-300" : "bg-neutral-800 text-neutral-400"}`}
    >
                      {isCategoryActive ? "Active" : "Blocked"}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#101216] border border-[#292D35] text-neutral-300">
                      {itemCount} items
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                    {cat.description || "No description"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-[#FF5A1F]" />
                      {postedOn}
                    </span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-[#FF5A1F] shrink-0" />
                      <span className="truncate">{branchLabel}</span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 sm:pl-2">{renderCategoryActions(cat)}</div>
              </div>;
  })}
        </div>}

      {
    /* Create / Edit modal */
  }
      {isModalOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B20] border border-[#292D35] rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#292D35] bg-[#14171C]">
              <div>
                <h3 className="text-base font-black text-white font-['Outfit',sans-serif]">
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </h3>
                <p className="text-[12px] text-neutral-500 mt-0.5">
                  {editingCategory ? "Update banner, visibility, and display order." : "Create a browsable collection for your menu."}
                </p>
              </div>
              <button
    onClick={() => setIsModalOpen(false)}
    title="Close category form"
    className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-[#252830] cursor-pointer transition-all"
  >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm p-6 overflow-y-auto">
              <div>
                <label className="block text-neutral-300 font-bold mb-1.5 text-[12px]">
                  Category Name *
                </label>
                <input
    type="text"
    required
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    placeholder="e.g. Gourmet Burgers"
    className={inputClass}
  />
              </div>

              <CatalogImageField
    label="Banner Image"
    imageUrl={formData.image}
    showUrlInput={false}
    onImageChange={(url) => setFormData({ ...formData, image: url })}
    uploadType="category"
    frontendDomainUrl={frontendDomainUrl}
    onError={(message) => addToast("Upload Failed", message, "error")}
  />

              <div>
                <label className="block text-neutral-300 font-bold mb-1.5 text-[12px]">
                  Description
                </label>
                <textarea
    rows={3}
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    placeholder="Category description for customer store..."
    className={`${inputClass} resize-none`}
  />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1.5 text-[12px]">
                  Sort Order *
                </label>
                <input
    type="number"
    required
    min={1}
    step={1}
    value={formData.sort}
    onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}
    className={inputClass}
  />
              </div>

              <fieldset className="space-y-2">
                <legend className="block text-neutral-300 font-bold text-[12px]">Tags</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-[#292D35] bg-[#101216] px-3 py-2.5 hover:border-[#3A404A] transition-colors">
                    <input
    type="radio"
    name="category-tag"
    checked={formData.tags.length === 0}
    onChange={() => setFormData((current) => ({ ...current, tags: [] }))}
    className="border-[#292D35] text-[#FF5A1F]"
  />
                    <span className="text-neutral-300 font-semibold text-[12px]">No tag</span>
                  </label>
                  {CATEGORY_TAGS.map((tag) => <label
    key={tag.key}
    className={`flex items-center gap-2 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors ${formData.tags[0] === tag.key ? "border-[#FF5A1F]/50 bg-[#FF5A1F]/10" : "border-[#292D35] bg-[#101216] hover:border-[#3A404A]"}`}
  >
                      <input
    type="radio"
    name="category-tag"
    checked={formData.tags[0] === tag.key}
    onChange={() => setFormData((current) => ({ ...current, tags: [tag.key] }))}
    className="border-[#292D35] text-[#FF5A1F]"
  />
                      <span className="text-neutral-300 font-semibold text-[12px]">{tag.label}</span>
                    </label>)}
                </div>
              </fieldset>

              <div className="space-y-2.5 rounded-2xl border border-[#292D35] bg-[#14171C] p-3.5">
                <p className="text-neutral-300 font-bold text-[12px]">Branch *</p>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="cat-all-branches-toggle"
                    checked={formData.showAllBranches}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        showAllBranches: e.target.checked,
                        branchName: e.target.checked
                          ? ""
                          : formData.branchName || branchName || liveBranches[0]?.name || ""
                      })
                    }
                    className="rounded border-[#292D35] text-[#FF5A1F]"
                  />
                  <span className="text-neutral-300 font-semibold text-[12px]">
                    Show this category in all branches
                  </span>
                </label>
                <select
                  disabled={formData.showAllBranches}
                  value={formData.showAllBranches ? "" : formData.branchName || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      showAllBranches: false,
                      branchName: e.target.value
                    })
                  }
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <option value="">Select branch…</option>
                  {liveBranches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                      {b.branchCode || b.shortName ? ` (${b.branchCode || b.shortName})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500">
                  {formData.showAllBranches
                    ? "Category will appear across every branch."
                    : "Choose the branch where this category should appear."}
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-[#292D35]">
                  <input
                    type="checkbox"
                    id="cat-active-toggle"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-[#292D35] text-[#FF5A1F]"
                  />
                  <span className="text-neutral-300 font-semibold text-[12px]">
                    Active & displayed on website
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#292D35]">
                <button
    type="button"
    onClick={() => setIsModalOpen(false)}
    className="px-4 py-2.5 rounded-xl bg-[#252830] text-neutral-300 hover:text-white font-bold transition-all cursor-pointer text-sm"
  >
                  Cancel
                </button>

                <button
    type="submit"
    disabled={saving}
    className="px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] !text-white font-extrabold shadow-md shadow-[#FF5A1F]/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 text-sm"
  >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>}

      {
    /* Delete modal */
  }
      {categoryToDelete && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#292D35] bg-[#191B20] p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-['Outfit',sans-serif]">
                  Delete category?
                </h3>
                <p className="mt-1.5 text-sm text-neutral-300 leading-relaxed">
                  You are about to remove{" "}
                  <span className="font-bold text-white">{categoryToDelete.name}</span> from the
                  menu catalog.
                </p>
                {products.some((product) => product.category === categoryToDelete.id) && <p className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    This category still has linked dishes. Deleting it may leave them
                    uncategorized.
                  </p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
    type="button"
    disabled={deleting}
    onClick={() => setCategoryToDelete(null)}
    className="rounded-xl bg-[#252830] px-4 py-2.5 text-sm font-bold text-neutral-300 transition-all hover:text-white disabled:opacity-50 cursor-pointer"
  >
                Cancel
              </button>
              <button
    type="button"
    disabled={deleting}
    onClick={handleConfirmDelete}
    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold !text-white transition-all hover:bg-red-500 disabled:opacity-50 cursor-pointer"
  >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Category
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
export {
  CategoriesPage
};
