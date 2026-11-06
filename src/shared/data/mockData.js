import heroMealAsset from '@/assets/images/hero_burger_meal_1789195599245.jpg';
import dealBannerAsset from '@/assets/images/deal_banner_combo_1789195612757.jpg';
import classicSmashAsset from '@/assets/images/classic_smash_burger_1789195624062.jpg';
import crispyChickenAsset from '@/assets/images/crispy_chicken_burger_1789195637355.jpg';
import loadedBbqAsset from '@/assets/images/loaded_bbq_burger_1789195654495.jpg';
const heroMealImg = heroMealAsset.src;
const dealBannerImg = dealBannerAsset.src;
const classicSmashImg = classicSmashAsset.src;
const crispyChickenImg = crispyChickenAsset.src;
const loadedBbqImg = loadedBbqAsset.src;
const defaultAddons = [
  { id: "extra_cheese", name: "Extra Melted Cheddar", price: 1.2 },
  { id: "extra_patty", name: "Extra Smashed Beef Patty", price: 2.5 },
  { id: "crispy_bacon", name: "Applewood Smoked Bacon", price: 1.8 },
  { id: "pickled_jalapenos", name: "Fire Pickled Jalapeños", price: 0.75 },
  { id: "signature_sauce", name: "Signature Bite Special Sauce", price: 0.6 },
  { id: "upgrade_large_fries", name: "Upgrade to Large Fries", price: 1.5 },
  { id: "soft_drink", name: "Add Chilled Fountain Soda", price: 1.8 }
];
const bunOptions = [
  "Toasted Butter Brioche",
  "Artisan Potato Bun",
  "Sesame Seed Bun",
  "Crisp Lettuce Wrap (Low Carb)"
];
const cheeseOptions = [
  "American Style Melted Cheese",
  "Smoked Aged Cheddar",
  "Spicy Pepper Jack",
  "Swiss Emmental",
  "No Cheese"
];
const categories = [
  {
    id: "all",
    name: "All Items",
    image: classicSmashImg,
    itemCount: 12
  },
  {
    id: "burgers",
    name: "Burgers",
    image: classicSmashImg,
    itemCount: 4
  },
  {
    id: "chicken",
    name: "Chicken",
    image: crispyChickenImg,
    itemCount: 3
  },
  {
    id: "fries",
    name: "Fries",
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80",
    itemCount: 2
  },
  {
    id: "nuggets",
    name: "Nuggets",
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80",
    itemCount: 2
  },
  {
    id: "drinks",
    name: "Drinks",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80",
    itemCount: 2
  },
  {
    id: "desserts",
    name: "Desserts",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80",
    itemCount: 2
  },
  {
    id: "breakfast",
    name: "Breakfast",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80",
    itemCount: 1
  }
];
const products = [
  {
    id: "classic-smash-meal",
    name: "Classic Smash Burger Meal",
    category: "burgers",
    price: 9.99,
    originalPrice: 12.49,
    rating: 4.9,
    reviewsCount: 1842,
    description: "Double smashed 100% Angus beef patties, melted American cheese, crisp romaine lettuce, pickles, and signature house sauce on a buttered brioche bun. Includes golden fries and a chilled fountain drink.",
    image: classicSmashImg,
    isPopular: true,
    isBestseller: true,
    tags: ["Best Seller", "Combo Meal"],
    calories: 920,
    prepTime: "6-8 mins",
    availableAddons: defaultAddons,
    availableBuns: bunOptions,
    availableCheese: cheeseOptions
  },
  {
    id: "crispy-chicken-combo",
    name: "Crispy Chicken Combo",
    category: "chicken",
    price: 8.49,
    originalPrice: 10.99,
    rating: 4.8,
    reviewsCount: 1240,
    description: "Ultra-crispy hand-breaded chicken fillet, fresh shredded iceberg lettuce, crunchy dill pickles, and creamy signature herb sauce. Served with sea-salt fries and your choice of soft drink.",
    image: crispyChickenImg,
    isPopular: true,
    isBestseller: true,
    tags: ["Fan Favorite", "Crispy"],
    calories: 840,
    prepTime: "5-7 mins",
    availableAddons: defaultAddons,
    availableBuns: bunOptions,
    availableCheese: cheeseOptions
  },
  {
    id: "nuggets-10pc-meal",
    name: "10-Piece Crispy Nuggets Meal",
    category: "nuggets",
    price: 7.99,
    originalPrice: 9.5,
    rating: 4.9,
    reviewsCount: 980,
    description: "Ten golden, tender chicken breast nuggets fried to a crunchy crunch. Paired with crispy seasoned fries, an ice-cold drink, and your choice of smoky BBQ or sweet honey mustard sauce.",
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    tags: ["Popular", "Kids & Adults"],
    calories: 760,
    prepTime: "4-6 mins",
    availableAddons: defaultAddons.filter((a) => a.id.includes("sauce") || a.id.includes("fries") || a.id.includes("drink"))
  },
  {
    id: "loaded-bbq-burger",
    name: "Loaded BBQ Burger",
    category: "burgers",
    price: 11.49,
    originalPrice: 13.99,
    rating: 4.9,
    reviewsCount: 1420,
    description: "Double seared beef patties slathered in rich Texas hickory BBQ glaze, topped with crispy beer-battered onion strings, smoked cheddar cheese, and smoky bacon on toasted potato bun.",
    image: loadedBbqImg,
    isPopular: true,
    tags: ["Chef Special", "Smoky BBQ"],
    calories: 990,
    prepTime: "7-9 mins",
    availableAddons: defaultAddons,
    availableBuns: bunOptions,
    availableCheese: cheeseOptions
  },
  {
    id: "spicy-chicken-burger",
    name: "Spicy Chicken Burger",
    category: "chicken",
    price: 8.99,
    rating: 4.7,
    reviewsCount: 865,
    description: "Spicy buttermilk fried chicken thigh tossed in habanero chili oil, crunchy vinegar slaw, fire-pickled jalapeños, and ghost pepper remoulade for an unforgettable kick.",
    image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    tags: ["Hot & Spicy"],
    calories: 810,
    prepTime: "5-7 mins",
    availableAddons: defaultAddons,
    availableBuns: bunOptions,
    availableCheese: cheeseOptions
  },
  {
    id: "golden-fries",
    name: "Golden Skin-On Fries",
    category: "fries",
    price: 3.49,
    rating: 4.8,
    reviewsCount: 2150,
    description: "Signature cut Idaho potatoes fried twice in pure sunflower oil for maximum crunch outside and fluffy potato goodness inside. Lightly seasoned with sea salt.",
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    tags: ["Crispy Side"],
    calories: 380,
    prepTime: "3-5 mins",
    availableAddons: [
      { id: "cheese_sauce", name: "Side of Warm Cheddar Sauce", price: 1.25 },
      { id: "bbq_dip", name: "Smoky BBQ Dipping Cup", price: 0.6 },
      { id: "bacon_bits", name: "Real Crispy Bacon Crumbles", price: 1.5 }
    ]
  },
  {
    id: "chocolate-shake",
    name: "Thick Belgian Chocolate Shake",
    category: "desserts",
    price: 4.49,
    rating: 4.9,
    reviewsCount: 1120,
    description: "Hand-spun real dairy custard blended with molten Belgian dark chocolate fudge, topped with fluffy whipped cream, chocolate sprinkles, and a drizzle of cocoa syrup.",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    tags: ["Hand-Spun", "Sweet Treat"],
    calories: 520,
    prepTime: "3-4 mins",
    availableAddons: [
      { id: "extra_whipped", name: "Extra Whipped Cream", price: 0.5 },
      { id: "malt_powder", name: "Old Fashioned Malt", price: 0.75 },
      { id: "crushed_oreo", name: "Crushed Oreo Crumb Topping", price: 1 }
    ]
  },
  {
    id: "breakfast-stack",
    name: "Morning Sunrise Breakfast Stack",
    category: "breakfast",
    price: 6.99,
    rating: 4.7,
    reviewsCount: 630,
    description: "Cage-free fried egg with running yolk, savory seasoned breakfast pork sausage patty, melted sharp cheddar, and caramelized maple butter on a toasted golden potato bun.",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
    tags: ["Breakfast Favorite"],
    calories: 610,
    prepTime: "4-6 mins",
    availableAddons: defaultAddons,
    availableBuns: bunOptions,
    availableCheese: cheeseOptions
  },
  {
    id: "truffle-mushroom-smash",
    name: "Truffle Mushroom Smash",
    category: "burgers",
    price: 12.29,
    rating: 4.9,
    reviewsCount: 780,
    description: "Two smashed patties topped with sautéed garlic cremini mushrooms, melted Swiss Emmental cheese, baby arugula, and black truffle garlic aioli on a brioche bun.",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80",
    isNew: true,
    tags: ["Gourmet", "Truffle Aioli"],
    calories: 940,
    prepTime: "7-9 mins",
    availableAddons: defaultAddons,
    availableBuns: bunOptions,
    availableCheese: cheeseOptions
  },
  {
    id: "cheesy-bacon-loaded-fries",
    name: "Cheesy Bacon Loaded Fries",
    category: "fries",
    price: 5.99,
    rating: 4.8,
    reviewsCount: 940,
    description: "A mountain of golden fries smothered in velvety hot cheddar cheese sauce, applewood bacon crumbles, pickled jalapeños, and fresh chopped chives.",
    image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    tags: ["Loaded Side"],
    calories: 680,
    prepTime: "4-6 mins",
    availableAddons: [
      { id: "extra_cheese_sauce", name: "Extra Cheddar Sauce", price: 1.25 },
      { id: "ranch_drizzle", name: "Garlic Buttermilk Ranch Drizzle", price: 0.6 }
    ]
  },
  {
    id: "crispy-tender-box",
    name: "Crispy Chicken Tenders Box",
    category: "chicken",
    price: 8.99,
    rating: 4.9,
    reviewsCount: 1105,
    description: "Four jumbo tender chicken tenders marinated for 12 hours in spiced buttermilk and hand-breaded to order. Served with fries, warm honey butter biscuit, and creamy garlic dip.",
    image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80",
    tags: ["Hand-Breaded"],
    calories: 810,
    prepTime: "5-7 mins",
    availableAddons: defaultAddons
  },
  {
    id: "chilled-fountain-soda",
    name: "Ice-Cold Craft Soda",
    category: "drinks",
    price: 2.29,
    rating: 4.7,
    reviewsCount: 420,
    description: "Fresh fountain soda with crunchy pebble ice. Choose from Classic Cola, Diet Cola, Lemon-Lime Fizz, Craft Root Beer, or House Fresh Lemonade.",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80",
    tags: ["Chilled Drink"],
    calories: 180,
    prepTime: "1-2 mins"
  }
];
const deals = [
  {
    id: "deal-smash-combo",
    title: "Burger + Fries + Drink — From $9.99",
    tagline: "Classic Smash Combo Special",
    price: 9.99,
    originalPrice: 13.49,
    discountBadge: "SAVE 26%",
    description: "Our iconic Double Smash Burger paired with hot golden skin-on fries and an ice-cold craft soda. Fast, fresh, and fully satisfying.",
    image: heroMealImg,
    itemsIncluded: [
      "1x Classic Smash Double Patty Burger",
      "1x Regular Crispy Golden Fries",
      "1x Choice of Chilled Soft Drink"
    ],
    badgeColor: "#E51B23"
  },
  {
    id: "deal-double-trouble",
    title: "2 Meals, One Great Price",
    tagline: "Double Flavor Duo Feast",
    price: 16.99,
    originalPrice: 22.98,
    discountBadge: "SAVE $6.00",
    description: "The ultimate pairing: 1 Classic Smash Burger + 1 Crispy Chicken Burger, accompanied by 2 orders of golden fries and 2 drinks.",
    image: dealBannerImg,
    itemsIncluded: [
      "1x Classic Smash Burger",
      "1x Crispy Chicken Burger",
      "2x Medium Golden Fries",
      "2x Cold Fountain Drinks"
    ],
    badgeColor: "#F5B82E"
  },
  {
    id: "deal-free-side",
    title: "Free Side With Any Large Meal",
    tagline: "Weekend Family Saver",
    price: 14.49,
    originalPrice: 19.98,
    discountBadge: "FREE SIDE",
    description: "Order any deluxe specialty burger combo and receive a complimentary 6-piece nugget pack or loaded cheese fries on us!",
    image: loadedBbqImg,
    itemsIncluded: [
      "1x Loaded BBQ Bacon Burger Meal",
      "1x Choice of Free 6pc Nuggets or Cheesy Fries",
      "1x Large Fountain Drink"
    ],
    badgeColor: "#2E9B5B"
  }
];
const testimonials = [
  {
    id: "1",
    name: "Marcus Vance",
    location: "Downtown Food Critic",
    rating: 5,
    comment: "The crust on the smash patties is exceptional. The brioche bun was warm and soft, the signature sauce is addictive, and the delivery arrived in under 20 minutes hot and crispy!",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    verified: true,
    date: "Yesterday",
    favoriteOrder: "Classic Smash Burger Meal"
  },
  {
    id: "2",
    name: "Sarah Chen",
    location: "Verified Customer",
    rating: 5,
    comment: "Hands down the best fried chicken sandwich in town. That crunchy slaw and spicy habanero glaze is pure magic. We order every Friday night for team lunch!",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
    verified: true,
    date: "3 days ago",
    favoriteOrder: "Spicy Chicken Burger + Shake"
  },
  {
    id: "3",
    name: "David Rodriguez",
    location: "Verified Customer",
    rating: 5,
    comment: "The loaded bacon cheese fries alone deserve five stars. Packed with actual smoked bacon and rich cheddar. Ordering online took under 30 seconds. Seamless!",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    verified: true,
    date: "1 week ago",
    favoriteOrder: "Loaded BBQ Burger + Loaded Fries"
  },
  {
    id: "4",
    name: "Elena Rostova",
    location: "Verified Customer",
    rating: 5,
    comment: "You can taste that the ingredients are fresh, not frozen heat-lamp stuff. Real smashed beef, fresh crisp lettuce, and thick hand-spun chocolate shakes. Perfection.",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
    verified: true,
    date: "2 weeks ago",
    favoriteOrder: "Truffle Mushroom Smash"
  }
];
const branches = [
  {
    id: "downtown-central",
    name: "Downtown Central Flagship",
    shortName: "Downtown Central",
    area: "Central Business District",
    address: "428 Grand Avenue, Central Plaza",
    city: "Metropolis",
    phone: "(555) 248-3661",
    operatingHours: "10:30 AM – 11:30 PM",
    deliveryTime: "15-25 min",
    deliveryFee: 0,
    minOrder: 10,
    rating: 4.9,
    isOpen: true,
    isPopular: true,
    distance: "0.6 mi",
    areasServed: [
      "Downtown Core",
      "Financial District",
      "Arts Quarter",
      "Grand Avenue",
      "City Hall Plaza",
      "South Harbor Walk"
    ]
  },
  {
    id: "westside-boulevard",
    name: "Westside Marina Boulevard",
    shortName: "Westside Marina",
    area: "Westside & Marina",
    address: "1082 Sunset Boulevard, Suite B",
    city: "Metropolis",
    phone: "(555) 248-3662",
    operatingHours: "11:00 AM – 12:00 AM",
    deliveryTime: "20-30 min",
    deliveryFee: 1.99,
    minOrder: 12,
    rating: 4.8,
    isOpen: true,
    distance: "2.1 mi",
    areasServed: [
      "Marina Promenade",
      "Sunset Hills",
      "Ocean Heights",
      "Culver Plaza",
      "West End Village"
    ]
  },
  {
    id: "uptown-heights",
    name: "Uptown Heights & Campus",
    shortName: "Uptown Heights",
    area: "Uptown & University",
    address: "750 North Park Way",
    city: "Metropolis",
    phone: "(555) 248-3663",
    operatingHours: "10:00 AM – 11:00 PM",
    deliveryTime: "25-35 min",
    deliveryFee: 2.49,
    minOrder: 10,
    rating: 4.9,
    isOpen: true,
    distance: "3.4 mi",
    areasServed: [
      "University Campus",
      "North Park",
      "Uptown Square",
      "Tech Corridor",
      "Greenville Residences"
    ]
  },
  {
    id: "eastgate-express",
    name: "Eastgate Commercial Hub",
    shortName: "Eastgate Hub",
    area: "East Market",
    address: "315 Pioneer Expressway",
    city: "Metropolis",
    phone: "(555) 248-3664",
    operatingHours: "11:30 AM – 11:00 PM",
    deliveryTime: "20-30 min",
    deliveryFee: 1.49,
    minOrder: 10,
    rating: 4.7,
    isOpen: true,
    distance: "4.2 mi",
    areasServed: [
      "East Gate Mall",
      "Industrial Park",
      "Riverside Woods",
      "Old Town East",
      "Metro Logistics Park"
    ]
  }
];
export {
  branches,
  bunOptions,
  categories,
  cheeseOptions,
  dealBannerImg,
  deals,
  defaultAddons,
  heroMealImg,
  products,
  testimonials
};
