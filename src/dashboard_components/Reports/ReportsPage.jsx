import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import {
  FileSpreadsheet,
  Download
} from "lucide-react";
const ReportsPage = () => {
  const { orders, formatPrice, addToast } = useRestaurant();
  const { filterByBranch, isAllBranches, liveBranches, activeBranchFilter, branches } = useBranchScope();
  const [selectedReport, setSelectedReport] = useState("sales");
  const [dateRange, setDateRange] = useState("today");
  const scopedOrders = filterByBranch(orders);
  const activeBranchLabel = activeBranchFilter === "all" ? "All Branches" : branches.find((b) => b.id === activeBranchFilter)?.shortName || "Branch";
  const reportArchives = [
    {
      id: "REP-2026-09-01",
      title: "Monthly Consolidated Sales Report — August 2026",
      branchId: "all",
      branch: "All Branches",
      type: "Sales & Tax",
      size: "2.4 MB",
      date: "Sep 01, 2026"
    },
    ...liveBranches.map((b, index) => ({
      id: `REP-BRANCH-${b.id}`,
      title: `Weekly Register Shift Balancing — ${b.shortName}`,
      branchId: b.id,
      branch: b.shortName,
      type: index % 2 === 0 ? "Register POS" : "Inventory",
      size: `${(1.1 + index * 0.4).toFixed(1)} MB`,
      date: "Sep 07, 2026"
    }))
  ].filter(
    (rep) => isAllBranches ? true : rep.branchId === "all" || rep.branchId === activeBranchFilter
  );
  const handleGenerateReport = () => {
    const gross = scopedOrders.reduce((acc, o) => acc + o.total, 0);
    addToast(
      "Report Generated",
      `Generating ${selectedReport.toUpperCase()} report for ${activeBranchLabel} (${dateRange})...`,
      "info"
    );
    setTimeout(() => {
      const headers = ["Metric", "Value", "Branch", "Generated At"];
      const rows = [
        ["Gross Sales", formatPrice(gross), activeBranchLabel, (/* @__PURE__ */ new Date()).toLocaleString()],
        ["Orders Count", String(scopedOrders.length), activeBranchLabel, (/* @__PURE__ */ new Date()).toLocaleString()],
        ["Discounts Total", formatPrice(Math.round(gross * 0.05)), activeBranchLabel, (/* @__PURE__ */ new Date()).toLocaleString()],
        ["Net Sales", formatPrice(Math.round(gross * 0.95)), activeBranchLabel, (/* @__PURE__ */ new Date()).toLocaleString()],
        ["Tax (8%)", formatPrice(Math.round(gross * 0.08)), activeBranchLabel, (/* @__PURE__ */ new Date()).toLocaleString()]
      ];
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `report_${selectedReport}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Download Complete", "Your report has been downloaded.", "success");
    }, 600);
  };
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Financial & Shift Reports
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Export official tax statements, end-of-day register z-reports, and kitchen performance data.
          </p>
        </div>
      </div>

      {
    /* Report Generator Form Card */
  }
      <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">
          Generate New Statement
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-neutral-300 font-bold mb-1.5">
              Report Category
            </label>
            <select
    value={selectedReport}
    onChange={(e) => setSelectedReport(e.target.value)}
    className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF5A1F]"
  >
              <option value="sales">Daily End-of-Day Sales Summary (Z-Report)</option>
              <option value="tax">Tax & Government Filing Breakdown (8%)</option>
              <option value="branches">Multi-Branch Revenue Comparison</option>
              <option value="staff">Cashier Register Drawer Balancing</option>
              <option value="dishes">Menu Item Profitability & Margin</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-300 font-bold mb-1.5">
              Time Period
            </label>
            <select
    value={dateRange}
    onChange={(e) => setDateRange(e.target.value)}
    className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF5A1F]"
  >
              <option value="today">Today (Current Live Shift)</option>
              <option value="yesterday">Yesterday (Finalized)</option>
              <option value="7d">Last 7 Days</option>
              <option value="this_month">This Month to Date</option>
              <option value="last_month">Previous Full Month</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
    onClick={handleGenerateReport}
    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] text-white font-bold transition-all shadow-md shadow-[#FF5A1F]/20"
  >
              <Download className="w-4 h-4" />
              <span>Generate & Download</span>
            </button>
          </div>
        </div>
      </div>

      {
    /* Historical Report Archives */
  }
      <div className="bg-[#191B20] border border-[#292D35] rounded-[20px] p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">
          Archived Reports & Audits
        </h3>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#292D35] text-neutral-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-3">Document</th>
                <th className="py-3 px-3">Scope</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">File Size</th>
                <th className="py-3 px-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292D35]/60 text-neutral-200">
              {reportArchives.map((rep) => <tr key={rep.id} className="hover:bg-[#252830]/40 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#00D084]" />
                      <span className="font-bold text-white">{rep.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-300">{rep.branch}</td>
                  <td className="py-3.5 px-3 text-neutral-400">{rep.type}</td>
                  <td className="py-3.5 px-3 text-neutral-400 font-mono text-[11px]">
                    {rep.date}
                  </td>
                  <td className="py-3.5 px-3 text-neutral-500 font-mono">{rep.size}</td>
                  <td className="py-3.5 px-3 text-right">
                    <button
    onClick={handleGenerateReport}
    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#30343C] transition-colors"
    title="Download copy"
  >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
export {
  ReportsPage
};
