import { useState } from "react";
import { Star, ShieldCheck, Quote, MessageSquare, Plus } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { WriteReviewModal } from '@/components/Customer/WriteReviewModal';
const Testimonials = () => {
  const { customerReviews } = useRestaurant();
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const displayReviews = customerReviews.filter(
    (r) => r.status === "approved" || r.isFeatured
  );
  return <section id="reviews-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-20">
      {
    /* Write review modal */
  }
      <WriteReviewModal isOpen={isWriteModalOpen} onClose={() => setIsWriteModalOpen(false)} />

      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 text-center sm:text-left">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#E51B23] bg-[#E51B23]/10 px-3.5 py-1.5 rounded-full inline-block mb-2">
            Real Food Lovers
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#191919] tracking-tight font-['Outfit']">
            Loved by Hungry People
          </h2>
          <p className="text-sm sm:text-base text-[#777777] font-medium mt-1">
            Over 12,000 satisfied burger fans across town. Here’s what they have to say.
          </p>
        </div>

        <button
    onClick={() => setIsWriteModalOpen(true)}
    className="inline-flex items-center gap-2 bg-[#E51B23] hover:bg-[#B90F16] text-white font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-glow-red hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
  >
          <Plus className="w-4 h-4" />
          <span>Write a Review</span>
        </button>
      </div>

      {
    /* Grid of Reviews */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayReviews.slice(0, 6).map((review) => <div
    key={review.id}
    className="bg-white rounded-3xl p-6 border border-[#EEE7DC] shadow-soft-card hover:shadow-soft-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
  >
            <div>
              {
    /* Rating and Quote Icon */
  }
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-[#F5B82E]">
                  {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <div className="flex items-center gap-2">
                  {review.branchName && <span className="text-[10px] font-bold text-neutral-500 bg-[#FAF6F0] px-2 py-0.5 rounded-md border border-[#EEE7DC]">
                      {review.branchName}
                    </span>}
                  <Quote className="w-5 h-5 text-[#E9E2D8]" />
                </div>
              </div>

              {
    /* Review Text */
  }
              <p className="text-xs sm:text-sm text-[#3A3A3A] leading-relaxed mb-4 font-medium">
                "{review.comment}"
              </p>

              {
    /* Admin Reply (if any) */
  }
              {review.adminReply && <div className="mb-4 p-3 bg-[#FFF9EF] border-l-3 border-[#E51B23] rounded-r-xl text-xs space-y-1">
                  <div className="flex items-center gap-1 text-[#E51B23] font-bold text-[10px] uppercase">
                    <MessageSquare className="w-3 h-3" />
                    <span>Restaurant Manager Reply</span>
                  </div>
                  <p className="text-neutral-700 italic">"{review.adminReply}"</p>
                </div>}
            </div>

            {
    /* Author Footer */
  }
            <div className="pt-4 border-t border-[#EEE7DC] flex items-center justify-between mt-auto">
              <div className="flex items-center gap-3">
                <img
    src={review.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`}
    alt={review.name || review.customerName || "Customer"}
    referrerPolicy="no-referrer"
    className="w-10 h-10 rounded-full object-cover border border-[#E9E2D8]"
  />
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#191919] leading-tight">
                    {review.name || review.customerName || "Customer"}
                  </h4>
                  <div className="text-[10px] text-[#777777] flex items-center gap-1">
                    {review.verified !== false && <span className="text-[#2E9B5B] flex items-center gap-0.5 font-bold">
                        <ShieldCheck className="w-3 h-3" /> Verified Customer
                      </span>}
                    <span>• {review.date}</span>
                  </div>
                </div>
              </div>
            </div>

            {
    /* Favorite item pill */
  }
            {review.favoriteOrder && <div className="mt-3 bg-[#FFF9EF] px-3 py-1 rounded-xl text-[10px] font-semibold text-[#777777] truncate">
                Fav order: <strong className="text-[#191919]">{review.favoriteOrder}</strong>
              </div>}
          </div>)}
      </div>
    </section>;
};
export {
  Testimonials
};
