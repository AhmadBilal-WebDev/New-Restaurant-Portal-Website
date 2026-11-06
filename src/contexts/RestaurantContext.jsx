'use client';

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { expireOwnerSession, getOwnerSession, isOwnerSessionExpired } from '@/shared/lib/ownerSession';
import { getOwnerBranches } from '@/shared/lib/branchesApi';
import { extractCurrencyFromProfile } from '@/shared/lib/currencySymbols';
import { buildBranchIdRemap, remapBranchId } from '@/shared/lib/branchScope';
import { getOwnerProfile } from '@/shared/lib/ownerProfile';
import { filterBranchesForStaff, getStaffAccess, isStaffSession } from '@/shared/lib/staffAccess';
import {
  getRestaurantTheme,
  updateRestaurantTheme,
} from '@/shared/lib/restaurantThemeApi';
import { defaultRestaurantConfig } from '@/shared/config/restaurantConfig';
import { products as initialProducts, categories as initialCategories, branches as initialBranches, deals as initialDeals } from '@/shared/data/mockData';
import {
  DEFAULT_WEEKLY_TIMETABLE,
  INITIAL_HERO_BANNERS,
  INITIAL_REVIEWS,
  INITIAL_PROMO_CODES,
  INITIAL_SUBSCRIBERS,
  INITIAL_RIDERS
} from '@/shared/data/seedData';
const demoProductIds = new Set(initialProducts.map((product) => product.id));
const demoCategoryIds = new Set(initialCategories.map((category) => category.id));
const RestaurantContext = createContext(void 0);
const SEED_ORDERS = [
  {
    orderId: "ord-1048",
    orderNumber: "#1048",
    customerName: "Ahmad Bilal",
    customerEmail: "ahmad@gmail.com",
    customerPhone: "+92 300 8472910",
    customerAddress: "House 42, Model Town, Renala Khurd",
    branchId: "branch-renala",
    branchName: "BurgerBlast — Renala Khurd",
    channel: "Website",
    items: [
      {
        cartItemId: "item-1048-1",
        product: initialProducts[0],
        quantity: 2,
        selectedAddons: [],
        unitPrice: initialProducts[0]?.price || 850,
        totalPrice: (initialProducts[0]?.price || 850) * 2
      },
      {
        cartItemId: "item-1048-2",
        product: initialProducts[2] || initialProducts[0],
        quantity: 1,
        selectedAddons: [],
        unitPrice: initialProducts[2]?.price || 150,
        totalPrice: initialProducts[2]?.price || 150
      }
    ],
    itemCount: 3,
    subtotal: 1850,
    discount: 100,
    tax: 0,
    deliveryFee: 150,
    total: 1900,
    paymentMethod: "card",
    paymentStatus: "paid",
    status: "preparing",
    createdAt: "12 mins ago",
    elapsedMinutes: 12,
    estimatedTime: "25 min",
    priority: "rush",
    notes: "Please add extra burger sauce on the side.",
    riderId: "rider-1",
    riderName: "Zubair Khan",
    riderPhone: "+92 301 5544332",
    riderVehicle: "Honda CD 70 — LE 8421 (Red)",
    riderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    deliveryDistance: "2.1 km",
    deliveryCoords: { lat: 30.9612, lng: 73.6015 },
    trackingTimestamps: {
      placedAt: "12:35 PM",
      confirmedAt: "12:38 PM",
      processingAt: "12:42 PM",
      shippedAt: "Pending",
      deliveredAt: "Estimated 01:05 PM"
    },
    reviewOtp: "5842"
  },
  {
    orderId: "ord-1047",
    orderNumber: "#1047",
    customerName: "Zainab Fatima",
    customerEmail: "zainab@gmail.com",
    customerPhone: "+92 321 4452109",
    customerAddress: "Suite 12, Cantt Plaza, Okara",
    branchId: "branch-okara",
    branchName: "BurgerBlast — Okara Cantonment",
    channel: "POS",
    items: [
      {
        cartItemId: "item-1047-1",
        product: initialProducts[1] || initialProducts[0],
        quantity: 2,
        selectedAddons: [],
        unitPrice: initialProducts[1]?.price || 600,
        totalPrice: (initialProducts[1]?.price || 600) * 2
      }
    ],
    itemCount: 2,
    subtotal: 1200,
    discount: 0,
    tax: 0,
    deliveryFee: 0,
    total: 1200,
    paymentMethod: "cash",
    paymentStatus: "paid",
    status: "ready",
    createdAt: "24 mins ago",
    elapsedMinutes: 24,
    estimatedTime: "Ready",
    priority: "normal",
    riderId: "rider-2",
    riderName: "Bilal Tariq",
    riderPhone: "+92 321 8899001",
    riderVehicle: "Yamaha YBR 125 — OK 3190",
    riderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    deliveryDistance: "1.2 km",
    trackingTimestamps: {
      placedAt: "12:15 PM",
      confirmedAt: "12:18 PM",
      processingAt: "12:22 PM",
      shippedAt: "12:38 PM",
      deliveredAt: "Ready for pickup"
    },
    reviewOtp: "3941"
  },
  {
    orderId: "ord-1046",
    orderNumber: "#1046",
    customerName: "Hamza Sheikh",
    customerEmail: "hamza@gmail.com",
    customerPhone: "+92 301 9923847",
    customerAddress: "Flat 4B, MM Alam Road, Lahore",
    branchId: "branch-downtown",
    branchName: "BurgerBlast — Downtown Central",
    channel: "Delivery",
    items: [
      {
        cartItemId: "item-1046-1",
        product: initialProducts[0],
        quantity: 2,
        selectedAddons: [],
        unitPrice: initialProducts[0]?.price || 850,
        totalPrice: (initialProducts[0]?.price || 850) * 2
      },
      {
        cartItemId: "item-1046-2",
        product: initialProducts[1] || initialProducts[0],
        quantity: 1,
        selectedAddons: [],
        unitPrice: initialProducts[1]?.price || 750,
        totalPrice: initialProducts[1]?.price || 750
      },
      {
        cartItemId: "item-1046-3",
        product: initialProducts[3] || initialProducts[0],
        quantity: 2,
        selectedAddons: [],
        unitPrice: 150,
        totalPrice: 300
      }
    ],
    itemCount: 4,
    subtotal: 2750,
    discount: 250,
    tax: 0,
    deliveryFee: 180,
    total: 2680,
    paymentMethod: "online",
    paymentStatus: "paid",
    status: "on_the_way",
    createdAt: "38 mins ago",
    elapsedMinutes: 38,
    estimatedTime: "10 min",
    priority: "normal",
    riderId: "rider-1",
    riderName: "Zubair Khan",
    riderPhone: "+92 301 5544332",
    riderVehicle: "Honda CG 125 — LHR 6109 (Black)",
    riderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    deliveryDistance: "1.8 km",
    deliveryCoords: { lat: 31.5204, lng: 74.3587 },
    trackingTimestamps: {
      placedAt: "12:05 PM",
      confirmedAt: "12:08 PM",
      processingAt: "12:15 PM",
      shippedAt: "12:35 PM",
      deliveredAt: "Estimated 12:50 PM"
    },
    reviewOtp: "9182"
  },
  {
    orderId: "ord-1045",
    orderNumber: "#1045",
    customerName: "Tariq Mehmood",
    customerPhone: "+92 333 1184920",
    customerAddress: "Shop 7, Main GT Road, Renala Khurd",
    branchId: "branch-renala",
    branchName: "BurgerBlast — Renala Khurd",
    channel: "Phone",
    items: [],
    itemCount: 1,
    subtotal: 850,
    discount: 0,
    tax: 0,
    deliveryFee: 150,
    total: 1e3,
    paymentMethod: "cash",
    paymentStatus: "cod",
    status: "delivered",
    createdAt: "1 hour ago",
    elapsedMinutes: 65,
    estimatedTime: "Delivered",
    priority: "normal",
    riderId: "rider-3",
    riderName: "Danish Ali",
    riderPhone: "+92 333 1122334",
    deliveryDistance: "2.4 km",
    reviewOtp: "7429",
    isReviewed: false
  }
];
const SEED_STAFF = [
  {
    id: "staff-1",
    name: "Ahmad Bilal",
    email: "ahmad@burgerblast.com",
    phone: "+92 300 8472910",
    role: "Owner",
    branchId: "all",
    branchName: "All Branches",
    status: "Active",
    lastActive: "Just now",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    permissions: ["all_access", "finance", "staff_mgmt", "menu_edit", "pos_override", "branches_admin", "reviews_admin"]
  },
  {
    id: "staff-2",
    name: "Muhammad Usman",
    email: "usman.renala@burgerblast.com",
    phone: "+92 301 4488211",
    role: "Manager",
    branchId: "branch-renala",
    branchName: "BurgerBlast — Renala Khurd",
    status: "Active",
    lastActive: "5m ago",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
    permissions: ["branch_orders", "kitchen_kds", "cash_close", "inventory", "live_tracking"]
  },
  {
    id: "staff-3",
    name: "Hamza Tariq",
    email: "hamza.okara@burgerblast.com",
    phone: "+92 321 7765100",
    role: "Manager",
    branchId: "branch-okara",
    branchName: "BurgerBlast — Okara Cantonment",
    status: "Active",
    lastActive: "12m ago",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    permissions: ["branch_orders", "kitchen_kds", "cash_close", "live_tracking"]
  },
  {
    id: "staff-4",
    name: "Ali Raza",
    email: "ali.chef@burgerblast.com",
    phone: "+92 304 9912001",
    role: "Kitchen Staff",
    branchId: "branch-renala",
    branchName: "BurgerBlast — Renala Khurd",
    status: "Active",
    lastActive: "Active on KDS",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    permissions: ["kitchen_kds"]
  },
  {
    id: "staff-5",
    name: "Sara Khan",
    email: "sara.cashier@burgerblast.com",
    phone: "+92 333 5522108",
    role: "Cashier",
    branchId: "branch-downtown",
    branchName: "BurgerBlast — Downtown Central",
    status: "Active",
    lastActive: "Active on Counter",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    permissions: ["counter_pos", "receipt_print"]
  }
];
const RestaurantProvider = ({ children }) => {
  const localStorage = typeof window === "undefined" ? { getItem: () => null, setItem: () => void 0, removeItem: () => void 0 } : window.localStorage;
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_restaurant_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        const stamped = localStorage.getItem("ros_superadmin_currency");
        if (stamped) {
          try {
            const currency = JSON.parse(stamped);
            if (currency?.code && currency?.symbol) {
              return { ...parsed, currency: { ...parsed.currency, ...currency } };
            }
          } catch {
          }
        }
        return parsed;
      }
      return defaultRestaurantConfig;
    } catch {
      return defaultRestaurantConfig;
    }
  });
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_products");
      const savedProducts = saved ? JSON.parse(saved) : [];
      const list = savedProducts.filter((product) => !demoProductIds.has(product.id));
      return list.map((p, idx) => ({
        ...p,
        promotionalTag: p.promotionalTag || (idx === 0 ? "bestseller" : idx === 1 ? "new" : idx === 2 ? "discount" : "none"),
        customBuns: p.customBuns || [
          { id: "bun_brioche", name: "Toasted Butter Brioche", price: 0 },
          { id: "bun_potato", name: "Artisan Potato Bun", price: 60 },
          { id: "bun_sesame", name: "Sesame Seed Bun", price: 40 },
          { id: "bun_lettuce", name: "Crisp Lettuce Wrap", price: 0 }
        ],
        customCheese: p.customCheese || [
          { id: "ch_american", name: "American Melted Cheese", price: 0 },
          { id: "ch_cheddar", name: "Smoked Aged Cheddar", price: 80 },
          { id: "ch_pepperjack", name: "Spicy Pepper Jack", price: 80 },
          { id: "ch_none", name: "No Cheese", price: 0 }
        ],
        customToppings: p.customToppings || [
          { id: "top_extra_patty", name: "Extra Patty", price: 250 },
          { id: "top_bacon", name: "Crispy Bacon / Pepperoni", price: 150 },
          { id: "top_jalapenos", name: "Fire Pickled Jalapeños", price: 60 },
          { id: "top_sauce", name: "Signature Secret Sauce Dip", price: 50 },
          { id: "top_fries", name: "Side of Skin-On Fries", price: 180 }
        ]
      }));
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_categories");
      if (saved) {
        const savedCategories = JSON.parse(saved);
        return savedCategories.filter((category) => !demoCategoryIds.has(category.id));
      }
      return [];
    } catch {
      return [];
    }
  });
  const [branches, setBranches] = useState(() => {
    try {
      const loggedIn = localStorage.getItem("ros_admin_logged_in") === "true" || Boolean(getOwnerSession()?.token);
      const saved = localStorage.getItem("ros_branches");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const demoIds = /* @__PURE__ */ new Set(["branch-renala", "branch-okara", "branch-downtown"]);
          const withoutDemo = parsed.filter((b) => !demoIds.has(b.id));
          if (loggedIn) return withoutDemo;
          return withoutDemo.length ? withoutDemo : parsed;
        }
      }
      if (loggedIn) return [];
      const customBranches = defaultRestaurantConfig.defaultBranches.map((b) => ({
        id: b.id,
        name: b.name,
        shortName: b.shortName,
        area: b.city,
        address: b.address,
        city: b.city,
        phone: b.phone,
        whatsapp: "+92 300 1234567",
        googleMapsUrl: "https://maps.google.com",
        operatingHours: b.operatingHours,
        weeklyTimetable: DEFAULT_WEEKLY_TIMETABLE,
        deliveryTime: b.deliveryTime,
        deliveryFee: b.deliveryFee,
        freeDeliveryThreshold: 2e3,
        minOrder: b.minOrder,
        rating: b.rating,
        isOpen: b.isOpen,
        areasServed: b.areasServed,
        isPopular: true,
        ordersToday: b.ordersToday,
        revenueToday: b.revenueToday
      }));
      return customBranches.length ? customBranches : initialBranches;
    } catch {
      return [];
    }
  });
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_orders");
      return saved ? JSON.parse(saved) : SEED_ORDERS;
    } catch {
      return SEED_ORDERS;
    }
  });
  const [staff, setStaff] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_staff");
      return saved ? JSON.parse(saved) : SEED_STAFF;
    } catch {
      return SEED_STAFF;
    }
  });
  const [deals, setDeals] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_deals");
      if (saved) return JSON.parse(saved);
      return initialDeals.map((d) => ({
        ...d,
        isActive: true,
        discountPercent: Math.round((d.originalPrice - d.price) / d.originalPrice * 100)
      }));
    } catch {
      return initialDeals;
    }
  });
  const [heroBanners, setHeroBanners] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_hero_banners");
      return saved ? JSON.parse(saved) : INITIAL_HERO_BANNERS;
    } catch {
      return INITIAL_HERO_BANNERS;
    }
  });
  const [reviews, setReviews] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_reviews");
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });
  const [subscribers, setSubscribers] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_subscribers");
      return saved ? JSON.parse(saved) : INITIAL_SUBSCRIBERS;
    } catch {
      return INITIAL_SUBSCRIBERS;
    }
  });
  const [isSubscriptionEnabled, setIsSubscriptionEnabled] = useState(() => {
    const val = localStorage.getItem("ros_subscription_enabled");
    return val !== null ? val === "true" : true;
  });
  const [promoCodes, setPromoCodes] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_promo_codes");
      return saved ? JSON.parse(saved) : INITIAL_PROMO_CODES;
    } catch {
      return INITIAL_PROMO_CODES;
    }
  });
  const [riders, setRiders] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_riders");
      return saved ? JSON.parse(saved) : INITIAL_RIDERS;
    } catch {
      return INITIAL_RIDERS;
    }
  });
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_customer_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_wishlist");
      if (saved) return JSON.parse(saved);
      return ["classic-smash-meal", "loaded-bbq-burger"];
    } catch {
      return ["classic-smash-meal", "loaded-bbq-burger"];
    }
  });
  const [currentBranchId, setCurrentBranchId] = useState(() => {
    return localStorage.getItem("ros_current_branch_id") || "branch-renala";
  });
  const [currentOrderMode, setCurrentOrderMode] = useState("delivery");
  const [currentArea, setCurrentArea] = useState("Main GT Road");
  const [popularMealIds, setPopularMealIds] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_popular_meal_ids");
      if (saved) return JSON.parse(saved);
      return products.filter((p) => p.isPopular).map((p) => p.id);
    } catch {
      return ["classic-smash-meal", "crispy-chicken-combo", "loaded-bbq-burger", "golden-fries"];
    }
  });
  const [currentStaffRole, setCurrentStaffRole] = useState(() => {
    return localStorage.getItem("ros_current_staff_role") || "Owner";
  });
  const [posStatus, setPosStatus] = useState({
    isConnected: true,
    lastSync: "Just now (Auto-sync active)",
    provider: "RestaurantOS Terminal Gateway v3.2",
    terminalCount: 4,
    health: "excellent",
    syncLogs: [
      { id: "log-1", time: "10:22:15", event: "Menu catalog synced across 3 branches", status: "success" },
      { id: "log-2", time: "10:14:02", event: "Incoming online web orders pushed to kitchen KDS", status: "success" },
      { id: "log-3", time: "09:45:00", event: "Branch terminals handshake verified (Renala & Okara)", status: "success" }
    ]
  });
  const [activeBranchFilter, setActiveBranchFilterState] = useState("all");
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminAuthReady, setIsAdminAuthReady] = useState(false);
  const setActiveBranchFilter = useCallback(
    (branchId) => {
      if (branchId === "all") {
        setActiveBranchFilterState("all");
        return;
      }
      const target = branches.find((b) => b.id === branchId);
      if (!target || target.isActive === false) return;
      setActiveBranchFilterState(branchId);
      setCurrentBranchId(branchId);
    },
    [branches]
  );
  const [adminTheme, setAdminThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_admin_theme");
      return saved === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [isThemeSaving, setIsThemeSaving] = useState(false);

  const persistAdminThemeLocal = useCallback((theme) => {
    try {
      localStorage.setItem("ros_admin_theme", theme);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const applyAdminTheme = useCallback(
    (theme) => {
      const next = theme === "light" ? "light" : "dark";
      setAdminThemeState(next);
      persistAdminThemeLocal(next);
      return next;
    },
    [persistAdminThemeLocal],
  );

  /** Load saved theme from API for this domain (admin only). */
  useEffect(() => {
    if (!isAdminAuthReady || !isAdminLoggedIn) return;
    let cancelled = false;

    (async () => {
      const result = await getRestaurantTheme();
      if (cancelled || !result.ok || !result.theme) return;
      applyAdminTheme(result.theme);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdminAuthReady, isAdminLoggedIn, applyAdminTheme]);

  const setAdminTheme = useCallback(
    async (theme) => {
      const next = theme === "light" ? "light" : "dark";
      const previous = adminTheme;
      applyAdminTheme(next);
      setIsThemeSaving(true);
      try {
        const result = await updateRestaurantTheme(next);
        if (!result.ok) {
          applyAdminTheme(previous);
          return { ok: false, theme: previous, message: result.message };
        }
        applyAdminTheme(result.theme || next);
        return { ok: true, theme: result.theme || next };
      } finally {
        setIsThemeSaving(false);
      }
    },
    [adminTheme, applyAdminTheme],
  );

  const toggleAdminTheme = useCallback(async () => {
    const next = adminTheme === "dark" ? "light" : "dark";
    return setAdminTheme(next);
  }, [adminTheme, setAdminTheme]);
  const [toasts, setToasts] = useState([]);
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
  useEffect(() => {
    try {
      localStorage.setItem("ros_restaurant_config", JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_products", JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_categories", JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_branches", JSON.stringify(branches));
    } catch (e) {
      console.error(e);
    }
  }, [branches]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_orders", JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
  }, [orders]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_staff", JSON.stringify(staff));
    } catch (e) {
      console.error(e);
    }
  }, [staff]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_deals", JSON.stringify(deals));
    } catch (e) {
      console.error(e);
    }
  }, [deals]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_hero_banners", JSON.stringify(heroBanners));
    } catch (e) {
      console.error(e);
    }
  }, [heroBanners]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_reviews", JSON.stringify(reviews));
    } catch (e) {
      console.error(e);
    }
  }, [reviews]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_subscribers", JSON.stringify(subscribers));
    } catch (e) {
      console.error(e);
    }
  }, [subscribers]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_subscription_enabled", String(isSubscriptionEnabled));
    } catch (e) {
      console.error(e);
    }
  }, [isSubscriptionEnabled]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_promo_codes", JSON.stringify(promoCodes));
    } catch (e) {
      console.error(e);
    }
  }, [promoCodes]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_riders", JSON.stringify(riders));
    } catch (e) {
      console.error(e);
    }
  }, [riders]);
  useEffect(() => {
    try {
      if (customerUser) {
        localStorage.setItem("ros_customer_user", JSON.stringify(customerUser));
      } else {
        localStorage.removeItem("ros_customer_user");
      }
    } catch (e) {
      console.error(e);
    }
  }, [customerUser]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_wishlist", JSON.stringify(wishlist));
    } catch (e) {
      console.error(e);
    }
  }, [wishlist]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_current_branch_id", currentBranchId);
    } catch (e) {
      console.error(e);
    }
  }, [currentBranchId]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_popular_meal_ids", JSON.stringify(popularMealIds));
    } catch (e) {
      console.error(e);
    }
  }, [popularMealIds]);
  useEffect(() => {
    try {
      localStorage.setItem("ros_current_staff_role", currentStaffRole);
    } catch (e) {
      console.error(e);
    }
  }, [currentStaffRole]);
  useEffect(() => {
    try {
      const session = getOwnerSession();
      const sessionExpired = Boolean(session && isOwnerSessionExpired(session.token));
      if (sessionExpired) expireOwnerSession();
      const loggedIn = !sessionExpired && (localStorage.getItem("ros_admin_logged_in") === "true" || Boolean(session?.token));
      setIsAdminLoggedIn(loggedIn);
    } catch {
      setIsAdminLoggedIn(false);
    } finally {
      setIsAdminAuthReady(true);
    }
  }, []);
  useEffect(() => {
    if (!isAdminAuthReady || !isAdminLoggedIn) return;
    let cancelled = false;
    async function syncFromBackend() {
      const domain = typeof window !== "undefined" ? window.location.origin : "";
      const [branchesResult, profileResult] = await Promise.all([
        getOwnerBranches(domain),
        getOwnerProfile()
      ]);
      if (cancelled) return;
      if (branchesResult.ok) {
        const nextBranches = branchesResult.branches;
        const live = nextBranches.filter((b) => b.isActive !== false);
        const liveIds = live.map((b) => b.id);
        const idMap = buildBranchIdRemap(nextBranches);
        const branchNameById = Object.fromEntries(nextBranches.map((b) => [b.id, b.name]));
        setBranches(nextBranches);
        try {
          localStorage.setItem("ros_branches", JSON.stringify(nextBranches));
          if (liveIds.length === 0) {
            localStorage.removeItem("ros_branch_remap_sig");
            localStorage.removeItem("ros_branch_remap_sig_v2");
            localStorage.removeItem("ros_branch_remap_sig_v3");
          }
        } catch {
        }
        if (liveIds.length > 0) {
          const signature = liveIds.slice().sort().join("|");
          let alreadyMapped = false;
          try {
            alreadyMapped = localStorage.getItem("ros_branch_remap_sig_v3") === signature;
          } catch {
            alreadyMapped = false;
          }
          if (!alreadyMapped) {
            setOrders(
              (prev) => prev.map((order, index) => {
                const nextId = remapBranchId(order.branchId, idMap, liveIds, index) || liveIds[0];
                return {
                  ...order,
                  branchId: nextId,
                  branchName: branchNameById[nextId] || order.branchName
                };
              })
            );
            setRiders(
              (prev) => prev.map((rider, index) => {
                const nextId = remapBranchId(rider.branchId, idMap, liveIds, index) || liveIds[0];
                return {
                  ...rider,
                  branchId: nextId,
                  branchName: branchNameById[nextId] || rider.branchName
                };
              })
            );
            setStaff(
              (prev) => prev.map((member, index) => {
                if (member.branchId === "all") return member;
                const nextId = remapBranchId(member.branchId, idMap, liveIds, index) || liveIds[0];
                return {
                  ...member,
                  branchId: nextId,
                  branchName: branchNameById[nextId] || member.branchName
                };
              })
            );
            setReviews(
              (prev) => prev.map((review, index) => {
                const nextId = remapBranchId(review.branchId, idMap, liveIds, index) || liveIds[0];
                return {
                  ...review,
                  branchId: nextId,
                  branchName: branchNameById[nextId] || review.branchName
                };
              })
            );
            setProducts(
              (prev) => prev.map((product, index) => {
                const existing = product.branchAvailability?.length ? product.branchAvailability : product.branchIds || [];
                const remappedExisting = existing.map(
                  (id, i) => id === "all" ? "all" : remapBranchId(id, idMap, liveIds, index + i) || liveIds[0]
                ).filter(Boolean);
                const coversAll = remappedExisting.length === 0 || remappedExisting.includes("all") || liveIds.every((id) => remappedExisting.includes(id));
                const nextAvailability = coversAll ? [liveIds[index % liveIds.length]] : Array.from(new Set(remappedExisting.filter((id) => id !== "all")));
                return {
                  ...product,
                  branchAvailability: nextAvailability,
                  branchIds: nextAvailability
                };
              })
            );
            setDeals(
              (prev) => prev.map((deal, index) => {
                const nextId = liveIds[index % liveIds.length];
                return {
                  ...deal,
                  branchId: deal.branchId && deal.branchId !== "all" ? remapBranchId(deal.branchId, idMap, liveIds, index) || nextId : nextId
                };
              })
            );
            setCategories(
              (prev) => prev.map((category, index) => ({
                ...category,
                branchId: category.branchId && category.branchId !== "all" ? remapBranchId(category.branchId, idMap, liveIds, index) || liveIds[index % liveIds.length] : liveIds[index % liveIds.length]
              }))
            );
            setHeroBanners(
              (prev) => prev.map((banner, index) => ({
                ...banner,
                branchId: banner.branchId && banner.branchId !== "all" ? remapBranchId(banner.branchId, idMap, liveIds, index) || liveIds[index % liveIds.length] : liveIds[index % liveIds.length]
              }))
            );
            setSubscribers(
              (prev) => prev.map((sub, index) => ({
                ...sub,
                branchId: sub.branchId && sub.branchId !== "all" ? remapBranchId(sub.branchId, idMap, liveIds, index) || liveIds[index % liveIds.length] : liveIds[index % liveIds.length]
              }))
            );
            try {
              localStorage.setItem("ros_branch_remap_sig_v3", signature);
              localStorage.removeItem("ros_branch_remap_sig");
              localStorage.removeItem("ros_branch_remap_sig_v2");
            } catch {
            }
          }
        }
        setActiveBranchFilterState((prev) => {
          if (nextBranches.length === 0) return "all";
          if (isStaffSession()) {
            const scoped = filterBranchesForStaff(nextBranches, getStaffAccess()).filter(
              (b) => b.isActive !== false
            );
            if (scoped.length === 1) return scoped[0].id;
            if (scoped.length === 0) return "all";
            if (prev !== "all" && scoped.some((b) => b.id === prev)) return prev;
            return "all";
          }
          if (prev === "all") return prev;
          const stillActive = nextBranches.find((b) => b.id === prev && b.isActive !== false);
          return stillActive ? prev : "all";
        });
        setCurrentBranchId((prev) => {
          if (live.length === 0) return "";
          if (isStaffSession()) {
            const scoped = filterBranchesForStaff(nextBranches, getStaffAccess()).filter(
              (b) => b.isActive !== false
            );
            if (scoped.length === 0) return "";
            if (scoped.some((b) => b.id === prev)) return prev;
            return scoped[0].id;
          }
          if (live.some((b) => b.id === prev)) return prev;
          return live[0].id;
        });
      }
      if (profileResult.ok && profileResult.data) {
        const currency = extractCurrencyFromProfile(profileResult.data);
        if (currency) {
          setConfig((prev) => ({
            ...prev,
            currency: {
              ...prev.currency,
              code: currency.code,
              symbol: currency.symbol,
              position: currency.position
            }
          }));
          try {
            localStorage.setItem(
              "ros_superadmin_currency",
              JSON.stringify({
                code: currency.code,
                symbol: currency.symbol,
                position: currency.position
              })
            );
          } catch {
          }
        }
      }
    }
    void syncFromBackend();
    const onFocus = () => {
      void syncFromBackend();
    };
    const pollId = window.setInterval(() => {
      void syncFromBackend();
    }, 45e3);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAdminAuthReady, isAdminLoggedIn]);
  useEffect(() => {
    if (!isAdminAuthReady) return;
    try {
      localStorage.setItem("ros_admin_logged_in", String(isAdminLoggedIn));
    } catch (e) {
      console.error(e);
    }
  }, [isAdminLoggedIn, isAdminAuthReady]);
  const addToast = (title, message, type = "success") => {
    const id = "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4e3);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  const formatPrice = (amount) => {
    const stamped = typeof window !== "undefined" ? localStorage.getItem("ros_superadmin_currency") : null;
    let sym = config.currency.symbol;
    let position = config.currency.position;
    if (stamped) {
      try {
        const parsed = JSON.parse(stamped);
        if (parsed.symbol) sym = parsed.symbol;
        if (parsed.position) position = parsed.position;
      } catch {
      }
    }
    const formattedNum = Number(amount || 0).toLocaleString(void 0, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return position === "prefix" ? `${sym}${formattedNum}` : `${formattedNum} ${sym}`;
  };
  const updateConfig = (partial) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    addToast("Settings Saved", "Restaurant branding and preferences updated successfully.", "success");
  };
  const resetConfig = () => {
    setConfig(defaultRestaurantConfig);
    addToast("Reset Complete", "Default settings restored.", "info");
  };
  const addProduct = (p) => {
    const newProduct = {
      ...p,
      id: "prod_" + Date.now()
    };
    setProducts((prev) => [newProduct, ...prev]);
    addToast("Product Added", `"${p.name}" has been added to the menu.`, "success");
  };
  const updateProduct = (productOrId, partial) => {
    if (typeof productOrId === "string") {
      setProducts(
        (prev) => prev.map((item) => item.id === productOrId ? { ...item, ...partial } : item)
      );
      addToast("Product Updated", "Product details saved.", "success");
    } else {
      setProducts((prev) => prev.map((item) => item.id === productOrId.id ? productOrId : item));
      addToast("Product Updated", `"${productOrId.name}" details updated.`, "success");
    }
  };
  const toggleProductStock = (id) => {
    setProducts(
      (prev) => prev.map(
        (item) => item.id === id ? { ...item, inStock: item.inStock === false ? true : false } : item
      )
    );
    addToast("Stock Toggled", "Item availability updated in menu.", "info");
  };
  const deleteProduct = (id) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast("Product Removed", `Product ${target ? `"${target.name}"` : ""} was removed.`, "warning");
  };
  const addCategory = (c) => {
    const newCat = {
      ...c,
      id: c.name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
      isActive: c.isActive !== void 0 ? c.isActive : true
    };
    setCategories((prev) => [...prev, newCat]);
    addToast("Category Created", `Category "${c.name}" added.`, "success");
  };
  const updateCategory = (categoryOrId, partial) => {
    if (typeof categoryOrId === "string") {
      setCategories(
        (prev) => prev.map((c) => c.id === categoryOrId ? { ...c, ...partial } : c)
      );
      addToast("Category Updated", "Category details updated.", "success");
    } else {
      setCategories((prev) => prev.map((c) => c.id === categoryOrId.id ? categoryOrId : c));
      addToast("Category Updated", `Category "${categoryOrId.name}" updated.`, "success");
    }
  };
  const deleteCategory = (id) => {
    const target = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    addToast("Category Deleted", `Category ${target?.name} deleted.`, "warning");
  };
  const addBranch = (b) => {
    const newBranch = {
      ...b,
      id: "branch_" + Date.now(),
      weeklyTimetable: b.weeklyTimetable || DEFAULT_WEEKLY_TIMETABLE,
      whatsapp: b.whatsapp || "+92 300 1234567",
      googleMapsUrl: b.googleMapsUrl || "https://maps.google.com",
      freeDeliveryThreshold: b.freeDeliveryThreshold || 2e3,
      ordersToday: 0,
      revenueToday: 0
    };
    setBranches((prev) => [...prev, newBranch]);
    addToast("Branch Added", `New location "${b.name}" is now active.`, "success");
  };
  const updateBranch = (branchOrId, partial) => {
    if (typeof branchOrId === "string") {
      setBranches(
        (prev) => prev.map((b) => b.id === branchOrId ? { ...b, ...partial } : b)
      );
      addToast("Branch Updated", "Branch settings updated.", "success");
    } else {
      setBranches((prev) => prev.map((b) => b.id === branchOrId.id ? branchOrId : b));
      addToast("Branch Updated", `Branch "${branchOrId.name}" settings updated.`, "success");
    }
  };
  const deleteBranch = (id) => {
    const target = branches.find((b) => b.id === id);
    setBranches((prev) => prev.filter((b) => b.id !== id));
    addToast("Branch Removed", `Branch "${target?.name}" removed.`, "warning");
  };
  const placeCustomerOrder = (payload) => {
    const branchObj = branches.find((b) => b.id === payload.branchId) || branches[0];
    const orderNum = "#" + (1050 + orders.length);
    const assignedRider = riders[Math.floor(Math.random() * riders.length)];
    const generatedOtp = Math.floor(1e3 + Math.random() * 9e3).toString();
    const newOrder = {
      orderId: "ord-" + Date.now(),
      orderNumber: orderNum,
      customerName: payload.customerName || customerUser?.name || "Online Guest",
      customerPhone: payload.phone || customerUser?.phone || "+92 300 0000000",
      customerAddress: payload.address || "Takeaway Pickup",
      branchId: branchObj?.id || "branch-renala",
      branchName: branchObj?.name || config.name,
      channel: payload.orderMode === "pickup" ? "POS" : "Website",
      items: payload.items,
      itemCount: payload.items.reduce((acc, item) => acc + item.quantity, 0),
      subtotal: payload.subtotal,
      discount: 0,
      tax: 0,
      // 0 tax applied as per requirement 14
      deliveryFee: payload.orderMode === "pickup" ? 0 : payload.deliveryFee,
      total: payload.total,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentMethod === "cash" ? "cod" : "paid",
      status: "received",
      createdAt: "Just now",
      elapsedMinutes: 0,
      estimatedTime: payload.orderMode === "pickup" ? "15-20 min" : "25-35 min",
      priority: "normal",
      notes: payload.notes,
      riderId: assignedRider?.id,
      riderName: assignedRider?.name || "Zubair Khan",
      riderPhone: assignedRider?.phone || "+92 301 5544332",
      deliveryDistance: "2.4 km",
      deliveryCoords: { lat: 30.9577, lng: 73.6124 },
      reviewOtp: generatedOtp,
      isReviewed: false
    };
    setOrders((prev) => [newOrder, ...prev]);
    setBranches(
      (prev) => prev.map(
        (b) => b.id === newOrder.branchId ? {
          ...b,
          ordersToday: (b.ordersToday || 0) + 1,
          revenueToday: (b.revenueToday || 0) + newOrder.total
        } : b
      )
    );
    addToast(
      "Order Placed Successfully!",
      `Order ${newOrder.orderNumber} for ${newOrder.customerName} (${formatPrice(newOrder.total)}) placed at ${branchObj?.shortName || "Branch"}.`,
      "success"
    );
    return newOrder;
  };
  const updateOrderStatus = (orderId, status) => {
    setOrders(
      (prev) => prev.map((o) => {
        if (o.orderId === orderId) {
          return { ...o, status };
        }
        return o;
      })
    );
    const ord = orders.find((o) => o.orderId === orderId);
    addToast(
      "Order Status Updated",
      `Order ${ord ? ord.orderNumber : ""} moved to "${status.replace("_", " ").toUpperCase()}".`,
      "info"
    );
  };
  const addStaff = (member) => {
    const newMember = {
      ...member,
      id: "staff_" + Date.now()
    };
    setStaff((prev) => [...prev, newMember]);
    addToast("Staff Added", `${member.name} assigned as ${member.role}.`, "success");
  };
  const updateStaff = (memberOrId, partial) => {
    if (typeof memberOrId === "string") {
      setStaff(
        (prev) => prev.map((s) => s.id === memberOrId ? { ...s, ...partial } : s)
      );
      addToast("Staff Updated", "Staff member profile updated.", "success");
    } else {
      setStaff((prev) => prev.map((s) => s.id === memberOrId.id ? memberOrId : s));
      addToast("Staff Updated", `${memberOrId.name}'s profile updated.`, "success");
    }
  };
  const deleteStaff = (id) => {
    const target = staff.find((s) => s.id === id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
    addToast("Staff Removed", `${target?.name} removed from roster.`, "warning");
  };
  const addDeal = (d) => {
    const newDeal = {
      ...d,
      id: "deal_" + Date.now(),
      isActive: d.isActive !== void 0 ? d.isActive : true
    };
    setDeals((prev) => [newDeal, ...prev]);
    addToast("Combo Deal Created", `Deal "${d.title}" added to active combos.`, "success");
  };
  const updateDeal = (dealOrId, partial) => {
    if (typeof dealOrId === "string") {
      setDeals((prev) => prev.map((d) => d.id === dealOrId ? { ...d, ...partial } : d));
    } else {
      setDeals((prev) => prev.map((d) => d.id === dealOrId.id ? dealOrId : d));
    }
    addToast("Deal Updated", "Combo deal settings saved.", "success");
  };
  const deleteDeal = (id) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
    addToast("Deal Deleted", "Combo deal removed.", "warning");
  };
  const toggleDealActive = (id) => {
    setDeals(
      (prev) => prev.map((d) => d.id === id ? { ...d, isActive: !d.isActive } : d)
    );
    addToast("Deal Status Changed", "Combo visibility updated.", "info");
  };
  const updateHeroBanner = (id, partial) => {
    setHeroBanners(
      (prev) => prev.map((b) => b.id === id ? { ...b, ...partial } : b)
    );
    addToast("Hero Banner Updated", "Banner promotional content updated.", "success");
  };
  const addHeroBanner = (b) => {
    const newBanner = {
      ...b,
      id: "banner_" + Date.now()
    };
    setHeroBanners((prev) => [...prev, newBanner]);
    addToast("Banner Added", "New hero promotional banner created.", "success");
  };
  const deleteHeroBanner = (id) => {
    if (heroBanners.length <= 1) {
      addToast("Cannot Remove", "At least one hero banner is required.", "error");
      return;
    }
    setHeroBanners((prev) => prev.filter((b) => b.id !== id));
    addToast("Banner Removed", "Banner deleted.", "info");
  };
  const addReview = (reviewData) => {
    const order = orders.find((o) => o.orderId === reviewData.orderId || o.orderNumber === reviewData.orderId);
    if (!order) {
      return { success: false, message: "Order not found. Please check your Order ID." };
    }
    if (order.isReviewed) {
      return { success: false, message: "A review has already been submitted for this order." };
    }
    if (reviewData.otpCode && order.reviewOtp && reviewData.otpCode.trim() !== order.reviewOtp.trim()) {
      return { success: false, message: `Invalid verification code. Please enter the 4-digit code shown on your order receipt (${order.reviewOtp}).` };
    }
    const newRev = {
      id: "rev_" + Date.now(),
      orderId: order.orderNumber,
      customerName: reviewData.customerName || order.customerName,
      restaurantName: config.name,
      branchId: order.branchId,
      branchName: order.branchName,
      rating: reviewData.rating,
      comment: reviewData.comment,
      favoriteOrder: reviewData.favoriteOrder || order.items[0]?.product.name || "Signature Burger",
      date: "Just now",
      status: "approved",
      // Auto-approved or visible to admin
      verified: true
    };
    setReviews((prev) => [newRev, ...prev]);
    setOrders(
      (prev) => prev.map((o) => o.orderId === order.orderId ? { ...o, isReviewed: true, rating: reviewData.rating } : o)
    );
    addToast("Review Submitted", "Thank you for your feedback!", "success");
    return { success: true, message: "Your review has been verified and published!" };
  };
  const updateReviewStatus = (id, status) => {
    setReviews(
      (prev) => prev.map((r) => r.id === id ? { ...r, status } : r)
    );
    addToast("Review Updated", `Review status changed to ${status}.`, "info");
  };
  const deleteReview = (id) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    addToast("Review Removed", "Customer review deleted.", "warning");
  };
  const addSubscriber = (email) => {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Please enter a valid email address." };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (subscribers.some((s) => s.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: "This email is already subscribed to our newsletter!" };
    }
    const newSub = {
      id: "sub_" + Date.now(),
      email: cleanEmail,
      subscribedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      status: "active",
      branch: currentBranch?.shortName || "All Branches"
    };
    setSubscribers((prev) => [newSub, ...prev]);
    addToast("Subscribed!", "Welcome to Bite & Burger VIP club! Check your inbox for exclusive deals.", "success");
    return { success: true, message: "Thank you for subscribing!" };
  };
  const deleteSubscriber = (id) => {
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    addToast("Subscriber Removed", "Email removed from marketing list.", "info");
  };
  const addPromoCode = (promo) => {
    const newPromo = {
      ...promo,
      id: "promo_" + Date.now(),
      code: promo.code.toUpperCase().trim(),
      usageCount: 0
    };
    setPromoCodes((prev) => [newPromo, ...prev]);
    addToast("Promo Code Created", `Code "${newPromo.code}" is now active.`, "success");
  };
  const updatePromoCode = (id, partial) => {
    setPromoCodes(
      (prev) => prev.map((p) => p.id === id ? { ...p, ...partial } : p)
    );
    addToast("Promo Updated", "Promo code settings updated.", "success");
  };
  const deletePromoCode = (id) => {
    setPromoCodes((prev) => prev.filter((p) => p.id !== id));
    addToast("Promo Removed", "Promo code deleted.", "warning");
  };
  const applyPromoCode = (code, subtotal) => {
    const cleanCode = code.trim().toUpperCase();
    const match = promoCodes.find((p) => p.code === cleanCode && p.isActive);
    if (!match) {
      return { success: false, discount: 0, message: "Invalid or expired promo code." };
    }
    if (subtotal < match.minOrderAmount) {
      return {
        success: false,
        discount: 0,
        message: `Minimum order amount of ${formatPrice(match.minOrderAmount)} required to use "${match.code}".`
      };
    }
    let disc = 0;
    if (match.discountType === "percentage") {
      disc = subtotal * match.discountValue / 100;
      if (match.maxDiscount && disc > match.maxDiscount) {
        disc = match.maxDiscount;
      }
    } else {
      disc = match.discountValue;
    }
    disc = Math.min(disc, subtotal);
    return {
      success: true,
      discount: Math.round(disc),
      promo: match,
      message: `Promo code applied! You saved ${formatPrice(disc)}.`
    };
  };
  const updateRiderLocation = (riderId, lat, lng) => {
    setRiders(
      (prev) => prev.map((r) => r.id === riderId ? { ...r, currentLat: lat, currentLng: lng } : r)
    );
  };
  const assignRiderToOrder = (orderId, riderId) => {
    const rider = riders.find((r) => r.id === riderId);
    if (!rider) return;
    setOrders(
      (prev) => prev.map(
        (o) => o.orderId === orderId ? {
          ...o,
          riderId: rider.id,
          riderName: rider.name,
          riderPhone: rider.phone,
          status: "on_the_way"
        } : o
      )
    );
    addToast("Rider Assigned", `${rider.name} is dispatched for Order.`, "success");
  };
  const completeCustomerAuth = ({ token, user, branch } = {}) => {
    if (!user) {
      return { success: false, message: "Missing customer user." };
    }
    const nextUser = {
      ...user,
      phone:
        user.phone ||
        [user.countryCode, user.contactNumber].filter(Boolean).join(" ") ||
        ""
    };
    setCustomerUser(nextUser);
    try {
      if (token) localStorage.setItem("ros_customer_token", token);
      localStorage.setItem("ros_customer_user", JSON.stringify(nextUser));
    } catch {
      /* ignore */
    }
    if (branch?.id) {
      setCurrentBranchId(String(branch.id));
      try {
        localStorage.setItem("ros_current_branch_id", String(branch.id));
      } catch {
        /* ignore */
      }
    }
    return { success: true, message: "Login successful!", user: nextUser };
  };
  const loginCustomerUser = (email, _password) => {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Please provide a valid email address." };
    }
    const cleanEmail = email.trim().toLowerCase();
    const existingName = cleanEmail.split("@")[0].replace(/[^a-zA-Z]/g, " ");
    const formattedName = existingName ? existingName.charAt(0).toUpperCase() + existingName.slice(1) : "Bite Lover";
    const user = {
      id: "user_" + Date.now(),
      name: formattedName,
      email: cleanEmail,
      dob: "1998-05-14",
      phone: "+92 300 1234567",
      savedAddresses: ["Model Town, Renala Khurd", "Main GT Road"]
    };
    return completeCustomerAuth({ user });
  };
  const registerCustomerUser = (data) => {
    if (!data.name || !data.email) {
      return { success: false, message: "Please enter your name and email." };
    }
    const user = {
      id: "user_" + Date.now(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      dob: data.dob || "2000-01-01",
      phone: data.phone?.trim() || "+92 300 0000000",
      savedAddresses: []
    };
    return completeCustomerAuth({ user });
  };
  const updateCustomerProfile = (partial) => {
    setCustomerUser((prev) => {
      if (!prev) return null;
      const next = {
        ...prev,
        ...partial,
        phone:
          partial?.phone ||
          [partial?.countryCode || prev.countryCode, partial?.contactNumber || prev.contactNumber]
            .filter(Boolean)
            .join(" ") ||
          prev.phone ||
          ""
      };
      try {
        localStorage.setItem("ros_customer_user", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const clearCustomerSession = () => {
    setCustomerUser(null);
    try {
      localStorage.removeItem("ros_customer_user");
      localStorage.removeItem("ros_customer_token");
    } catch {
      /* ignore */
    }
  };
  const logoutCustomerUser = async () => {
    try {
      const { logoutCustomerApi } = await import("@/shared/lib/customerAuthApi");
      await logoutCustomerApi();
    } catch {
      /* still clear local session */
    }
    clearCustomerSession();
    addToast("Logged Out", "You have been signed out.", "info");
  };
  const toggleWishlist = (productId) => {
    const exists = wishlist.includes(productId);
    const updated = exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId];
    setWishlist(updated);
    const product = products.find((p) => p.id === productId);
    const productName = product ? product.name : "Item";
    if (!exists) {
      addToast("Added to Wishlist", `${productName} saved to your favorites.`, "success");
    } else {
      addToast("Removed from Wishlist", `${productName} removed from favorites.`, "info");
    }
    return { added: !exists };
  };
  const isWishlisted = (productId) => {
    return wishlist.includes(productId);
  };
  const clearWishlist = () => {
    setWishlist([]);
    addToast("Wishlist Cleared", "All saved items have been removed.", "info");
  };
  const togglePopularMeal = (id) => {
    setPopularMealIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((i) => i !== id) : [...prev, id];
      setProducts(
        (prodList) => prodList.map((p) => p.id === id ? { ...p, isPopular: !exists } : p)
      );
      addToast(
        exists ? "Removed from Popular Meals" : "Added to Popular Meals",
        "Popular meals section updated.",
        "info"
      );
      return updated;
    });
  };
  const setProductPromotionalTag = (id, tag) => {
    setProducts(
      (prev) => prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            promotionalTag: tag,
            isBestseller: tag === "bestseller",
            isNew: tag === "new"
          };
        }
        return p;
      })
    );
    addToast("Tag Updated", `Promotional tag set to "${tag.toUpperCase()}".`, "success");
  };
  const syncPOS = () => {
    setPosStatus((prev) => ({
      ...prev,
      lastSync: "Syncing in progress..."
    }));
    setTimeout(() => {
      setPosStatus((prev) => ({
        ...prev,
        lastSync: "Just now (" + (/* @__PURE__ */ new Date()).toLocaleTimeString() + ")",
        syncLogs: [
          {
            id: "log_" + Date.now(),
            time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
            event: `Full catalog & orders sync with ${prev.terminalCount} active terminals`,
            status: "success"
          },
          ...prev.syncLogs.slice(0, 9)
        ]
      }));
      addToast("POS Synced", "All terminal catalogs, pricing, and live orders synchronized.", "success");
    }, 1200);
  };
  const updateOrderRider = (orderId, riderId, riderName, riderPhone) => {
    setOrders(
      (prev) => prev.map(
        (o) => o.orderId === orderId ? {
          ...o,
          assignedRiderId: riderId,
          assignedRiderName: riderName,
          assignedRiderPhone: riderPhone,
          riderId,
          riderName,
          riderPhone
        } : o
      )
    );
  };
  const addRider = (r) => {
    const newRider = {
      ...r,
      id: "rider_" + Date.now(),
      rating: r.rating || 4.9,
      currentLat: r.currentLat || 30.9612,
      currentLng: r.currentLng || 73.6015,
      status: r.status || "available",
      completedOrdersCount: 0
    };
    setRiders((prev) => [newRider, ...prev]);
    addToast("Rider Added", `Rider ${newRider.name} added to fleet.`, "success");
  };
  const updateRider = (riderOrId, partial) => {
    if (typeof riderOrId === "string") {
      setRiders((prev) => prev.map((r) => r.id === riderOrId ? { ...r, ...partial } : r));
    } else {
      setRiders((prev) => prev.map((r) => r.id === riderOrId.id ? riderOrId : r));
    }
    addToast("Rider Updated", "Rider details saved.", "success");
  };
  const deleteRider = (id) => {
    setRiders((prev) => prev.filter((r) => r.id !== id));
    addToast("Rider Deleted", "Rider removed from fleet.", "info");
  };
  const updateCustomerReview = (rev) => {
    setReviews((prev) => prev.map((r) => r.id === rev.id ? rev : r));
    addToast("Review Updated", "Review details updated.", "success");
  };
  const deleteCustomerReview = (id) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    addToast("Review Deleted", "Review removed.", "info");
  };
  return <RestaurantContext.Provider
    value={{
      config,
      updateConfig,
      resetConfig,
      resetConfigToDefault: resetConfig,
      products,
      setProducts,
      addProduct,
      updateProduct,
      toggleProductStock,
      deleteProduct,
      categories,
      setCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      branches,
      setBranches,
      addBranch,
      updateBranch,
      deleteBranch,
      orders,
      placeCustomerOrder,
      updateOrderStatus,
      staff,
      addStaff,
      updateStaff,
      deleteStaff,
      posStatus,
      syncPOS,
      activeBranchFilter,
      setActiveBranchFilter,
      activeAdminTab,
      setActiveAdminTab,
      formatPrice,
      toasts,
      addToast,
      removeToast,
      isAdminLoggedIn,
      isAdminAuthReady,
      setIsAdminLoggedIn,
      adminTheme,
      setAdminTheme,
      toggleAdminTheme,
      isThemeSaving,
      // Deals
      deals,
      addDeal,
      updateDeal,
      deleteDeal,
      toggleDealActive,
      // Hero
      heroBanners,
      setHeroBanners,
      updateHeroBanner,
      addHeroBanner,
      deleteHeroBanner,
      // Reviews
      reviews,
      addReview,
      updateReviewStatus,
      deleteReview,
      // Subscribers
      subscribers,
      addSubscriber,
      deleteSubscriber,
      isSubscriptionEnabled,
      setIsSubscriptionEnabled,
      // Promos
      promoCodes,
      addPromoCode,
      updatePromoCode,
      deletePromoCode,
      applyPromoCode,
      // Riders
      riders,
      updateRiderLocation,
      assignRiderToOrder,
      // Customer Auth
      customerUser,
      completeCustomerAuth,
      clearCustomerSession,
      loginCustomerUser,
      registerCustomerUser,
      updateCustomerProfile,
      logoutCustomerUser,
      // Wishlist
      wishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
      // Branch Selection
      currentBranchId,
      setCurrentBranchId,
      currentOrderMode,
      setCurrentOrderMode,
      currentArea,
      setCurrentArea,
      currentBranch,
      // Popular Meals
      popularMealIds,
      togglePopularMeal,
      setProductPromotionalTag,
      // Permissions
      currentStaffRole,
      setCurrentStaffRole,
      currentAdminRole: currentStaffRole,
      setCurrentAdminRole: setCurrentStaffRole,
      // Aliases
      currentUser: customerUser,
      customerReviews: reviews,
      addCustomerReview: addReview,
      updateCustomerReview,
      deleteCustomerReview,
      addRider,
      updateRider,
      deleteRider,
      subscribeEmail: addSubscriber,
      unsubscribeEmail: (id) => deleteSubscriber(id),
      updateOrderRider
    }}
  >
      {children}
    </RestaurantContext.Provider>;
};
const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error("useRestaurant must be used within a RestaurantProvider");
  }
  return context;
};
export {
  RestaurantProvider,
  useRestaurant
};
