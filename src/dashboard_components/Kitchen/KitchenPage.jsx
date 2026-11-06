import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Flame,
  ArrowRight
} from "lucide-react";
const KitchenPage = () => {
  const {
    orders,
    activeBranchFilter,
    updateOrderStatus,
    addToast,
    branches
  } = useRestaurant();
  const liveIds = new Set(branches.filter((b) => b.isActive !== false).map((b) => b.id));
  const filteredOrders = liveIds.size === 0 ? [] : activeBranchFilter === "all" ? orders.filter((o) => liveIds.has(o.branchId)) : orders.filter((o) => o.branchId === activeBranchFilter);
  const newOrders = filteredOrders.filter((o) => o.status === "received");
  const preparingOrders = filteredOrders.filter((o) => o.status === "preparing");
  const readyOrders = filteredOrders.filter((o) => o.status === "ready");
  const completedOrders = filteredOrders.filter(
    (o) => o.status === "delivered" || o.status === "completed"
  );
  const activeBranchName = branches.length === 0 ? "Branch not yet" : activeBranchFilter === "all" ? "All Kitchen Stations" : branches.find((b) => b.id === activeBranchFilter)?.shortName || "Kitchen Station";
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {
    /* KDS Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Kitchen Display System (KDS)
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live line tickets for {activeBranchName} · Auto-refreshed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#191B20] border border-[#292D35] text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-[#00D084] animate-pulse" />
            <span>KDS Station Connected</span>
          </div>
        </div>
      </div>

      {
    /* 4-Column Kanban Board */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {
    /* ================= COLUMN 1: NEW ================= */
  }
        <div className="bg-[#14161B] border border-[#292D35] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#292D35]">
            <div className="flex items-center gap-2 font-bold text-xs text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>NEW ORDERS</span>
            </div>
            <span className="text-xs font-mono font-bold bg-[#191B20] px-2 py-0.5 rounded-md text-white border border-[#292D35]">
              {newOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {newOrders.length === 0 ? <div className="text-center py-8 text-neutral-600 text-xs">
                No new orders waiting.
              </div> : newOrders.map((ord) => <div
    key={ord.orderId}
    className="bg-[#191B20] border-2 border-purple-500/40 rounded-xl p-3.5 space-y-3 shadow-md hover:border-purple-500 transition-all"
  >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-sm text-white">
                      {ord.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      {ord.channel}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-300 font-medium">
                    {ord.customerName}
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {ord.branchName.replace("BurgerBlast — ", "")}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#101216] text-xs space-y-1">
                    <div className="text-[11px] font-bold text-white">
                      Items: {ord.itemCount}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-2">
                      {ord.notes || "Standard freshly prepared patties with toasted buns."}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      <span>{ord.createdAt}</span>
                    </div>

                    <button
    onClick={() => updateOrderStatus(ord.orderId, "preparing")}
    className="px-3 py-1.5 bg-[#FF5A1F] hover:bg-[#E04810] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
  >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Start Cooking</span>
                    </button>
                  </div>
                </div>)}
          </div>
        </div>

        {
    /* ================= COLUMN 2: PREPARING ================= */
  }
        <div className="bg-[#14161B] border border-[#292D35] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#292D35]">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>PREPARING (GRILL)</span>
            </div>
            <span className="text-xs font-mono font-bold bg-[#191B20] px-2 py-0.5 rounded-md text-white border border-[#292D35]">
              {preparingOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {preparingOrders.length === 0 ? <div className="text-center py-8 text-neutral-600 text-xs">
                Grill station idle.
              </div> : preparingOrders.map((ord) => <div
    key={ord.orderId}
    className="bg-[#191B20] border-2 border-amber-500/40 rounded-xl p-3.5 space-y-3 shadow-md hover:border-amber-500 transition-all"
  >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-sm text-white">
                      {ord.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      On Grill
                    </span>
                  </div>

                  <div className="text-xs text-neutral-300 font-medium">
                    {ord.customerName}
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {ord.branchName.replace("BurgerBlast — ", "")}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#101216] text-xs space-y-1">
                    <div className="text-[11px] font-bold text-white">
                      Items: {ord.itemCount}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-2">
                      {ord.notes || "Double smash patties, cheese melted, fries in fryer."}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>{ord.elapsedMinutes ? `${ord.elapsedMinutes}m in kitchen` : "12m"}</span>
                    </div>

                    <button
    onClick={() => updateOrderStatus(ord.orderId, "ready")}
    className="px-3 py-1.5 bg-[#00D084] hover:bg-[#00B573] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
  >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready</span>
                    </button>
                  </div>
                </div>)}
          </div>
        </div>

        {
    /* ================= COLUMN 3: READY ================= */
  }
        <div className="bg-[#14161B] border border-[#292D35] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#292D35]">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>READY (PASS)</span>
            </div>
            <span className="text-xs font-mono font-bold bg-[#191B20] px-2 py-0.5 rounded-md text-white border border-[#292D35]">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyOrders.length === 0 ? <div className="text-center py-8 text-neutral-600 text-xs">
                No orders waiting on pass.
              </div> : readyOrders.map((ord) => <div
    key={ord.orderId}
    className="bg-[#191B20] border-2 border-emerald-500/40 rounded-xl p-3.5 space-y-3 shadow-md hover:border-emerald-500 transition-all"
  >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-sm text-white">
                      {ord.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Bagged & Hot
                    </span>
                  </div>

                  <div className="text-xs text-neutral-300 font-medium">
                    {ord.customerName}
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {ord.branchName.replace("BurgerBlast — ", "")}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#101216] text-xs">
                    <span className="text-neutral-400">Ready for pickup / rider handover.</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-emerald-400 font-bold">
                      Ready on Pass
                    </span>

                    <button
    onClick={() => updateOrderStatus(ord.orderId, "delivered")}
    className="px-3 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
  >
                      <span>Complete</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>)}
          </div>
        </div>

        {
    /* ================= COLUMN 4: COMPLETED ================= */
  }
        <div className="bg-[#14161B] border border-[#292D35] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#292D35]">
            <div className="flex items-center gap-2 font-bold text-xs text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>COMPLETED</span>
            </div>
            <span className="text-xs font-mono font-bold bg-[#191B20] px-2 py-0.5 rounded-md text-white border border-[#292D35]">
              {completedOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {completedOrders.slice(0, 5).map((ord) => <div
    key={ord.orderId}
    className="bg-[#191B20]/60 border border-[#292D35] rounded-xl p-3 space-y-2 opacity-80 hover:opacity-100 transition-opacity"
  >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-white">{ord.orderNumber}</span>
                  <span className="text-[10px] text-blue-400 uppercase font-bold">Dispatched</span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  {ord.customerName} • {ord.itemCount} items
                </div>
              </div>)}
          </div>
        </div>
      </div>
    </div>;
};
export {
  KitchenPage
};
