import { useState } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Sparkles, Tag, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const CartDrawer = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onBrowseMenu
}) => {
  const { currentBranch, applyPromoCode, formatPrice, currentOrderMode } = useRestaurant();
  const [promoCode, setPromoCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoMessage, setPromoMessage] = useState(null);
  if (!isOpen) return null;
  const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const branchDeliveryFee = currentOrderMode === "pickup" ? 0 : currentBranch?.deliveryFee ?? 150;
  const freeThreshold = currentBranch?.freeDeliveryThreshold ?? 2e3;
  const isFreeDelivery = subtotal >= freeThreshold && currentOrderMode === "delivery";
  const amountNeededForFreeDelivery = Math.max(0, freeThreshold - subtotal);
  const deliveryProgress = Math.min(100, subtotal / freeThreshold * 100);
  const deliveryFee = cartItems.length === 0 ? 0 : isFreeDelivery ? 0 : branchDeliveryFee;
  const estimatedTax = 0;
  const grandTotal = subtotalAfterDiscount + deliveryFee + estimatedTax;
  const minOrder = currentBranch?.minOrder || 500;
  const isBelowMinOrder = currentOrderMode === "delivery" && subtotal < minOrder && cartItems.length > 0;
  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const res = applyPromoCode(promoCode, subtotal);
    if (res.success) {
      setDiscountAmount(res.discount);
      setPromoMessage({ text: res.message, isError: false });
    } else {
      setDiscountAmount(0);
      setPromoMessage({ text: res.message, isError: true });
    }
  };
  return <div className="fixed inset-0 z-50 flex justify-end">
      {
    /* Backdrop */
  }
      <div
    className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
    onClick={onClose}
  />

      {
    /* Slide-out Drawer Panel */
  }
      <div
    id="cart-drawer-panel"
    className="relative w-full max-w-md bg-[#FFF9EF] h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden border-l border-[#EEE7DC] animate-in slide-in-from-right duration-300"
  >
        {
    /* Top Header */
  }
        <div className="p-5 sm:p-6 bg-white border-b border-[#EEE7DC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E51B23]/10 text-[#E51B23] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#191919] font-['Outfit']">
                Your Cart
              </h2>
              <span className="text-xs font-semibold text-[#777777]">
                {currentBranch?.shortName || "Branch"} •{" "}
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)} item
                {cartItems.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <button
    onClick={onClose}
    className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
    aria-label="Close cart"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Free Delivery Meter for Delivery orders */
  }
        {cartItems.length > 0 && currentOrderMode === "delivery" && <div className="bg-[#FFF9EF] px-5 py-3 border-b border-[#EEE7DC]">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              {isFreeDelivery ? <span className="text-[#2E9B5B] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> You unlocked FREE delivery!
                </span> : <span className="text-[#3A3A3A]">
                  Add <strong className="text-[#E51B23]">{formatPrice(amountNeededForFreeDelivery)}</strong> more for FREE delivery
                </span>}
              <span className="text-[#777777] font-semibold">{Math.round(deliveryProgress)}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
              <div
    className="bg-[#2E9B5B] h-full rounded-full transition-all duration-300"
    style={{ width: `${deliveryProgress}%` }}
  />
            </div>
          </div>}

        {
    /* Minimum Order Warning if applicable */
  }
        {isBelowMinOrder && <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Minimum order of {formatPrice(minOrder)} required for delivery from this branch.
            </span>
          </div>}

        {
    /* Cart Item List */
  }
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {cartItems.length > 0 ? cartItems.map((item) => <div
    key={item.cartItemId}
    className="bg-white rounded-2xl p-3.5 border border-[#EEE7DC] shadow-xs flex gap-3.5 items-start"
  >
                {
    /* Thumbnail */
  }
                <img
    src={item.product.image}
    alt={item.product.name}
    referrerPolicy="no-referrer"
    className="w-18 h-18 rounded-xl object-cover bg-[#F7F1E7] flex-shrink-0"
  />

                {
    /* Details */
  }
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-sm font-bold text-[#191919] truncate">
                      {item.product.name}
                    </h4>
                    <button
    onClick={() => onRemoveItem(item.cartItemId)}
    className="text-neutral-400 hover:text-[#E51B23] p-1 transition-colors cursor-pointer"
    title="Remove item"
  >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {
    /* Customizations summary */
  }
                  <div className="text-[11px] text-[#777777] space-y-0.5 my-1">
                    {item.selectedBun && <div>• {item.selectedBun}</div>}
                    {item.selectedCheese && <div>• {item.selectedCheese}</div>}
                    {item.selectedAddons && item.selectedAddons.length > 0 && <div className="text-[#E51B23]">
                        + {item.selectedAddons.map((a) => a.name).join(", ")}
                      </div>}
                    {item.specialInstructions && <div className="italic text-neutral-500 truncate">
                        "{item.specialInstructions}"
                      </div>}
                  </div>

                  {
    /* Price & Quantity Stepper */
  }
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-neutral-100">
                    <span className="text-sm font-black text-[#191919] font-['Outfit']">
                      {formatPrice(item.totalPrice)}
                    </span>

                    <div className="flex items-center gap-2 bg-[#FFF9EF] border border-[#E9E2D8] rounded-full px-2 py-0.5">
                      <button
    onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
    className="text-neutral-500 hover:text-[#191919] p-0.5 cursor-pointer"
    aria-label="Decrease quantity"
  >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-[#191919] w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
    onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
    className="text-neutral-500 hover:text-[#191919] p-0.5 cursor-pointer"
    aria-label="Increase quantity"
  >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>) : (
    /* Empty Cart View */
    <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-20 h-20 rounded-full bg-white border border-[#E9E2D8] flex items-center justify-center text-[#E51B23] mb-4 shadow-sm">
                <ShoppingBag className="w-9 h-9 stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-black text-[#191919] font-['Outfit'] mb-1">
                Your cart is hungry!
              </h3>
              <p className="text-xs sm:text-sm text-[#777777] max-w-xs mb-6">
                You haven't added any juicy smash burgers or crispy sides to your order yet.
              </p>
              <button
      onClick={() => {
        onClose();
        onBrowseMenu();
      }}
      className="bg-[#E51B23] hover:bg-[#B90F16] text-white font-bold text-sm px-6 py-3 rounded-full shadow-glow-red transition-all cursor-pointer"
    >
                Browse Menu Now
              </button>
            </div>
  )}
        </div>

        {
    /* Bottom Checkout Controls */
  }
        {cartItems.length > 0 && <div className="bg-white border-t border-[#EEE7DC] p-5 space-y-4">
            {
    /* Promo Code Form */
  }
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
    type="text"
    placeholder="Promo code (e.g. BLAST20, WELCOME50)"
    value={promoCode}
    onChange={(e) => setPromoCode(e.target.value)}
    className="w-full bg-[#FFF9EF] text-xs font-semibold uppercase text-[#191919] pl-8 pr-3 py-2 rounded-xl border border-[#E9E2D8] focus:outline-none focus:border-[#E51B23]"
  />
              </div>
              <button
    type="submit"
    disabled={!promoCode.trim()}
    className="bg-[#191919] hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
  >
                Apply
              </button>
            </form>

            {promoMessage && <div
    className={`text-[11px] font-bold flex items-center gap-1.5 ${promoMessage.isError ? "text-red-600" : "text-emerald-700"}`}
  >
                {promoMessage.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{promoMessage.text}</span>
              </div>}

            {
    /* Calculations Breakdown */
  }
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#777777]">
                <span>Subtotal</span>
                <span className="font-bold text-[#191919]">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && <div className="flex justify-between text-[#2E9B5B] font-bold">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>}
              <div className="flex justify-between text-[#777777]">
                <span>Delivery Fee ({currentBranch?.shortName || "Branch"})</span>
                <span className="font-bold text-[#191919]">
                  {deliveryFee === 0 ? <span className="text-[#2E9B5B] uppercase text-[10px] tracking-wider font-extrabold">
                      FREE
                    </span> : formatPrice(deliveryFee)}
                </span>
              </div>

              {
    /* Tax is 0 as per Requirement 14 */
  }
              <div className="flex justify-between text-[#777777]">
                <span>Sales Tax</span>
                <span className="font-bold text-neutral-500">{formatPrice(0)} (Included)</span>
              </div>

              <div className="flex justify-between text-base font-black text-[#191919] pt-2 border-t border-[#EEE7DC] font-['Outfit']">
                <span>Grand Total</span>
                <span className="text-xl text-[#E51B23]">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            {
    /* Checkout CTA */
  }
            <button
    id="cart-checkout-btn"
    onClick={onCheckout}
    disabled={isBelowMinOrder}
    className="w-full bg-[#E51B23] hover:bg-[#B90F16] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base py-4 rounded-full shadow-glow-red hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
  >
              <span>{isBelowMinOrder ? `Minimum Order is ${formatPrice(minOrder)}` : "Proceed to Checkout"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>}
      </div>
    </div>;
};
export {
  CartDrawer
};
