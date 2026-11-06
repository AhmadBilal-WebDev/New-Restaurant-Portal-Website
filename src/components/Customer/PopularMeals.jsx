import { ProductCard } from "./ProductCard";
import { ArrowRight, Flame } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const PopularMeals = ({
  products,
  catalogReady,
  onSelectProduct,
  onQuickAdd,
  favorites,
  onToggleFavorite,
  onViewAllMenu
}) => {
  const { popularMealIds } = useRestaurant();
  const popularItems = products.filter(
    (p) => p.isPopular || popularMealIds && popularMealIds.includes(p.id)
  );
  const displayItems = popularItems.length > 0 ? popularItems : products.slice(0, 4);
  if (!catalogReady || products.length === 0) return null;
  return <section id="popular-meals-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {
    /* Header with Title and View All */
  }
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#E51B23] mb-2">
            <Flame className="w-4 h-4 fill-current" />
            <span>Top Picks This Week</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#191919] tracking-tight font-['Outfit']">
            Popular Meals
          </h2>
          <p className="text-sm sm:text-base text-[#777777] font-medium mt-1">
            Customer favorites, made fresh and ready to satisfy your hunger.
          </p>
        </div>

        <button
    onClick={onViewAllMenu}
    className="inline-flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#E51B23] hover:text-[#B90F16] transition-colors group self-start sm:self-auto cursor-pointer"
  >
          <span>View All Menu</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {
    /* Grid of Cards */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayItems.map((product) => <ProductCard
    key={product.id}
    product={product}
    onSelect={onSelectProduct}
    onQuickAdd={onQuickAdd}
    isFavorite={favorites.includes(product.id)}
    onToggleFavorite={onToggleFavorite}
  />)}
      </div>
    </section>;
};
export {
  PopularMeals
};
