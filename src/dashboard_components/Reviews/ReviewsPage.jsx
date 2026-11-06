import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { MessageSquare, Star, CheckCircle, XCircle, Trash2, Pin, Reply, Search } from "lucide-react";
const ReviewsPage = () => {
  const { customerReviews, updateCustomerReview, deleteCustomerReview, branches, activeBranchFilter, addToast } = useRestaurant();
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const handleStatusChange = (review, newStatus) => {
    updateCustomerReview({ ...review, status: newStatus });
    addToast(`Review marked as ${newStatus}.`, "info");
  };
  const handleToggleFeature = (review) => {
    const isNowFeatured = !review.isFeatured;
    updateCustomerReview({ ...review, isFeatured: isNowFeatured });
    addToast(isNowFeatured ? "Review pinned to homepage!" : "Review unpinned from homepage.", "info");
  };
  const handleSaveReply = (e) => {
    e.preventDefault();
    if (!replyingReview) return;
    updateCustomerReview({ ...replyingReview, adminReply: replyText.trim() });
    addToast("Admin reply saved successfully.", "success");
    setReplyingReview(null);
    setReplyText("");
  };
  const liveIds = new Set(branches.filter((b) => b.isActive !== false).map((b) => b.id));
  const filteredReviews = customerReviews.filter((r) => {
    const matchesBranch = liveIds.size > 0 && (activeBranchFilter === "all" ? liveIds.has(r.branchId) : r.branchId === activeBranchFilter);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesRating = ratingFilter === "all" || r.rating === ratingFilter;
    const reviewerName = r.name || r.customerName || "Customer";
    const reviewerPhone = r.phone || "";
    const matchesSearch = reviewerName.toLowerCase().includes(searchQuery.toLowerCase()) || r.comment.toLowerCase().includes(searchQuery.toLowerCase()) || reviewerPhone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesStatus && matchesRating && matchesSearch;
  });
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#FF5A1F]" />
            <span>Customer Reviews Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Moderate verified customer testimonials, approve or feature reviews, and publish manager replies.
          </p>
        </div>
      </div>

      {
    /* Filters Bar */
  }
      <div className="bg-[#14171C] border border-[#292D35] rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs">
        {
    /* Search */
  }
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by customer, text, or phone..."
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl pl-9 pr-3 py-2 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#FF5A1F]"
  />
        </div>

        {
    /* Status Filter */
  }
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 font-bold">Status:</span>
          <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="bg-[#1D2128] border border-[#292D35] rounded-xl px-2.5 py-2 text-white font-bold"
  >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {
    /* Rating Filter */
  }
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 font-bold">Stars:</span>
          <select
    value={ratingFilter}
    onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
    className="bg-[#1D2128] border border-[#292D35] rounded-xl px-2.5 py-2 text-white font-bold"
  >
            <option value="all">All Ratings</option>
            <option value={5}>5 Stars Only</option>
            <option value={4}>4 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={2}>2 Stars</option>
            <option value={1}>1 Star</option>
          </select>
        </div>
      </div>

      {
    /* Reviews Cards List */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReviews.map((rev) => <div
    key={rev.id}
    className={`bg-[#14171C] border rounded-2xl p-5 flex flex-col justify-between transition-all ${rev.isFeatured ? "border-[#FF5A1F]/60 shadow-lg shadow-[#FF5A1F]/5" : "border-[#292D35]"}`}
  >
            <div>
              {
    /* Header info */
  }
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{rev.name || rev.customerName}</span>
                    {rev.phone && <span className="text-[11px] text-neutral-400">({rev.phone})</span>}
                    {rev.isFeatured && <span className="inline-flex items-center gap-1 bg-[#FF5A1F]/15 text-[#FF5A1F] text-[10px] font-black px-2 py-0.5 rounded-full">
                        <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                      </span>}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center text-[#F5B82E]">
                      {[...Array(rev.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <span className="text-[11px] text-neutral-400 font-semibold">• {rev.date}</span>
                    {rev.branchName && <span className="text-[10px] text-neutral-300 bg-[#1D2128] px-2 py-0.5 rounded-md border border-[#292D35]">
                        {rev.branchName}
                      </span>}
                  </div>
                </div>

                <span
    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${rev.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : rev.status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}
  >
                  {rev.status}
                </span>
              </div>

              {
    /* Review text */
  }
              <p className="text-xs text-neutral-300 font-medium leading-relaxed my-3 bg-[#191B20] p-3 rounded-xl border border-[#292D35]/60">
                "{rev.comment}"
              </p>

              {
    /* Admin reply if present */
  }
              {rev.adminReply && <div className="mb-3 p-2.5 bg-[#FF5A1F]/10 border-l-2 border-[#FF5A1F] rounded-r-lg text-xs space-y-0.5">
                  <div className="text-[10px] font-bold text-[#FF5A1F] uppercase">Manager Response:</div>
                  <div className="text-neutral-300 italic">"{rev.adminReply}"</div>
                </div>}
            </div>

            {
    /* Actions Toolbar */
  }
            <div className="pt-3 border-t border-[#292D35] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                {rev.status !== "approved" && <button
    onClick={() => handleStatusChange(rev, "approved")}
    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg font-bold cursor-pointer"
  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>}
                {rev.status !== "rejected" && <button
    onClick={() => handleStatusChange(rev, "rejected")}
    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-bold cursor-pointer"
  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>}
                <button
    onClick={() => handleToggleFeature(rev)}
    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${rev.isFeatured ? "bg-[#FF5A1F] text-white" : "bg-[#1D2128] hover:bg-[#252A33] text-neutral-300"}`}
    title="Pin to Homepage"
  >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{rev.isFeatured ? "Unpin" : "Pin"}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
    onClick={() => {
      setReplyingReview(rev);
      setReplyText(rev.adminReply || "");
    }}
    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1D2128] hover:bg-[#252A33] text-neutral-300 rounded-lg font-bold cursor-pointer"
  >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>

                <button
    onClick={() => {
      if (confirm(`Delete review from ${rev.name || rev.customerName}?`)) {
        deleteCustomerReview(rev.id);
        addToast("Review deleted.", "info");
      }
    }}
    className="p-1.5 rounded-lg bg-[#1D2128] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 cursor-pointer"
  >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>)}

        {filteredReviews.length === 0 && <div className="col-span-full py-12 text-center text-neutral-400">
            No customer reviews match the active filter criteria.
          </div>}
      </div>

      {
    /* Reply Modal */
  }
      {replyingReview && <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setReplyingReview(null)} />
          <div className="relative w-full max-w-md bg-[#14171C] rounded-2xl border border-[#292D35] shadow-2xl z-10 p-5 text-xs">
            <h3 className="text-base font-black text-white mb-2">Reply to {replyingReview.name}</h3>
            <p className="text-neutral-400 mb-4">
              "{replyingReview.comment}"
            </p>

            <form onSubmit={handleSaveReply} className="space-y-4">
              <textarea
    required
    rows={4}
    value={replyText}
    onChange={(e) => setReplyText(e.target.value)}
    placeholder="Write an official manager response..."
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl p-3 text-white focus:outline-none focus:border-[#FF5A1F] resize-none"
  />

              <div className="flex justify-end gap-2">
                <button
    type="button"
    onClick={() => setReplyingReview(null)}
    className="px-4 py-2 rounded-xl bg-[#1D2128] text-neutral-300"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="px-5 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] text-white font-bold"
  >
                  Save & Publish Reply
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
export {
  ReviewsPage
};
