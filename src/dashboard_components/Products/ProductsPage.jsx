import { useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { CatalogImageField } from '@/dashboard_components/Layout/CatalogImageField';
import {
  apiMessage,
  CATALOG_TAGS,
  createProduct,
  deleteProduct as deleteCatalogProduct,
  getCategories,
  getFrontendDomainUrl,
  getProducts,
  updateProduct as updateCatalogProduct
} from '@/shared/lib/catalogApi';
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  Flame,
  FolderOpen,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Package,
  PackageX,
  Percent,
  Plus,
  Power,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UtensilsCrossed,
  Wallet,
  X
} from "lucide-react";

const ALL_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const INPUT =
  "mt-1.5 w-full rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-input,#101216)] px-3.5 py-2.5 text-sm text-[var(--admin-text,#fff)] placeholder:text-[var(--admin-faint,#737373)] transition-colors focus:outline-none focus:border-[var(--color-admin-accent,#FF5A1F)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)]";

const SURFACE =
  "rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14161B)]";

const emptyForm = {
  name: "",
  sku: "",
  sort: "1",
  description: "",
  category: "",
  image: "",
  costPrice: "",
  sellingPrice: "",
  discountPrice: "",
  tax: "5",
  stockQuantity: "100",
  calories: "520",
  preparationTime: "15",
  recipe: "",
  notes: "",
  allergens: "",
  availableFrom: "10:00",
  availableTo: "23:00",
  availableDays: [...ALL_DAYS],
  availabilityStatus: "available",
  tags: [],
  isActive: true,
  variantName: "Regular",
  variantSize: "Regular",
  variantPortion: "1",
  variantSku: "",
  addonName: "",
  addonPrice: "",
  addonMaxQuantity: "",
  ingredientName: "",
  ingredientQty: "1",
  ingredientUnit: "pc"
};

function SkeletonPulse({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--admin-hover,#1A1D24)] ${className}`}
    />
  );
}

function isProductActive(product) {
  return product.isActive !== false;
}

function isOutOfStock(product) {
  return (
    product.availabilityStatus === "out_of_stock" ||
    product.availabilityStatus === "unavailable" ||
    product.inStock === false ||
    (typeof product.stockQuantity === "number" && product.stockQuantity <= 0)
  );
}

function marginPct(product) {
  const sell = Number(product.discountPrice > 0 ? product.discountPrice : product.sellingPrice || product.price) || 0;
  const cost = Number(product.costPrice) || 0;
  if (sell <= 0) return 0;
  return Math.round(((sell - cost) / sell) * 100);
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

function MetaChip({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0D0F12)] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-faint,#737373)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-bold text-[var(--admin-text,#fff)]" title={String(value ?? "—")}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2 border-b border-[var(--admin-border,#292D35)] last:border-0">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
        {label}
      </span>
      <div className="min-w-0 text-sm text-[var(--admin-muted,#D4D4D4)] sm:text-right break-words">
        {children}
      </div>
    </div>
  );
}

