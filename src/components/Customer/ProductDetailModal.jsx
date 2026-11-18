import { useState, useMemo, useEffect } from "react";
import { X, Star, Plus, Minus, Check, Clock, AlertTriangle } from "lucide-react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { catalogTagLabel } from "@/shared/lib/catalogApi";

const ProductDetailModal = ({ product, onClose, onAddToCart }) => {
  const { formatPrice } = useRestaurant();
  const activeVariants = (product?.variants || []).filter((variant) => variant.isActive !== false);
  const availableAddonsList = (product?.availableAddons || product?.addons || []).filter(
    (addon) => addon.isActive !== false
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  useEffect(() => {
    if (!product) return undefined;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, product]);

  useEffect(() => {
    if (!product) return;
    const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
    setQuantity(1);
    setSelectedVariantId(variants[0]?.id || "");
    setSelectedAddons([]);
    setSpecialInstructions("");
  }, [product]);

  const selectedVariant =
    activeVariants.find((variant) => variant.id === selectedVariantId) || activeVariants[0];
  const basePrice =
    typeof selectedVariant?.price === "number" && selectedVariant.price > 0
      ? selectedVariant.price
      : product?.price || 0;

  const addonSum = useMemo(
    () => selectedAddons.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [selectedAddons]
  );
  const unitPrice = basePrice + addonSum;
  const totalPrice = unitPrice * quantity;

  if (!product) return null;

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((item) => item.id === addon.id);
      if (exists) return prev.filter((item) => item.id !== addon.id);
      return [...prev, addon];
    });
  };

  const displayTag = product.displayTags?.[0] || null;
  const badgeText =
    product.promotionalTag?.text ||
    (product.isBestseller
      ? "Best Seller"
      : product.isNew
        ? "New"
        : product.originalPrice && product.originalPrice > product.price
          ? "Offer"
          : "");

  const handleAdd = () => {
    onAddToCart(
      {
        ...product,
        price: basePrice,
        selectedVariant: selectedVariant || null
      },
      quantity,
      selectedVariant?.name,
      undefined,
      selectedAddons,
      specialInstructions,
      totalPrice
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div
        id="product-detail-modal"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#EEE7DC] bg-white shadow-2xl animate-in zoom-in-95 duration-200 sm:rounded-[32px]"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-md backdrop-blur-md transition-colors hover:bg-white hover:text-[#191919]"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6 overflow-y-auto p-5 sm:p-7">
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <div className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden rounded-2xl bg-[#F7F1E7] shadow-xs sm:aspect-square sm:h-52 sm:w-52">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              {badgeText ? (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-[#E51B23] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  {badgeText}
                </span>
              ) : null}
            </div>

            <div className="flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-[#F5B82E]">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-xs font-black text-[#191919]">{product.rating ?? 4.8}</span>
                </div>
                <span className="text-xs text-[#777777]">({product.reviewsCount || 0} reviews)</span>
                {product.prepTime ? (
                  <span className="ml-auto flex items-center gap-1 text-xs text-[#777777]">
                    <Clock className="h-3 w-3 text-[#E51B23]" />
                    {product.prepTime}
                  </span>
                ) : null}
              </div>

              {product.categoryName ? (
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#E51B23]">
                  {product.categoryName}
                </p>
              ) : null}

              <h2 className="mb-2 font-['Outfit'] text-2xl font-black leading-tight text-[#191919] sm:text-3xl">
                {product.name}
              </h2>

              {displayTag ? (
                <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-[#FFF1E8] px-2.5 py-1 text-[10px] font-extrabold text-[#C94312]">
                  {displayTag.emoji ? <span>{displayTag.emoji}</span> : null}
                  {displayTag.label || catalogTagLabel(displayTag.key)}
                </span>
              ) : null}

              <p className="mb-4 text-sm leading-relaxed text-[#777777]">{product.description}</p>

              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-['Outfit'] text-2xl font-black text-[#191919]">
                  {formatPrice(basePrice)}
                </span>
                {product.originalPrice && product.originalPrice > basePrice ? (
                  <span className="text-sm font-semibold text-[#777777] line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                ) : null}
                {product.calories ? (
                  <span className="ml-1 text-xs font-semibold text-[#777777]">
                    {product.calories} Calories
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {activeVariants.length > 0 ? (
            <div className="border-t border-[#EEE7DC] pt-5">
              <h4 className="mb-3 flex items-center justify-between text-sm font-black uppercase tracking-wider text-[#191919]">
                <span>Choose Size / Variant</span>
                <span className="text-xs font-bold text-[#E51B23]">Required</span>
              </h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {activeVariants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 text-left text-xs font-bold transition-all sm:text-sm ${
                        isSelected
                          ? "border-[#E51B23] bg-[#E51B23]/5 text-[#E51B23]"
                          : "border-[#E9E2D8] bg-white text-[#3A3A3A] hover:bg-[#FFF9EF]"
                      }`}
                    >
                      <span className="pr-2">
                        <span className="block">{variant.name}</span>
                        {(variant.size || variant.portion) && (
                          <span className="mt-0.5 block text-[11px] font-semibold text-[#777777]">
                            {[variant.size, variant.portion ? `Serves ${variant.portion}` : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold">{formatPrice(variant.price)}</span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-[#E51B23] bg-[#E51B23] text-white"
                              : "border-neutral-300"
                          }`}
                        >
                          {isSelected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                        </div>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {availableAddonsList.length > 0 ? (
            <div className="border-t border-[#EEE7DC] pt-5">
              <h4 className="mb-3 flex items-center justify-between text-sm font-black uppercase tracking-wider text-[#191919]">
                <span>Add Extra Toppings & Sides</span>
                <span className="text-xs font-semibold text-[#777777]">Optional</span>
              </h4>
              <div className="space-y-2">
                {availableAddonsList.map((addon) => {
                  const isChecked = selectedAddons.some((item) => item.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition-all ${
                        isChecked
                          ? "border-[#E51B23] bg-[#E51B23]/5"
                          : "border-[#E9E2D8] bg-white hover:bg-[#FFF9EF]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-lg border ${
                            isChecked
                              ? "border-[#E51B23] bg-[#E51B23] text-white"
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isChecked ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                        </div>
                        <span className="text-xs font-bold text-[#191919] sm:text-sm">{addon.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-[#E51B23] sm:text-sm">
                        +{formatPrice(addon.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {product.allergens?.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="mb-1.5 flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Allergens</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-amber-900/80">
                {product.allergens.join(" · ")}
              </p>
            </div>
          ) : null}

          {product.ingredients?.length > 0 ? (
            <div className="border-t border-[#EEE7DC] pt-5">
              <h4 className="mb-2 text-sm font-black uppercase tracking-wider text-[#191919]">
                Ingredients
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ingredient) => (
                  <span
                    key={ingredient.id}
                    className="rounded-full border border-[#E9E2D8] bg-[#FFF9EF] px-2.5 py-1 text-[11px] font-bold text-[#3A3A3A]"
                  >
                    {ingredient.name}
                    {ingredient.quantity
                      ? ` · ${ingredient.quantity}${ingredient.unit ? ` ${ingredient.unit}` : ""}`
                      : ""}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {product.notes ? (
            <div className="rounded-2xl border border-[#E9E2D8] bg-[#FFF9EF] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#777777]">Chef note</p>
              <p className="mt-1 text-xs leading-relaxed text-[#3A3A3A]">{product.notes}</p>
            </div>
          ) : null}

          <div className="border-t border-[#EEE7DC] pt-5">
            <label
              htmlFor="special-instructions"
              className="mb-2 block text-sm font-black uppercase tracking-wider text-[#191919]"
            >
              Special Instructions
            </label>
            <textarea
              id="special-instructions"
              rows={2}
              placeholder="e.g. Extra napkins, sauce on the side..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full rounded-2xl border border-[#E9E2D8] bg-[#FFF9EF] p-3 text-xs text-[#191919] placeholder-neutral-400 focus:border-[#E51B23] focus:outline-none sm:text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#EEE7DC] bg-[#FFF9EF] p-4 sm:flex-row sm:p-5">
          <div className="flex items-center gap-3 rounded-full border border-[#E9E2D8] bg-white p-1 shadow-xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#191919] transition-colors hover:bg-[#FFF9EF] disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-black text-[#191919]">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#191919] transition-colors hover:bg-[#FFF9EF]"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            id="modal-add-to-cart-cta"
            onClick={handleAdd}
            className="flex w-full flex-1 items-center justify-between gap-3 rounded-full bg-[#E51B23] px-6 py-3.5 text-sm font-black text-white shadow-glow-red transition-all hover:-translate-y-0.5 hover:bg-[#B90F16] active:translate-y-0 sm:w-auto sm:justify-center sm:text-base"
          >
            <span>Add to Cart</span>
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-extrabold tracking-wide">
              {formatPrice(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export { ProductDetailModal };
