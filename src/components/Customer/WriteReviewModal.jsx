import { useState } from "react";
import { Star, X, ShieldCheck, Check } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const WriteReviewModal = ({ isOpen, onClose }) => {
  const { branches, addCustomerReview, customerUser, currentBranch, addToast } = useRestaurant();
  const [name, setName] = useState(customerUser?.name || "");
  const [phone, setPhone] = useState(customerUser?.phone || "");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [branchId, setBranchId] = useState(currentBranch?.id || branches[0]?.id || "");
  const [favoriteOrder, setFavoriteOrder] = useState("Smash Burger");
  const [step, setStep] = useState("form");
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("1234");
  const [otpError, setOtpError] = useState("");
  if (!isOpen) return null;
  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !comment.trim()) {
      addToast("Please fill out all required fields.", "warning");
      return;
    }
    setGeneratedOtp("1234");
    setStep("otp");
  };
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpCode.trim() === "1234" || otpCode.trim() === generatedOtp) {
      const selectedB = branches.find((b) => b.id === branchId) || branches[0];
      addCustomerReview({
        name: name.trim(),
        phone: phone.trim(),
        rating,
        comment: comment.trim(),
        branchId: selectedB.id,
        branchName: selectedB.name,
        favoriteOrder: favoriteOrder.trim() || "Signature Smash Meal",
        status: "approved",
        isFeatured: true
      });
      setStep("success");
      addToast("Review verified and published successfully!", "success");
      setTimeout(() => {
        onClose();
        setStep("form");
        setComment("");
        setOtpCode("");
      }, 1500);
    } else {
      setOtpError('Invalid OTP code. Please enter demo OTP "1234".');
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {
    /* Backdrop */
  }
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {
    /* Modal Card */
  }
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#EEE7DC] z-10 overflow-hidden animate-in zoom-in-95">
        {
    /* Header */
  }
        <div className="p-5 sm:p-6 bg-[#FFF9EF] border-b border-[#EEE7DC] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E51B23]">
              Verified Feedback
            </span>
            <h3 className="text-xl font-black text-[#191919] font-['Outfit']">
              {step === "otp" ? "Verify Your Phone" : step === "success" ? "Review Published!" : "Rate Your Experience"}
            </h3>
          </div>
          <button
    onClick={onClose}
    className="w-8 h-8 rounded-full bg-white border border-[#EEE7DC] flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
  >
            <X className="w-4 h-4" />
          </button>
        </div>

        {
    /* Body */
  }
        <div className="p-5 sm:p-6">
          {step === "form" && <form onSubmit={handleInitialSubmit} className="space-y-4">
              {
    /* Branch Selection */
  }
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Select Branch</label>
                <select
    value={branchId}
    onChange={(e) => setBranchId(e.target.value)}
    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] text-xs font-bold text-[#191919] focus:outline-none focus:border-[#E51B23]"
  >
                  {branches.map((b) => <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>)}
                </select>
              </div>

              {
    /* Star Rating selector */
  }
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Your Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => <button
    key={star}
    type="button"
    onMouseEnter={() => setHoverRating(star)}
    onMouseLeave={() => setHoverRating(0)}
    onClick={() => setRating(star)}
    className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
  >
                      <Star
    className={`w-7 h-7 ${(hoverRating || rating) >= star ? "text-[#F5B82E] fill-current" : "text-neutral-300"}`}
  />
                    </button>)}
                  <span className="ml-2 text-xs font-bold text-[#191919]">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              {
    /* Name and Phone */
  }
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Your Name</label>
                  <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="e.g. Sarah Khan"
    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] text-xs font-medium text-[#191919] focus:outline-none focus:border-[#E51B23]"
  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Mobile Phone (for OTP)</label>
                  <input
    type="tel"
    required
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    placeholder="e.g. +92 300 1234567"
    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] text-xs font-medium text-[#191919] focus:outline-none focus:border-[#E51B23]"
  />
                </div>
              </div>

              {
    /* Favorite Dish */
  }
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Favorite Order / Dish</label>
                <input
    type="text"
    value={favoriteOrder}
    onChange={(e) => setFavoriteOrder(e.target.value)}
    placeholder="e.g. Double Smashed Beef Burger & Loaded Fries"
    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] text-xs font-medium text-[#191919] focus:outline-none focus:border-[#E51B23]"
  />
              </div>

              {
    /* Comment */
  }
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Review Comments</label>
                <textarea
    required
    rows={3}
    value={comment}
    onChange={(e) => setComment(e.target.value)}
    placeholder="Tell us what you loved about the food, taste, or fast delivery..."
    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEE7DC] bg-[#FAF6F0] text-xs font-medium text-[#191919] focus:outline-none focus:border-[#E51B23] resize-none"
  />
              </div>

              {
    /* Submit CTA */
  }
              <button
    type="submit"
    className="w-full py-3.5 rounded-full bg-[#E51B23] hover:bg-[#B90F16] text-white font-extrabold text-xs sm:text-sm shadow-glow-red transition-all cursor-pointer"
  >
                Send OTP & Submit Review
              </button>
            </form>}

          {step === "otp" && <form onSubmit={handleVerifyOtp} className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-[#E51B23]/10 text-[#E51B23] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-base font-black text-[#191919]">Enter Verification Code</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  We sent a 4-digit verification code to <strong>{phone}</strong>.
                </p>
                <div className="inline-block mt-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-800">
                  Demo Test Hint: Enter code <strong>1234</strong>
                </div>
              </div>

              <div className="max-w-xs mx-auto">
                <input
    type="text"
    maxLength={4}
    value={otpCode}
    onChange={(e) => {
      setOtpCode(e.target.value);
      setOtpError("");
    }}
    placeholder="1234"
    className="w-full text-center text-2xl tracking-[0.5em] font-black py-3 rounded-2xl border-2 border-[#EEE7DC] focus:border-[#E51B23] focus:outline-none"
  />
                {otpError && <p className="text-xs text-red-600 font-bold mt-1.5">{otpError}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <button
    type="button"
    onClick={() => setStep("form")}
    className="flex-1 py-3 rounded-xl border border-[#EEE7DC] text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
  >
                  Back
                </button>
                <button
    type="submit"
    className="flex-1 py-3 rounded-xl bg-[#E51B23] hover:bg-[#B90F16] text-white text-xs font-bold shadow-glow-red cursor-pointer"
  >
                  Verify & Publish
                </button>
              </div>
            </form>}

          {step === "success" && <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h4 className="text-lg font-black text-[#191919]">Thank You For Your Review!</h4>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Your feedback helps us continuously improve the quality of our food and service.
              </p>
            </div>}
        </div>
      </div>
    </div>;
};
export {
  WriteReviewModal
};