const ProductsPage = () => {
  const {
    products,
    setProducts,
    categories,
    setCategories,
    formatPrice,
    popularMealIds,
    togglePopularMeal,
    addToast,
    adminTheme
  } = useRestaurant();
  const { primaryBranchId, liveBranches, isAllBranches } = useBranchScope();
  const branchName =
    liveBranches.find((b) => b.id === primaryBranchId)?.name ||
    liveBranches[0]?.name ||
    "";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards");
  const [expandedId, setExpandedId] = useState("");
  const [detailProduct, setDetailProduct] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorStep, setEditorStep] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [togglingProductId, setTogglingProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiMeta, setApiMeta] = useState({
    count: null,
    branch: null,
    frontendDomainUrl: "",
    message: "",
    success: false
  });
  const loadingRef = useRef(false);
  const editorTopRef = useRef(null);
  const [formData, setFormData] = useState(emptyForm);
  const [variants, setVariants] = useState([]);
  const [addons, setAddons] = useState([]);
  const [ingredients, setIngredients] = useState([]);

  const EDITOR_STEPS = [
    { id: 0, label: "Basics", hint: "Name, category & photo" },
    { id: 1, label: "Pricing", hint: "Cost, stock & tags" },
    { id: 2, label: "Schedule", hint: "Days & availability" },
    { id: 3, label: "Extras", hint: "Variants & addons" }
  ];

  const scrollEditorTop = () => {
    requestAnimationFrame(() => {
      editorTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeEditor = () => {
    if (saving) return;
    setIsEditorOpen(false);
    setEditingProduct(null);
    setEditorStep(0);
  };

  const loadCatalog = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const domain = getFrontendDomainUrl();
      const params = {
        frontendDomainUrl: domain,
        ...(branchName && !isAllBranches ? { branchName } : {})
      };
      const [cats, prods] = await Promise.all([getCategories(params), getProducts(params)]);
      if (cats.ok) {
        setCategories(cats.categories);
      } else {
        addToast("Load Failed", apiMessage(cats.data, "Categories could not be loaded."), "error");
      }
      if (prods.ok) {
        setProducts(prods.products);
        setApiMeta({
          count: typeof prods.count === "number" ? prods.count : prods.products.length,
          branch: prods.branch ?? null,
          frontendDomainUrl: prods.frontendDomainUrl || domain,
          message: prods.message || "Products fetched successfully",
          success: prods.success !== false
        });
      } else {
        addToast("Load Failed", apiMessage(prods.data, "Products could not be loaded."), "error");
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [branchName, isAllBranches]);

  const productRows = products;

  const stats = useMemo(() => {
    const total = productRows.length;
    let active = 0;
    let blocked = 0;
    let oos = 0;
    let popular = 0;
    let featured = 0;
    let marginSum = 0;
    let stockSum = 0;
    for (const product of productRows) {
      if (isProductActive(product)) active += 1;
      else blocked += 1;
      if (isOutOfStock(product)) oos += 1;
      if (popularMealIds.includes(product.id) || product.isPopular || product.tags?.includes("popular")) {
        popular += 1;
      }
      if (product.isFeatured || product.tags?.includes("featured")) featured += 1;
      marginSum += marginPct(product);
      stockSum += Number(product.stockQuantity) || 0;
    }
    const activePct = total ? Math.round((active / total) * 100) : 0;
    const avgMargin = total ? Math.round(marginSum / total) : 0;
    return {
      total,
      active,
      blocked,
      oos,
      popular,
      featured,
      activePct,
      avgMargin,
      stockSum,
      categories: categories.length
    };
  }, [productRows, popularMealIds, categories.length]);

  const filteredProducts = useMemo(() => {
    return productRows.filter((p) => {
      const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.merchantId || "").toLowerCase().includes(q) ||
        (p.branchName || "").toLowerCase().includes(q);
      if (!matchesCategory || !matchesSearch) return false;
      if (statusFilter === "active") return isProductActive(p);
      if (statusFilter === "blocked") return !isProductActive(p);
      if (statusFilter === "oos") return isOutOfStock(p);
      if (statusFilter === "popular") {
        return popularMealIds.includes(p.id) || !!p.isPopular || !!p.tags?.includes("popular");
      }
      return true;
    });
  }, [productRows, selectedCategory, searchQuery, statusFilter, popularMealIds]);

  const categoryBars = useMemo(() => {
    const counts = new Map();
    for (const product of productRows) {
      const cat = categories.find((c) => c.id === product.category);
      const label = cat?.name || "Uncategorized";
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const max = Math.max(...rows.map((row) => row.value), 1);
    return { rows, max };
  }, [productRows, categories]);

  const stockBars = useMemo(() => {
    const available = productRows.filter(
      (p) => (p.availabilityStatus || "available") === "available" && !isOutOfStock(p)
    ).length;
    const unavailable = productRows.filter((p) => p.availabilityStatus === "unavailable").length;
    const out = productRows.filter(
      (p) => p.availabilityStatus === "out_of_stock" || isOutOfStock(p)
    ).length;
    const rows = [
      { label: "Available", value: available, color: "from-emerald-700 via-emerald-500 to-emerald-300" },
      { label: "Unavailable", value: unavailable, color: "from-amber-700 via-amber-500 to-amber-300" },
      { label: "Out of stock", value: out, color: "from-red-700 via-red-500 to-red-300" }
    ];
    const max = Math.max(...rows.map((r) => r.value), 1);
    return { rows, max };
  }, [productRows]);

  const marginBars = useMemo(() => {
    const rows = productRows
      .map((p) => ({
        label: p.name || "Item",
        value: Math.max(0, marginPct(p)),
        stock: Number(p.stockQuantity) || 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const max = Math.max(...rows.map((r) => r.value), 1);
    return { rows, max };
  }, [productRows]);

  const priceBands = useMemo(() => {
    const bands = [
      { label: "< 300", min: 0, max: 300, value: 0 },
      { label: "300–600", min: 300, max: 600, value: 0 },
      { label: "600–1000", min: 600, max: 1000, value: 0 },
      { label: "1000+", min: 1000, max: Infinity, value: 0 }
    ];
    for (const p of productRows) {
      const price = Number(p.discountPrice > 0 ? p.discountPrice : p.sellingPrice || p.price) || 0;
      const band = bands.find((b) => price >= b.min && price < b.max);
      if (band) band.value += 1;
    }
    const max = Math.max(...bands.map((b) => b.value), 1);
    return { bands, max };
  }, [productRows]);

  const donutStyle = useMemo(() => {
    const total = Math.max(stats.total, 1);
    const activeDeg = (stats.active / total) * 360;
    const blockedDeg = (stats.blocked / total) * 360;
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
      background: `conic-gradient(${[segment(activeDeg, "#34d399"), segment(blockedDeg, "#f87171")].join(", ")})`
    };
  }, [stats]);

  const chipClass = (active) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
      active
        ? "bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] border-[var(--color-admin-accent,#FF5A1F)] text-[var(--color-admin-accent,#FF5A1F)]"
        : "bg-[var(--admin-surface,#0D0F12)] border-[var(--admin-border,#2A2F38)] text-[var(--admin-subtle,#A3A3A3)] hover:border-[var(--admin-hover,#1A1D24)] hover:text-[var(--admin-text,#fff)]"
    }`;

  const buildPayload = () => {
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const discountPrice = parseFloat(formData.discountPrice) || 0;
    const finalVariants =
      variants.length > 0
        ? variants
        : [
            {
              name: formData.variantName || "Regular",
              size: formData.variantSize || "Regular",
              portion: formData.variantPortion || "1",
              price: sellingPrice,
              sku: formData.variantSku || `${formData.sku || "SKU"}-R`
            }
          ];
    return {
      frontendDomainUrl: getFrontendDomainUrl(),
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      categoryId: formData.category,
      description: formData.description.trim(),
      branchName: editingProduct?.branchName || branchName,
      image: formData.image.trim(),
      tags: formData.tags,
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice,
      discountPrice,
      tax: parseFloat(formData.tax) || 0,
      variants: finalVariants,
      addons,
      availabilityStatus: formData.availabilityStatus || "available",
      availableDays: formData.availableDays,
      availableFrom: formData.availableFrom || "10:00",
      availableTo: formData.availableTo || "23:00",
      ingredients,
      stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
      recipe: formData.recipe.trim(),
      calories: parseInt(formData.calories, 10) || 0,
      allergens: formData.allergens
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      preparationTime: parseInt(formData.preparationTime, 10) || 15,
      notes: formData.notes.trim(),
      isFeatured: formData.tags.includes("featured"),
      isActive: formData.isActive,
      sort: parseInt(formData.sort, 10) || products.length + 1
    };
  };

  const handleOpenAdd = () => {
    if (categories.length === 0) {
      addToast("Category Required", "Add a category first, then create a product.", "error");
      return;
    }
    setFormData({
      ...emptyForm,
      sort: String(products.length + 1),
      category: categories[0]?.id || ""
    });
    setVariants([]);
    setAddons([]);
    setIngredients([]);
    setEditingProduct(null);
    setEditorStep(0);
    setIsEditorOpen(true);
    scrollEditorTop();
  };

  const handleOpenEdit = (p) => {
    setFormData({
      ...emptyForm,
      name: p.name,
      sku: p.sku || "",
      sort: String(p.sort ?? 1),
      description: p.description || "",
      category: p.category,
      image: p.image || "",
      costPrice: String(p.costPrice ?? ""),
      sellingPrice: String(p.sellingPrice ?? p.originalPrice ?? p.price ?? ""),
      discountPrice: String(p.discountPrice ?? ""),
      tax: String(p.tax ?? 5),
      stockQuantity: String(p.stockQuantity ?? 100),
      calories: String(p.calories ?? 520),
      preparationTime: String(p.preparationTime ?? 15),
      recipe: p.recipe || "",
      notes: p.notes || "",
      allergens: (p.allergens || []).join(", "),
      availableFrom: p.availableFrom || "10:00",
      availableTo: p.availableTo || "23:00",
      availableDays: p.availableDays?.length ? p.availableDays : [...ALL_DAYS],
      availabilityStatus: p.availabilityStatus || "available",
      tags: [
        ...new Set([
          ...(p.tags || []),
          ...(p.isFeatured ? ["featured"] : []),
          ...(popularMealIds.includes(p.id) || p.isPopular ? ["popular"] : [])
        ])
      ],
      isActive: p.isActive !== false
    });
    setVariants(p.variants || []);
    setAddons(p.addons || []);
    setIngredients(p.ingredients || []);
    setEditingProduct(p);
    setEditorStep(0);
    setIsEditorOpen(true);
    setDetailProduct(null);
    scrollEditorTop();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const requiredBasics = [formData.name, formData.sku, formData.category, formData.description];
    if (requiredBasics.some((value) => !value.trim()) || !formData.image.trim()) {
      setEditorStep(0);
      addToast("Validation Error", "Complete basics and upload a product photo.", "error");
      return;
    }
    const requiredPricing = [
      formData.costPrice,
      formData.sellingPrice,
      formData.discountPrice,
      formData.tax,
      formData.stockQuantity,
      formData.calories,
      formData.preparationTime,
      formData.sort
    ];
    if (requiredPricing.some((value) => !String(value).trim())) {
      setEditorStep(1);
      addToast("Validation Error", "Complete pricing and stock fields.", "error");
      return;
    }
    if (
      !formData.availableFrom.trim() ||
      !formData.availableTo.trim() ||
      !formData.recipe.trim() ||
      !formData.notes.trim()
    ) {
      setEditorStep(2);
      addToast("Validation Error", "Complete availability, recipe, and notes.", "error");
      return;
    }
    if (!(editingProduct?.branchName || branchName)) {
      addToast("Branch Required", "Select a branch before saving a product.", "error");
      return;
    }
    if (formData.availableDays.length === 0) {
      setEditorStep(2);
      addToast("Availability Required", "Select at least one day for product availability.", "error");
      return;
    }
    setSaving(true);
    const payload = buildPayload();
    const result = editingProduct
      ? await updateCatalogProduct(editingProduct.id, payload)
      : await createProduct(payload);
    setSaving(false);
    if (!result.ok) {
      addToast("Save Failed", apiMessage(result.data, "Product could not be saved."), "error");
      return;
    }
    await loadCatalog();
    if (editingProduct) {
      if (formData.tags.includes("popular") && !popularMealIds.includes(editingProduct.id)) {
        togglePopularMeal(editingProduct.id);
      } else if (!formData.tags.includes("popular") && popularMealIds.includes(editingProduct.id)) {
        togglePopularMeal(editingProduct.id);
      }
      addToast("Product Updated", `${formData.name} updated successfully.`, "success");
    } else {
      addToast("Product Added", `${formData.name} added to menu.`, "success");
    }
    setIsEditorOpen(false);
    setEditingProduct(null);
    setEditorStep(0);
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
  };

  const handleToggleProductActive = async (product) => {
    if (togglingProductId) return;
    setTogglingProductId(product.id);
    const payload = {
      frontendDomainUrl: getFrontendDomainUrl(),
      name: product.name,
      sku: product.sku || "",
      categoryId: product.category,
      description: product.description || "",
      branchName: product.branchName || branchName,
      image: product.image || "",
      tags: product.tags || [],
      costPrice: product.costPrice || 0,
      sellingPrice: product.sellingPrice ?? product.price,
      discountPrice: product.discountPrice || 0,
      tax: product.tax || 0,
      variants: product.variants || [],
      addons: product.addons || [],
      availabilityStatus: product.availabilityStatus || "available",
      availableDays: product.availableDays || [...ALL_DAYS],
      availableFrom: product.availableFrom || "10:00",
      availableTo: product.availableTo || "23:00",
      ingredients: product.ingredients || [],
      stockQuantity: product.stockQuantity || 0,
      recipe: product.recipe || "",
      calories: typeof product.calories === "number" ? product.calories : Number(product.calories) || 0,
      allergens: product.allergens || [],
      preparationTime: product.preparationTime || 15,
      notes: product.notes || "",
      isFeatured: product.isFeatured || false,
      isActive: product.isActive === false,
      sort: product.sort || 1
    };
    const result = await updateCatalogProduct(product.id, payload);
    setTogglingProductId("");
    if (!result.ok) {
      addToast("Update Failed", apiMessage(result.data, "Product status could not be updated."), "error");
      return;
    }
    await loadCatalog();
    addToast(
      product.isActive === false ? "Product Activated" : "Product Deactivated",
      `${product.name} is now ${product.isActive === false ? "active" : "inactive"}.`,
      "success"
    );
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete || deleting) return;
    setDeleting(true);
    const result = await deleteCatalogProduct(productToDelete.id, getFrontendDomainUrl());
    setDeleting(false);
    if (!result.ok) {
      addToast("Delete Failed", apiMessage(result.data, "Product could not be deleted."), "error");
      return;
    }
    await loadCatalog();
    addToast("Product Deleted", `${productToDelete.name} removed.`, "info");
    setProductToDelete(null);
    if (detailProduct?.id === productToDelete.id) setDetailProduct(null);
  };

  const addVariant = () => {
    const price = parseFloat(formData.sellingPrice) || 0;
    if (!formData.variantName.trim()) return;
    setVariants((prev) => [
      ...prev,
      {
        name: formData.variantName.trim(),
        size: formData.variantSize.trim() || formData.variantName.trim(),
        portion: formData.variantPortion.trim() || "1",
        price,
        sku: formData.variantSku.trim() || `${formData.sku || "SKU"}-${prev.length + 1}`
      }
    ]);
    setFormData((prev) => ({
      ...prev,
      variantName: "",
      variantSize: "",
      variantPortion: "1",
      variantSku: ""
    }));
  };

  const addAddon = () => {
    if (!formData.addonName.trim()) return;
    setAddons((prev) => [
      ...prev,
      {
        name: formData.addonName.trim(),
        price: parseFloat(formData.addonPrice) || 0,
        ...(parseInt(formData.addonMaxQuantity, 10) > 0
          ? { maxQuantity: parseInt(formData.addonMaxQuantity, 10) }
          : {})
      }
    ]);
    setFormData((prev) => ({ ...prev, addonName: "", addonPrice: "", addonMaxQuantity: "" }));
  };

  const addIngredient = () => {
    if (!formData.ingredientName.trim()) return;
    setIngredients((prev) => [
      ...prev,
      {
        name: formData.ingredientName.trim(),
        quantity: parseFloat(formData.ingredientQty) || 1,
        unit: formData.ingredientUnit.trim() || "pc"
      }
    ]);
    setFormData((prev) => ({
      ...prev,
      ingredientName: "",
      ingredientQty: "1",
      ingredientUnit: "pc"
    }));
  };

  const previewCategory = categories.find((c) => c.id === formData.category)?.name || "Select category";
  const previewPrice = parseFloat(formData.sellingPrice) || 0;
  const previewDiscount = parseFloat(formData.discountPrice) || 0;
  const isLight = adminTheme === "light";

  const renderProductDetailBody = (product) => {
    const categoryObj = categories.find((c) => c.id === product.category);
    const sell = Number(product.discountPrice > 0 ? product.discountPrice : product.sellingPrice || product.price) || 0;
    return (
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-x-6">
          <FieldRow label="Product ID">{product.id || "—"}</FieldRow>
          <FieldRow label="Merchant ID">{product.merchantId || "—"}</FieldRow>
          <FieldRow label="SKU">{product.sku || "—"}</FieldRow>
          <FieldRow label="Sort">{product.sort ?? "—"}</FieldRow>
          <FieldRow label="Category">{categoryObj?.name || product.category || "—"}</FieldRow>
          <FieldRow label="Branch">{product.branchName || apiMeta.branch || branchName || "All / null"}</FieldRow>
          <FieldRow label="Active">{isProductActive(product) ? "Yes" : "No"}</FieldRow>
          <FieldRow label="Featured">{product.isFeatured ? "Yes" : "No"}</FieldRow>
          <FieldRow label="Availability">{product.availabilityStatus || "—"}</FieldRow>
          <FieldRow label="In stock">{product.inStock === false ? "No" : "Yes"}</FieldRow>
          <FieldRow label="Created">{formatShortDate(product.createdAt)}</FieldRow>
          <FieldRow label="Updated">{formatShortDate(product.updatedAt)}</FieldRow>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Description
          </p>
          <p className="text-sm text-[var(--admin-muted,#D4D4D4)]">
            {product.description || "—"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetaChip label="Cost" value={formatPrice(product.costPrice || 0)} />
          <MetaChip label="Selling" value={formatPrice(product.sellingPrice || product.price || 0)} />
          <MetaChip label="Discount" value={formatPrice(product.discountPrice || 0)} />
          <MetaChip label="Tax %" value={`${product.tax ?? 0}%`} />
          <MetaChip label="Stock" value={product.stockQuantity ?? 0} />
          <MetaChip label="Calories" value={product.calories ?? "—"} />
          <MetaChip label="Prep (min)" value={product.preparationTime ?? "—"} />
          <MetaChip label="Margin" value={`${marginPct(product)}%`} />
          <MetaChip label="Live price" value={formatPrice(sell)} />
          <MetaChip label="Rating" value={product.rating ?? "—"} />
          <MetaChip label="Reviews" value={product.reviewsCount ?? 0} />
          <MetaChip
            label="Window"
            value={
              product.availableFrom || product.availableTo
                ? `${product.availableFrom || "—"} – ${product.availableTo || "—"}`
                : "—"
            }
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(product.tags || []).length === 0 ? (
              <span className="text-xs text-[var(--admin-faint,#737373)]">None</span>
            ) : (
              (product.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0D0F12)] px-2 py-1 text-[11px] font-bold text-[var(--admin-muted,#D4D4D4)]"
                >
                  <Tag className="h-3 w-3 text-[var(--color-admin-accent,#FF5A1F)]" />
                  {tag}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
            Available days
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(product.availableDays || []).length === 0 ? (
              <span className="text-xs text-[var(--admin-faint,#737373)]">—</span>
            ) : (
              (product.availableDays || []).map((day) => (
                <span
                  key={day}
                  className="rounded-md bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)] px-2 py-1 text-[10px] font-bold capitalize text-[var(--color-admin-accent,#FF5A1F)]"
                >
                  {String(day).slice(0, 3)}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className={`${SURFACE} p-3`}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Allergens
            </p>
            <p className="text-sm text-[var(--admin-muted,#D4D4D4)]">
              {(product.allergens || []).join(", ") || "None listed"}
            </p>
          </div>
          <div className={`${SURFACE} p-3`}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Recipe
            </p>
            <p className="text-sm text-[var(--admin-muted,#D4D4D4)]">{product.recipe || "—"}</p>
          </div>
          <div className={`${SURFACE} p-3 sm:col-span-2`}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Notes
            </p>
            <p className="text-sm text-[var(--admin-muted,#D4D4D4)]">{product.notes || "—"}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className={`${SURFACE} p-3`}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Variants ({(product.variants || []).length})
            </p>
            {(product.variants || []).length === 0 ? (
              <p className="text-xs text-[var(--admin-faint,#737373)]">None</p>
            ) : (
              <ul className="space-y-1.5">
                {(product.variants || []).map((v, i) => (
                  <li key={`${v.sku || v.name}-${i}`} className="text-xs text-[var(--admin-muted,#D4D4D4)]">
                    <span className="font-bold text-[var(--admin-text,#fff)]">{v.name}</span>
                    {v.size ? ` · ${v.size}` : ""}
                    {v.portion ? ` · x${v.portion}` : ""}
                    {" — "}
                    {formatPrice(v.price || 0)}
                    {v.sku ? ` · ${v.sku}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${SURFACE} p-3`}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Addons ({(product.addons || []).length})
            </p>
            {(product.addons || []).length === 0 ? (
              <p className="text-xs text-[var(--admin-faint,#737373)]">None</p>
            ) : (
              <ul className="space-y-1.5">
                {(product.addons || []).map((a, i) => (
                  <li key={`${a.name}-${i}`} className="text-xs text-[var(--admin-muted,#D4D4D4)]">
                    <span className="font-bold text-[var(--admin-text,#fff)]">{a.name}</span>
                    {" — "}
                    {formatPrice(a.price || 0)}
                    {a.maxQuantity ? ` · max ${a.maxQuantity}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${SURFACE} p-3`}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Ingredients ({(product.ingredients || []).length})
            </p>
            {(product.ingredients || []).length === 0 ? (
              <p className="text-xs text-[var(--admin-faint,#737373)]">None</p>
            ) : (
              <ul className="space-y-1.5">
                {(product.ingredients || []).map((ing, i) => (
                  <li key={`${ing.name}-${i}`} className="text-xs text-[var(--admin-muted,#D4D4D4)]">
                    <span className="font-bold text-[var(--admin-text,#fff)]">{ing.name}</span>
                    {" — "}
                    {ing.quantity} {ing.unit}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {product.image ? (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
              Image URL
            </p>
            <p className="break-all text-[11px] text-[var(--admin-subtle,#A3A3A3)]">{product.image}</p>
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-lg space-y-3">
            <div className="flex items-center gap-2.5">
              <SkeletonPulse className="h-10 w-10 rounded-xl" />
              <SkeletonPulse className="h-7 w-52" />
            </div>
            <SkeletonPulse className="h-4 w-full max-w-md" />
          </div>
          <SkeletonPulse className="h-11 w-40 rounded-xl" />
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className={`${SURFACE} space-y-4 p-5`}>
            <SkeletonPulse className="h-4 w-28" />
            <SkeletonPulse className="mx-auto h-36 w-36 rounded-full" />
          </div>
          <div className={`${SURFACE} space-y-4 p-5 xl:col-span-2`}>
            <SkeletonPulse className="h-4 w-40" />
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="space-y-2">
                <SkeletonPulse className="h-3 w-1/3" />
                <SkeletonPulse className="h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={editorTopRef}
      className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans',sans-serif]"
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
                title="Back to products"
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-elevated,#151920)] text-[var(--admin-muted,#D4D4D4)] transition-all hover:border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_50%,transparent)] hover:text-[var(--admin-text,#fff)] disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-['Outfit',sans-serif] text-xl font-black tracking-tight text-[var(--admin-text,#fff)] sm:text-2xl">
                    {editingProduct ? "Edit Product" : "New Product"}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                    <Sparkles className="h-3 w-3" />
                    Live preview
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--admin-subtle,#A3A3A3)] sm:text-sm">
                  Build the menu item step by step — category, pricing, schedule, then extras.
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
                form="product-editor-form"
                disabled={saving}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingProduct ? "Save Changes" : "Publish Product"}
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
                  className={`group flex min-w-[9rem] flex-1 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_60%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] to-transparent"
                      : done
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-[var(--admin-border,#2A2F38)] bg-[var(--admin-elevated,#14171C)] hover:border-[var(--admin-hover,#3A404C)]"
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <form
              id="product-editor-form"
              onSubmit={(event) => void handleSave(event)}
              className={`${SURFACE} space-y-5 p-4 sm:p-5`}
            >
              {editorStep === 0 && (
                <div className="animate-in fade-in space-y-4 duration-200">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)] sm:col-span-2">
                      Product Title *
                      <input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Chicken Burger"
                        className={INPUT}
                      />
                    </label>
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      SKU *
                      <input
                        required
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="CHK-BRG-01"
                        className={INPUT}
                      />
                    </label>
                    <div>
                      <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">Category *</p>
                      {categories.length === 0 ? (
                        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-300/90">
                          No categories yet. Create one on the Categories page first.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, category: c.id })}
                              className={chipClass(formData.category === c.id)}
                            >
                              {formData.category === c.id && <Check className="h-3 w-3" />}
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)] sm:col-span-2">
                      Description *
                      <textarea
                        required
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Crispy chicken burger with house sauce"
                        className={`${INPUT} min-h-[5rem] resize-y`}
                      />
                    </label>
                  </div>
                  <div className="rounded-xl border border-dashed border-[var(--admin-border,#343943)] bg-[var(--admin-surface,#0F1217)]/80 p-4">
                    <CatalogImageField
                      label="Food Image *"
                      imageUrl={formData.image}
                      showUrlInput={false}
                      onImageChange={(url) => setFormData({ ...formData, image: url })}
                      uploadType="product"
                      frontendDomainUrl={getFrontendDomainUrl()}
                      onError={(message) => addToast("Upload Failed", message, "error")}
                    />
                  </div>
                </div>
              )}

              {editorStep === 1 && (
                <div className="animate-in fade-in space-y-4 duration-200">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["costPrice", "Cost Price *", "250"],
                      ["sellingPrice", "Selling Price *", "499"],
                      ["discountPrice", "Discount Price *", "449"],
                      ["tax", "Tax % *", "5"],
                      ["stockQuantity", "Stock Qty *", "100"],
                      ["calories", "Calories *", "520"],
                      ["preparationTime", "Prep Time (mins) *", "15"],
                      ["sort", "Sort Order *", "1"]
                    ].map(([key, label, placeholder]) => (
                      <label key={key} className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                        {label}
                        <input
                          type="number"
                          required
                          min={key === "preparationTime" || key === "sort" ? 1 : 0}
                          value={formData[key]}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          placeholder={placeholder}
                          className={INPUT}
                        />
                      </label>
                    ))}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">Promo Tag</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData((current) => ({ ...current, tags: [] }))}
                        className={chipClass(formData.tags.length === 0)}
                      >
                        No tag
                      </button>
                      {CATALOG_TAGS.map((tag) => (
                        <button
                          key={tag.key}
                          type="button"
                          onClick={() => setFormData((current) => ({ ...current, tags: [tag.key] }))}
                          className={chipClass(formData.tags[0] === tag.key)}
                        >
                          {formData.tags[0] === tag.key && <Check className="h-3 w-3" />}
                          {tag.emoji} {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                      formData.isActive
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-[var(--admin-border,#2A2F38)] bg-[var(--admin-surface,#0F1217)]"
                    }`}
                  >
                    <Power
                      className={`mt-0.5 h-4 w-4 shrink-0 ${formData.isActive ? "text-emerald-400" : "text-[var(--admin-faint,#737373)]"}`}
                    />
                    <span>
                      <span className="block text-xs font-black text-[var(--admin-text,#fff)]">
                        {formData.isActive ? "Active on menu" : "Inactive / blocked"}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--admin-faint,#737373)]">
                        Toggle storefront visibility
                      </span>
                    </span>
                  </button>
                </div>
              )}

              {editorStep === 2 && (
                <div className="animate-in fade-in space-y-4 duration-200">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      Available From *
                      <input
                        type="time"
                        required
                        value={formData.availableFrom}
                        onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                        className={INPUT}
                      />
                    </label>
                    <label className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                      Available To *
                      <input
                        type="time"
                        required
                        value={formData.availableTo}
                        onChange={(e) => setFormData({ ...formData, availableTo: e.target.value })}
                        className={INPUT}
                      />
                    </label>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">Available Days *</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_DAYS.map((day) => {
                        const selected = formData.availableDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setFormData((current) => ({
                                ...current,
                                availableDays: selected
                                  ? current.availableDays.filter((d) => d !== day)
                                  : [...current.availableDays, day]
                              }))
                            }
                            className={`${chipClass(selected)} capitalize`}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">Availability Status</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["available", "Available"],
                        ["unavailable", "Unavailable"],
                        ["out_of_stock", "Out of Stock"]
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormData({ ...formData, availabilityStatus: value })}
                          className={chipClass(formData.availabilityStatus === value)}
                        >
                          {formData.availabilityStatus === value && <Check className="h-3 w-3" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Allergens
                    <input
                      type="text"
                      value={formData.allergens}
                      onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                      placeholder="gluten, dairy"
                      className={INPUT}
                    />
                  </label>
                  <label className="block text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Recipe *
                    <input
                      required
                      value={formData.recipe}
                      onChange={(e) => setFormData({ ...formData, recipe: e.target.value })}
                      placeholder="Grill patty, assemble with sauce"
                      className={INPUT}
                    />
                  </label>
                  <label className="block text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">
                    Notes *
                    <input
                      required
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Serve hot"
                      className={INPUT}
                    />
                  </label>
                </div>
              )}

              {editorStep === 3 && (
                <div className="animate-in fade-in space-y-4 duration-200">
                  <div className={`${SURFACE} space-y-3 p-4`}>
                    <p className="text-xs font-black text-[var(--admin-text,#fff)]">Variants</p>
                    {variants.map((v, i) => (
                      <div
                        key={`${v.sku}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-surface,#151920)] px-3 py-2 text-xs text-[var(--admin-muted,#D4D4D4)]"
                      >
                        <span className="truncate">
                          {v.name} ({v.size}) — {formatPrice(v.price)} — {v.sku}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                          className="shrink-0 cursor-pointer font-bold text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        placeholder="Name"
                        value={formData.variantName}
                        onChange={(e) => setFormData({ ...formData, variantName: e.target.value })}
                        className={INPUT}
                      />
                      <input
                        placeholder="Size"
                        value={formData.variantSize}
                        onChange={(e) => setFormData({ ...formData, variantSize: e.target.value })}
                        className={INPUT}
                      />
                      <input
                        placeholder="Portion"
                        value={formData.variantPortion}
                        onChange={(e) => setFormData({ ...formData, variantPortion: e.target.value })}
                        className={INPUT}
                      />
                      <input
                        placeholder="SKU"
                        value={formData.variantSku}
                        onChange={(e) => setFormData({ ...formData, variantSku: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--admin-hover,#252830)] px-3 py-1.5 text-xs font-bold text-[var(--admin-muted,#D4D4D4)] hover:text-[var(--admin-text,#fff)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Variant
                    </button>
                  </div>

                  <div className={`${SURFACE} space-y-3 p-4`}>
                    <p className="text-xs font-black text-[var(--admin-text,#fff)]">Addons</p>
                    {addons.map((a, i) => (
                      <div
                        key={`${a.name}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-surface,#151920)] px-3 py-2 text-xs text-[var(--admin-muted,#D4D4D4)]"
                      >
                        <span>
                          {a.name} — {formatPrice(a.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddons((prev) => prev.filter((_, idx) => idx !== i))}
                          className="cursor-pointer font-bold text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        placeholder="Addon name"
                        value={formData.addonName}
                        onChange={(e) => setFormData({ ...formData, addonName: e.target.value })}
                        className={INPUT}
                      />
                      <input
                        placeholder="Price"
                        type="number"
                        value={formData.addonPrice}
                        onChange={(e) => setFormData({ ...formData, addonPrice: e.target.value })}
                        className={INPUT}
                      />
                      <input
                        placeholder="Max qty"
                        type="number"
                        min={1}
                        value={formData.addonMaxQuantity}
                        onChange={(e) => setFormData({ ...formData, addonMaxQuantity: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addAddon}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--admin-hover,#252830)] px-3 py-1.5 text-xs font-bold text-[var(--admin-muted,#D4D4D4)] hover:text-[var(--admin-text,#fff)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Addon
                    </button>
                  </div>

                  <div className={`${SURFACE} space-y-3 p-4`}>
                    <p className="text-xs font-black text-[var(--admin-text,#fff)]">Ingredients</p>
                    {ingredients.map((ing, i) => (
                      <div
                        key={`${ing.name}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-surface,#151920)] px-3 py-2 text-xs text-[var(--admin-muted,#D4D4D4)]"
                      >
                        <span>
                          {ing.name} — {ing.quantity} {ing.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIngredients((prev) => prev.filter((_, idx) => idx !== i))}
                          className="cursor-pointer font-bold text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        placeholder="Name"
                        value={formData.ingredientName}
                        onChange={(e) => setFormData({ ...formData, ingredientName: e.target.value })}
                        className={INPUT}
                      />
                      <input
                        placeholder="Qty"
                        type="number"
                        value={formData.ingredientQty}
                        onChange={(e) => setFormData({ ...formData, ingredientQty: e.target.value })}
                        className={INPUT}
                      />
                      <input
                        placeholder="Unit"
                        value={formData.ingredientUnit}
                        onChange={(e) => setFormData({ ...formData, ingredientUnit: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--admin-hover,#252830)] px-3 py-1.5 text-xs font-bold text-[var(--admin-muted,#D4D4D4)] hover:text-[var(--admin-text,#fff)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Ingredient
                    </button>
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
                {editorStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setEditorStep((step) => (step < 3 ? step + 1 : step))}
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
                    {editingProduct ? "Save Changes" : "Publish Product"}
                  </button>
                )}
              </div>
            </form>

            <aside className="h-fit space-y-3 xl:sticky xl:top-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--admin-subtle,#A3A3A3)]">
                <Eye className="h-3.5 w-3.5 text-[var(--color-admin-accent,#FF5A1F)]" />
                Menu card preview
              </div>
              <div
                className={`overflow-hidden rounded-2xl border border-[var(--admin-border,#2A2F38)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)] ${isLight ? "bg-white" : "bg-[#0A0C10]"}`}
              >
                <div className="relative aspect-[4/3]">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt={formData.name || "Product preview"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--admin-elevated,#151920)] text-[var(--admin-faint,#737373)]">
                      <UtensilsCrossed className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  {formData.tags[0] && (
                    <span className="absolute left-3 top-3 rounded-md bg-[var(--color-admin-accent,#FF5A1F)] px-2.5 py-1 text-[10px] font-black uppercase text-white">
                      {CATALOG_TAGS.find((t) => t.key === formData.tags[0])?.label || formData.tags[0]}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                      {previewCategory}
                    </p>
                    <h3 className="line-clamp-2 text-lg font-black text-white">
                      {formData.name.trim() || "Product title"}
                    </h3>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-black text-white">
                        {formatPrice(previewDiscount || previewPrice || 0)}
                      </span>
                      {previewDiscount > 0 && previewPrice > previewDiscount && (
                        <span className="text-xs text-neutral-400 line-through">
                          {formatPrice(previewPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--admin-border,#1F242C)] bg-[var(--admin-surface,#11151B)] px-3 py-2.5 text-[10px] text-[var(--admin-faint,#737373)]">
                  <span
                    className={`rounded-md px-2 py-0.5 font-bold ${formData.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--admin-hover,#252830)] text-[var(--admin-subtle,#A3A3A3)]"}`}
                  >
                    {formData.isActive ? "Active" : "Blocked"}
                  </span>
                  <span className="truncate">{formData.sku || "No SKU"}</span>
                  <span className="ml-auto tabular-nums">Stock {formData.stockQuantity || 0}</span>
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
                  <UtensilsCrossed className="h-5 w-5" />
                </span>
                <span>Products & Menu</span>
              </h2>
              <p className="mt-1.5 max-w-xl text-xs text-[var(--admin-subtle,#A3A3A3)] sm:text-sm">
                Catalog analytics, full product payload, and live menu controls — theme-aware for dark & light.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              title="Add a product"
              className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_25%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-admin-accent-hover,#E04810)] active:translate-y-0 sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <MetaChip label="API count" value={apiMeta.count ?? stats.total} />
            <MetaChip
              label="Branch"
              value={apiMeta.branch ?? ((isAllBranches ? "All" : branchName) || "null")}
            />
            <MetaChip label="Domain" value={apiMeta.frontendDomainUrl || getFrontendDomainUrl()} />
            <MetaChip label="Success" value={apiMeta.success ? "true" : "false"} />
            <MetaChip label="Message" value={apiMeta.message || "—"} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {[
              {
                label: "Total",
                value: stats.total,
                hint: "Menu items",
                icon: Layers,
                tone: "text-[var(--color-admin-accent,#FF5A1F)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)]",
                filter: "all"
              },
              {
                label: "Active",
                value: stats.active,
                hint: `${stats.activePct}% live`,
                icon: CheckCircle2,
                tone: "text-emerald-400 bg-emerald-500/10",
                filter: "active"
              },
              {
                label: "Blocked",
                value: stats.blocked,
                hint: "Hidden",
                icon: Ban,
                tone: "text-red-400 bg-red-500/10",
                filter: "blocked"
              },
              {
                label: "Out of Stock",
                value: stats.oos,
                hint: "Need restock",
                icon: PackageX,
                tone: "text-amber-300 bg-amber-500/10",
                filter: "oos"
              },
              {
                label: "Popular",
                value: stats.popular,
                hint: `${stats.featured} featured`,
                icon: Sparkles,
                tone: "text-sky-400 bg-sky-500/10",
                filter: "popular"
              },
              {
                label: "Avg Margin",
                value: `${stats.avgMargin}%`,
                hint: `${stats.stockSum} units stock`,
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
                      <p className="mt-2 text-2xl font-black tracking-tight text-[var(--admin-text,#fff)] tabular-nums sm:text-3xl">
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
                  <p className="mt-0.5 text-[12px] text-[var(--admin-faint,#737373)]">Active vs blocked</p>
                </div>
                <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
                  <div
                    className="relative h-36 w-36 shrink-0 rounded-full shadow-[0_0_40px_color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)]"
                    style={donutStyle}
                  >
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
                      { label: "Blocked", value: stats.blocked, color: "bg-red-400", filter: "blocked" },
                      { label: "Out of stock", value: stats.oos, color: "bg-amber-400", filter: "oos" },
                      { label: "Popular", value: stats.popular, color: "bg-sky-400", filter: "popular" }
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
                            : "border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] hover:border-[var(--admin-hover,#3A4250)]"
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
                  <div className="text-sm font-bold text-[var(--admin-text,#fff)]">Products by category</div>
                  <div className="mt-0.5 text-[11px] text-[var(--admin-faint,#737373)]">Where menu items sit</div>
                </div>
                {categoryBars.rows.length === 0 ? (
                  <p className="py-10 text-center text-xs text-[var(--admin-faint,#737373)]">No products to chart yet.</p>
                ) : (
                  <div className="space-y-3">
                    {categoryBars.rows.map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="flex items-center gap-1.5 truncate text-[var(--admin-subtle,#A3A3A3)]">
                            <FolderOpen className="h-3 w-3 shrink-0 text-[var(--color-admin-accent,#FF5A1F)]" />
                            {row.label}
                          </span>
                          <span className="font-bold tabular-nums text-[var(--admin-text,#fff)]">{row.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-surface,#101216)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#C2410C] via-[var(--color-admin-accent,#FF5A1F)] to-[#FDBA74] transition-all duration-500"
                            style={{ width: `${(row.value / categoryBars.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 border-t border-[var(--admin-border,#292D35)] pt-3">
                  <div className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">Availability mix</div>
                  <div className="flex h-28 items-end gap-2 sm:gap-3">
                    {stockBars.rows.map((row) => (
                      <div
                        key={row.label}
                        className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="text-[10px] font-bold tabular-nums text-[var(--admin-subtle,#A3A3A3)] opacity-0 transition-opacity group-hover:opacity-100">
                          {row.value}
                        </span>
                        <div className="flex h-[88px] w-full items-end overflow-hidden rounded-t-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#0E1116)]">
                          <div
                            className={`w-full rounded-t-lg bg-gradient-to-t ${row.color} transition-all duration-500`}
                            style={{
                              height: `${Math.max(row.value > 0 ? 12 : 0, (row.value / stockBars.max) * 100)}%`
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

              <div className={`${SURFACE} space-y-5 p-5 xl:col-span-4`}>
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--admin-text,#fff)]">
                    <Wallet className="h-4 w-4 text-[var(--color-admin-accent,#FF5A1F)]" />
                    Margin leaders
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--admin-faint,#737373)]">
                    Top items by sell vs cost
                  </div>
                </div>
                {marginBars.rows.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--admin-faint,#737373)]">No margin data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {marginBars.rows.map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate text-[var(--admin-subtle,#A3A3A3)]">{row.label}</span>
                          <span className="font-bold tabular-nums text-[var(--admin-text,#fff)]">{row.value}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-surface,#101216)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-300 transition-all duration-500"
                            style={{ width: `${(row.value / marginBars.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 border-t border-[var(--admin-border,#292D35)] pt-3">
                  <div className="text-xs font-bold text-[var(--admin-muted,#D4D4D4)]">Price bands</div>
                  <div className="flex h-24 items-end gap-2">
                    {priceBands.bands.map((band) => (
                      <div key={band.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="text-[10px] font-bold tabular-nums text-[var(--admin-subtle,#A3A3A3)]">
                          {band.value}
                        </span>
                        <div className="flex h-[72px] w-full items-end overflow-hidden rounded-t-lg border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)]">
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-[var(--color-admin-accent-hover,#E04810)] to-[var(--color-admin-accent,#FF5A1F)] transition-all duration-500"
                            style={{
                              height: `${Math.max(band.value > 0 ? 10 : 0, (band.value / priceBands.max) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-[var(--admin-faint,#737373)]">{band.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)] p-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle,#A3A3A3)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, SKU, id, merchant, branch..."
                className="w-full rounded-xl border border-[var(--admin-border,#2A2F38)] bg-[var(--admin-input,#0F1217)] py-2.5 pl-9 pr-4 text-xs text-[var(--admin-text,#fff)] placeholder-[var(--admin-faint,#737373)] focus:border-[var(--color-admin-accent,#FF5A1F)] focus:outline-none"
              />
            </div>
            <div className="flex w-full items-center gap-2 overflow-x-auto no-scrollbar sm:w-auto">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  selectedCategory === "all"
                    ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white"
                    : "bg-[var(--admin-hover,#1D2128)] text-[var(--admin-subtle,#A3A3A3)] hover:text-[var(--admin-text,#fff)]"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                    selectedCategory === c.id
                      ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white"
                      : "bg-[var(--admin-hover,#1D2128)] text-[var(--admin-subtle,#A3A3A3)] hover:text-[var(--admin-text,#fff)]"
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <span className="shrink-0 rounded-md border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-2.5 py-1 text-[10px] font-extrabold uppercase text-[var(--admin-muted,#D4D4D4)]">
                {filteredProducts.length} shown
              </span>
              <div className="inline-flex shrink-0 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  title="Card view"
                  className={`cursor-pointer rounded-lg p-2 transition-colors ${viewMode === "cards" ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white" : "text-[var(--admin-subtle,#A3A3A3)] hover:text-[var(--admin-text,#fff)]"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("rows")}
                  title="Row view"
                  className={`cursor-pointer rounded-lg p-2 transition-colors ${viewMode === "rows" ? "bg-[var(--color-admin-accent,#FF5A1F)] text-white" : "text-[var(--admin-subtle,#A3A3A3)] hover:text-[var(--admin-text,#fff)]"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {(statusFilter !== "all" || selectedCategory !== "all") && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--admin-faint,#737373)]">Filters:</span>
              {statusFilter !== "all" && (
                <span className="rounded-lg border border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] px-2.5 py-1 font-bold capitalize text-[var(--color-admin-accent,#FF5A1F)]">
                  {statusFilter === "oos" ? "Out of stock" : statusFilter}
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="rounded-lg border border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_15%,transparent)] px-2.5 py-1 font-bold text-[var(--color-admin-accent,#FF5A1F)]">
                  {categories.find((c) => c.id === selectedCategory)?.name || "Category"}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setSelectedCategory("all");
                }}
                className="cursor-pointer font-bold text-[var(--admin-subtle,#A3A3A3)] hover:text-[var(--admin-text,#fff)]"
              >
                Clear
              </button>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-[var(--admin-border,#343943)] bg-[var(--admin-elevated,#14171C)] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_10%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
                <Package className="h-6 w-6" />
              </div>
              <p className="mx-auto max-w-md text-sm text-[var(--admin-subtle,#A3A3A3)]">
                {products.length === 0
                  ? "No products yet. Add a category first, then create your first menu item."
                  : "No products match these filters."}
              </p>
              {products.length === 0 && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                >
                  <Plus className="h-4 w-4" />
                  Create product
                </button>
              )}
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const isPopularMeal =
                  popularMealIds.includes(product.id) || !!product.isPopular;
                const categoryObj = categories.find((c) => c.id === product.category);
                const active = isProductActive(product);
                const oos = isOutOfStock(product);
                const expanded = expandedId === product.id;
                const sell =
                  Number(
                    product.discountPrice > 0
                      ? product.discountPrice
                      : product.sellingPrice || product.price
                  ) || 0;
                return (
                  <article
                    key={product.id}
                    className={`group overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                      active
                        ? "border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)]"
                        : "border-[var(--admin-border,#292D35)]/60 bg-[var(--admin-elevated,#14171C)] opacity-80"
                    }`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-hover,#1D2128)]">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--admin-faint,#737373)]">
                          <UtensilsCrossed className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${active ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}
                        >
                          {active ? "Active" : "Blocked"}
                        </span>
                        {oos && (
                          <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                            OOS
                          </span>
                        )}
                        {product.promotionalTag && (
                          <span className="rounded-md bg-[var(--color-admin-accent,#FF5A1F)] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                            {product.promotionalTag.text}
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                          {categoryObj?.name || "Uncategorized"}
                        </p>
                        <h3 className="line-clamp-1 text-base font-black text-white">{product.name}</h3>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <p className="line-clamp-2 text-xs text-[var(--admin-subtle,#A3A3A3)]">
                        {product.description || "No description"}
                      </p>

                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <p className="text-lg font-black tabular-nums text-[var(--admin-text,#fff)]">
                            {formatPrice(sell)}
                          </p>
                          {product.discountPrice > 0 && (
                            <p className="text-[11px] text-[var(--admin-faint,#737373)] line-through">
                              {formatPrice(product.sellingPrice || 0)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-[var(--admin-faint,#737373)]">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--admin-surface,#101216)] px-2 py-1">
                            <Package className="h-3 w-3" />
                            {product.stockQuantity ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--admin-surface,#101216)] px-2 py-1">
                            <Flame className="h-3 w-3" />
                            {product.calories ?? "—"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--admin-surface,#101216)] px-2 py-1">
                            <Clock className="h-3 w-3" />
                            {product.preparationTime ?? "—"}m
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                          SKU: <span className="font-mono text-[var(--admin-muted,#D4D4D4)]">{product.sku || "—"}</span>
                        </div>
                        <div className="truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                          Margin: <span className="font-bold text-[var(--admin-muted,#D4D4D4)]">{marginPct(product)}%</span>
                        </div>
                        <div className="col-span-2 truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 font-mono text-[var(--admin-subtle,#A3A3A3)]" title={product.id}>
                          ID: {product.id}
                        </div>
                        {product.merchantId ? (
                          <div className="col-span-2 truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 font-mono text-[var(--admin-subtle,#A3A3A3)]" title={product.merchantId}>
                            Merchant: {product.merchantId}
                          </div>
                        ) : null}
                        {(product.branchName || product.branchAvailability?.length) ? (
                          <div className="col-span-2 flex items-center gap-1 truncate rounded-lg border border-[var(--admin-border,#292D35)] px-2 py-1.5 text-[var(--admin-subtle,#A3A3A3)]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {product.branchName || product.branchAvailability?.join(", ")}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-[var(--admin-surface,#101216)] px-2 py-1 text-[10px] font-bold text-[var(--admin-subtle,#A3A3A3)]">
                          {(product.variants || []).length} variants
                        </span>
                        <span className="rounded-md bg-[var(--admin-surface,#101216)] px-2 py-1 text-[10px] font-bold text-[var(--admin-subtle,#A3A3A3)]">
                          {(product.addons || []).length} addons
                        </span>
                        <span className="rounded-md bg-[var(--admin-surface,#101216)] px-2 py-1 text-[10px] font-bold text-[var(--admin-subtle,#A3A3A3)]">
                          {(product.ingredients || []).length} ingredients
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((prev) => (prev === product.id ? "" : product.id))
                          }
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)] transition-colors hover:text-[var(--admin-text,#fff)]"
                        >
                          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {expanded ? "Hide" : "Details"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailProduct(product)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[var(--admin-border,#292D35)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)] hover:text-[var(--admin-text,#fff)]"
                          title="Full panel"
                        >
                          <Layers className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePopularMeal(product.id)}
                          className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            isPopularMeal
                              ? "border border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_20%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]"
                              : "border border-[var(--admin-border,#292D35)] text-[var(--admin-faint,#737373)]"
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(togglingProductId)}
                          onClick={() => void handleToggleProductActive(product)}
                          className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                            active
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "bg-[var(--admin-hover,#252830)] text-[var(--admin-muted,#D4D4D4)]"
                          }`}
                        >
                          {togglingProductId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          {active ? "On" : "Off"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 transition-all hover:bg-red-500/25"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {expanded && (
                        <div className="animate-in fade-in slide-in-from-top-2 border-t border-[var(--admin-border,#292D35)] pt-3 duration-200">
                          {renderProductDetailBody(product)}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => {
                const isPopularMeal =
                  popularMealIds.includes(product.id) || !!product.isPopular;
                const categoryObj = categories.find((c) => c.id === product.category);
                const active = isProductActive(product);
                const oos = isOutOfStock(product);
                const expanded = expandedId === product.id;
                const sell =
                  Number(
                    product.discountPrice > 0
                      ? product.discountPrice
                      : product.sellingPrice || product.price
                  ) || 0;
                return (
                  <div
                    key={product.id}
                    className={`${SURFACE} p-4 transition-all hover:border-[var(--admin-hover,#3A404A)] sm:p-5 ${!active ? "opacity-75" : ""}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <div className="relative h-28 w-full shrink-0 self-start overflow-hidden rounded-xl bg-[var(--admin-hover,#1D2128)] sm:h-24 sm:w-28">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--admin-faint,#737373)]">
                            <UtensilsCrossed className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-300"}`}
                          >
                            {active ? "Active" : "Blocked"}
                          </span>
                          {oos && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              Out of stock
                            </span>
                          )}
                          <span className="truncate text-[10px] text-[var(--admin-faint,#737373)]">
                            {categoryObj?.name || product.category}
                          </span>
                          {product.sku && (
                            <span className="font-mono text-[10px] text-[var(--admin-faint,#737373)]">
                              {product.sku}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-[var(--admin-faint,#737373)]">
                            {product.id}
                          </span>
                        </div>

                        <h3 className="truncate text-base font-black text-[var(--admin-text,#fff)]">
                          {product.name}
                        </h3>
                        <p className="line-clamp-2 text-xs text-[var(--admin-subtle,#A3A3A3)]">
                          {product.description || "No description"}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-sm font-black text-[var(--admin-text,#fff)]">
                            {formatPrice(sell)}
                          </span>
                          <span className="text-[11px] text-[var(--admin-faint,#737373)]">
                            cost {formatPrice(product.costPrice || 0)} · tax {product.tax ?? 0}% · stock{" "}
                            {product.stockQuantity ?? 0}
                          </span>
                          {product.promotionalTag && (
                            <span className="rounded-full bg-[var(--color-admin-accent,#FF5A1F)] px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                              {product.promotionalTag.text}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => togglePopularMeal(product.id)}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                              isPopularMeal
                                ? "border border-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_20%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]"
                                : "bg-[var(--admin-hover,#1D2128)] text-[var(--admin-faint,#737373)]"
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            {isPopularMeal ? "Popular" : "Mark popular"}
                          </button>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((prev) => (prev === product.id ? "" : product.id))
                          }
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border,#292D35)] px-3 py-2 text-xs font-bold text-[var(--admin-muted,#D4D4D4)]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {expanded ? "Hide" : "All fields"}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(togglingProductId)}
                          onClick={() => void handleToggleProductActive(product)}
                          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                            active
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "bg-[var(--admin-hover,#252830)] text-[var(--admin-muted,#D4D4D4)]"
                          }`}
                        >
                          {togglingProductId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          {active ? "Active" : "Inactive"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[var(--color-admin-accent-hover,#E04810)]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product)}
                          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 transition-all hover:bg-red-500/25"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-4 animate-in fade-in border-t border-[var(--admin-border,#292D35)] pt-4 duration-200">
                        {renderProductDetailBody(product)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {detailProduct && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/70 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div
            className={`flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#191B20)] shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-2xl sm:zoom-in-95`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border,#292D35)] p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-admin-accent,#FF5A1F)]">
                  Full API payload
                </p>
                <h3 className="truncate text-lg font-black text-[var(--admin-text,#fff)]">
                  {detailProduct.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#A3A3A3)] hover:text-[var(--admin-text,#fff)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">{renderProductDetailBody(detailProduct)}</div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border,#292D35)] p-4">
              <button
                type="button"
                onClick={() => {
                  handleOpenEdit(detailProduct);
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2 text-sm font-bold text-white"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border,#292D35)] px-4 py-2 text-sm font-bold text-[var(--admin-muted,#D4D4D4)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className={`${SURFACE} w-full max-w-sm animate-in zoom-in-95 p-6 shadow-2xl`}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--admin-text,#fff)]">Are you sure?</h3>
                <p className="mt-1 text-sm text-[var(--admin-muted,#D4D4D4)]">
                  Delete product <span className="font-bold text-[var(--admin-text,#fff)]">{productToDelete.name}</span>?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setProductToDelete(null)}
                className="cursor-pointer rounded-xl bg-[var(--admin-hover,#252830)] px-4 py-2 text-sm font-bold text-[var(--admin-muted,#D4D4D4)] transition-all hover:text-[var(--admin-text,#fff)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteProduct()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition-all hover:bg-red-500 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { ProductsPage };
