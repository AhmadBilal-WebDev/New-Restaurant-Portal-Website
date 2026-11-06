import { useState, useMemo, useEffect } from "react";
import { X, Star, Plus, Minus, Check, Clock } from "lucide-react";
import { defaultAddons, bunOptions, cheeseOptions } from '@/shared/data/mockData';
const ProductDetailModal = ({
  product,
  onClose,
  onAddToCart
}) => {
  if (!product) return null;
  const [quantity, setQuantity] = useState(1);
  const [selectedBun, setSelectedBun] = useState(
    product.availableBuns ? product.availableBuns[0] : bunOptions[0]
  );
  const [selectedCheese, setSelectedCheese] = useState(
    product.availableCheese ? product.availableCheese[0] : cheeseOptions[0]
  );
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };
  const addonSum = useMemo(() => {
    return selectedAddons.reduce((sum, item) => sum + item.price, 0);
  }, [selectedAddons]);
  const unitPrice = product.price + addonSum;
  const totalPrice = unitPrice * quantity;
  const availableAddonsList = product.availableAddons || defaultAddons;
  const hasCustomization = product.category === "burgers" || product.category === "chicken" || product.category === "breakfast";
  const handleAdd = () => {
    onAddToCart(
      product,
      quantity,
      hasCustomization ? selectedBun : void 0,
      hasCustomization ? selectedCheese : void 0,
      selectedAddons,
      specialInstructions,
      totalPrice
    );
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {
    /* Backdrop */
  }
      <div
    className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
    onClick={onClose}
  />

      {
    /* Modal Card */
  }
      <div
    id="product-detail-modal"
    className="relative bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl sm:rounded-[32px] shadow-2xl z-10 flex flex-col overflow-hidden border border-[#EEE7DC] animate-in zoom-in-95 duration-200"
  >
        {
    /* Close Button */
  }
        <button
    onClick={onClose}
    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md text-neutral-600 hover:text-[#191919] hover:bg-white flex items-center justify-center shadow-md transition-colors"
    aria-label="Close modal"
  >
          <X className="w-5 h-5" />
        </button>

        {
    /* Scrollable Modal Body */
  }
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6">
          {
    /* Top Product Showcase */
  }
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="relative w-full sm:w-52 sm:h-52 aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-[#F7F1E7] flex-shrink-0 shadow-xs">
              <img
    src={product.image}
    alt={product.name}
    referrerPolicy="no-referrer"
    className="w-full h-full object-cover"
  />
              {product.isBestseller && <span className="absolute top-2.5 left-2.5 bg-[#E51B23] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Best Seller
                </span>}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1 text-[#F5B82E]">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs font-black text-[#191919]">{product.rating}</span>
                </div>
                <span className="text-xs text-[#777777]">({product.reviewsCount} reviews)</span>
                {product.prepTime && <span className="text-xs text-[#777777] flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3 text-[#E51B23]" />
                    {product.prepTime}
                  </span>}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#191919] font-['Outfit'] leading-tight mb-2">
                {product.name}
              </h2>

              <p className="text-sm text-[#777777] leading-relaxed mb-4">
                {product.description}
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#191919] font-['Outfit']">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && <span className="text-sm text-[#777777] line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>}
                {product.calories && <span className="text-xs font-semibold text-[#777777] ml-2">
                    {product.calories} Calories
                  </span>}
              </div>
            </div>
          </div>

          {
    /* Options: Bun Choice (if applicable) */
  }
          {hasCustomization && <div className="border-t border-[#EEE7DC] pt-5">
              <h4 className="text-sm font-black text-[#191919] uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>1. Choose Your Bun</span>
                <span className="text-xs text-[#E51B23] font-bold">Required</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(product.availableBuns || bunOptions).map((bun) => {
    const isSelected = selectedBun === bun;
    return <button
      key={bun}
      type="button"
      onClick={() => setSelectedBun(bun)}
      className={`flex items-center justify-between p-3 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${isSelected ? "border-[#E51B23] bg-[#E51B23]/5 text-[#E51B23]" : "border-[#E9E2D8] bg-white text-[#3A3A3A] hover:bg-[#FFF9EF]"}`}
    >
                      <span>{bun}</span>
                      <div
      className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-[#E51B23] bg-[#E51B23] text-white" : "border-neutral-300"}`}
    >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>;
  })}
              </div>
            </div>}

          {
    /* Options: Cheese Choice (if applicable) */
  }
          {hasCustomization && <div className="border-t border-[#EEE7DC] pt-5">
              <h4 className="text-sm font-black text-[#191919] uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>2. Choose Your Cheese</span>
                <span className="text-xs text-[#E51B23] font-bold">Required</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(product.availableCheese || cheeseOptions).map((cheese) => {
    const isSelected = selectedCheese === cheese;
    return <button
      key={cheese}
      type="button"
      onClick={() => setSelectedCheese(cheese)}
      className={`flex items-center justify-between p-3 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${isSelected ? "border-[#E51B23] bg-[#E51B23]/5 text-[#E51B23]" : "border-[#E9E2D8] bg-white text-[#3A3A3A] hover:bg-[#FFF9EF]"}`}
    >
                      <span>{cheese}</span>
                      <div
      className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-[#E51B23] bg-[#E51B23] text-white" : "border-neutral-300"}`}
    >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>;
  })}
              </div>
            </div>}

          {
    /* Add-ons Checklist */
  }
          {availableAddonsList.length > 0 && <div className="border-t border-[#EEE7DC] pt-5">
              <h4 className="text-sm font-black text-[#191919] uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Add Extra Toppings & Sides</span>
                <span className="text-xs text-[#777777] font-semibold">Optional</span>
              </h4>
              <div className="space-y-2">
                {availableAddonsList.map((addon) => {
    const isChecked = selectedAddons.some((a) => a.id === addon.id);
    return <div
      key={addon.id}
      onClick={() => toggleAddon(addon)}
      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${isChecked ? "border-[#E51B23] bg-[#E51B23]/5" : "border-[#E9E2D8] bg-white hover:bg-[#FFF9EF]"}`}
    >
                      <div className="flex items-center gap-3">
                        <div
      className={`w-5 h-5 rounded-lg border flex items-center justify-center ${isChecked ? "border-[#E51B23] bg-[#E51B23] text-white" : "border-neutral-300 bg-white"}`}
    >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-[#191919]">
                          {addon.name}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-[#E51B23]">
                        +${addon.price.toFixed(2)}
                      </span>
                    </div>;
  })}
              </div>
            </div>}

          {
    /* Special Instructions Note */
  }
          <div className="border-t border-[#EEE7DC] pt-5">
            <label
    htmlFor="special-instructions"
    className="block text-sm font-black text-[#191919] uppercase tracking-wider mb-2"
  >
              Special Instructions
            </label>
            <textarea
    id="special-instructions"
    rows={2}
    placeholder="e.g. Extra napkins, no ice in drink, sauce on the side..."
    value={specialInstructions}
    onChange={(e) => setSpecialInstructions(e.target.value)}
    className="w-full bg-[#FFF9EF] border border-[#E9E2D8] rounded-2xl p-3 text-xs sm:text-sm text-[#191919] placeholder-neutral-400 focus:outline-none focus:border-[#E51B23]"
  />
          </div>
        </div>

        {
    /* Modal Bottom Sticky Action Bar */
  }
        <div className="border-t border-[#EEE7DC] bg-[#FFF9EF] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {
    /* Quantity Stepper */
  }
          <div className="flex items-center gap-3 bg-white border border-[#E9E2D8] rounded-full p-1 shadow-xs">
            <button
    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
    disabled={quantity <= 1}
    className="w-9 h-9 rounded-full flex items-center justify-center text-[#191919] hover:bg-[#FFF9EF] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    aria-label="Decrease quantity"
  >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-black text-[#191919]">
              {quantity}
            </span>
            <button
    onClick={() => setQuantity((q) => q + 1)}
    className="w-9 h-9 rounded-full flex items-center justify-center text-[#191919] hover:bg-[#FFF9EF] transition-colors"
    aria-label="Increase quantity"
  >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {
    /* Add to Cart CTA */
  }
          <button
    id="modal-add-to-cart-cta"
    onClick={handleAdd}
    className="w-full sm:w-auto flex-1 bg-[#E51B23] hover:bg-[#B90F16] text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-full shadow-glow-red hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-between sm:justify-center gap-3"
  >
            <span>Add to Cart</span>
            <span className="bg-black/20 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide">
              ${totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>;
};
export {
  ProductDetailModal
};
