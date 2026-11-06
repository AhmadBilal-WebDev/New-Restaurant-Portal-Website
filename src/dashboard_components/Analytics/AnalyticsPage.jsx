import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import {
  Award,
  Clock
} from "lucide-react";
const AnalyticsPage = () => {
  const { orders, products, formatPrice } = useRestaurant();
  const { filterByBranch, matchesAvailability, isAllBranches, liveBranches } = useBranchScope();
  const [timeRange, setTimeRange] = useState("30d");
  const scopedOrders = filterByBranch(orders);
  const scopedProducts = products.filter(
    (p) => matchesAvailability(p.branchAvailability?.length ? p.branchAvailability : p.branchIds)
  );
  const totalRevenue = scopedOrders.reduce((acc, o) => acc + o.total, 0);
  const avgOrderValue = Math.round(totalRevenue / Math.max(scopedOrders.length, 1));
  const topSellers = scopedProducts.slice(0, 5).map((p, idx) => {
    const qty = Math.max(12, 90 - idx * 14);
    return {
      name: p.name,
      qty,
      revenue: qty * p.price,
      pct: Math.max(35, 95 - idx * 12)
    };
  });
  const peakHours = [
    { hour: "12:00 PM", orders: 18, pct: 40 },
    { hour: "01:00 PM", orders: 28, pct: 65 },
    { hour: "02:00 PM", orders: 22, pct: 50 },
    { hour: "04:00 PM", orders: 12, pct: 28 },
    { hour: "06:00 PM", orders: 19, pct: 42 },
    { hour: "08:00 PM", orders: 44, pct: 100 },
    { hour: "09:00 PM", orders: 39, pct: 88 },
    { hour: "10:00 PM", orders: 32, pct: 72 },
    { hour: "11:00 PM", orders: 24, pct: 55 }
  ];
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {
    /* Header & Timeframe Filter */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Performance & Revenue Analytics
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {isAllBranches ? `Combined analytics across ${liveBranches.length} live branches.` : "Deep dive into this branch sales trends, basket size, and peak hours."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#191B20] border border-[#292D35] rounded-xl self-start sm:self-auto">
          {["7d", "30d", "90d", "1y"].map((range) => <button
    key={range}
    onClick={() => setTimeRange(range)}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${timeRange === range ? "bg-[#FF5A1F] text-white" : "text-neutral-400 hover:text-white"}`}
  >
              {range}
            </button>)}
        </div>
      </div>

      {
    /* KPI 4-Card Summary */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="text-xs font-bold text-neutral-400 uppercase">Gross Sales</div>
          <div className="text-2xl font-black text-white font-mono">{formatPrice(totalRevenue)}</div>
          <div className="text-[11px] text-[#00D084] font-semibold">▲ +14.2% vs previous period</div>
        </div>

        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="text-xs font-bold text-neutral-400 uppercase">Avg Basket (AOV)</div>
          <div className="text-2xl font-black text-[#FF5A1F] font-mono">{formatPrice(avgOrderValue)}</div>
          <div className="text-[11px] text-neutral-400">Calculated over all channels</div>
        </div>

        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="text-xs font-bold text-neutral-400 uppercase">Repeat Customer Rate</div>
          <div className="text-2xl font-black text-[#3B82F6]">41.8%</div>
          <div className="text-[11px] text-neutral-400">High brand loyalty</div>
        </div>

        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="text-xs font-bold text-neutral-400 uppercase">Order Fulfillment Time</div>
          <div className="text-2xl font-black text-[#00D084]">14.2 min</div>
          <div className="text-[11px] text-neutral-400">Kitchen grill to pass handover</div>
        </div>
      </div>

      {
    /* Two Columns: Best Sellers & Peak Hours */
  }
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {
    /* Top 5 Best Selling Dishes */
  }
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#292D35]">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FF5A1F]" />
              <span>Top 5 Best-Selling Dishes</span>
            </h3>
            <span className="text-xs text-neutral-400">By sales volume</span>
          </div>

          <div className="space-y-4">
            {topSellers.map((item, idx) => <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    #{idx + 1} {item.name}
                  </span>
                  <span className="font-mono text-neutral-300 font-bold">
                    {formatPrice(item.revenue)} ({item.qty} sold)
                  </span>
                </div>
                <div className="w-full bg-[#101216] h-2 rounded-full overflow-hidden">
                  <div
    className="bg-[#FF5A1F] h-full rounded-full transition-all duration-500"
    style={{ width: `${item.pct}%` }}
  />
                </div>
              </div>)}
          </div>
        </div>

        {
    /* Peak Hours Distribution */
  }
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#292D35]">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#3B82F6]" />
              <span>Peak Hours Ordering Heatmap</span>
            </h3>
            <span className="text-xs text-neutral-400">Lunch vs Dinner Rush</span>
          </div>

          <div className="space-y-3">
            {peakHours.map((slot, idx) => <div key={idx} className="flex items-center gap-3 text-xs">
                <span className="w-20 font-mono text-neutral-400 shrink-0">
                  {slot.hour}
                </span>

                <div className="flex-1 bg-[#101216] h-2.5 rounded-full overflow-hidden">
                  <div
    className="bg-gradient-to-r from-blue-500 to-[#FF5A1F] h-full rounded-full"
    style={{ width: `${slot.pct}%` }}
  />
                </div>

                <span className="w-16 text-right font-mono font-bold text-white shrink-0">
                  {slot.orders} orders
                </span>
              </div>)}
          </div>
        </div>
      </div>
    </div>;
};
export {
  AnalyticsPage
};
