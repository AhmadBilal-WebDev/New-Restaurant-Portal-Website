import { useState, useMemo, useRef } from "react";
import { ProductCard } from "./ProductCard";
import { Search, X, SlidersHorizontal, Utensils, RefreshCw, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import heroMealImg from '@/assets/images/hero_burger_meal_1789195599245.jpg';
import { categoryTagLabel } from '@/shared/lib/catalogApi';
const MenuSection = ({
  products,
  catalogReady,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectProduct,
  onQuickAdd,
  favorites,
  onToggleFavorite
}) => {
  const { categories } = useRestaurant();
  const [sortBy, setSortBy] = useState("recommended");
  const scrollContainerRef = useRef(null);
  const activeCategories = catalogReady ? categories.filter(
    (c) => c.isActive !== false && c.id !== "all" && c.name.toLowerCase() !== "all items"
  ) : [];
  const scrollCategories = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 260;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };
  const filteredAndSortedProducts = useMemo(() => {
    let result = catalogReady ? [...products] : [];
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.tags && p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    const getNumericPrice = (p) => {
      if (typeof p.price === "number") return p.price;
      const parsed = parseFloat(String(p.price).replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    };
    const getNumericRating = (p) => {
      if (typeof p.rating === "number") return p.rating;
      const parsed = parseFloat(String(p.rating));
      return isNaN(parsed) ? 0 : parsed;
    };
    if (sortBy === "price-asc") {
      result.sort((a, b) => getNumericPrice(a) - getNumericPrice(b));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => getNumericPrice(b) - getNumericPrice(a));
    } else if (sortBy === "rating") {
      result.sort((a, b) => getNumericRating(b) - getNumericRating(a));
    } else if (sortBy === "popular") {
      result.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
    } else {
      result.sort((a, b) => {
        const aBest = a.isBestseller || a.isPopular ? 1 : 0;
        const bBest = b.isBestseller || b.isPopular ? 1 : 0;
        if (aBest !== bBest) return bBest - aBest;
        return getNumericRating(b) - getNumericRating(a);
      });
    }
    return result;
  }, [catalogReady, products, selectedCategory, searchQuery, sortBy]);
  const activeCategoryObj = activeCategories.find((c) => c.id === selectedCategory);
  return <section
    id="menu-section"
    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 scroll-mt-20"
  >
      {
    /* ========================================================
        EXPLORE THE MENU SECTION HEADER (Matches Screenshot)
    ======================================================== */
  }
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E51B23]/10 text-[#E51B23] text-xs font-black uppercase tracking-wider mb-2.5 shadow-2xs">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Fresh &amp; Tasty</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#191919] uppercase tracking-wider font-['Outfit']">
          Explore The Menu
        </h2>
      </div>

      {
    /* ========================================================
        1. SEARCH BAR WITH SORT (Positioned above Explore Categories)
    ======================================================== */
  }
      <div className="bg-white/90 backdrop-blur-xs rounded-2xl sm:rounded-full p-2.5 sm:p-3 shadow-soft-card border border-[#EEE7DC] mb-8 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          
          {
    /* Live Search Input */
  }
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
    id="menu-search-input"
    type="text"
    placeholder="Search your cravings..."
    value={searchQuery}
    onChange={(e) => onSearchChange(e.target.value)}
    className="w-full bg-[#FFF9EF]/80 text-sm text-[#191919] placeholder-neutral-400 pl-11 pr-10 py-3 rounded-xl sm:rounded-full border border-[#E9E2D8] focus:outline-none focus:border-[#E51B23] focus:ring-2 focus:ring-[#E51B23]/10 transition-all font-medium"
  />
            {searchQuery && <button
    type="button"
    onClick={() => onSearchChange("")}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
    aria-label="Clear search"
  >
                <X className="w-4 h-4" />
              </button>}
          </div>

          {
    /* Sort By Dropdown */
  }
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 px-2 sm:px-0">
            <div className="flex items-center gap-1.5 text-xs text-[#777777] font-bold">
              <SlidersHorizontal className="w-4 h-4 text-[#E51B23]" />
              <span>Sort:</span>
            </div>
            <select
    id="menu-sort-select"
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    className="bg-[#FFF9EF] text-xs sm:text-sm font-bold text-[#191919] border border-[#E9E2D8] rounded-xl sm:rounded-full px-3.5 py-2.5 focus:outline-none focus:border-[#E51B23] cursor-pointer hover:border-[#E51B23] transition-colors"
  >
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

        </div>
      </div>

      {
    /* ========================================================
        2. EXPLORE CATEGORIES (Underneath Search & Sort bar)
    ======================================================== */
  }
      <div id="categories-section" className="mb-8 scroll-mt-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#191919] font-['Outfit']">
              Explore Categories
            </h2>
            <p className="text-xs sm:text-sm text-[#777777] font-medium mt-0.5">
              Tap to filter your favorite cravings
            </p>
          </div>

          {
    /* Scroll helper arrows */
  }
          <div className="hidden sm:flex items-center gap-1.5">
            <button
    type="button"
    onClick={() => scrollCategories("left")}
    className="w-8 h-8 rounded-full border border-[#E9E2D8] bg-white flex items-center justify-center text-[#191919] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors shadow-xs cursor-pointer"
    aria-label="Scroll categories left"
  >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
    type="button"
    onClick={() => scrollCategories("right")}
    className="w-8 h-8 rounded-full border border-[#E9E2D8] bg-white flex items-center justify-center text-[#191919] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors shadow-xs cursor-pointer"
    aria-label="Scroll categories right"
  >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {
    /* Horizontal Category Circular Cards Row */
  }
        <div
    ref={scrollContainerRef}
    className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 scroll-smooth"
  >
          {!catalogReady ? <p className="w-full py-6 text-center text-sm font-semibold text-[#777777]">
              Loading categories...
            </p> : activeCategories.length === 0 ? <p className="w-full py-6 text-center text-sm font-semibold text-[#777777]">
              Categories not found.
            </p> : <>
          {
    /* ALL ITEMS CARD */
  }
          <button
    type="button"
    onClick={() => onSelectCategory("all")}
    className={`flex-shrink-0 group flex flex-col items-center p-3 rounded-2xl transition-all duration-200 focus:outline-none cursor-pointer ${selectedCategory === "all" ? "bg-white shadow-soft-card border-2 border-[#E51B23] -translate-y-1" : "bg-white/80 hover:bg-white border border-[#E9E2D8] hover:-translate-y-0.5 hover:shadow-sm"}`}
    style={{ minWidth: "105px" }}
  >
            <div
    className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden p-1 transition-all duration-200 flex items-center justify-center ${selectedCategory === "all" ? "ring-2 ring-[#E51B23] ring-offset-2 bg-[#FFF9EF]" : "group-hover:ring-2 group-hover:ring-[#F5B82E] bg-[#F7F1E7]"}`}
  >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#E51B23] to-[#FF5A1F] text-white flex items-center justify-center shadow-inner">
                <Utensils className="w-6 h-6 text-white" />
              </div>
            </div>

            <span
    className={`mt-2.5 text-xs sm:text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${selectedCategory === "all" ? "text-[#E51B23]" : "text-[#191919] group-hover:text-[#E51B23]"}`}
  >
              All Items
            </span>
            <span className="text-[10px] text-[#888888] font-semibold mt-0.5">
              {products.length} items
            </span>
          </button>

          {
    /* INDIVIDUAL CATEGORIES */
  }
          {activeCategories.map((category) => {
    const isActive = selectedCategory === category.id;
    const count = products.filter((p) => p.category === category.id).length;
    return <button
      key={category.id}
      type="button"
      onClick={() => onSelectCategory(category.id)}
      className={`flex-shrink-0 group flex flex-col items-center p-3 rounded-2xl transition-all duration-200 focus:outline-none cursor-pointer ${isActive ? "bg-white shadow-soft-card border-2 border-[#E51B23] -translate-y-1" : "bg-white/80 hover:bg-white border border-[#E9E2D8] hover:-translate-y-0.5 hover:shadow-sm"}`}
      style={{ minWidth: "105px" }}
    >
                <div
      className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden p-1 transition-all duration-200 ${isActive ? "ring-2 ring-[#E51B23] ring-offset-2 bg-[#FFF9EF]" : "group-hover:ring-2 group-hover:ring-[#F5B82E] bg-[#F7F1E7]"}`}
    >
                  <img
      src={category.image || heroMealImg.src}
      alt={category.name}
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(heroMealImg.src)) {
          event.currentTarget.src = heroMealImg.src;
        }
      }}
      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
    />
                </div>

                <span
      className={`mt-2.5 text-xs sm:text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${isActive ? "text-[#E51B23]" : "text-[#191919] group-hover:text-[#E51B23]"}`}
    >
                  {category.name}
                </span>
                {category.tags?.[0] && <span className="mt-1 max-w-full truncate rounded-full bg-[#FFF1E8] px-2 py-0.5 text-[9px] font-bold text-[#C94312]">
                    {categoryTagLabel(category.tags[0])}
                  </span>}
                <span className="text-[10px] text-[#888888] font-semibold mt-0.5">
                  {count} item{count === 1 ? "" : "s"}
                </span>
              </button>;
  })}
          </>}
        </div>
      </div>

      {
    /* ========================================================
        3. SHOWING X DELICIOUS ITEMS & PRODUCT GRID (Below Categories)
    ======================================================== */
  }
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 px-1">
        <div className="text-sm sm:text-base font-bold text-[#191919]">
          Showing <span className="text-[#E51B23] font-black">{filteredAndSortedProducts.length}</span> delicious item{filteredAndSortedProducts.length === 1 ? "" : "s"}
          {selectedCategory !== "all" && activeCategoryObj && <span className="text-[#777777] font-semibold ml-2 inline-flex items-center gap-1.5 bg-white border border-[#E9E2D8] px-3 py-0.5 rounded-full text-xs shadow-2xs">
              <span>Category: <strong>{activeCategoryObj.name}</strong></span>
              <button
    type="button"
    onClick={() => onSelectCategory("all")}
    className="hover:text-[#E51B23] ml-0.5 font-black text-sm leading-none"
    title="Clear category filter"
  >
                ×
              </button>
            </span>}
          {searchQuery && <span className="text-[#777777] font-semibold ml-2 inline-flex items-center gap-1.5 bg-white border border-[#E9E2D8] px-3 py-0.5 rounded-full text-xs shadow-2xs">
              <span>Search: <strong>"{searchQuery}"</strong></span>
              <button
    type="button"
    onClick={() => onSearchChange("")}
    className="hover:text-[#E51B23] ml-0.5 font-black text-sm leading-none"
    title="Clear search"
  >
                ×
              </button>
            </span>}
        </div>

        {(selectedCategory !== "all" || searchQuery) && <button
    type="button"
    onClick={() => {
      onSelectCategory("all");
      onSearchChange("");
    }}
    className="text-xs sm:text-sm font-bold text-[#E51B23] hover:underline flex items-center gap-1.5 cursor-pointer"
  >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>}
      </div>

      {
    /* Product Cards Grid */
  }
      {filteredAndSortedProducts.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedProducts.map((product) => <ProductCard
    key={product.id}
    product={product}
    onSelect={onSelectProduct}
    onQuickAdd={onQuickAdd}
    isFavorite={favorites.includes(product.id)}
    onToggleFavorite={onToggleFavorite}
  />)}
        </div> : (
    /* Empty State */
    <div className="bg-white rounded-3xl p-12 text-center border border-[#EEE7DC] shadow-soft-card max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#FFF9EF] border border-[#E9E2D8] flex items-center justify-center text-[#E51B23] mx-auto mb-4">
            <Utensils className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-[#191919] mb-2 font-['Outfit']">
            {!catalogReady ? "Loading menu..." : products.length === 0 ? "Products not found." : "No matching items found"}
          </h3>
          <p className="text-sm text-[#777777] mb-6">
            {!catalogReady ? "Please wait while the menu is prepared." : products.length === 0 ? "There are no available products to display right now." : "We couldn't find any items matching your filter or search query. Try resetting filters to explore our full menu."}
          </p>
          {catalogReady && products.length > 0 && <button
      type="button"
      onClick={() => {
        onSelectCategory("all");
        onSearchChange("");
      }}
      className="bg-[#E51B23] hover:bg-[#B90F16] text-white font-bold text-sm px-6 py-3 rounded-full transition-colors cursor-pointer"
    >
            Show All Menu Items
          </button>}
        </div>
  )}
    </section>;
};
export {
  MenuSection
};
