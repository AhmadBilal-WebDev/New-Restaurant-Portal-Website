import { X, Clock, CheckCircle2, Bike, ChefHat, MapPin, Phone } from "lucide-react";
const OrderTrackingModal = ({
  isOpen,
  onClose,
  order
}) => {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
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
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden border border-[#EEE7DC] animate-in zoom-in-95 duration-200">
        {
    /* Header */
  }
        <div className="p-5 bg-[#FFF9EF] border-b border-[#EEE7DC] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E51B23]">
              Live Delivery Tracker
            </span>
            <h3 className="text-xl font-black text-[#191919] font-['Outfit']">
              {order ? `Order #${order.orderId}` : "Track Your Meal"}
            </h3>
          </div>
          <button
    onClick={onClose}
    className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 text-neutral-600 flex items-center justify-center border border-[#E9E2D8]"
    aria-label="Close tracking"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Content */
  }
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {order ? <>
              {
    /* ETA Highlight */
  }
              <div className="bg-[#E51B23]/10 border border-[#E51B23]/25 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#777777]">Estimated Arrival</div>
                  <div className="text-2xl font-black text-[#E51B23] font-['Outfit']">
                    {order.estimatedDeliveryTime}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#E51B23] text-white flex items-center justify-center shadow-glow-red animate-pulse">
                  <Bike className="w-6 h-6" />
                </div>
              </div>

              {
    /* Step Progression */
  }
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2E9B5B] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#191919]">Order Received & Queued</h5>
                    <p className="text-[11px] text-[#777777]">Kitchen received your order at {order.createdAt}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E51B23] text-white flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#E51B23]">Grilling Fresh On Flat-Top</h5>
                    <p className="text-[11px] text-[#777777]">Double Angus patties smashed with caramelized crust</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#191919]">Courier On The Way</h5>
                    <p className="text-[11px] text-[#777777]">Hot thermal bag transit to your address</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#191919]">Delivered Hot</h5>
                    <p className="text-[11px] text-[#777777]">Enjoy your fresh Bite & Burger meal!</p>
                  </div>
                </div>
              </div>

              {
    /* Delivery Details */
  }
              <div className="bg-[#FFF9EF] p-4 rounded-2xl border border-[#EEE7DC] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#777777]">Customer:</span>
                  <span className="font-bold text-[#191919]">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777777]">Delivery Address:</span>
                  <span className="font-bold text-[#191919] max-w-xs text-right truncate">
                    {order.deliveryAddress}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777777]">Items:</span>
                  <span className="font-bold text-[#191919]">
                    {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#EEE7DC] flex justify-between font-black text-sm text-[#191919]">
                  <span>Total:</span>
                  <span className="text-[#E51B23]">${order.total.toFixed(2)}</span>
                </div>
              </div>

              {
    /* Support button */
  }
              <div className="text-center pt-2">
                <a
    href="tel:5552483663"
    className="inline-flex items-center gap-2 text-xs font-bold text-[#3A3A3A] hover:text-[#E51B23]"
  >
                  <Phone className="w-3.5 h-3.5" /> Need to modify order? Call kitchen: (555) 248-3663
                </a>
              </div>
            </> : <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#FFF9EF] border border-[#E9E2D8] flex items-center justify-center text-[#E51B23] mx-auto mb-3">
                <Clock className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-[#191919] font-['Outfit'] mb-1">
                No active orders in progress
              </h4>
              <p className="text-xs text-[#777777] max-w-xs mx-auto mb-4">
                Place an order from our menu to track real-time kitchen preparation and delivery status here.
              </p>
              <button
    onClick={onClose}
    className="bg-[#E51B23] hover:bg-[#B90F16] text-white text-xs font-bold px-6 py-2.5 rounded-full"
  >
                Go to Menu
              </button>
            </div>}
        </div>
      </div>
    </div>;
};
export {
  OrderTrackingModal
};
