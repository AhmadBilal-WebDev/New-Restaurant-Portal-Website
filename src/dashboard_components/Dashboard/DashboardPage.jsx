import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  Eye,
  ArrowRight
} from "lucide-react";
const DashboardPage = ({
  onNavigateTab,
  onSelectOrderDetails
}) => {
  const {
    branches,
    orders,
    posStatus,
    activeBranchFilter,
    formatPrice,
    updateOrderStatus
  } = useRestaurant();
  const liveIds = new Set(branches.filter((b) => b.isActive !== false).map((b) => b.id));
  const filteredOrders = liveIds.size === 0 ? [] : activeBranchFilter === "all" ? orders.filter((o) => liveIds.has(o.branchId)) : orders.filter((o) => o.branchId === activeBranchFilter);
  const todayRevenue = filteredOrders.reduce((acc, o) => acc + (o.status !== "cancelled" ? o.total : 0), 0);
  const weekRevenue = todayRevenue * 4.6 + 45e3;
  const activeOrdersCount = filteredOrders.filter((o) => o.status === "received" || o.status === "preparing" || o.status === "ready").length;
  const codPendingCount = filteredOrders.filter((o) => o.paymentStatus === "cod" && o.status !== "delivered" && o.status !== "completed").length;
  const liveBranchesCount = branches.filter((b) => b.isOpen).length;
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const revenueTrendData = [
    { day: "1", value: 12e3 },
    { day: "3", value: 14500 },
    { day: "6", value: 18200 },
    { day: "9", value: 15400 },
    { day: "12", value: 22e3 },
    { day: "15", value: 19800 },
    { day: "18", value: 27500 },
    { day: "21", value: 24300 },
    { day: "24", value: 31e3 },
    { day: "27", value: 29400 },
    { day: "30", value: todayRevenue > 0 ? todayRevenue : 35200 }
  ];
  const maxChartValue = Math.max(...revenueTrendData.map((d) => d.value), 4e4);
  const chartWidth = 600;
  const chartHeight = 180;
  const paddingX = 20;
  const paddingY = 20;
  const points = revenueTrendData.map((item, idx) => {
    const x = paddingX + idx / (revenueTrendData.length - 1) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - item.value / maxChartValue * (chartHeight - paddingY * 2);
    return { x, y, value: item.value, day: item.day };
  });
  const svgPath = points.reduce((acc, p, idx) => {
    if (idx === 0) return `M ${p.x} ${p.y}`;
    const prev = points[idx - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  const areaPath = `${svgPath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  const websiteOrders = filteredOrders.filter((o) => o.channel === "Website").length || 1;
  const posOrders = filteredOrders.filter((o) => o.channel === "POS").length || 1;
  const phoneOrders = filteredOrders.filter((o) => o.channel === "Phone").length || 1;
  const deliveryOrders = filteredOrders.filter((o) => o.channel === "Delivery").length || 1;
  const totalChannels = websiteOrders + posOrders + phoneOrders + deliveryOrders;
  const websitePct = Math.round(websiteOrders / totalChannels * 100);
  const posPct = Math.round(posOrders / totalChannels * 100);
  const deliveryPct = Math.round(deliveryOrders / totalChannels * 100);
  const phonePct = 100 - websitePct - posPct - deliveryPct;
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {
    /* =========================================================================
        1. DASHBOARD HERO / WELCOME PANEL
        Approx 130-145px, dark gradient, thin border, welcome text + 4 mini cards
    ========================================================================== */
  }
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-[#14161B] via-[#181B22] to-[#121418] border border-[#292D35] p-5 lg:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome, Ahmad
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] font-bold">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-[#00D084] shadow-xs shadow-[#00D084] animate-pulse" />
              <strong className="text-white font-bold">{liveBranchesCount} branches</strong> live
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400">
              {posStatus.isConnected ? "4 POS connected" : "0 POS connected"}
            </span>
            <span className="text-neutral-600 hidden sm:inline">·</span>
            <span className="text-neutral-400 hidden sm:inline">
              Multi-branch operations in sync
            </span>
          </div>
        </div>

        {
    /* 4 Compact Summary Cards on Right */
  }
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 z-10">
          {
    /* Live Orders */
  }
          <div className="bg-[#191B20]/90 border border-[#292D35] rounded-xl px-3.5 py-2.5 flex flex-col justify-center min-w-[105px]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Live Orders
            </div>
            <div className="text-xl font-black text-[#00D084] mt-0.5">
              {activeOrdersCount}
            </div>
          </div>

          {
    /* COD Pending */
  }
          <div className="bg-[#191B20]/90 border border-[#292D35] rounded-xl px-3.5 py-2.5 flex flex-col justify-center min-w-[105px]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              COD Pending
            </div>
            <div className="text-xl font-black text-[#F4C20D] mt-0.5">
              {codPendingCount}
            </div>
          </div>

          {
    /* Today Revenue */
  }
          <div className="bg-[#191B20]/90 border border-[#292D35] rounded-xl px-3.5 py-2.5 flex flex-col justify-center min-w-[115px]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Today Revenue
            </div>
            <div className="text-base sm:text-lg font-black text-[#FF5A1F] mt-0.5 truncate">
              {formatPrice(todayRevenue)}
            </div>
          </div>

          {
    /* Week Revenue */
  }
          <div className="bg-[#191B20]/90 border border-[#292D35] rounded-xl px-3.5 py-2.5 flex flex-col justify-center min-w-[115px]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Week Revenue
            </div>
            <div className="text-base sm:text-lg font-black text-[#3B82F6] mt-0.5 truncate">
              {formatPrice(weekRevenue)}
            </div>
          </div>
        </div>

        {
    /* Decorative subtle background radial glow */
  }
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#FF5A1F]/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {
    /* =========================================================================
        2. KPI STATISTICS SECTION
        4 large KPI cards in one row on desktop
    ========================================================================== */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {
    /* KPI 1: Today's Revenue */
  }
        <div className="relative bg-[#191B20] border border-[#292D35] rounded-[22px] p-5 shadow-sm hover:border-[#FF5A1F]/40 transition-all group overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#00D084] flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> ▲ 12.4%
            </span>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight">
              {formatPrice(todayRevenue)}
            </div>
            <div className="text-xs font-bold text-neutral-300 mt-1">
              Today's Revenue
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              {filteredOrders.length} orders across branches
            </div>
          </div>

          {
    /* Bottom Accent Line in Orange */
  }
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#FF5A1F]" />
        </div>

        {
    /* KPI 2: Week Revenue */
  }
        <div className="relative bg-[#191B20] border border-[#292D35] rounded-[22px] p-5 shadow-sm hover:border-[#3B82F6]/40 transition-all group overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#3B82F6] flex items-center gap-0.5">
              ▲ 8.2%
            </span>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight">
              {formatPrice(weekRevenue)}
            </div>
            <div className="text-xs font-bold text-neutral-300 mt-1">
              Week Revenue
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              8% vs previous week
            </div>
          </div>

          {
    /* Bottom Accent Line in Blue */
  }
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#3B82F6]" />
        </div>

        {
    /* KPI 3: Active Orders */
  }
        <div className="relative bg-[#191B20] border border-[#292D35] rounded-[22px] p-5 shadow-sm hover:border-[#00D084]/40 transition-all group overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#00D084]/15 text-[#00D084] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider bg-[#00D084]/15 text-[#00D084] px-2 py-0.5 rounded-full border border-[#00D084]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse" />
              Live
            </span>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight">
              {activeOrdersCount}
            </div>
            <div className="text-xs font-bold text-neutral-300 mt-1">
              Active Orders
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Across live kitchen stations
            </div>
          </div>

          {
    /* Bottom Accent Line in Green */
  }
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#00D084]" />
        </div>

        {
    /* KPI 4: Total Customers */
  }
        <div className="relative bg-[#191B20] border border-[#292D35] rounded-[22px] p-5 shadow-sm hover:border-[#A855F7]/40 transition-all group overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/15 text-[#A855F7] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#A855F7]">
              +14 this wk
            </span>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight">
              {Math.max(orders.length + 8, 48)}
            </div>
            <div className="text-xs font-bold text-neutral-300 mt-1">
              Total Customers
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Registered in loyalty system
            </div>
          </div>

          {
    /* Bottom Accent Line in Purple */
  }
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#A855F7]" />
        </div>
      </div>

      {
    /* =========================================================================
        3. REVENUE ANALYTICS + ORDER SOURCES SECTION
        Left 70% Chart, Right 30% Donut
    ========================================================================== */
  }
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
        {
    /* Left Column (approx 70% -> 7 of 10 cols) */
  }
        <div className="lg:col-span-7 bg-[#191B20] border border-[#292D35] rounded-[20px] p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#292D35]">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Revenue — 30 Days
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Daily trend across all branches
              </p>
            </div>

            <button
    onClick={() => onNavigateTab("analytics")}
    className="flex items-center gap-1.5 text-xs font-semibold text-[#FF5A1F] hover:text-[#E04810] px-3 py-1.5 rounded-lg bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/20 transition-colors"
  >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {
    /* Interactive SVG Curve Chart */
  }
          <div className="mt-5 relative">
            <svg
    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
    className="w-full h-48 sm:h-56 overflow-visible"
  >
              <defs>
                {
    /* Gradient for area fill */
  }
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#090A0C" stopOpacity="0" />
                </linearGradient>
                {
    /* Gradient for line stroke */
  }
                <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FF5A1F" />
                  <stop offset="70%" stopColor="#F4C20D" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>

              {
    /* Grid Lines */
  }
              {[0.25, 0.5, 0.75].map((pct, idx) => {
    const yPos = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
    return <line
      key={idx}
      x1={paddingX}
      y1={yPos}
      x2={chartWidth - paddingX}
      y2={yPos}
      stroke="#292D35"
      strokeDasharray="4 4"
      strokeWidth="1"
    />;
  })}

              {
    /* Area */
  }
              <path d={areaPath} fill="url(#revenueFill)" />

              {
    /* Smooth curve line */
  }
              <path
    d={svgPath}
    fill="none"
    stroke="url(#revenueStroke)"
    strokeWidth="3"
    strokeLinecap="round"
  />

              {
    /* Points & Hover Interactivity */
  }
              {points.map((p, idx) => <g key={idx}>
                  <circle
    cx={p.x}
    cy={p.y}
    r={hoveredPointIndex === idx ? 6 : 3.5}
    fill={hoveredPointIndex === idx ? "#FF5A1F" : "#101216"}
    stroke="#FF5A1F"
    strokeWidth="2.5"
    className="cursor-pointer transition-all duration-200"
    onMouseEnter={() => setHoveredPointIndex(idx)}
    onMouseLeave={() => setHoveredPointIndex(null)}
  />
                </g>)}
            </svg>

            {
    /* Tooltip display */
  }
            {hoveredPointIndex !== null && <div
    className="absolute -top-3 pointer-events-none transform -translate-x-1/2 bg-[#101216] border border-[#FF5A1F]/60 px-2.5 py-1 rounded-lg text-white shadow-xl z-20"
    style={{
      left: `${points[hoveredPointIndex].x / chartWidth * 100}%`
    }}
  >
                <div className="text-[10px] text-neutral-400">
                  Day {points[hoveredPointIndex].day}
                </div>
                <div className="text-xs font-bold text-[#FF5A1F]">
                  {formatPrice(points[hoveredPointIndex].value)}
                </div>
              </div>}

            {
    /* X-axis labels */
  }
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2 px-3 font-mono">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Day 21</span>
              <span>Day 30 (Today)</span>
            </div>
          </div>
        </div>

        {
    /* Right Column (approx 30% -> 3 of 10 cols) - Order Sources */
  }
        <div className="lg:col-span-3 bg-[#191B20] border border-[#292D35] rounded-[20px] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Order Sources
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Today's channel breakdown
            </p>

            {
    /* Visual Donut representation */
  }
            <div className="flex items-center justify-center my-6">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
    cx="50"
    cy="50"
    r="40"
    fill="transparent"
    stroke="#292D35"
    strokeWidth="12"
  />
                  {
    /* Website slice */
  }
                  <circle
    cx="50"
    cy="50"
    r="40"
    fill="transparent"
    stroke="#FF5A1F"
    strokeWidth="12"
    strokeDasharray={`${websitePct * 2.51} 251`}
    strokeDashoffset="0"
  />
                  {
    /* POS slice */
  }
                  <circle
    cx="50"
    cy="50"
    r="40"
    fill="transparent"
    stroke="#00D084"
    strokeWidth="12"
    strokeDasharray={`${posPct * 2.51} 251`}
    strokeDashoffset={`${-websitePct * 2.51}`}
  />
                  {
    /* Delivery slice */
  }
                  <circle
    cx="50"
    cy="50"
    r="40"
    fill="transparent"
    stroke="#3B82F6"
    strokeWidth="12"
    strokeDasharray={`${deliveryPct * 2.51} 251`}
    strokeDashoffset={`${-(websitePct + posPct) * 2.51}`}
  />
                </svg>

                {
    /* Center metric */
  }
                <div className="absolute text-center leading-tight">
                  <div className="text-lg font-black text-white">{totalChannels}</div>
                  <div className="text-[10px] text-neutral-400 font-medium">Orders</div>
                </div>
              </div>
            </div>

            {
    /* Channels breakdown legend */
  }
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF5A1F]" />
                  <span>Website Storefront</span>
                </div>
                <span className="font-bold text-white">{websitePct}%</span>
              </div>

              <div className="flex items-center justify-between text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#00D084]" />
                  <span>POS Counter</span>
                </div>
                <span className="font-bold text-white">{posPct}%</span>
              </div>

              <div className="flex items-center justify-between text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
                  <span>Food Delivery</span>
                </div>
                <span className="font-bold text-white">{deliveryPct}%</span>
              </div>

              <div className="flex items-center justify-between text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F4C20D]" />
                  <span>Phone Hotline</span>
                </div>
                <span className="font-bold text-white">{phonePct}%</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#292D35] mt-4 text-[11px] text-neutral-500 text-center">
            All channels automatically synchronized with KDS.
          </div>
        </div>
      </div>

      {
    /* =========================================================================
        4. RECENT ORDERS SECTION
        100% full-width card with table
    ========================================================================== */
  }
      <div className="bg-[#191B20] border border-[#292D35] rounded-[20px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#292D35]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Recent Orders
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Latest restaurant orders across branches
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
    onClick={() => onNavigateTab("orders")}
    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#252830] hover:bg-[#30343C] border border-[#292D35] px-3 py-1.5 rounded-lg transition-colors"
  >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {
    /* Orders Table */
  }
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#292D35] text-neutral-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-3">Order</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292D35]/60 text-neutral-200">
              {filteredOrders.slice(0, 6).map((ord) => {
    const isPreparing = ord.status === "preparing";
    const isReady = ord.status === "ready";
    const isDelivered = ord.status === "delivered" || ord.status === "completed";
    const isReceived = ord.status === "received";
    return <tr
      key={ord.orderId}
      className="hover:bg-[#252830]/50 transition-colors group cursor-pointer"
      onClick={() => onSelectOrderDetails?.(ord)}
    >
                    <td className="py-3.5 px-3 font-mono font-bold text-white">
                      {ord.orderNumber}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{ord.customerName}</div>
                      <div className="text-[11px] text-neutral-400">{ord.customerPhone}</div>
                    </td>

                    <td className="py-3.5 px-3 text-neutral-300">
                      {ord.branchName.replace("BurgerBlast — ", "")}
                    </td>

                    <td className="py-3.5 px-3 text-neutral-300">
                      {ord.itemCount} {ord.itemCount === 1 ? "item" : "items"}
                    </td>

                    <td className="py-3.5 px-3 font-bold text-white font-mono">
                      {formatPrice(ord.total)}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${ord.paymentStatus === "paid" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"}`}
    >
                        {ord.paymentStatus} ({ord.paymentMethod})
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
      className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${isPreparing ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : isReady ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : isDelivered ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "bg-purple-500/15 text-purple-400 border border-purple-500/30"}`}
    >
                        <span
      className={`w-1.5 h-1.5 rounded-full ${isPreparing ? "bg-amber-400 animate-pulse" : isReady ? "bg-emerald-400" : isDelivered ? "bg-blue-400" : "bg-purple-400"}`}
    />
                        {ord.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-neutral-400 font-mono text-[11px]">
                      {ord.createdAt}
                    </td>

                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isReceived && <button
      onClick={() => updateOrderStatus(ord.orderId, "preparing")}
      className="px-2 py-1 bg-[#FF5A1F] hover:bg-[#E04810] text-white text-[10px] font-bold rounded-md transition-colors"
    >
                            Accept
                          </button>}
                        {isPreparing && <button
      onClick={() => updateOrderStatus(ord.orderId, "ready")}
      className="px-2 py-1 bg-[#00D084] hover:bg-[#00B573] text-black text-[10px] font-bold rounded-md transition-colors"
    >
                            Mark Ready
                          </button>}
                        <button
      onClick={() => onSelectOrderDetails?.(ord)}
      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#30343C] transition-colors"
      title="View Order Details"
    >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>;
  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
export {
  DashboardPage
};
