import { Star, Plus, Heart, Flame, Clock } from "lucide-react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { catalogTagLabel } from "@/shared/lib/catalogApi";

const ProductCard = ({ product, onSelect, onQuickAdd, isFavorite, onToggleFavorite }) => {
  const { formatPrice } = useRestaurant();
  const displayTag = product.displayTags?.[0] || null;
  const catalogTagKey =
    displayTag?.key ||
    product.tags?.find((tag) => {
      const key = typeof tag === "string" ? tag : tag?.key;
      return key && key !== "outofstock" && key !== "out_of_stock";
    });

  const renderSingleTag = () => {
    const promoType =
      typeof product.promotionalTag === "object"
        ? product.promotionalTag?.type
        : product.promotionalTag;

    if (promoType === "bestseller" || product.isBestseller) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#E51B23] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm sm:text-xs">
          <Flame className="h-3 w-3 fill-current" />
          Best Seller
        </span>
      );
    }
    if (promoType === "new" || product.isNew) {
      return (
        <span className="rounded-full bg-[#F5B82E] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#191919] shadow-sm sm:text-xs">
          {product.promotionalTag?.text || "New"}
        </span>
      );
    }
    if (
      promoType === "discount" ||
      (product.originalPrice && product.originalPrice > product.price)
    ) {
      const pct = product.originalPrice
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 10;
      return (
        <span className="rounded-full bg-[#2E9B5B] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm sm:text-xs">
          {pct}% OFF
        </span>
      );
    }
    return null;
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelect(product)}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-[#EEE7DC] bg-white p-4 shadow-soft-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-soft-card-hover sm:p-5"
    >
      <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#F7F1E7]">
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute left-2.5 top-2.5 z-10">{renderSingleTag()}</div>

        <button
          onClick={(e) => onToggleFavorite(product.id, e)}
          className={`absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all duration-200 ${
            isFavorite
              ? "scale-110 bg-[#E51B23] text-white"
              : "bg-white/90 text-neutral-500 backdrop-blur-xs hover:scale-105 hover:bg-white hover:text-[#E51B23]"
          }`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>

        {product.prepTime ? (
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
            <Clock className="h-2.5 w-2.5" />
            <span>{product.prepTime}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current text-[#F5B82E]" />
              <span className="text-xs font-extrabold text-[#191919]">{product.rating ?? 4.8}</span>
              <span className="text-[11px] text-[#777777]">({product.reviewsCount || 0})</span>
            </div>
            {product.calories ? (
              <span className="text-[11px] font-medium text-[#777777]">{product.calories} kcal</span>
            ) : null}
          </div>

          {product.categoryName ? (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#E51B23]/80">
              {product.categoryName}
            </p>
          ) : null}

          <h3 className="mb-1.5 font-['Outfit'] text-base font-black leading-snug text-[#191919] transition-colors group-hover:text-[#E51B23] sm:text-lg">
            {product.name}
          </h3>

          {(displayTag || catalogTagKey) && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFF1E8] px-2.5 py-1 text-[10px] font-extrabold text-[#C94312]">
              {displayTag?.emoji ? <span>{displayTag.emoji}</span> : null}
              {displayTag?.label ||
                catalogTagLabel(typeof catalogTagKey === "string" ? catalogTagKey : catalogTagKey?.key)}
            </span>
          )}

          <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-[#777777] sm:text-sm">
            {product.description}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[#EEE7DC]/80 pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-['Outfit'] text-lg font-black text-[#191919] sm:text-xl">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice ? (
              <span className="text-xs font-semibold text-[#777777] line-through">
                {formatPrice(product.originalPrice)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-bold text-[#E51B23] group-hover:underline sm:inline">
              {product.variants?.length ? "Customize" : "Add"}
            </span>
            <button
              onClick={(e) => onQuickAdd(product, e)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#E51B23] text-white shadow-glow-red transition-all duration-200 hover:scale-110 hover:bg-[#B90F16] active:scale-95 sm:h-10 sm:w-10"
              title="Add to order"
              aria-label={`Add ${product.name} to order`}
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProductCard };
