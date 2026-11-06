import { Home, Utensils, MapPin, ShoppingBag, Search } from "lucide-react";
const MobileBottomNav = ({
  currentSelection,
  currentBranch,
  onOpenLocationModal,
  onOpenCart,
  cartCount,
  cartSubtotal,
  onOpenOrders,
  onOpenSearch,
  onNavigateHome,
  onNavigateMenu,
  activeSection
}) => {
  const branchDisplayName = currentBranch?.shortName || currentSelection.selectedArea || "Location";
  return <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
      {
    /* Floating Mini Cart Bar if items exist in cart */
  }
      {cartCount > 0 && <div className="px-3 pb-2 pt-1 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
          <button
    id="mobile-quick-cart-bar"
    onClick={onOpenCart}
    className="pointer-events-auto w-full bg-[#E51B23] hover:bg-[#B90F16] text-white py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-between font-bold text-xs active:scale-98 transition-transform"
  >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-[#E51B23] font-black text-[11px] flex items-center justify-center">
                {cartCount}
              </span>
              <span>Review Order ({currentSelection.orderMode === "pickup" ? "Pickup" : "Delivery"})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-sm">${cartSubtotal.toFixed(2)}</span>
              <span className="text-[10px] uppercase font-bold opacity-80 ml-0.5">Checkout →</span>
            </div>
          </button>
        </div>}

      {
    /* Main Bottom Bar */
  }
      <nav
    id="mobile-bottom-navigation"
    className="bg-white/95 backdrop-blur-lg border-t border-[#E9E2D8] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around"
  >
        {
    /* Home */
  }
        <button
    id="mobile-nav-home"
    onClick={onNavigateHome}
    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[58px] ${activeSection === "hero-section" ? "text-[#E51B23] font-bold" : "text-[#666666] hover:text-[#191919]"}`}
  >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Home</span>
        </button>

        {
    /* Menu */
  }
        <button
    id="mobile-nav-menu"
    onClick={onNavigateMenu}
    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[58px] ${activeSection === "menu-section" || activeSection === "popular-section" ? "text-[#E51B23] font-bold" : "text-[#666666] hover:text-[#191919]"}`}
  >
          <Utensils className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Menu</span>
        </button>

        {
    /* Branch / Location Selector */
  }
        <button
    id="mobile-nav-branch"
    onClick={onOpenLocationModal}
    className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[#191919] hover:bg-black/5 transition-colors min-w-[68px] relative"
  >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-[#E51B23]/10 text-[#E51B23] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 ring-2 ring-white" />
          </div>
          <span className="text-[10px] font-bold leading-tight mt-0.5 max-w-[70px] truncate text-[#191919]">
            {branchDisplayName}
          </span>
        </button>

        {
    /* Search button replaces orders button in bottom navigation */
  }
        <button
    id="mobile-nav-search"
    onClick={onOpenSearch}
    className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[#666666] hover:text-[#E51B23] transition-colors min-w-[58px]"
    aria-label="Search food items"
  >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Search</span>
        </button>

        {
    /* Cart */
  }
        <button
    id="mobile-nav-cart"
    onClick={onOpenCart}
    className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[#191919] hover:bg-black/5 transition-colors min-w-[58px] relative"
  >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5 text-[#E51B23]" />
            {cartCount > 0 && <span className="absolute -top-1 -right-2 bg-[#E51B23] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>}
          </div>
          <span className="text-[10px] font-bold leading-tight">Cart</span>
        </button>
      </nav>
    </div>;
};
export {
  MobileBottomNav
};
