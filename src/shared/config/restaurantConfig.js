import { restaurantTheme } from '@/shared/theme/colors';

/**
 * White-label restaurant config.
 * Theme colors come from src/shared/theme/colors.js — edit there to change brand colors everywhere.
 */
const defaultRestaurantConfig = {
  id: "rest-001",
  name: "BurgerBlast Co.",
  shortName: "ROS",
  tagline: "Smash • Crisp • Crave",
  logo: {
    text: "BurgerBlast",
    subText: "Co.",
    iconName: "UtensilsCrossed"
  },
  theme: { ...restaurantTheme },
  currency: {
    code: "PKR",
    symbol: "PKR ",
    position: "prefix"
  },
  contact: {
    phone: "(555) 248-3663",
    email: "contact@burgerblast.com",
    hotline: "111-BURGER (287-437)",
    whatsapp: "+92 300 1234567",
    freeDeliveryThreshold: 2e3,
    taxRate: 0.08
    // 8%
  },
  businessHours: {
    openDays: "Monday – Sunday",
    operatingHours: "10:30 AM – 11:30 PM"
  },
  defaultBranches: [
    {
      id: "branch-renala",
      name: "BurgerBlast — Renala Khurd",
      shortName: "Renala Khurd",
      city: "Renala Khurd",
      address: "Main GT Road, Commercial Zone, Renala Khurd",
      phone: "(044) 263-5501",
      manager: "Muhammad Usman",
      operatingHours: "10:30 AM – 11:30 PM",
      deliveryTime: "25-35 mins",
      deliveryFee: 150,
      minOrder: 500,
      rating: 4.9,
      isOpen: true,
      ordersToday: 24,
      revenueToday: 38400,
      areasServed: [
        "Main GT Road",
        "Canal Colony",
        "Model Town",
        "Al-Rehman City",
        "Railway Road"
      ]
    },
    {
      id: "branch-okara",
      name: "BurgerBlast — Okara Cantonment",
      shortName: "Okara",
      city: "Okara",
      address: "Faisalabad Road, Near Gol Chowk, Okara",
      phone: "(044) 252-9912",
      manager: "Hamza Tariq",
      operatingHours: "11:00 AM – 12:00 AM",
      deliveryTime: "30-40 mins",
      deliveryFee: 200,
      minOrder: 600,
      rating: 4.8,
      isOpen: true,
      ordersToday: 31,
      revenueToday: 51200,
      areasServed: [
        "Gol Chowk",
        "Cantt Area",
        "Samadpura",
        "Javed Nagar",
        "Depalpur Road"
      ]
    },
    {
      id: "branch-downtown",
      name: "BurgerBlast — Downtown Central",
      shortName: "Downtown",
      city: "Lahore",
      address: "74 Gulberg III, MM Alam Road, Lahore",
      phone: "(042) 357-1100",
      manager: "Ahmad Bilal",
      operatingHours: "10:00 AM – 01:00 AM",
      deliveryTime: "20-30 mins",
      deliveryFee: 180,
      minOrder: 700,
      rating: 4.95,
      isOpen: true,
      ordersToday: 48,
      revenueToday: 89400,
      areasServed: [
        "Gulberg III",
        "MM Alam Road",
        "Main Boulevard",
        "Liberty Market",
        "Garden Town"
      ]
    }
  ]
};
export {
  defaultRestaurantConfig
};
