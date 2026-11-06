import { heroMealImg, dealBannerImg } from "./mockData";
import crispyChickenAsset from '@/assets/images/crispy_chicken_burger_1789195637355.jpg';
const crispyChickenImg = crispyChickenAsset.src;
const DEFAULT_WEEKLY_TIMETABLE = [
  { day: "Monday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
  { day: "Tuesday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
  { day: "Wednesday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
  { day: "Thursday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
  { day: "Friday", open: "10:30 AM", close: "12:00 AM", isOpen: true },
  { day: "Saturday", open: "10:30 AM", close: "12:30 AM", isOpen: true },
  { day: "Sunday", open: "10:30 AM", close: "11:30 PM", isOpen: true }
];
const INITIAL_HERO_BANNERS = [
  {
    id: "banner-1",
    title: "CRAFTED SMASH BURGERS",
    titleHighlight: "DELIVERED IN MINUTES",
    highlightColor: "#FF5A1F",
    tagline: "100% Angus Beef • Toasted Brioche • Fire Glazed",
    description: "Savor the crispy, caramelized crust of our signature smashed patties, melted cheddar, and secret house sauce.",
    image: heroMealImg,
    badge: "HOT & FRESH DELIVERY",
    deliveryTimeBadge: "15-25 MIN ARRIVAL",
    priceFrom: "Starting at 850",
    ctaText: "Order Now",
    isActive: true
  },
  {
    id: "banner-2",
    title: "SIZZLING COMBO DEALS",
    titleHighlight: "SAVE UP TO 30%",
    highlightColor: "#F5B82E",
    tagline: "Burger + Golden Fries + Chilled Craft Soda",
    description: "Double the patties, double the crunch. Share the feast with our limited-time duo combos and loaded sides.",
    image: dealBannerImg,
    badge: "WEEKEND SPECIAL FEAST",
    deliveryTimeBadge: "CRISPY & PIPING HOT",
    priceFrom: "Starting at 1,450",
    ctaText: "Grab Deal",
    isActive: true
  },
  {
    id: "banner-3",
    title: "CRISPY CHICKEN CRUNCH",
    titleHighlight: "EXPLOSIVE SPICE & FLAVOR",
    highlightColor: "#E51B23",
    tagline: "12-Hour Buttermilk Brined • Hand-Breaded",
    description: "Golden crunchy chicken thigh tossed in habanero honey glaze, crunchy vinegar slaw, and fire-pickled jalapeños.",
    image: crispyChickenImg,
    badge: "CHEF SIGNATURE RECIPE",
    deliveryTimeBadge: "20 MIN GUARANTEE",
    priceFrom: "Starting at 790",
    ctaText: "Try Now",
    isActive: true
  }
];
const INITIAL_REVIEWS = [
  {
    id: "rev-1",
    orderId: "ord-1045",
    customerName: "Marcus Vance",
    restaurantName: "BurgerBlast Co.",
    branchId: "branch-renala",
    branchName: "BurgerBlast — Renala Khurd",
    rating: 5,
    comment: "The crust on the smash patties is exceptional. The brioche bun was warm and soft, the signature sauce is addictive, and delivery arrived in 18 minutes hot and crispy!",
    date: "Yesterday",
    status: "approved",
    favoriteOrder: "Classic Smash Burger Meal",
    verified: true
  },
  {
    id: "rev-2",
    orderId: "ord-1041",
    customerName: "Sarah Chen",
    restaurantName: "BurgerBlast Co.",
    branchId: "branch-okara",
    branchName: "BurgerBlast — Okara Cantonment",
    rating: 5,
    comment: "Hands down the best fried chicken sandwich in town. That crunchy slaw and spicy habanero glaze is pure magic. We order every Friday for team lunch!",
    date: "3 days ago",
    status: "approved",
    favoriteOrder: "Crispy Chicken Combo + Shake",
    verified: true
  },
  {
    id: "rev-3",
    orderId: "ord-1039",
    customerName: "David Rodriguez",
    restaurantName: "BurgerBlast Co.",
    branchId: "branch-downtown",
    branchName: "BurgerBlast — Downtown Central",
    rating: 5,
    comment: "The loaded bacon cheese fries alone deserve five stars. Packed with actual smoked bacon and rich cheddar. Ordering online took under 30 seconds. Seamless!",
    date: "1 week ago",
    status: "approved",
    favoriteOrder: "Loaded BBQ Burger + Loaded Fries",
    verified: true
  }
];
const INITIAL_PROMO_CODES = [
  {
    id: "promo-1",
    code: "BITE20",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 1e3,
    maxDiscount: 400,
    expiryDate: "2026-12-31",
    usageLimit: 500,
    usageCount: 42,
    isActive: true
  },
  {
    id: "promo-2",
    code: "FLAT150",
    discountType: "fixed",
    discountValue: 150,
    minOrderAmount: 1200,
    expiryDate: "2026-12-31",
    usageLimit: 300,
    usageCount: 68,
    isActive: true
  },
  {
    id: "promo-3",
    code: "WELCOME50",
    discountType: "fixed",
    discountValue: 50,
    minOrderAmount: 500,
    expiryDate: "2026-12-31",
    usageLimit: 1e3,
    usageCount: 115,
    isActive: true
  }
];
const INITIAL_SUBSCRIBERS = [
  {
    id: "sub-1",
    email: "zain.foodie@gmail.com",
    subscribedAt: "2026-03-01",
    status: "active",
    branch: "Renala Khurd"
  },
  {
    id: "sub-2",
    email: "ayesha.tariq@yahoo.com",
    subscribedAt: "2026-03-05",
    status: "active",
    branch: "Okara Cantonment"
  },
  {
    id: "sub-3",
    email: "hamza.sheikh99@outlook.com",
    subscribedAt: "2026-03-10",
    status: "active",
    branch: "Downtown Central"
  }
];
const INITIAL_RIDERS = [
  {
    id: "rider-1",
    name: "Zubair Khan",
    phone: "+92 301 5544332",
    vehicle: "Honda CD 70 (LEH-4829)",
    rating: 4.9,
    currentLat: 31.5204,
    currentLng: 74.3587,
    status: "on_the_way"
  },
  {
    id: "rider-2",
    name: "Bilal Tariq",
    phone: "+92 321 8899001",
    vehicle: "Suzuki GS 150 (OKA-7721)",
    rating: 4.8,
    currentLat: 30.9856,
    currentLng: 73.5932,
    status: "idle"
  },
  {
    id: "rider-3",
    name: "Danish Ali",
    phone: "+92 333 1122334",
    vehicle: "Yamaha YBR 125 (RNL-1092)",
    rating: 4.95,
    currentLat: 30.9577,
    currentLng: 73.6124,
    status: "on_the_way"
  }
];
export {
  DEFAULT_WEEKLY_TIMETABLE,
  INITIAL_HERO_BANNERS,
  INITIAL_PROMO_CODES,
  INITIAL_REVIEWS,
  INITIAL_RIDERS,
  INITIAL_SUBSCRIBERS
};
