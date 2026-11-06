import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  User,
  Phone,
  Utensils,
  ShoppingBag,
  Bike
} from "lucide-react";
const CounterPage = () => {
  const {
    products,
    categories,
    branches,
    activeBranchFilter,
    formatPrice,
    placeCustomerOrder,
    addToast,
    config
  } = useRestaurant();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderMode, setOrderMode] = useState("dine-in");
  const [customerName, setCustomerName] = useState("Walk-in Guest");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerTable, setCustomerTable] = useState("Table 4");
  const [ticketItems, setTicketItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState(null);
  const liveIds = new Set(branches.filter((b) => b.isActive !== false).map((b) => b.id));
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch = searchQuery === "" || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const availability = p.branchAvailability?.length ? p.branchAvailability : p.branchIds;
    const matchesBranch = !availability || availability.length === 0 || (activeBranchFilter === "all" ? availability.some((id) => id === "all" || liveIds.has(id)) : availability.includes(activeBranchFilter) || availability.includes("all"));
    return matchesCat && matchesSearch && matchesBranch;
  });
  const handleAddToTicket = (product) => {
    setTicketItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        const cur = updated[existingIdx];
        const newQty = cur.quantity + 1;
        updated[existingIdx] = {
          ...cur,
          quantity: newQty,
          totalPrice: cur.unitPrice * newQty
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.price,
            totalPrice: product.price
          }
        ];
      }
    });
  };
  const handleUpdateQty = (productId, delta) => {
    setTicketItems(
      (prev) => prev.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? {
            ...item,
            quantity: newQty,
            totalPrice: item.unitPrice * newQty
          } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };
  const handleClearTicket = () => {
    setTicketItems([]);
    setDiscountAmount(0);
    addToast("Order Cleared", "Active ticket has been emptied.", "info");
  };
  const subtotal = ticketItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const tax = subtotal * (config.contact.taxRate || 0.08);
  const deliveryFee = orderMode === "delivery" ? 150 : 0;
  const grandTotal = Math.max(0, subtotal + tax + deliveryFee - discountAmount);
  const liveBranches = branches.filter((b) => b.isActive !== false);
  const branchObj = activeBranchFilter === "all" ? liveBranches[0] || branches[0] : liveBranches.find((b) => b.id === activeBranchFilter) || liveBranches[0] || branches[0];
  const handleCompletePayment = (method) => {
    if (ticketItems.length === 0) return;
    const cartItemsMapped = ticketItems.map((ti) => ({
      cartItemId: ti.product.id + "-" + Date.now(),
      product: ti.product,
      quantity: ti.quantity,
      selectedAddons: [],
      unitPrice: ti.unitPrice,
      totalPrice: ti.totalPrice
    }));
    const newOrder = placeCustomerOrder({
      items: cartItemsMapped,
      customerName: customerName + (orderMode === "dine-in" ? ` (${customerTable})` : ""),
      phone: customerPhone || "+92 300 1234567",
      address: orderMode === "delivery" ? "Customer Delivery Address" : `${branchObj.name} (Counter)`,
      branchId: branchObj.id,
      paymentMethod: method,
      orderMode: orderMode === "delivery" ? "delivery" : "pickup",
      subtotal,
      deliveryFee,
      tax,
      total: grandTotal,
      notes: `POS Counter Terminal order (${orderMode.toUpperCase()})`
    });
    setPaymentSuccessOrder(newOrder);
    setTicketItems([]);
    setDiscountAmount(0);
  };
  return <div className="p-4 sm:p-6 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {
    /* =========================================================================
        LEFT AREA: CATEGORIES, SEARCH, PRODUCT GRID (approx 7.5 of 12 cols)
    ========================================================================== */
  }
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {
    /* Top Search and Branch Bar */
  }
          <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search food, drinks, codes..."
    className="w-full bg-[#101216] border border-[#292D35] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5A1F] transition-colors"
  />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs text-neutral-300">
              <span className="text-neutral-400 text-[11px]">Active Register:</span>
              <span className="font-bold text-white bg-[#101216] px-2.5 py-1 rounded-lg border border-[#292D35]">
                {branchObj?.shortName || "Main Counter"} · Terminal 1
              </span>
            </div>
          </div>

          {
    /* Categories Selector Carousel / Tabs */
  }
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
    onClick={() => setSelectedCategory("all")}
    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === "all" ? "bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20" : "bg-[#191B20] border border-[#292D35] text-neutral-300 hover:bg-[#252830]"}`}
  >
              All Items ({products.length})
            </button>

            {categories.map((cat) => <button
    key={cat.id}
    onClick={() => setSelectedCategory(cat.id)}
    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id ? "bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20" : "bg-[#191B20] border border-[#292D35] text-neutral-300 hover:bg-[#252830]"}`}
  >
                {cat.name}
              </button>)}
          </div>

          {
    /* Product Grid */
  }
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((p) => <div
    key={p.id}
    onClick={() => handleAddToTicket(p)}
    className="bg-[#191B20] border border-[#292D35] hover:border-[#FF5A1F]/50 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group select-none"
  >
                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-[#101216] mb-2.5">
                  <img
    src={p.image}
    alt={p.name}
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    loading="lazy"
  />
                  <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    {p.prepTime || "10m"}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white text-xs line-clamp-1 group-hover:text-[#FF5A1F] transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                    {p.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#292D35]/50">
                  <span className="font-extrabold text-sm text-white font-mono">
                    {formatPrice(p.price)}
                  </span>
                  <button
    className="w-7 h-7 rounded-lg bg-[#FF5A1F]/15 text-[#FF5A1F] group-hover:bg-[#FF5A1F] group-hover:text-white flex items-center justify-center transition-colors"
    title="Add to order"
  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>)}
          </div>
        </div>

        {
    /* =========================================================================
        RIGHT AREA: CURRENT ORDER TICKET (approx 4.5 of 12 cols)
    ========================================================================== */
  }
        <div className="lg:col-span-5 xl:col-span-4 bg-[#191B20] border border-[#292D35] rounded-[22px] p-5 shadow-xl sticky top-24">
          {
    /* Order Header */
  }
          <div className="flex items-center justify-between pb-3 border-b border-[#292D35]">
            <div>
              <h3 className="text-base font-black text-white tracking-tight">
                Current Order
              </h3>
              <p className="text-[11px] text-neutral-400">
                Ticket #POS-{Math.floor(100 + Math.random() * 900)}
              </p>
            </div>

            <button
    onClick={handleClearTicket}
    disabled={ticketItems.length === 0}
    className="text-neutral-500 hover:text-red-400 disabled:opacity-30 p-1 rounded-lg hover:bg-[#252830] transition-colors"
    title="Clear Ticket"
  >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {
    /* Order Mode Selector (Dine-in / Takeaway / Delivery) */
  }
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#101216] rounded-xl border border-[#292D35] my-3">
            <button
    onClick={() => setOrderMode("dine-in")}
    className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${orderMode === "dine-in" ? "bg-[#FF5A1F] text-white shadow-xs" : "text-neutral-400 hover:text-white"}`}
  >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dine-In</span>
            </button>

            <button
    onClick={() => setOrderMode("takeaway")}
    className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${orderMode === "takeaway" ? "bg-[#FF5A1F] text-white shadow-xs" : "text-neutral-400 hover:text-white"}`}
  >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>

            <button
    onClick={() => setOrderMode("delivery")}
    className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${orderMode === "delivery" ? "bg-[#FF5A1F] text-white shadow-xs" : "text-neutral-400 hover:text-white"}`}
  >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>

          {
    /* Customer / Table Inputs */
  }
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="relative">
              <User className="w-3 h-3 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
    type="text"
    value={customerName}
    onChange={(e) => setCustomerName(e.target.value)}
    placeholder="Guest Name"
    className="w-full bg-[#101216] border border-[#292D35] rounded-lg pl-7 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-[#FF5A1F]"
  />
            </div>

            {orderMode === "dine-in" ? <input
    type="text"
    value={customerTable}
    onChange={(e) => setCustomerTable(e.target.value)}
    placeholder="Table No."
    className="w-full bg-[#101216] border border-[#292D35] rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-[#FF5A1F]"
  /> : <div className="relative">
                <Phone className="w-3 h-3 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
    type="text"
    value={customerPhone}
    onChange={(e) => setCustomerPhone(e.target.value)}
    placeholder="Phone"
    className="w-full bg-[#101216] border border-[#292D35] rounded-lg pl-7 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-[#FF5A1F]"
  />
              </div>}
          </div>

          {
    /* Ticket Items Scroll Area */
  }
          <div className="max-h-60 overflow-y-auto space-y-2 py-1 no-scrollbar">
            {ticketItems.length === 0 ? <div className="text-center py-8 text-neutral-500 text-xs">
                Ticket is empty.
                <br />
                <span className="text-[11px] text-neutral-600">
                  Tap items from the menu to build order.
                </span>
              </div> : ticketItems.map((item) => <div
    key={item.product.id}
    className="flex items-center justify-between p-2 rounded-xl bg-[#101216] border border-[#292D35]/70 text-xs"
  >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-white truncate">{item.product.name}</div>
                    <div className="text-[10px] text-neutral-400">
                      {formatPrice(item.unitPrice)} each
                    </div>
                  </div>

                  {
    /* Quantity controls */
  }
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
    onClick={() => handleUpdateQty(item.product.id, -1)}
    className="w-6 h-6 rounded-md bg-[#252830] text-neutral-300 hover:bg-neutral-700 flex items-center justify-center"
  >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
    onClick={() => handleUpdateQty(item.product.id, 1)}
    className="w-6 h-6 rounded-md bg-[#252830] text-neutral-300 hover:bg-neutral-700 flex items-center justify-center"
  >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {
    /* Total */
  }
                  <div className="w-16 text-right font-mono font-bold text-white shrink-0 pl-1">
                    {formatPrice(item.totalPrice)}
                  </div>
                </div>)}
          </div>

          {
    /* Financial Summary */
  }
          <div className="border-t border-[#292D35] mt-4 pt-3 space-y-1.5 text-xs text-neutral-400">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="text-neutral-200 font-mono">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Tax (8%)</span>
              <span className="text-neutral-200 font-mono">{formatPrice(tax)}</span>
            </div>

            {orderMode === "delivery" && <div className="flex items-center justify-between">
                <span>Delivery Charge</span>
                <span className="text-neutral-200 font-mono">{formatPrice(deliveryFee)}</span>
              </div>}

            {discountAmount > 0 && <div className="flex items-center justify-between text-[#00D084]">
                <span>Discount</span>
                <span className="font-mono">-{formatPrice(discountAmount)}</span>
              </div>}

            <div className="flex items-center justify-between pt-2 border-t border-[#292D35] text-white font-extrabold text-base">
              <span>Total</span>
              <span className="text-[#FF5A1F] font-mono text-lg">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {
    /* Action Buttons */
  }
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
    onClick={() => {
      if (discountAmount === 0 && subtotal > 0) {
        setDiscountAmount(Math.round(subtotal * 0.1));
        addToast("10% Discount Applied", "Manager discount applied to ticket.", "success");
      } else {
        setDiscountAmount(0);
      }
    }}
    disabled={ticketItems.length === 0}
    className="py-2.5 px-3 rounded-xl bg-[#252830] hover:bg-[#30343C] text-neutral-300 text-xs font-bold border border-[#292D35] transition-colors disabled:opacity-40"
  >
              {discountAmount > 0 ? "Remove Disc" : "10% Disc"}
            </button>

            <button
    onClick={() => setIsPaymentModalOpen(true)}
    disabled={ticketItems.length === 0}
    className="py-2.5 px-3 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] text-white text-xs font-extrabold shadow-md shadow-[#FF5A1F]/20 transition-all disabled:opacity-40"
  >
              Pay {formatPrice(grandTotal)}
            </button>
          </div>
        </div>
      </div>

      {
    /* Payment Modal */
  }
      {isPaymentModalOpen && <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B20] border border-[#292D35] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center">
              <h3 className="text-lg font-black text-white">Select Payment Method</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Order Total: <strong className="text-[#FF5A1F] text-base">{formatPrice(grandTotal)}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
    onClick={() => {
      handleCompletePayment("cash");
      setIsPaymentModalOpen(false);
    }}
    className="p-4 rounded-xl bg-[#101216] border border-[#292D35] hover:border-[#00D084] text-white flex flex-col items-center gap-2 group transition-all"
  >
                <div className="w-12 h-12 rounded-xl bg-[#00D084]/15 text-[#00D084] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Banknote className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs">Cash Payment</span>
                <span className="text-[10px] text-neutral-400">Cash drawer opens</span>
              </button>

              <button
    onClick={() => {
      handleCompletePayment("card");
      setIsPaymentModalOpen(false);
    }}
    className="p-4 rounded-xl bg-[#101216] border border-[#292D35] hover:border-[#3B82F6] text-white flex flex-col items-center gap-2 group transition-all"
  >
                <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs">Card / POS Swipe</span>
                <span className="text-[10px] text-neutral-400">Terminal prompt</span>
              </button>
            </div>

            <button
    onClick={() => setIsPaymentModalOpen(false)}
    className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
  >
              Cancel
            </button>
          </div>
        </div>}

      {
    /* Payment Success Receipt Dialog */
  }
      {paymentSuccessOrder && <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B20] border border-[#292D35] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[#00D084]/20 text-[#00D084] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Payment Received!</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Order <strong className="text-white">{paymentSuccessOrder.orderNumber}</strong> sent to Kitchen.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#101216] border border-[#292D35] text-xs text-left space-y-1 font-mono text-neutral-300">
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="font-bold text-white">{formatPrice(paymentSuccessOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="uppercase">{paymentSuccessOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{paymentSuccessOrder.customerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
    onClick={() => {
      addToast("Receipt Printed", `Receipt for ${paymentSuccessOrder.orderNumber} dispatched to thermal printer.`, "success");
      setPaymentSuccessOrder(null);
    }}
    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#252830] hover:bg-[#30343C] text-white text-xs font-bold border border-[#292D35] transition-colors"
  >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>

              <button
    onClick={() => setPaymentSuccessOrder(null)}
    className="flex-1 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] text-white text-xs font-bold transition-colors"
  >
                Done
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
export {
  CounterPage
};
