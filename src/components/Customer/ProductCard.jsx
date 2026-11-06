import { Star, Plus, Heart, Flame, Clock } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { catalogTagLabel } from '@/shared/lib/catalogApi';
const ProductCard = ({
  product,
  onSelect,
  onQuickAdd,
  isFavorite,
  onToggleFavorite
}) => {
  const { formatPrice } = useRestaurant();
  const catalogTag = product.tags?.find((tag) => tag !== "outofstock" && tag !== "out_of_stock");
  const renderSingleTag = () => {
    if (product.promotionalTag === "bestseller" || !product.promotionalTag && product.isBestseller) {
      return <span className="inline-flex items-center gap-1 bg-[#E51B23] text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
          <Flame className="w-3 h-3 fill-current" />
          Best Seller
        </span>;
    }
    if (product.promotionalTag === "new" || !product.promotionalTag && product.isNew) {
      return <span className="bg-[#F5B82E] text-[#191919] text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
          New
        </span>;
    }
    if (product.promotionalTag === "discount" || !product.promotionalTag && product.originalPrice && product.originalPrice > product.price) {
      const pct = product.originalPrice ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100) : 10;
      return <span className="bg-[#2E9B5B] text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
          {pct}% OFF
        </span>;
    }
    return null;
  };
  return <div
    id={`product-card-${product.id}`}
    onClick={() => onSelect(product)}
    className="group relative flex flex-col justify-between bg-white rounded-3xl p-4 sm:p-5 border border-[#EEE7DC] shadow-soft-card hover:shadow-soft-card-hover hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
  >
      {
    /* Top Image & Single Badge Container */
  }
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#F7F1E7] mb-4">
        <img
    src={product.image}
    alt={product.name}
    referrerPolicy="no-referrer"
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
    loading="lazy"
  />

        {
    /* Single Badge - strictly one promotional tag */
  }
        <div className="absolute top-2.5 left-2.5 z-10">
          {renderSingleTag()}
        </div>

        {
    /* Heart / Favorite Toggle Button */
  }
        <button
    onClick={(e) => onToggleFavorite(product.id, e)}
    className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 z-10 shadow-sm ${isFavorite ? "bg-[#E51B23] text-white scale-110" : "bg-white/90 backdrop-blur-xs text-neutral-500 hover:text-[#E51B23] hover:bg-white hover:scale-105"}`}
    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
  >
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>

        {
    /* Prep Time pill in bottom corner */
  }
        {product.prepTime && <div className="absolute bottom-2 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>{product.prepTime}</span>
          </div>}
      </div>

      {
    /* Product Content Details */
  }
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {
    /* Rating and Reviews */
  }
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#F5B82E] fill-current" />
              <span className="text-xs font-extrabold text-[#191919]">{product.rating}</span>
              <span className="text-[11px] text-[#777777]">({product.reviewsCount})</span>
            </div>
            {product.calories && <span className="text-[11px] font-medium text-[#777777]">
                {product.calories} kcal
              </span>}
          </div>

          {
    /* Product Name */
  }
          <h3 className="text-base sm:text-lg font-black text-[#191919] leading-snug group-hover:text-[#E51B23] transition-colors mb-1.5 font-['Outfit']">
            {product.name}
          </h3>

          {catalogTag && <span className="inline-flex mb-2 rounded-full bg-[#FFF1E8] px-2.5 py-1 text-[10px] font-extrabold text-[#C94312]">
              {catalogTagLabel(catalogTag)}
            </span>}

          {
    /* Short Description */
  }
          <p className="text-xs sm:text-sm text-[#777777] line-clamp-2 leading-relaxed mb-4">
            {product.description}
          </p>
        </div>

        {
    /* Price & Action Button Footer */
  }
        <div className="pt-3 border-t border-[#EEE7DC]/80 flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-black text-[#191919] font-['Outfit']">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && <span className="text-xs text-[#777777] line-through font-semibold">
                {formatPrice(product.originalPrice)}
              </span>}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-bold text-[#E51B23] group-hover:underline">
              Customize
            </span>
            <button
    onClick={(e) => onQuickAdd(product, e)}
    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E51B23] hover:bg-[#B90F16] text-white flex items-center justify-center shadow-glow-red hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
    title="Add to order"
    aria-label={`Add ${product.name} to order`}
  >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>;
};
export {
  ProductCard
};
