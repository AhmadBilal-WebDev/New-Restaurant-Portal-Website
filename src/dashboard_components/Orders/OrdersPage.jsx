import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  Search,
  Download,
  Eye,
  Bike,
  X,
  Printer,
  Phone,
  MapPin
} from "lucide-react";
const OrdersPage = ({ initialSelectedOrder }) => {
  const {
    orders,
    branches,
    riders,
    activeBranchFilter,
    formatPrice,
    updateOrderStatus,
    updateOrderRider,
    addToast,
    config
  } = useRestaurant();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(
    initialSelectedOrder || null
  );
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const liveIds = new Set(branches.filter((b) => b.isActive !== false).map((b) => b.id));
  const filteredOrders = orders.filter((o) => {
    const matchesBranch = liveIds.size > 0 && (activeBranchFilter === "all" ? liveIds.has(o.branchId) : o.branchId === activeBranchFilter);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSearch = searchQuery === "" || o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || o.customerPhone.includes(searchQuery);
    return matchesBranch && matchesStatus && matchesSearch;
  });
  const totalCount = filteredOrders.length;
  const pendingCount = orders.filter((o) => o.status === "received").length;
  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const deliveryCount = orders.filter((o) => o.status === "ready" || o.status === "out_for_delivery").length;
  const completedCount = orders.filter((o) => o.status === "delivered" || o.status === "completed").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;
  const handleExportCSV = () => {
    const headers = ["Order #", "Customer", "Phone", "Branch", "Items", "Subtotal", "Tax", "Delivery", "Total", "Payment", "Rider", "Status", "Date"];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.customerPhone,
      o.branchName,
      o.itemCount,
      o.subtotal,
      0,
      // Tax is strictly 0
      o.deliveryFee,
      o.total,
      `${o.paymentStatus} (${o.paymentMethod})`,
      o.assignedRiderName || "Unassigned",
      o.status,
      o.createdAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `restaurantos_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Report Exported", "Orders CSV downloaded successfully.", "success");
  };
  const handleStatusUpdate = (orderId, status) => {
    updateOrderStatus(orderId, status);
    if (selectedOrder && selectedOrder.orderId === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  };
  const handleRiderAssign = (orderId, riderId) => {
    const rider = riders.find((r) => r.id === riderId);
    if (rider) {
      updateOrderRider(orderId, rider.id, rider.name, rider.phone);
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          assignedRiderId: rider.id,
          assignedRiderName: rider.name,
          assignedRiderPhone: rider.phone
        });
      }
      addToast("Rider Assigned", `${rider.name} assigned to order.`, "success");
    }
  };
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {
    /* Top Header & Export */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Orders Management
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time live multi-branch orders feed, dispatch riders, and print tax-free receipts.
          </p>
        </div>

        <button
    onClick={handleExportCSV}
    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#252830] hover:bg-[#30343C] border border-[#292D35] text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer self-start sm:self-auto"
  >
          <Download className="w-4 h-4 text-[#FF5A1F]" />
          <span>Export Orders (.CSV)</span>
        </button>
      </div>

      {
    /* Stats Bar */
  }
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
    onClick={() => setStatusFilter("all")}
    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${statusFilter === "all" ? "bg-[#191B20] border-[#FF5A1F] shadow-sm" : "bg-[#191B20]/60 border-[#292D35] hover:border-[#404550]"}`}
  >
          <div className="text-[10px] uppercase font-bold text-neutral-400">Total</div>
          <div className="text-xl font-extrabold text-white mt-1">{totalCount}</div>
        </div>

        <div
    onClick={() => setStatusFilter("received")}
    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${statusFilter === "received" ? "bg-[#191B20] border-purple-500 shadow-sm" : "bg-[#191B20]/60 border-[#292D35] hover:border-[#404550]"}`}
  >
          <div className="text-[10px] uppercase font-bold text-purple-400">New / Received</div>
          <div className="text-xl font-extrabold text-white mt-1">{pendingCount}</div>
        </div>

        <div
    onClick={() => setStatusFilter("confirmed")}
    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${statusFilter === "confirmed" ? "bg-[#191B20] border-blue-500 shadow-sm" : "bg-[#191B20]/60 border-[#292D35] hover:border-[#404550]"}`}
  >
          <div className="text-[10px] uppercase font-bold text-blue-400">Confirmed</div>
          <div className="text-xl font-extrabold text-white mt-1">{confirmedCount}</div>
        </div>

        <div
    onClick={() => setStatusFilter("preparing")}
    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${statusFilter === "preparing" ? "bg-[#191B20] border-amber-500 shadow-sm" : "bg-[#191B20]/60 border-[#292D35] hover:border-[#404550]"}`}
  >
          <div className="text-[10px] uppercase font-bold text-amber-400">In Kitchen</div>
          <div className="text-xl font-extrabold text-white mt-1">{preparingCount}</div>
        </div>

        <div
    onClick={() => setStatusFilter("ready")}
    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${statusFilter === "ready" || statusFilter === "out_for_delivery" ? "bg-[#191B20] border-emerald-500 shadow-sm" : "bg-[#191B20]/60 border-[#292D35] hover:border-[#404550]"}`}
  >
          <div className="text-[10px] uppercase font-bold text-emerald-400">Out for Delivery</div>
          <div className="text-xl font-extrabold text-white mt-1">{deliveryCount}</div>
        </div>

        <div
    onClick={() => setStatusFilter("delivered")}
    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${statusFilter === "delivered" ? "bg-[#191B20] border-neutral-400 shadow-sm" : "bg-[#191B20]/60 border-[#292D35] hover:border-[#404550]"}`}
  >
          <div className="text-[10px] uppercase font-bold text-neutral-400">Delivered</div>
          <div className="text-xl font-extrabold text-white mt-1">{completedCount}</div>
        </div>
      </div>

      {
    /* Search Input */
  }
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by order #, customer name, or phone..."
    className="w-full bg-[#191B20] border border-[#292D35] rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#FF5A1F]"
  />
      </div>

      {
    /* Orders Table */
  }
      <div className="bg-[#14171C] border border-[#292D35] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#191B20] text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#292D35]">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Items / Total</th>
                <th className="py-3 px-4">Assigned Rider</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292D35]/60 text-neutral-200">
              {filteredOrders.map((order) => {
    const assignedRider = riders.find((r) => r.id === order.assignedRiderId);
    return <tr key={order.orderId} className="hover:bg-[#191B20]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{order.orderNumber}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#1D2128] text-neutral-400 border border-[#292D35]">
                          {order.channel}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 font-sans mt-0.5">{order.createdAt}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{order.customerName}</div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-neutral-500" />
                        <span>{order.customerPhone}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-neutral-300">{order.branchName}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-black text-white text-sm">
                        {formatPrice(order.total)}
                      </div>
                      <div className="text-[10px] text-neutral-400">{order.itemCount} items • Tax: 0.00</div>
                    </td>

                    {
      /* Rider Assignment Dropdown */
    }
                    <td className="py-3.5 px-4">
                      <select
      value={order.assignedRiderId || ""}
      onChange={(e) => handleRiderAssign(order.orderId, e.target.value)}
      className="bg-[#1D2128] border border-[#292D35] rounded-xl px-2.5 py-1 text-[11px] text-neutral-200 focus:border-[#FF5A1F] cursor-pointer"
    >
                        <option value="">Assign Delivery Rider</option>
                        {riders.filter((r) => activeBranchFilter === "all" || r.branchId === order.branchId).map((r) => <option key={r.id} value={r.id}>
                              {r.name} ({r.vehicleType.toUpperCase()})
                            </option>)}
                      </select>
                      {order.assignedRiderName && <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                          <Bike className="w-3 h-3" />
                          <span>{order.assignedRiderName}</span>
                        </div>}
                    </td>

                    {
      /* Order Status Select */
    }
                    <td className="py-3.5 px-4">
                      <select
      value={order.status}
      onChange={(e) => handleStatusUpdate(order.orderId, e.target.value)}
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border border-transparent cursor-pointer ${order.status === "received" ? "bg-purple-500/20 text-purple-400" : order.status === "confirmed" ? "bg-blue-500/20 text-blue-400" : order.status === "preparing" ? "bg-amber-500/20 text-amber-400" : order.status === "ready" || order.status === "out_for_delivery" ? "bg-emerald-500/20 text-emerald-400" : order.status === "delivered" || order.status === "completed" ? "bg-neutral-800 text-neutral-300" : "bg-red-500/20 text-red-400"}`}
    >
                        <option value="received" className="bg-[#191B20] text-purple-400">Received</option>
                        <option value="confirmed" className="bg-[#191B20] text-blue-400">Confirmed</option>
                        <option value="preparing" className="bg-[#191B20] text-amber-400">Preparing</option>
                        <option value="ready" className="bg-[#191B20] text-emerald-400">Out for Delivery</option>
                        <option value="delivered" className="bg-[#191B20] text-neutral-300">Delivered</option>
                        <option value="cancelled" className="bg-[#191B20] text-red-400">Cancelled</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
      onClick={() => setSelectedOrder(order)}
      className="p-1.5 rounded-lg bg-[#1D2128] hover:bg-[#252A33] text-neutral-300 hover:text-white transition-colors cursor-pointer"
      title="View Details"
    >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
      onClick={() => {
        setSelectedOrder(order);
        setIsInvoiceOpen(true);
      }}
      className="p-1.5 rounded-lg bg-[#1D2128] hover:bg-[#FF5A1F]/20 text-neutral-300 hover:text-[#FF5A1F] transition-colors cursor-pointer"
      title="Print Invoice / Receipt"
    >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>;
  })}

              {filteredOrders.length === 0 && <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Order Details Modal */
  }
      {selectedOrder && !isInvoiceOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B20] border border-[#292D35] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#292D35]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white font-mono">
                    {selectedOrder.orderNumber}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30">
                    {selectedOrder.channel}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Placed at {selectedOrder.branchName} • {selectedOrder.createdAt}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
    onClick={() => setIsInvoiceOpen(true)}
    className="p-1.5 rounded-lg bg-[#252830] text-neutral-300 hover:text-white"
    title="Print Receipt"
  >
                  <Printer className="w-4 h-4" />
                </button>
                <button
    onClick={() => setSelectedOrder(null)}
    className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#252830]"
  >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {
    /* Customer Info */
  }
            <div className="p-3.5 rounded-xl bg-[#101216] border border-[#292D35] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-neutral-500 font-bold uppercase text-[10px]">Customer</div>
                <div className="text-white font-bold text-sm mt-0.5">{selectedOrder.customerName}</div>
                <div className="text-neutral-400 flex items-center gap-1.5 mt-1">
                  <Phone className="w-3 h-3 text-neutral-500" />
                  <span>{selectedOrder.customerPhone}</span>
                </div>
              </div>

              <div>
                <div className="text-neutral-500 font-bold uppercase text-[10px]">Delivery Address</div>
                <div className="text-neutral-300 flex items-start gap-1.5 mt-1 leading-snug">
                  <MapPin className="w-3 h-3 text-[#FF5A1F] shrink-0 mt-0.5" />
                  <span>{selectedOrder.customerAddress}</span>
                </div>
              </div>
            </div>

            {
    /* Order Items List */
  }
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Order Items ({selectedOrder.itemCount})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item, idx) => <div
    key={idx}
    className="p-2.5 rounded-xl bg-[#101216] border border-[#292D35]/60 flex items-center justify-between text-xs"
  >
                      <div>
                        <div className="font-bold text-white">
                          {item.quantity}x {item.product.name}
                        </div>
                        {item.selectedBun && <div className="text-[10px] text-neutral-400">
                            Bun: {item.selectedBun} • Cheese: {item.selectedCheese || "American"}
                          </div>}
                      </div>
                      <div className="font-mono font-bold text-white">
                        {formatPrice(item.totalPrice)}
                      </div>
                    </div>) : <div className="p-3 rounded-xl bg-[#101216] text-xs text-neutral-400">
                    Standard chef meal combo items
                  </div>}
              </div>
            </div>

            {
    /* Financials (Tax = 0) */
  }
            <div className="p-3.5 rounded-xl bg-[#101216] border border-[#292D35] space-y-1.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white font-mono">{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Sales Tax (0% Included)</span>
                <span className="font-mono">{formatPrice(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="text-white font-mono">{formatPrice(selectedOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#292D35] text-white font-black text-sm">
                <span>Total Amount</span>
                <span className="text-[#FF5A1F] font-mono text-base">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {
    /* Status Flow Buttons */
  }
            <div className="pt-2 border-t border-[#292D35] space-y-2">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">
                Update Status Flow
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button
    onClick={() => handleStatusUpdate(selectedOrder.orderId, "confirmed")}
    className="py-2 rounded-xl bg-[#101216] hover:bg-blue-600 hover:text-white border border-[#292D35] text-neutral-300 transition-colors"
  >
                  Confirm Order
                </button>
                <button
    onClick={() => handleStatusUpdate(selectedOrder.orderId, "preparing")}
    className="py-2 rounded-xl bg-[#101216] hover:bg-amber-500 hover:text-black border border-[#292D35] text-neutral-300 transition-colors"
  >
                  Send to Kitchen
                </button>
                <button
    onClick={() => handleStatusUpdate(selectedOrder.orderId, "ready")}
    className="py-2 rounded-xl bg-[#101216] hover:bg-emerald-500 hover:text-black border border-[#292D35] text-neutral-300 transition-colors"
  >
                  Out for Delivery
                </button>
              </div>
            </div>
          </div>
        </div>}

      {
    /* Printable Receipt / Invoice Modal */
  }
      {isInvoiceOpen && selectedOrder && <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar font-mono text-xs">
            {
    /* Action Bar */
  }
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <span className="font-sans font-bold text-sm text-neutral-900">Official Tax Invoice</span>
              <div className="flex gap-2">
                <button
    onClick={() => window.print()}
    className="flex items-center gap-1 px-3 py-1.5 bg-[#E51B23] text-white rounded-lg font-sans font-bold text-xs shadow cursor-pointer"
  >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
    onClick={() => setIsInvoiceOpen(false)}
    className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
  >
                  ✕
                </button>
              </div>
            </div>

            {
    /* Receipt Content */
  }
            <div id="print-area" className="space-y-4 p-2">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black font-sans tracking-tight">{config.name}</h2>
                <div className="text-[11px] text-neutral-600">{selectedOrder.branchName}</div>
                <div className="text-[10px] text-neutral-500">Order #{selectedOrder.orderNumber} • {selectedOrder.createdAt}</div>
              </div>

              <div className="border-t border-dashed border-neutral-300 pt-2 space-y-1">
                <div>Customer: <strong>{selectedOrder.customerName}</strong></div>
                <div>Phone: <strong>{selectedOrder.customerPhone}</strong></div>
                <div>Address: <strong>{selectedOrder.customerAddress}</strong></div>
                {selectedOrder.assignedRiderName && <div>Rider: <strong>{selectedOrder.assignedRiderName}</strong> ({selectedOrder.assignedRiderPhone})</div>}
              </div>

              {
    /* Items */
  }
              <div className="border-t border-dashed border-neutral-300 pt-2 space-y-2">
                {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item, idx) => <div key={idx} className="flex justify-between items-start">
                      <div>
                        <div>{item.quantity}x {item.product.name}</div>
                        {item.selectedBun && <div className="text-[10px] text-neutral-500">Bun: {item.selectedBun}</div>}
                      </div>
                      <div className="font-bold">{formatPrice(item.totalPrice)}</div>
                    </div>) : <div className="flex justify-between">
                    <div>Chef Smash Meal Combo</div>
                    <div>{formatPrice(selectedOrder.subtotal)}</div>
                  </div>}
              </div>

              {
    /* Totals Breakdown */
  }
              <div className="border-t border-dashed border-neutral-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Sales Tax (0%):</span>
                  <span>{formatPrice(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{formatPrice(selectedOrder.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-neutral-900 pt-2">
                  <span>TOTAL AMOUNT:</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-neutral-300 text-[10px] text-neutral-500">
                Thank you for dining with {config.name}!
              </div>
            </div>
          </div>
        </div>}
    </div>;
};
export {
  OrdersPage
};
