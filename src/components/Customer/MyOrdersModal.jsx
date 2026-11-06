import { useState } from "react";
import {
  X,
  Package,
  Bike,
  MapPin,
  Phone,
  Navigation,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const MyOrdersModal = ({
  isOpen,
  onClose,
  onReorder,
  onExploreMenu
}) => {
  const { customerUser, orders, riders, formatPrice, config } = useRestaurant();
  const [selectedOrder, setSelectedOrder] = useState(null);
  if (!isOpen) return null;
  const userOrders = orders.filter((o) => {
    if (!customerUser) return false;
    const matchEmail = customerUser.email && o.customerEmail && o.customerEmail.toLowerCase() === customerUser.email.toLowerCase();
    const matchPhone = customerUser.phone && o.customerPhone && o.customerPhone.replace(/[^0-9]/g, "") === customerUser.phone.replace(/[^0-9]/g, "");
    const matchName = customerUser.name && o.customerName && o.customerName.toLowerCase() === customerUser.name.toLowerCase();
    return matchEmail || matchPhone || matchName;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const activeOrder = selectedOrder || userOrders[0] || null;
  const assignedRider = activeOrder?.assignedRiderId ? riders.find((r) => r.id === activeOrder.assignedRiderId) : riders.find((r) => r.status === "on_the_way" || r.status === "on_delivery") || riders[0];
  const getStatusStep = (status) => {
    switch (status) {
      case "received":
      case "pending":
        return 1;
      case "confirmed":
      case "preparing":
        return 2;
      case "ready":
      case "on_the_way":
      case "out_for_delivery":
        return 3;
      case "delivered":
      case "completed":
        return 4;
      default:
        return 2;
    }
  };
  const currentStep = activeOrder ? getStatusStep(activeOrder.status) : 1;
  return <div
    id="my-orders-modal-backdrop"
    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    onClick={onClose}
  >
      <div
    id="my-orders-modal"
    onClick={(e) => e.stopPropagation()}
    className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#EEE7DC] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
  >
        {
    /* Header */
  }
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#EEE7DC] bg-[#FFF9EF]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E51B23] text-white flex items-center justify-center shadow-md">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#191919] font-['Outfit'] flex items-center gap-2">
                My Orders &amp; Live Tracking
                {userOrders.length > 0 && <span className="bg-[#E51B23]/10 text-[#E51B23] text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {userOrders.length}
                  </span>}
              </h2>
              <p className="text-xs text-[#777777]">
                Track delivery boy live location and view order receipts
              </p>
            </div>
          </div>

          <button
    type="button"
    onClick={onClose}
    className="w-9 h-9 rounded-full bg-white border border-[#E9E2D8] hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
    aria-label="Close"
  >
            <X className="w-4 h-4" />
          </button>
        </div>

        {
    /* Modal Body */
  }
        {userOrders.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-12">
            <div className="w-20 h-20 rounded-full bg-[#FFF9EF] border border-[#E9E2D8] flex items-center justify-center text-[#E51B23] mb-4">
              <ShoppingBag className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-black text-[#191919] font-['Outfit'] mb-2">
              No orders placed yet
            </h3>
            <p className="text-xs sm:text-sm text-[#777777] max-w-md mx-auto mb-6">
              You haven't made any orders under {customerUser?.name || "this account"}. Explore our menu to place your first smash burger order!
            </p>
            <button
    type="button"
    onClick={() => {
      onClose();
      if (onExploreMenu) onExploreMenu();
    }}
    className="bg-[#E51B23] hover:bg-[#B90F16] text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-glow-red hover:scale-105 active:scale-95 transition-all cursor-pointer"
  >
              Explore Delicious Menu
            </button>
          </div> : <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#EEE7DC]">
            {
    /* Left Column: Order History List */
  }
            <div className="lg:col-span-5 p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[420px] lg:max-h-[640px]">
              <div className="text-xs font-bold text-[#777777] uppercase tracking-wider mb-2">
                Order History
              </div>
              {userOrders.map((order) => {
    const isSelected = activeOrder?.orderId === order.orderId;
    const statusColor = order.status === "delivered" || order.status === "completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : order.status === "cancelled" ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
    return <div
      key={order.orderId}
      onClick={() => setSelectedOrder(order)}
      className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? "bg-[#FFF9EF] border-[#E51B23] shadow-sm ring-1 ring-[#E51B23]/30" : "bg-white border-[#E9E2D8] hover:border-neutral-300 hover:bg-neutral-50/70"}`}
    >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono font-bold text-xs text-[#191919]">
                        {order.orderNumber || `#${order.orderId}`}
                      </span>
                      <span
      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}
    >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="text-xs text-[#666666] line-clamp-1 mb-2">
                      {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-[#EEE7DC]">
                      <span className="text-neutral-400 font-normal">
                        {new Date(order.createdAt).toLocaleDateString(void 0, {
      month: "short",
      day: "numeric"
    })}
                      </span>
                      <span className="text-[#E51B23] font-black">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>;
  })}
            </div>

            {
    /* Right Column: Live Tracking & Delivery Boy Details */
  }
            {activeOrder && <div className="lg:col-span-7 p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[640px]">
                {
    /* Active Order Banner */
  }
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#E51B23]">
                      Active Order Status
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-[#191919] font-['Outfit']">
                      Order {activeOrder.orderNumber || `#${activeOrder.orderId}`}
                    </h3>
                    <p className="text-xs text-[#777777]">
                      Placed on {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {activeOrder.branchName || "Downtown Branch"}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-neutral-400 block font-medium">Grand Total</span>
                    <span className="text-xl font-black text-[#E51B23] font-['Outfit']">
                      {formatPrice(activeOrder.total)}
                    </span>
                  </div>
                </div>

                {
    /* Live Delivery Tracker Steps */
  }
                <div className="bg-[#FFF9EF] p-4 sm:p-5 rounded-2xl border border-[#EEE7DC]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bike className="w-5 h-5 text-[#E51B23]" />
                      <span className="text-xs font-bold text-[#191919]">
                        Live Delivery Status
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#E51B23] bg-[#E51B23]/10 px-2.5 py-0.5 rounded-full">
                      {activeOrder.status === "delivered" ? "Delivered" : activeOrder.estimatedDeliveryTime || "25-35 mins"}
                    </span>
                  </div>

                  {
    /* 4 Step Progress Bar */
  }
                  <div className="relative flex items-center justify-between mb-2">
                    <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-gray-200 -z-0" />
                    <div
    className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-[#E51B23] -z-0 transition-all duration-500"
    style={{
      width: `${(currentStep - 1) / 3 * 100}%`
    }}
  />

                    {
    /* Step 1 */
  }
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? "bg-[#E51B23] text-white shadow-sm" : "bg-white border-2 border-gray-300 text-gray-400"}`}
  >
                        1
                      </div>
                      <span className="text-[10px] font-bold text-[#191919]">Received</span>
                    </div>

                    {
    /* Step 2 */
  }
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? "bg-[#E51B23] text-white shadow-sm" : "bg-white border-2 border-gray-300 text-gray-400"}`}
  >
                        2
                      </div>
                      <span className="text-[10px] font-bold text-[#191919]">Kitchen</span>
                    </div>

                    {
    /* Step 3 */
  }
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 3 ? "bg-[#E51B23] text-white shadow-sm" : "bg-white border-2 border-gray-300 text-gray-400"}`}
  >
                        3
                      </div>
                      <span className="text-[10px] font-bold text-[#191919]">On Way</span>
                    </div>

                    {
    /* Step 4 */
  }
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 4 ? "bg-[#2E9B5B] text-white shadow-sm" : "bg-white border-2 border-gray-300 text-gray-400"}`}
  >
                        ✓
                      </div>
                      <span className="text-[10px] font-bold text-[#191919]">Delivered</span>
                    </div>
                  </div>
                </div>

                {
    /* Delivery Boy Live Location Card */
  }
                <div className="p-4 sm:p-5 rounded-2xl border border-[#EEE7DC] bg-white shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-black text-[#191919] uppercase tracking-wider">
                        Delivery Boy Live Location
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                      GPS Connected
                    </span>
                  </div>

                  {
    /* Visual Map Mockup with Live Moving Rider */
  }
                  <div className="relative h-44 sm:h-52 w-full rounded-xl overflow-hidden border border-[#E9E2D8] bg-[#EBF0E8] flex items-center justify-center">
                    {
    /* Stylized streets visual background */
  }
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94A3B8_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute h-3 bg-amber-200/80 w-full rotate-12 -top-4" />
                    <div className="absolute w-3 bg-amber-200/80 h-full -rotate-12 left-1/3" />
                    <div className="absolute h-2.5 bg-neutral-300 w-full top-1/2 -translate-y-1/2" />

                    {
    /* Destination (Customer Address) */
  }
                    <div className="absolute right-10 top-1/3 flex flex-col items-center z-10">
                      <div className="w-8 h-8 rounded-full bg-[#191919] text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                        <MapPin className="w-4 h-4 text-[#FDB913]" />
                      </div>
                      <span className="mt-1 bg-white/95 px-2 py-0.5 rounded-md text-[9px] font-black text-[#191919] shadow-xs border border-gray-200">
                        Your Location
                      </span>
                    </div>

                    {
    /* Delivery Rider on Map */
  }
                    <div className="absolute left-1/3 top-1/2 -translate-y-1/2 flex flex-col items-center z-10 animate-bounce">
                      <div className="w-10 h-10 rounded-full bg-[#E51B23] text-white flex items-center justify-center shadow-glow-red ring-4 ring-white">
                        <Bike className="w-5 h-5" />
                      </div>
                      <span className="mt-1 bg-[#191919] text-white px-2 py-0.5 rounded-md text-[9px] font-bold shadow-md">
                        {assignedRider ? assignedRider.name : "Delivery Boy"}
                      </span>
                    </div>

                    {
    /* Live distance overlay badge */
  }
                    <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 text-xs">
                      <Navigation className="w-3.5 h-3.5 text-[#E51B23]" />
                      <span className="font-bold text-[#191919]">
                        {activeOrder.status === "delivered" ? "Arrived at your doorstep" : "1.2 km away • Approaching your street"}
                      </span>
                    </div>
                  </div>

                  {
    /* Rider Contact Card */
  }
                  {assignedRider && <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F0] border border-[#EFE8DD]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-black text-sm">
                          {assignedRider.name[0]}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#191919]">
                            {assignedRider.name}
                          </div>
                          <div className="text-[11px] text-[#777777]">
                            {assignedRider.vehicle || "Honda CG125"} • Rating {assignedRider.rating || "4.9"} ★
                          </div>
                        </div>
                      </div>

                      <a
    href={`tel:${assignedRider.phone}`}
    className="flex items-center gap-1.5 bg-[#2E9B5B] hover:bg-[#25824C] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-xs"
    title="Call delivery rider"
  >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Rider</span>
                      </a>
                    </div>}
                </div>

                {
    /* Items Ordered Breakdown */
  }
                <div className="p-4 rounded-2xl border border-[#EEE7DC] bg-[#FCFBF8] space-y-2.5">
                  <span className="text-xs font-bold text-[#777777] uppercase tracking-wider block">
                    Items in this Order
                  </span>
                  <div className="divide-y divide-[#EEE7DC]">
                    {activeOrder.items.map((item, idx) => <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[#FFF9EF] border border-[#E9E2D8] font-bold text-center flex items-center justify-center text-[#E51B23]">
                            {item.quantity}x
                          </span>
                          <span className="font-semibold text-[#191919]">
                            {item.product.name}
                          </span>
                        </div>
                        <span className="font-bold text-[#191919]">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>)}
                  </div>

                  {
    /* Reorder Button */
  }
                  {onReorder && <div className="pt-2">
                      <button
    type="button"
    onClick={() => {
      onReorder(activeOrder.items);
      onClose();
    }}
    className="w-full py-2.5 rounded-xl bg-white hover:bg-[#FFF9EF] border border-[#E51B23] text-[#E51B23] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
  >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reorder These Items</span>
                      </button>
                    </div>}
                </div>
              </div>}
          </div>}
      </div>
    </div>;
};
export {
  MyOrdersModal
};
