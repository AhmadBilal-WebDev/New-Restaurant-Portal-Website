'use client';

import { useState, useEffect } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Header } from '@/components/Customer/Header';
import { Hero } from '@/components/Customer/Hero';
import { PopularMeals } from '@/components/Customer/PopularMeals';
import { MenuSection } from '@/components/Customer/MenuSection';
import { ProductDetailModal } from '@/components/Customer/ProductDetailModal';
import { CartDrawer } from '@/components/Customer/CartDrawer';
import { CheckoutModal } from '@/components/Customer/CheckoutModal';
import { DealsSection } from '@/components/Customer/DealsSection';
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
import { ArrowUp, Shield } from "lucide-react";
const CustomerSite = ({ onOpenAdmin }) => {
  const {
    config,
    products,
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
  const [branchSelection, setBranchSelection] = useState({
    branchId: "",
    selectedArea: "",
    orderMode: "delivery",
    latitude: "",
    longitude: ""
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  useEffect(() => {
    try {
      const saved = readLocationSession();
      if (saved?.branchId && saved?.orderMode) {
        setBranchSelection({
          branchId: saved.branchId,
          selectedArea: saved.selectedArea || saved.branchName || "",
          orderMode: saved.orderMode,
          latitude: saved.latitude || "",
          longitude: saved.longitude || ""
        });
      }
    } catch (error) {
      console.error("Saved branch selection could not be restored:", error);
    } finally {
      setIsClientReady(true);
      // Show location modal on every page refresh / load.
      setIsLocationModalOpen(true);
      setIsFirstVisit(true);
    }
  }, []);
  const storefrontProducts = products.filter((product) => {
    const isTaggedOutOfStock = product.tags?.some((tag) => {
      const normalizedTag = tag.trim().toLowerCase().replace(/[\s-]+/g, "_");
      return normalizedTag === "outofstock" || normalizedTag === "out_of_stock";
    });
    return product.inStock !== false && !isTaggedOutOfStock;
  });
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
  const currentBranch = branches.find((b) => b.id === branchSelection.branchId) || branches[0];
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
      branchName: selection.branchName || ""
    };
    setBranchSelection(next);
    writeLocationSession(next);
    setIsFirstVisit(false);
    setIsLocationModalOpen(false);
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
  const handleAddToCart = (product, quantity, selectedBun, selectedCheese, selectedAddons = [], specialInstructions, calculatedTotal) => {
    const addonKey = selectedAddons.map((a) => a.id).sort().join("-");
    const cartItemId = `${product.id}-${selectedBun || "nobun"}-${selectedCheese || "nocheese"}-${addonKey}-${specialInstructions || "none"}`;
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = product.price + addonsPrice;
    const finalItemTotal = calculatedTotal || unitPrice * quantity;
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + quantity;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPrice: current.unitPrice * newQty
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            cartItemId,
            product,
            quantity,
            selectedBun,
            selectedCheese,
            selectedAddons,
            specialInstructions,
            unitPrice,
            totalPrice: finalItemTotal
          }
        ];
      }
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
    handleAddToCart(product, 1);
  };
  const handleUpdateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartItems(
      (prev) => prev.map(
        (item) => item.cartItemId === cartItemId ? {
          ...item,
          quantity: newQuantity,
          totalPrice: item.unitPrice * newQuantity
        } : item
      )
    );
  };
  const handleRemoveItem = (cartItemId) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
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
    handleAddToCart(dealProduct, 1);
    addToast("Deal Combo Claimed!", `${deal.name} added (${formatPrice(deal.dealPrice)})`, "success");
  };
  const handleToggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      const updated = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      const product = products.find((p) => p.id === productId);
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
      phone: "(555) 384-9182",
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
  };
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
    catalogReady={isClientReady}
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
    catalogReady={isClientReady}
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
    branch={isClientReady ? currentBranch : null}
    branchName={
      process.env.NEXT_PUBLIC_RESTAURANT_BRANCH_NAME ||
      (isClientReady
        ? currentBranch?.name || currentBranch?.city || currentBranch?.shortName || ""
        : "")
    }
    enabled={isClientReady}
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
        onClearCart={() => setCartItems([])}
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
    onClearCart={() => setCartItems([])}
    selectedBranch={currentBranch}
    selectedArea={branchSelection.selectedArea}
    orderMode={branchSelection.orderMode}
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
    initialMode="register"
    onAuthSuccess={() => {
      setIsAuthModalOpen(false);
      scrollToSection("hero-section");
    }}
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
