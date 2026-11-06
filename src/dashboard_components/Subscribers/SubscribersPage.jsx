import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { Mail, Search, Download, Trash2, Calendar, UserCheck } from "lucide-react";
const SubscribersPage = () => {
  const { subscribers, unsubscribeEmail, addToast } = useRestaurant();
  const { matchesBranch } = useBranchScope();
  const [searchQuery, setSearchQuery] = useState("");
  const branchScoped = subscribers.filter((sub) => matchesBranch(sub.branchId));
  const filtered = branchScoped.filter(
    (sub) => sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleExportCSV = () => {
    if (branchScoped.length === 0) {
      addToast("No subscribers to export.", "warning");
      return;
    }
    const headers = ["Email,SubscribedAt,Status"];
    const rows = branchScoped.map((s) => `"${s.email}","${s.subscribedAt}","${s.status === "unsubscribed" ? "Unsubscribed" : "Active"}"`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `newsletter_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${branchScoped.length} subscriber emails.`, "success");
  };
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#FF5A1F]" />
            <span>Newsletter Subscribers</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            View customer VIP emails gathered from the homepage subscription box.
          </p>
        </div>

        <button
    onClick={handleExportCSV}
    className="flex items-center gap-2 bg-[#191B20] hover:bg-[#252830] border border-[#292D35] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
  >
          <Download className="w-4 h-4 text-[#FF5A1F]" />
          <span>Export CSV</span>
        </button>
      </div>

      {
    /* Stats and Search */
  }
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by email..."
    className="w-full bg-[#191B20] border border-[#292D35] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5A1F]"
  />
        </div>
        <div className="text-xs text-neutral-400 font-semibold self-end sm:self-auto">
          {filtered.length} of {branchScoped.length} for this branch view
        </div>
      </div>

      <div className="bg-[#191B20] border border-[#292D35] rounded-2xl overflow-hidden">
        {filtered.length === 0 ? <div className="py-16 text-center text-sm text-neutral-500">No subscribers for this branch.</div> : <div className="divide-y divide-[#292D35]">
            {filtered.map((sub) => <div key={sub.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#252830]/40">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {sub.email}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {sub.subscribedAt}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.status === "unsubscribed" ? "bg-neutral-800 text-neutral-400" : "bg-emerald-500/15 text-emerald-400"}`}
  >
                    {sub.status === "unsubscribed" ? "Unsubscribed" : "Active"}
                  </span>
                  {sub.status !== "unsubscribed" && <button
    type="button"
    title="Unsubscribe"
    onClick={() => {
      unsubscribeEmail(sub.id);
      addToast("Subscriber removed from active list.", "info");
    }}
    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
  >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>}
                </div>
              </div>)}
          </div>}
      </div>
    </div>;
};
export {
  SubscribersPage
};
