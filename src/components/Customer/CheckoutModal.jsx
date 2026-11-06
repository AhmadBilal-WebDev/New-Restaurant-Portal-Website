import { useState, useEffect } from "react";
import { X, CheckCircle2, Bike, ShoppingBag } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const CheckoutModal = ({
  isOpen,
  onClose,
  cartItems,
  onOrderPlaced,
  onClearCart,
  selectedBranch,
  selectedArea,
  orderMode = "delivery"
}) => {
  const { customerUser, formatPrice, config } = useRestaurant();
  const [deliveryMethod, setDeliveryMethod] = useState(orderMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [tipPercentage, setTipPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  useEffect(() => {
    if (customerUser) {
      if (customerUser.name) setFullName(customerUser.name);
      if (customerUser.email) setEmail(customerUser.email);
      if (customerUser.phone) setPhone(customerUser.phone);
      if (customerUser.address) setAddress(customerUser.address);
      if (customerUser.city) setCity(customerUser.city);
    } else {
      if (!fullName) setFullName("Guest Customer");
      if (!phone) setPhone("+92 300 1234567");
      if (!address) setAddress(selectedArea || selectedBranch?.address || "GT Road Branch Area");
    }
  }, [customerUser, selectedArea, selectedBranch]);
  useEffect(() => {
    setDeliveryMethod(orderMode);
  }, [orderMode]);
  if (!isOpen) return null;
  const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const branchDeliveryFee = deliveryMethod === "pickup" ? 0 : selectedBranch?.deliveryFee ?? 150;
  const freeThreshold = selectedBranch?.freeDeliveryThreshold ?? 2e3;
  const isFreeDelivery = subtotal >= freeThreshold && deliveryMethod === "delivery";
  const deliveryFee = cartItems.length === 0 ? 0 : isFreeDelivery ? 0 : branchDeliveryFee;
  const tax = 0;
  const tipAmount = subtotal * tipPercentage / 100;
  const grandTotal = subtotal + deliveryFee + tax + tipAmount;
  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const orderNumber = `BB-${Math.floor(1e5 + Math.random() * 9e5)}`;
      const newOrder = {
        orderId: orderNumber,
        orderNumber,
        createdAt: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        estimatedDeliveryTime: selectedBranch?.deliveryTime || "25 - 35 mins",
        items: [...cartItems],
        subtotal,
        deliveryFee,
        tax,
        tip: tipAmount,
        total: grandTotal,
        deliveryMethod,
        deliveryAddress: deliveryMethod === "delivery" ? `${address}${apartment ? ", " + apartment : ""}${city ? ", " + city : ""}` : `Pick up at ${selectedBranch?.name || config.name}`,
        customerName: fullName,
        customerPhone: phone,
        status: "received"
      };
      setPlacedOrder(newOrder);
      onOrderPlaced(newOrder);
      onClearCart();
      setIsSubmitting(false);
    }, 1e3);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {
    /* Backdrop */
  }
      <div
    className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
    onClick={placedOrder ? void 0 : onClose}
  />

      {
    /* Modal Container */
  }
      <div
    id="checkout-modal-container"
    className="relative bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl sm:rounded-[32px] shadow-2xl z-10 flex flex-col overflow-hidden border border-[#EEE7DC] animate-in zoom-in-95 duration-200"
  >
        {
    /* Header */
  }
        <div className="p-5 sm:p-6 bg-[#FFF9EF] border-b border-[#EEE7DC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#191919] font-['Outfit']">
              {placedOrder ? "Order Confirmed!" : "Checkout & Delivery"}
            </h2>
            {selectedBranch && <span className="text-xs bg-[#E51B23]/10 text-[#E51B23] font-bold px-2 py-0.5 rounded-full">
                {selectedBranch.shortName}
              </span>}
          </div>
          <button
    onClick={onClose}
    className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 text-neutral-600 flex items-center justify-center border border-[#E9E2D8] transition-colors cursor-pointer"
    aria-label="Close checkout"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Modal Body */
  }
        <div className="overflow-y-auto p-5 sm:p-7 no-scrollbar">
          {placedOrder ? (
    /* Order Placed Success Confirmation Screen */
    <div className="text-center py-4 space-y-6">
              <div className="w-20 h-20 rounded-full bg-[#2E9B5B]/10 border-2 border-[#2E9B5B] text-[#2E9B5B] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#E51B23]">
                  Order #{placedOrder.orderId}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#191919] font-['Outfit'] mt-1">
                  Thank You, {placedOrder.customerName}!
                </h3>
                <p className="text-sm text-[#777777] max-w-md mx-auto mt-2">
                  Your meal is being prepared with fresh ingredients right now at {selectedBranch?.shortName || config.name}. Estimated delivery in{" "}
                  <strong className="text-[#191919]">{placedOrder.estimatedDeliveryTime}</strong>.
                </p>
              </div>

              {
      /* Order summary card */
    }
              <div className="bg-[#FFF9EF] rounded-2xl p-5 border border-[#EEE7DC] max-w-lg mx-auto text-left space-y-3">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Branch</span>
                  <span className="font-bold text-[#191919]">{selectedBranch?.name || config.name}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Order Type</span>
                  <span className="font-bold uppercase text-[#E51B23]">{placedOrder.deliveryMethod}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Destination</span>
                  <span className="font-semibold text-[#191919] truncate max-w-[240px]">
                    {placedOrder.deliveryAddress}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#EEE7DC] flex justify-between text-sm font-black text-[#191919]">
                  <span>Total Paid / COD</span>
                  <span className="text-[#E51B23] text-base">{formatPrice(placedOrder.total)}</span>
                </div>
              </div>

              <div className="pt-4">
                <button
      type="button"
      onClick={onClose}
      className="bg-[#E51B23] hover:bg-[#B90F16] text-white font-extrabold px-8 py-3.5 rounded-full shadow-glow-red transition-all cursor-pointer"
    >
                  Done & Track Order
                </button>
              </div>
            </div>
  ) : (
    /* Checkout Form */
    <form onSubmit={handlePlaceOrder} className="space-y-6">
              {
      /* Delivery / Pickup Tabs */
    }
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#FAF6F0] p-1 rounded-2xl border border-[#EEE7DC]">
                  <button
      type="button"
      onClick={() => setDeliveryMethod("delivery")}
      className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${deliveryMethod === "delivery" ? "bg-[#E51B23] text-white shadow-xs" : "text-neutral-600 hover:text-[#191919]"}`}
    >
                    <Bike className="w-4 h-4" />
                    <span>Delivery ({selectedBranch?.deliveryTime || "25-35 min"})</span>
                  </button>
                  <button
      type="button"
      onClick={() => setDeliveryMethod("pickup")}
      className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${deliveryMethod === "pickup" ? "bg-[#191919] text-white shadow-xs" : "text-neutral-600 hover:text-[#191919]"}`}
    >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Pick-Up (15 min)</span>
                  </button>
                </div>
              </div>

              {
      /* Customer Profile info */
    }
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Contact & Customer Details
                  </label>
                  {customerUser ? <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Auto-filled from profile
                    </span> : <span className="text-[11px] text-neutral-500">Ordering as guest</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Full Name</label>
                    <input
      type="text"
      required
      value={fullName}
      onChange={(e) => setFullName(e.target.value)}
      placeholder="e.g. Alex Morgan"
      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Phone Number</label>
                    <input
      type="tel"
      required
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      placeholder="e.g. +92 300 1234567"
      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Email (for receipt)</label>
                    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="e.g. alex@example.com"
      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
    />
                  </div>
                </div>
              </div>

              {
      /* Delivery Address (if delivery) */
    }
              {deliveryMethod === "delivery" && <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                    Delivery Address (Serving Area: {selectedArea || selectedBranch?.area})
                  </label>
                  <div className="space-y-3">
                    <input
      type="text"
      required
      value={address}
      onChange={(e) => setAddress(e.target.value)}
      placeholder="Street address, house/building number"
      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
      type="text"
      value={apartment}
      onChange={(e) => setApartment(e.target.value)}
      placeholder="Apt / Suite (optional)"
      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
    />
                      <input
      type="text"
      value={city}
      onChange={(e) => setCity(e.target.value)}
      placeholder="City"
      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
    />
                    </div>
                    <textarea
      rows={2}
      value={deliveryNotes}
      onChange={(e) => setDeliveryNotes(e.target.value)}
      placeholder="Delivery instructions (e.g. gate code, leave at door)"
      className="w-full px-3.5 py-2 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919] resize-none"
    />
                  </div>
                </div>}

              {
      /* Payment Method */
    }
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
      type="button"
      onClick={() => setPaymentMethod("cash")}
      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${paymentMethod === "cash" ? "border-[#E51B23] bg-[#FFF9EF] ring-1 ring-[#E51B23]" : "border-[#EEE7DC] hover:border-neutral-300"}`}
    >
                    <div className="text-xs font-black text-[#191919]">Cash On Delivery</div>
                    <span className="text-[10px] text-neutral-500">Pay when arrived</span>
                  </button>
                  <button
      type="button"
      onClick={() => setPaymentMethod("card")}
      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${paymentMethod === "card" ? "border-[#E51B23] bg-[#FFF9EF] ring-1 ring-[#E51B23]" : "border-[#EEE7DC] hover:border-neutral-300"}`}
    >
                    <div className="text-xs font-black text-[#191919]">Card On Delivery</div>
                    <span className="text-[10px] text-neutral-500">Rider POS machine</span>
                  </button>
                  <button
      type="button"
      onClick={() => setPaymentMethod("apple_pay")}
      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${paymentMethod === "apple_pay" ? "border-[#E51B23] bg-[#FFF9EF] ring-1 ring-[#E51B23]" : "border-[#EEE7DC] hover:border-neutral-300"}`}
    >
                    <div className="text-xs font-black text-[#191919]">Online Wallet</div>
                    <span className="text-[10px] text-neutral-500">JazzCash / Easypaisa</span>
                  </button>
                </div>
              </div>

              {
      /* Summary breakdown */
    }
              <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#EEE7DC] space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span className="font-bold text-[#191919]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-[#191919]">
                    {deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Taxes</span>
                  <span className="font-bold text-neutral-500">{formatPrice(0)} (Included)</span>
                </div>
                <div className="pt-2 border-t border-[#EEE7DC] flex justify-between text-base font-black text-[#191919]">
                  <span>Total Amount</span>
                  <span className="text-[#E51B23] text-lg">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {
      /* Submit CTA */
    }
              <button
      type="submit"
      disabled={isSubmitting}
      className="w-full bg-[#E51B23] hover:bg-[#B90F16] text-white font-black py-4 rounded-full shadow-glow-red hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
    >
                <span>{isSubmitting ? "Placing Order..." : `Place Order • ${formatPrice(grandTotal)}`}</span>
              </button>
            </form>
  )}
        </div>
      </div>
    </div>;
};
export {
  CheckoutModal
};
