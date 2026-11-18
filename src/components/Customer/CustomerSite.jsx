'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Header } from '@/components/Customer/Header';
import { Hero } from '@/components/Customer/Hero';
import { PopularMeals } from '@/components/Customer/PopularMeals';
import { MenuSection } from '@/components/Customer/MenuSection';
import { ProductDetailModal } from '@/components/Customer/ProductDetailModal';
import { CartDrawer } from '@/components/Customer/CartDrawer';
import { CheckoutModal } from '@/components/Customer/CheckoutModal';
import { DealsSection } from '@/components/Customer/DealsSection';
import { DealsWelcomeModal } from '@/components/Customer/DealsWelcomeModal';
import { BrandStory } from '@/components/Customer/BrandStory';
import { HowItWorks } from '@/components/Customer/HowItWorks';
import { Testimonials } from '@/components/Customer/Testimonials';
import { Newsletter } from '@/components/Customer/Newsletter';
import { Footer } from '@/components/Customer/Footer';
import { OrderTrackingModal } from '@/components/Customer/OrderTrackingModal';
import { LocationModal } from '@/components/Customer/LocationModal';
import { MobileBottomNav } from '@/components/Customer/MobileBottomNav';
import { BranchTimetableModal } from '@/components/Customer/BranchTimetableModal';
import { CustomerAuthModal } from '@/components/Customer/CustomerAuthModal';
import { UserMenuModal } from '@/components/Customer/UserMenuModal';
import { CustomerAccountPage } from '@/components/Customer/CustomerAccountPage';
import {
  readLocationSession,
  writeLocationSession
} from '@/shared/lib/publicBranchesApi';
import {
  getUserCatalogCategories,
  getUserCatalogProducts,
  userCatalogApiMessage
} from '@/shared/lib/userCatalogApi';
import { getPublicFrontendDomainUrl } from '@/shared/lib/catalogApi';
import {
  clearGuestCart,
  clearGuestOrderStorage,
  clearPendingCheckout,
  hasPendingCheckout,
  readGuestCart,
  writeGuestCart
} from '@/shared/lib/guestCartStorage';
import {
  addUserCartItem,
  adjustUserCartItemQuantity,
  buildAddCartItemPayload,
  buildCartSyncPayload,
  clearUserCart,
  getUserCart,
  removeUserCartItem,
  syncUserCart
} from '@/shared/lib/userCartApi';
import { ArrowUp, Shield } from "lucide-react";
const CustomerSite = ({ onOpenAdmin }) => {
  const {
    config,
    products: contextProducts,
    branches,
    orders,
    currentUser,
    customerUser,
    placeCustomerOrder,
    addToast,
    formatPrice
  } = useRestaurant();
  const [isClientReady, setIsClientReady] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [authIntent, setAuthIntent] = useState("register");
  const [resumeCheckoutAfterAuth, setResumeCheckoutAfterAuth] = useState(false);
  const [isCartSyncing, setIsCartSyncing] = useState(false);
  const [isCartMutating, setIsCartMutating] = useState(false);
  const cartSyncInFlightRef = useRef(false);
  const cartSyncedForUserRef = useRef("");
  const cartMutatingRef = useRef(false);
  const prevCustomerUserRef = useRef(customerUser);
  const [branchSelection, setBranchSelection] = useState({
    branchId: "",
    selectedArea: "",
    orderMode: "delivery",
    latitude: "",
    longitude: ""
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDealsWelcomeOpen, setIsDealsWelcomeOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [storefrontCategories, setStorefrontCategories] = useState([]);
  const [storefrontProductsRaw, setStorefrontProductsRaw] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = readLocationSession();
      if (saved?.branchId && saved?.orderMode) {
        setBranchSelection({
          branchId: saved.branchId,
          selectedArea: saved.selectedArea || saved.branchName || "",
          orderMode: saved.orderMode,
          latitude: saved.latitude || "",
          longitude: saved.longitude || "",
          branchName: saved.branchName || ""
        });
      }
      // Always restore cart mirror from localStorage (guest + post-logout continuity).
      setCartItems(readGuestCart());
      if (hasPendingCheckout()) {
        setResumeCheckoutAfterAuth(true);
      }
    } catch (error) {
      console.error("Saved branch selection could not be restored:", error);
    } finally {
      setCartHydrated(true);
      setIsClientReady(true);
      // Show location modal on every page refresh / load.
      setIsLocationModalOpen(true);
      setIsFirstVisit(true);
    }
  }, []);

  /** Items that still need /cart/sync (new guest lines or edited after logout). */
  const getPendingSyncItems = (items = []) =>
    (Array.isArray(items) ? items : []).filter(
      (item) => !item?.serverCartSynced || item?.guestDirty === true
    );

  // Always mirror cart → localStorage so logout/guest still sees selections.
  useEffect(() => {
    if (!cartHydrated) return;
    writeGuestCart(Array.isArray(cartItems) ? cartItems : []);
  }, [cartItems, cartHydrated]);

  // On logout: keep LS cart for guest editing; only reset sync gate.
  useEffect(() => {
    const wasLoggedIn = !!prevCustomerUserRef.current;
    const isLoggedIn = !!customerUser;
    prevCustomerUserRef.current = customerUser;
    if (!wasLoggedIn || isLoggedIn) return;
    cartSyncedForUserRef.current = "";
    setCartItems((prev) => {
      const next = (Array.isArray(prev) ? prev : []).map((item) => ({
        ...item,
        // Keep as mirrored until guest edits; prevents blind re-merge on next login.
        serverCartSynced: item.serverCartSynced !== false,
        guestDirty: false
      }));
      writeGuestCart(next);
      return next;
    });
  }, [customerUser]);
  const storefrontProducts = useMemo(
    () =>
      storefrontProductsRaw.filter((product) => {
        const isTaggedOutOfStock = product.tags?.some((tag) => {
          const key = typeof tag === "string" ? tag : tag?.key || "";
          const normalizedTag = String(key).trim().toLowerCase().replace(/[\s-]+/g, "_");
          return normalizedTag === "outofstock" || normalizedTag === "out_of_stock";
        });
        return product.inStock !== false && !isTaggedOutOfStock;
      }),
    [storefrontProductsRaw]
  );
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState(["classic-smash-meal", "loaded-bbq-burger"]);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAccountPageOpen, setIsAccountPageOpen] = useState(false);
  const [accountSection, setAccountSection] = useState("profile");

  const openAccountSection = (section = "profile") => {
    setAccountSection(section);
    setIsAccountPageOpen(true);
    setIsUserMenuOpen(false);
  };
  const [latestOrder, setLatestOrder] = useState(null);
  const [activeSection, setActiveSection] = useState("hero-section");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;
  const catalogRequestKeyRef = useRef("");

  const locationConfirmed = Boolean(
    branchSelection.branchId &&
      (branchSelection.branchName || branchSelection.selectedArea)
  );

  const currentBranch =
    branches.find((b) => b.id === branchSelection.branchId) ||
    (locationConfirmed ? branches[0] : null);

  const catalogBranchCandidates = useMemo(() => {
    if (!locationConfirmed) return [];
    const confirmed =
      branches.find((b) => b.id === branchSelection.branchId) || null;
    const values = [
      branchSelection.branchName,
      confirmed?.name,
      confirmed?.city,
      confirmed?.shortName,
      confirmed?.branchCode,
      branchSelection.selectedArea
    ];
    const unique = [];
    for (const value of values) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) continue;
      if (!unique.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
        unique.push(trimmed);
      }
    }
    return unique;
  }, [
    locationConfirmed,
    branchSelection.branchId,
    branchSelection.branchName,
    branchSelection.selectedArea,
    branches
  ]);

  useEffect(() => {
    if (!isClientReady || catalogBranchCandidates.length === 0) {
      setStorefrontCategories([]);
      setStorefrontProductsRaw([]);
      setCatalogLoaded(false);
      setCatalogLoading(false);
      return;
    }

    const requestKey = catalogBranchCandidates.join("|");
    catalogRequestKeyRef.current = requestKey;

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogLoaded(false);
    setSelectedCategory("all");

    void (async () => {
      const domain = getPublicFrontendDomainUrl();
      let lastCatsError = "";
      let lastProdsError = "";
      let loaded = false;

      for (const candidate of catalogBranchCandidates) {
        if (cancelled || catalogRequestKeyRef.current !== requestKey) return;

        const [cats, prods] = await Promise.all([
          getUserCatalogCategories({
            frontendDomainUrl: domain,
            branchName: candidate
          }),
          getUserCatalogProducts({
            frontendDomainUrl: domain,
            branchName: candidate
          })
        ]);

        if (cancelled || catalogRequestKeyRef.current !== requestKey) return;

        const catsMessage = userCatalogApiMessage(
          cats.data,
          "Could not load menu categories."
        );
        const prodsMessage = userCatalogApiMessage(
          prods.data,
          "Could not load menu products."
        );
        const catsBranchMissing =
          !cats.ok && /branch name not found/i.test(catsMessage || "");
        const prodsBranchMissing =
          !prods.ok && /branch name not found/i.test(prodsMessage || "");

        if (catsBranchMissing || prodsBranchMissing) {
          lastCatsError = catsMessage;
          lastProdsError = prodsMessage;
          continue;
        }

        if (!cats.ok) {
          setStorefrontCategories([]);
          lastCatsError = catsMessage;
        } else {
          setStorefrontCategories(cats.categories);
        }

        if (!prods.ok) {
          setStorefrontProductsRaw([]);
          lastProdsError = prodsMessage;
        } else {
          const categoryNameById = Object.fromEntries(
            (cats.ok ? cats.categories : []).map((category) => [category.id, category.name])
          );
          setStorefrontProductsRaw(
            prods.products.map((product) => ({
              ...product,
              categoryName: product.categoryName || categoryNameById[product.category] || ""
            }))
          );
        }

        if (!cats.ok) {
          addToastRef.current("Categories unavailable", catsMessage, "error");
        }
        if (!prods.ok) {
          addToastRef.current("Products unavailable", prodsMessage, "error");
        }

        loaded = true;
        break;
      }

      if (cancelled || catalogRequestKeyRef.current !== requestKey) return;

      if (!loaded) {
        setStorefrontCategories([]);
        setStorefrontProductsRaw([]);
        // Only one quiet failure toast pair after all candidates fail.
        if (lastCatsError) {
          addToastRef.current("Categories unavailable", lastCatsError, "error");
        }
        if (lastProdsError) {
          addToastRef.current("Products unavailable", lastProdsError, "error");
        }
      }

      setCatalogLoading(false);
      setCatalogLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isClientReady, catalogBranchCandidates]);

  useEffect(() => {
    if (latestOrder) {
      const match = orders.find(
        (o) => o.orderId === latestOrder.orderId || o.orderNumber.includes(latestOrder.orderId)
      );
      if (match && match.status !== latestOrder.status) {
        setLatestOrder((prev) => {
          if (!prev) return null;
          let mappedStatus = "received";
          if (match.status === "preparing") mappedStatus = "preparing";
          if (match.status === "ready" || match.status === "on_the_way") mappedStatus = "on_the_way";
          if (match.status === "delivered" || match.status === "completed") mappedStatus = "delivered";
          return { ...prev, status: mappedStatus };
        });
      }
    }
  }, [orders, latestOrder]);
  const handleSelectBranch = (selection) => {
    const next = {
      branchId: selection.branchId,
      selectedArea: selection.selectedArea || selection.branchName || "",
      orderMode: selection.orderMode || "delivery",
      latitude: selection.latitude || "",
      longitude: selection.longitude || "",
      branchName: selection.branchName || selection.selectedArea || ""
    };
    setBranchSelection(next);
    writeLocationSession(next);
    setIsFirstVisit(false);
    setIsLocationModalOpen(false);
    // After location is locked, show branch deals in a welcome modal.
    setIsDealsWelcomeOpen(true);
    addToast(
      "Location confirmed",
      `${next.branchName || next.selectedArea || "Branch"} · ${
        next.orderMode === "pickup" ? "Pick-Up" : "Delivery"
      }${next.latitude ? ` · ${next.latitude}, ${next.longitude}` : ""}`,
      "success"
    );
  };
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      const sections = [
        "hero-section",
        "popular-section",
        "menu-section",
        "deals-section",
        "brand-story-section",
        "how-it-works-section",
        "reviews-section"
      ];
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160 && rect.bottom >= 160) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const getActiveBranchMeta = () => {
    const branchId = branchSelection.branchId || currentBranch?.id || "";
    const branchName =
      branchSelection.branchName ||
      currentBranch?.name ||
      currentBranch?.city ||
      currentBranch?.shortName ||
      "";
    return { branchId, branchName };
  };

  const applyServerCartItems = (items) => {
    const next = (Array.isArray(items) ? items : []).map((item) => ({
      ...item,
      serverCartSynced: true,
      guestDirty: false
    }));
    setCartItems(next);
    // Mirror server cart in localStorage (do NOT wipe) so logout still shows cart.
    writeGuestCart(next);
  };

  const loadAccountCart = async ({ showToast = false } = {}) => {
    const result = await getUserCart(getPublicFrontendDomainUrl());
    if (result.ok) {
      applyServerCartItems(result.items);
      if (showToast) {
        addToast("Cart loaded", result.message || "Loaded your account cart.", "success");
      }
    }
    return result;
  };

  const handleClearCart = async ({ silent = false } = {}) => {
    // Guest / logged-out → localStorage only
    if (!customerUser) {
      setCartItems([]);
      clearGuestCart();
      if (!silent) addToast("Cart cleared", "All items removed.", "success");
      return;
    }
    // Logged-in → DELETE /api/restaurant/user/cart (Bearer token)
    if (cartMutatingRef.current) return;
    cartMutatingRef.current = true;
    setIsCartMutating(true);
    try {
      const result = await clearUserCart(getPublicFrontendDomainUrl());
      if (result.ok) {
        setCartItems([]);
        writeGuestCart([]);
        if (!silent) addToast("Cart cleared", "All items removed from your cart.", "success");
      } else {
        addToast("Could not clear cart", result.message || "Please try again.", "error");
      }
    } finally {
      cartMutatingRef.current = false;
      setIsCartMutating(false);
    }
  };

  const handleAddToCart = async (
    product,
    quantity,
    selectedBun,
    selectedCheese,
    selectedAddons = [],
    specialInstructions,
    calculatedTotal
  ) => {
    const addonKey = selectedAddons.map((a) => a.id).sort().join("-");
    const cartItemId = `${product.id}-${selectedBun || "nobun"}-${selectedCheese || "nocheese"}-${addonKey}-${specialInstructions || "none"}`;
    const addonsPrice = selectedAddons.reduce(
      (sum, a) => sum + (Number(a.price) || 0) * Math.max(1, Number(a.quantity) || 1),
      0
    );
    const selectedVariant = product?.selectedVariant || null;
    const matchedVariant =
      selectedVariant ||
      (selectedBun && Array.isArray(product?.variants)
        ? product.variants.find(
            (v) => String(v?.name || "").toLowerCase() === String(selectedBun).toLowerCase()
          )
        : null) ||
      product?.variants?.[0] ||
      null;
    const basePrice =
      (typeof selectedVariant?.price === "number" && selectedVariant.price > 0
        ? selectedVariant.price
        : null) ??
      (typeof matchedVariant?.price === "number" && matchedVariant.price > 0
        ? matchedVariant.price
        : null) ??
      (Number(product?.price) > 0 ? Number(product.price) : null) ??
      (Number(product?.sellingPrice) > 0 ? Number(product.sellingPrice) : 0);
    const unitPrice = Number(basePrice) + addonsPrice;
    const finalItemTotal =
      typeof calculatedTotal === "number" && calculatedTotal > 0
        ? calculatedTotal
        : unitPrice * quantity;
    const variantId =
      selectedVariant?.id ||
      matchedVariant?.id ||
      product?.variantId ||
      undefined;

    // Logged-in: persist via cart items API, then hydrate from server cart.
    if (customerUser) {
      const { branchId, branchName } = getActiveBranchMeta();
      if (!branchId) {
        addToast("Branch required", "Select a delivery branch before adding items.", "error");
        return;
      }
      if (cartMutatingRef.current) return;
      cartMutatingRef.current = true;
      setIsCartMutating(true);
      try {
        const payload = buildAddCartItemPayload({
          product: {
            ...product,
            price: basePrice,
            selectedVariant: selectedVariant || matchedVariant || product.selectedVariant,
            variantId
          },
          quantity,
          selectedBun: selectedBun || matchedVariant?.name,
          selectedAddons,
          specialInstructions,
          branchId,
          branchName
        });
        const result = await addUserCartItem(payload, getPublicFrontendDomainUrl());
        if (!result.ok) {
          addToast("Add to cart failed", result.message || "Could not add item.", "error");
          return;
        }
        applyServerCartItems(result.items);
        addToast(
          "Added to Order!",
          `${quantity}x ${product.name}`,
          "success"
        );
        setIsCartOpen(true);
      } finally {
        cartMutatingRef.current = false;
        setIsCartMutating(false);
      }
      return;
    }

    // Guest: localStorage-backed cart (pending sync on next login).
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + quantity;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPrice: current.unitPrice * newQty,
          serverCartSynced: false,
          guestDirty: true
        };
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId,
          product: {
            ...product,
            price: basePrice,
            sellingPrice: basePrice,
            selectedVariant: selectedVariant || matchedVariant || null
          },
          quantity,
          selectedBun: selectedBun || matchedVariant?.name || "",
          selectedCheese,
          selectedAddons,
          specialInstructions,
          unitPrice,
          totalPrice: finalItemTotal,
          variantId,
          serverCartSynced: false,
          guestDirty: true
        }
      ];
    });
    addToast(
      "Added to Order!",
      `${quantity}x ${product.name} (${formatPrice(finalItemTotal)})`,
      "success"
    );
    setIsCartOpen(true);
  };
  const handleQuickAdd = (product, e) => {
    e.stopPropagation();
    void handleAddToCart(product, 1);
  };
  const handleUpdateQuantity = async (cartItemId, actionOrQuantity) => {
    const line = cartItems.find(
      (item) => item.cartItemId === cartItemId || item.serverLineId === cartItemId
    );
    if (!line) return;

    const currentQty = Math.max(1, Number(line.quantity) || 1);
    let action = "";
    if (actionOrQuantity === "increase" || actionOrQuantity === "decrease") {
      action = actionOrQuantity;
    } else {
      const nextQty = Number(actionOrQuantity);
      if (!Number.isFinite(nextQty)) return;
      if (nextQty > currentQty) action = "increase";
      else if (nextQty < currentQty) action = "decrease";
      else return;
    }

    // Guest / logged-out: localStorage only; mark dirty so next login reconciles.
    if (!customerUser) {
      if (action === "decrease" && currentQty <= 1) {
        setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
        return;
      }
      const nextQty = action === "increase" ? currentQty + 1 : currentQty - 1;
      setCartItems((prev) =>
        prev.map((item) =>
          item.cartItemId === cartItemId
            ? {
                ...item,
                quantity: nextQty,
                totalPrice: item.unitPrice * nextQty,
                serverCartSynced: false,
                guestDirty: true
              }
            : item
        )
      );
      return;
    }

    // Logged-in: qty=1 + decrease → remove line; otherwise action API.
    if (action === "decrease" && currentQty <= 1) {
      void handleRemoveItem(cartItemId);
      return;
    }

    const serverId = line.serverLineId || line.cartItemId || cartItemId;
    if (cartMutatingRef.current) return;
    cartMutatingRef.current = true;
    setIsCartMutating(true);
    try {
      const result = await adjustUserCartItemQuantity(
        serverId,
        action,
        getPublicFrontendDomainUrl()
      );
      if (!result.ok) {
        addToast("Update failed", result.message || "Could not update quantity.", "error");
        return;
      }
      applyServerCartItems(result.items);
    } finally {
      cartMutatingRef.current = false;
      setIsCartMutating(false);
    }
  };
  const handleRemoveItem = async (cartItemId) => {
    if (!customerUser) {
      setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
      return;
    }

    const line = cartItems.find(
      (item) => item.cartItemId === cartItemId || item.serverLineId === cartItemId
    );
    const serverId = line?.serverLineId || line?.cartItemId || cartItemId;
    if (cartMutatingRef.current) return;
    cartMutatingRef.current = true;
    setIsCartMutating(true);
    try {
      const result = await removeUserCartItem(serverId, getPublicFrontendDomainUrl());
      if (!result.ok) {
        addToast("Remove failed", result.message || "Could not remove item.", "error");
        return;
      }
      applyServerCartItems(result.items);
    } finally {
      cartMutatingRef.current = false;
      setIsCartMutating(false);
    }
  };
  const handleClaimDeal = (deal) => {
    const dealProduct = {
      id: deal.id,
      name: deal.name,
      category: "deals",
      price: deal.dealPrice,
      originalPrice: deal.originalPrice > deal.dealPrice ? deal.originalPrice : void 0,
      rating: 5,
      reviewsCount: 0,
      description: deal.shortDescription,
      image: deal.image
    };
    void handleAddToCart(dealProduct, 1);
    addToast("Deal Combo Claimed!", `${deal.name} added (${formatPrice(deal.dealPrice)})`, "success");
  };
  const handleToggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      const updated = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      const product =
        storefrontProductsRaw.find((p) => p.id === productId) ||
        contextProducts.find((p) => p.id === productId);
      addToast(
        exists ? "Removed from Favorites" : "Saved to Favorites!",
        product ? product.name : "",
        "info"
      );
      return updated;
    });
  };
  const handleOrderPlaced = (order) => {
    setLatestOrder(order);
    placeCustomerOrder({
      items: order.items,
      customerName: order.customerName,
      phone: order.customerPhone || customerUser?.phone || "",
      address: order.deliveryAddress || "Local Address",
      branchId: currentBranch?.id || "branch-renala",
      paymentMethod: "card",
      orderMode: order.deliveryMethod === "pickup" ? "pickup" : "delivery",
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      tax: order.tax,
      total: order.total,
      notes: "Customer placed order via website storefront."
    });
    clearGuestOrderStorage();
    setResumeCheckoutAfterAuth(false);
  };

  const handleRequireLoginForCheckout = () => {
    setResumeCheckoutAfterAuth(true);
    setAuthIntent("login");
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setIsAuthModalOpen(true);
  };

  /**
   * Login reconcile:
   * - Keep localStorage as cart mirror (never wipe after sync)
   * - Clean mirrored lines → GET only (no re-merge / no qty double)
   * - Dirty lines with serverLineId → increase/decrease to match local qty
   * - Brand-new guest lines → /cart/sync once
   * - Guest-removed mirrored lines → DELETE item on server
   */
  const syncLocalCartWithServer = async ({
    items = null,
    showToast = true
  } = {}) => {
    const branchId = branchSelection.branchId || currentBranch?.id || "";
    const branchName =
      branchSelection.branchName ||
      currentBranch?.name ||
      currentBranch?.city ||
      currentBranch?.shortName ||
      "";

    if (!branchId) {
      return { ok: false, skipped: true, message: "Branch required before cart sync." };
    }
    if (cartSyncInFlightRef.current) {
      return { ok: false, skipped: true, message: "Cart sync already running." };
    }

    cartSyncInFlightRef.current = true;
    setIsCartSyncing(true);
    const domain = getPublicFrontendDomainUrl();

    try {
      const fromStorage = readGuestCart();
      const localAll = Array.isArray(items)
        ? items
        : fromStorage.length
          ? fromStorage
          : Array.isArray(cartItems)
            ? cartItems
            : [];
      const pending = getPendingSyncItems(localAll);

      let serverResult = await getUserCart(domain);
      let serverItems = serverResult.ok ? serverResult.items : [];

      // Guest cleared everything → clear account cart too.
      if (!localAll.length) {
        if (serverItems.length) {
          await clearUserCart(domain);
        }
        applyServerCartItems([]);
        return { ok: true, cleared: true };
      }

      // Guest removed mirrored lines → delete those server rows.
      const hasMirrorIds = localAll.some((item) => item.serverLineId);
      if (hasMirrorIds) {
        for (const serverLine of serverItems) {
          const sid = serverLine.serverLineId || serverLine.cartItemId;
          const stillLocal = localAll.some(
            (local) => local.serverLineId === sid || local.cartItemId === sid
          );
          if (!stillLocal && sid) {
            await removeUserCartItem(sid, domain);
          }
        }
        serverResult = await getUserCart(domain);
        serverItems = serverResult.ok ? serverResult.items : [];
      }

      // Dirty mirrored qty → adjust via increase/decrease (avoids sync double-count).
      const dirtyMirrored = pending.filter((item) => item.serverLineId);
      for (const item of dirtyMirrored) {
        const sid = item.serverLineId;
        const serverLine = serverItems.find(
          (row) => row.serverLineId === sid || row.cartItemId === sid
        );
        if (!serverLine) continue;
        const localQty = Math.max(1, Number(item.quantity) || 1);
        const serverQty = Math.max(1, Number(serverLine.quantity) || 1);
        let delta = localQty - serverQty;
        while (delta > 0) {
          const bumped = await adjustUserCartItemQuantity(sid, "increase", domain);
          if (!bumped.ok) break;
          delta -= 1;
        }
        while (delta < 0) {
          const reduced = await adjustUserCartItemQuantity(sid, "decrease", domain);
          if (!reduced.ok) break;
          delta += 1;
        }
      }

      // Brand-new guest lines (never on server) → sync merge once.
      const brandNew = pending.filter((item) => !item.serverLineId);
      if (brandNew.length) {
        const payload = buildCartSyncPayload({
          cartItems: brandNew,
          branchId,
          branchName
        });
        const syncResult = await syncUserCart(payload, domain);
        if (!syncResult.ok && showToast) {
          addToast(
            "Cart sync failed",
            syncResult.message || "Could not merge local cart.",
            "error"
          );
        }
      }

      const loaded = await loadAccountCart({ showToast: false });
      if (showToast && pending.length) {
        addToast(
          "Cart synced",
          "Local cart synced with your account.",
          "success"
        );
      }
      return { ok: loaded.ok !== false, reconciled: true, pendingCount: pending.length };
    } finally {
      cartSyncInFlightRef.current = false;
      setIsCartSyncing(false);
    }
  };

  const handleAuthSuccess = async () => {
    setIsAuthModalOpen(false);

    const fromStorage = readGuestCart();
    const localSnapshot = fromStorage.length ? fromStorage : cartItems;

    cartSyncedForUserRef.current = "auth-success";
    await syncLocalCartWithServer({
      items: localSnapshot,
      showToast: getPendingSyncItems(localSnapshot).length > 0
    });
    if (customerUser?.id) {
      cartSyncedForUserRef.current = customerUser.id;
    }

    if (resumeCheckoutAfterAuth || hasPendingCheckout()) {
      clearPendingCheckout();
      setResumeCheckoutAfterAuth(false);
      setIsCheckoutOpen(true);
      addToast(
        "Welcome back",
        "You're signed in. Review checkout and place your order.",
        "success"
      );
      return;
    }
    scrollToSection("hero-section");
  };

  // Logged-in refresh: reconcile LS mirror once location is confirmed.
  useEffect(() => {
    if (!cartHydrated || !isClientReady || !customerUser?.id || !locationConfirmed) return;
    if (cartSyncedForUserRef.current === customerUser.id) return;
    cartSyncedForUserRef.current = customerUser.id;
    const localSnapshot = readGuestCart().length ? readGuestCart() : cartItems;
    void syncLocalCartWithServer({
      items: localSnapshot,
      showToast: getPendingSyncItems(localSnapshot).length > 0
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHydrated, isClientReady, customerUser?.id, locationConfirmed]);
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };
  const handleSearchFocus = () => {
    scrollToSection("menu-section");
    const searchInput = document.getElementById("menu-search-input");
    if (searchInput) {
      searchInput.focus();
    }
  };
  return <div className="min-h-screen flex flex-col food-icons-bg text-[#191919] selection:bg-[#FF5A1F] selection:text-white">
      {
    /* Top Banner with Quick Admin Portal Link */
  }
      <div className="bg-[#111318] text-white text-xs px-4 py-1.5 flex items-center justify-between border-b border-[#292D35]/50">
        <div className="flex items-center gap-2 max-w-xl truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00D084] animate-pulse" />
          <span className="text-neutral-300 font-medium">
            {config.name} Multi-Branch Live Storefront
          </span>
          <span className="hidden md:inline text-neutral-500">•</span>
          <span className="hidden md:inline text-neutral-400">
            Current Branch:{" "}
            <strong className="text-white">
              {isClientReady ? currentBranch?.name : ""}
            </strong>
          </span>
        </div>

        <button
    onClick={onOpenAdmin}
    className="flex items-center gap-1.5 bg-[#FF5A1F] hover:bg-[#E04810] text-white text-[11px] font-bold py-1 px-2.5 rounded-md transition-all shadow-xs shrink-0 cursor-pointer"
    title="Open RestaurantOS Admin Management Portal"
  >
          <Shield size={12} />
          <span>RestaurantOS Admin Portal (/admin)</span>
        </button>
      </div>

      {
    /* Sticky Header with Branch / Location Selector */
  }
      <Header
    cartCount={cartCount}
    onOpenCart={() => setIsCartOpen(true)}
    onOpenSearch={handleSearchFocus}
    onOpenOrders={() => {
      if (customerUser) {
        openAccountSection("orders");
      } else {
        setAuthIntent("login");
        setIsAuthModalOpen(true);
      }
    }}
    activeSection={activeSection}
    currentSelection={branchSelection}
    currentBranch={isClientReady ? currentBranch : void 0}
    onOpenLocationModal={() => setIsLocationModalOpen(true)}
    onOpenTimetable={() => setIsTimetableModalOpen(true)}
    onOpenUser={() => {
      if (customerUser) {
        setIsUserMenuOpen(true);
      } else {
        setAuthIntent("register");
        setIsAuthModalOpen(true);
      }
    }}
  />

      {
    /* Main Page Layout Flow */
  }
      <main className="flex-1 pb-20 lg:pb-0">
        {
    /* 1. Hero Section (3 sliding banners) */
  }
        <Hero
    onOrderNow={() => scrollToSection("menu-section")}
    onExploreMenu={() => scrollToSection("menu-section")}
    branchName={isClientReady ? currentBranch?.shortName || currentBranch?.name || "" : ""}
    enabled={isClientReady}
  />

        {
    /* 2. Menu Section:
        - Search Bar + Sort Dropdown at the top
        - Explore Categories (circular image cards) directly below
        - "Showing 13 delicious items" + active filter pills
        - Product Cards Grid
    */
  }
        <MenuSection
    products={storefrontProducts}
    categories={storefrontCategories}
    catalogReady={isClientReady && catalogLoaded && !catalogLoading}
    selectedCategory={selectedCategory}
    onSelectCategory={setSelectedCategory}
    searchQuery={searchQuery}
    onSearchChange={setSearchQuery}
    onSelectProduct={(p) => setSelectedProductForModal(p)}
    onQuickAdd={handleQuickAdd}
    favorites={favorites}
    onToggleFavorite={handleToggleFavorite}
  />

        {
    /* 3. Popular Meals (Shown AFTER Explore Categories and Menu items) */
  }
        <PopularMeals
    products={storefrontProducts}
    catalogReady={isClientReady && catalogLoaded && !catalogLoading}
    onSelectProduct={(p) => setSelectedProductForModal(p)}
    onQuickAdd={handleQuickAdd}
    favorites={favorites}
    onToggleFavorite={handleToggleFavorite}
    onViewAllMenu={() => scrollToSection("menu-section")}
  />

        {
    /* 4. Sizzling Deals / Combos */
  }
        <DealsSection
    branch={isClientReady && locationConfirmed ? currentBranch : null}
    branchName={
      process.env.NEXT_PUBLIC_RESTAURANT_BRANCH_NAME ||
      (isClientReady && locationConfirmed
        ? branchSelection.branchName ||
          currentBranch?.name ||
          currentBranch?.city ||
          currentBranch?.shortName ||
          ""
        : "")
    }
    enabled={isClientReady && locationConfirmed}
    onClaimDeal={handleClaimDeal}
  />

        {
    /* 6. Brand Story / Why Choose Us */
  }
        <BrandStory />
        <HowItWorks onStartOrder={() => scrollToSection("menu-section")} />

        {
    /* 7. Customer Reviews */
  }
        <Testimonials />

        {
    /* 8. Email Subscription / Newsletter */
  }
        <Newsletter />
      </main>

      {
    /* 9. Footer */
  }
      <Footer onNavigate={scrollToSection} />

      {
    /* Mobile Bottom Navigation Bar */
  }
      <MobileBottomNav
    currentSelection={branchSelection}
    currentBranch={currentBranch}
    onOpenLocationModal={() => setIsLocationModalOpen(true)}
    onOpenCart={() => setIsCartOpen(true)}
    cartCount={cartCount}
    cartSubtotal={cartSubtotal}
    onOpenOrders={() => setIsTrackingOpen(true)}
    onOpenSearch={handleSearchFocus}
    onNavigateHome={() => scrollToSection("hero-section")}
    onNavigateMenu={() => scrollToSection("menu-section")}
    activeSection={activeSection}
  />

      {
    /* Floating Scroll-to-Top button */
  }
      {showScrollTop && <button
    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    className="hidden sm:flex fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-white border border-[#E9E2D8] text-[#191919] hover:bg-[#FF5A1F] hover:text-white hover:border-[#FF5A1F] items-center justify-center shadow-md transition-all cursor-pointer"
    aria-label="Scroll to top"
  >
          <ArrowUp className="w-5 h-5" />
        </button>}

      {
    /* Branch & Delivery Area Selection Modal */
  }
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => {
          // After first confirm in this session, allow dismiss; otherwise keep required.
          if (!isFirstVisit) setIsLocationModalOpen(false);
        }}
        branches={branches}
        currentSelection={branchSelection}
        onSelectBranch={handleSelectBranch}
        isFirstVisit={isFirstVisit}
        cartCount={cartItems.length}
        onClearCart={() => {
          void handleClearCart({ silent: true });
        }}
      />

      <DealsWelcomeModal
        isOpen={isDealsWelcomeOpen && !isLocationModalOpen}
        onClose={() => setIsDealsWelcomeOpen(false)}
        branch={currentBranch}
        branchName={
          branchSelection.branchName ||
          currentBranch?.name ||
          currentBranch?.city ||
          currentBranch?.shortName ||
          ""
        }
        onClaimDeal={handleClaimDeal}
        onBrowseAll={() => scrollToSection("deals-section")}
      />

      {
    /* Product Detail / Customization Modal */
  }
      <ProductDetailModal
    product={selectedProductForModal}
    onClose={() => setSelectedProductForModal(null)}
    onAddToCart={handleAddToCart}
  />

      {
    /* Cart Drawer */
  }
      <CartDrawer
    isOpen={isCartOpen}
    onClose={() => setIsCartOpen(false)}
    cartItems={cartItems}
    onUpdateQuantity={handleUpdateQuantity}
    onRemoveItem={handleRemoveItem}
    onClearCart={() => {
      void handleClearCart();
    }}
    isCartBusy={isCartMutating || isCartSyncing}
    onCheckout={() => {
      setIsCartOpen(false);
      setIsCheckoutOpen(true);
    }}
    onBrowseMenu={() => {
      setIsCartOpen(false);
      scrollToSection("menu-section");
    }}
  />

      {
    /* Checkout Modal */
  }
      <CheckoutModal
    isOpen={isCheckoutOpen}
    onClose={() => setIsCheckoutOpen(false)}
    cartItems={cartItems}
    onOrderPlaced={handleOrderPlaced}
    onClearCart={() => {
      setCartItems([]);
      clearGuestCart();
      clearGuestOrderStorage();
    }}
    onRequireLogin={handleRequireLoginForCheckout}
    selectedBranch={currentBranch}
    selectedArea={branchSelection.selectedArea}
    orderMode={branchSelection.orderMode}
    branchId={branchSelection.branchId || currentBranch?.id || ""}
    branchName={
      branchSelection.branchName ||
      currentBranch?.name ||
      currentBranch?.city ||
      currentBranch?.shortName ||
      ""
    }
    latitude={branchSelection.latitude || ""}
    longitude={branchSelection.longitude || ""}
  />

      {
    /* Live Order Tracking Modal */
  }
      <OrderTrackingModal
    isOpen={isTrackingOpen}
    onClose={() => setIsTrackingOpen(false)}
    order={latestOrder}
  />

      {
    /* Branch Timetable & Operating Hours Modal (Requirement 1) */
  }
      <BranchTimetableModal
    isOpen={isTimetableModalOpen}
    onClose={() => setIsTimetableModalOpen(false)}
    branch={currentBranch}
  />

      {
    /* Customer Login / Register Modal (Requirement 2) */
  }
      <CustomerAuthModal
    isOpen={isAuthModalOpen}
    onClose={() => setIsAuthModalOpen(false)}
    initialMode={authIntent}
    onAuthSuccess={handleAuthSuccess}
    onSuccess={handleAuthSuccess}
  />

      {
    /* Customer User Account Dropdown Menu Modal */
  }
      <UserMenuModal
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onNavigateHome={() => {
          setIsUserMenuOpen(false);
          scrollToSection("hero-section");
        }}
        onOpenProfile={() => openAccountSection("profile")}
        onOpenOrders={() => openAccountSection("orders")}
        onOpenWishlist={() => openAccountSection("favourites")}
        onOpenAddresses={() => openAccountSection("addresses")}
        onOpenLoyalty={() => openAccountSection("loyalty")}
        onOpenWallet={() => openAccountSection("wallet")}
      />

      <CustomerAccountPage
        isOpen={isAccountPageOpen}
        onClose={() => setIsAccountPageOpen(false)}
        initialSection={accountSection}
        onGoHome={() => scrollToSection("hero-section")}
        onSelectProduct={(product) => setSelectedProductForModal(product)}
        onQuickAdd={(product) => handleAddToCart(product, 1)}
        onReorder={(items) => {
          if (items?.length > 0) {
            setCartItems(items);
            setIsAccountPageOpen(false);
            setIsCartOpen(true);
            addToast("Items Added to Cart", `Loaded ${items.length} items for reorder.`, "success");
          }
        }}
        onExploreMenu={() => scrollToSection("menu-section")}
      />
    </div>;
};
export {
  CustomerSite
};
