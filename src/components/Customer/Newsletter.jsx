import { useState } from "react";
import { Mail, CheckCircle2, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const Newsletter = () => {
  const { subscribeEmail } = useRestaurant();
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatusMessage({ text: "Please provide a valid email address.", isError: true });
      return;
    }
    const res = subscribeEmail(email.trim());
    if (res.success) {
      setIsSuccess(true);
      setStatusMessage({ text: res.message, isError: false });
    } else {
      setStatusMessage({ text: res.message, isError: true });
    }
  };
  return <section id="newsletter-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="w-full bg-gradient-to-br from-[#FFF9EE] via-[#FFF2DB] to-[#FFECCE] rounded-3xl sm:rounded-[40px] border-2 border-[#EADBBF] p-8 sm:p-14 lg:p-16 shadow-xl relative overflow-hidden">
        {
    /* Decorative background glow & accent */
  }
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFB800]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-96 h-96 bg-[#E51B23]/10 rounded-full blur-3xl pointer-events-none" />

        {isSuccess ? <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 animate-in zoom-in-95 duration-200 py-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#2E9B5B]/15 text-[#2E9B5B] flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-[#191919] font-['Outfit']">
                  You're on the VIP list!
                </h3>
                <p className="text-sm sm:text-base text-[#555555] mt-1.5 font-medium">
                  Exclusive promo codes and secret weekly menus will arrive at <strong className="text-[#191919]">{email}</strong>.
                </p>
              </div>
            </div>
            <button
    type="button"
    onClick={() => {
      setIsSuccess(false);
      setEmail("");
      setStatusMessage(null);
    }}
    className="text-sm font-bold text-[#E51B23] hover:underline shrink-0 cursor-pointer"
  >
              Subscribe another email
            </button>
          </div> : <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10 py-2 sm:py-4">
            {
    /* Left Column: Headline & Details (Lamba horizontal banner left) */
  }
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-[#E51B23] bg-[#E51B23]/10 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4" />
                <span>VIP Bites &amp; Secret Weekly Drops</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#191919] tracking-tight font-['Outfit'] leading-tight">
                Get 20% Off Your Next Order &amp; Weekly Flash Deals
              </h2>

              <p className="text-sm sm:text-base lg:text-lg text-[#555555] font-medium leading-relaxed max-w-xl">
                Join 14,000+ burger lovers for instant welcome discount coupons, weekend BOGO codes, chef's secret creations, and priority delivery perks.
              </p>

              {
    /* Quick Perks Pill Row */
  }
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#191919] bg-white/90 border border-[#E9DAC3] px-3 py-1.5 rounded-full shadow-2xs">
                  ✨ Instant 20% Voucher
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#191919] bg-white/90 border border-[#E9DAC3] px-3 py-1.5 rounded-full shadow-2xs">
                  🍔 Secret Menu Drops
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#191919] bg-white/90 border border-[#E9DAC3] px-3 py-1.5 rounded-full shadow-2xs">
                  ⚡ Zero Spam Guarantee
                </span>
              </div>
            </div>

            {
    /* Right Column: Wide Form & Submission (Lamba horizontal banner right) */
  }
            <div className="lg:col-span-5">
              <form onSubmit={handleSubmit} className="w-full space-y-4 bg-white/60 p-5 sm:p-6 rounded-3xl border border-[#EBE0CD] shadow-sm backdrop-blur-xs">
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
    type="email"
    id="newsletter-email-input"
    placeholder="Enter your email address..."
    value={email}
    onChange={(e) => {
      setEmail(e.target.value);
      if (statusMessage) setStatusMessage(null);
    }}
    className="w-full bg-white border border-[#E0D3BC] text-sm text-[#191919] placeholder-neutral-400 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-[#E51B23] focus:ring-2 focus:ring-[#E51B23]/20 transition-all shadow-xs font-medium"
  />
                  </div>
                  <button
    type="submit"
    id="newsletter-subscribe-btn"
    className="w-full bg-[#E51B23] hover:bg-[#B90F16] text-white font-black text-sm sm:text-base py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
  >
                    <span>Subscribe &amp; Get 20% Off</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {statusMessage && <div
    className={`text-xs font-bold flex items-center gap-1.5 px-1 ${statusMessage.isError ? "text-[#E51B23]" : "text-emerald-700"}`}
  >
                    {statusMessage.isError && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{statusMessage.text}</span>
                  </div>}

                <div className="flex items-center gap-2 text-[11px] text-[#777777] px-1">
                  <span>🔒 No spam ever. Unsubscribe anytime with a single click.</span>
                </div>
              </form>
            </div>
          </div>}
      </div>
    </section>;
};
export {
  Newsletter
};
