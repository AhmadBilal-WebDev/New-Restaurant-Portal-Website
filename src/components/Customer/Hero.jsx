import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, Star, ShieldCheck, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { getPublicFrontendDomainUrl } from '@/shared/lib/catalogApi';
import {
  getPublicRestaurantBanners,
  restaurantBannerTagLabel
} from '@/shared/lib/restaurantBannerApi';
import heroMealImg from '@/assets/images/hero_burger_meal_1789195599245.jpg';
const Hero = ({
  onOrderNow,
  onExploreMenu,
  branchName,
  enabled
}) => {
  const { config, formatPrice } = useRestaurant();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [publicBanners, setPublicBanners] = useState(null);
  const [isFetchingBanners, setIsFetchingBanners] = useState(true);
  const [loadedImageUrls, setLoadedImageUrls] = useState(
    () => /* @__PURE__ */ new Set([heroMealImg.src])
  );
  const autoSlideRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const defaultBanner = {
    id: "default-home-banner",
    title: "CRAFTED SMASH",
    highlightWord: "HOT & CRISPY",
    accentWord: "DELIVERED FAST",
    subtitle: "Savor caramelized smashed Angus beef patties, molten cheddar, and signature house glaze on toasted butter brioche.",
    badgeText: "FRESH • FAST • FLAVORFUL",
    ctaText: "Order Now",
    secondaryCtaText: "Explore Menu",
    imageUrl: heroMealImg.src,
    buttonLink: void 0,
    secondaryButtonLink: void 0,
    floatingBadge1: "Triple Smash Deluxe",
    floatingBadge2: "⚡ Fast Arrival",
    priceText: `From ${formatPrice(850)}`
  };
  useEffect(() => {
    if (!enabled || !branchName) {
      setPublicBanners(null);
      setIsFetchingBanners(true);
      return;
    }
    let isCurrent = true;
    setIsFetchingBanners(true);
    void getPublicRestaurantBanners(getPublicFrontendDomainUrl()).then((result) => {
      if (!isCurrent) return;
      if (!result.ok) {
        console.error("Public restaurant banners could not be loaded:", result.data);
        setPublicBanners([]);
        setIsFetchingBanners(false);
        return;
      }
      setPublicBanners(result.banners);
      setIsFetchingBanners(false);
    });
    return () => {
      isCurrent = false;
    };
  }, [branchName, enabled]);
  const now = Date.now();
  const banners = (publicBanners || []).filter((banner) => {
    if (!banner.isActive || !banner.title) return false;
    const startsAt = banner.startDate ? new Date(banner.startDate).getTime() : 0;
    const endsAt = banner.endDate ? new Date(banner.endDate).getTime() : Number.POSITIVE_INFINITY;
    return (!startsAt || startsAt <= now) && endsAt >= now;
  }).sort((a, b) => a.displayOrder - b.displayOrder).map((banner) => ({
    id: banner.id,
    title: banner.title,
    highlightWord: "",
    accentWord: "",
    subtitle: banner.shortText || banner.description,
    badgeText: banner.tag,
    ctaText: banner.buttonText,
    secondaryCtaText: banner.secondaryButtonText,
    imageUrl: banner.image || heroMealImg.src,
    floatingBadge1: banner.tag,
    floatingBadge2: "",
    priceText: "",
    buttonLink: banner.buttonLink,
    secondaryButtonLink: banner.secondaryButtonLink
  }));
  const displayedBanners = banners.length > 0 ? banners : [defaultBanner];
  useEffect(() => {
    setCurrentIndex(0);
  }, [displayedBanners.length]);
  useEffect(() => {
    if (isPaused || displayedBanners.length <= 1) return;
    setProgress(0);
    const stepTime = 50;
    const totalTime = 3200;
    const increment = stepTime / totalTime * 100;
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + increment;
      });
    }, stepTime);
    autoSlideRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayedBanners.length);
      setProgress(0);
    }, totalTime);
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPaused, displayedBanners.length, currentIndex]);
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayedBanners.length) % displayedBanners.length);
    setProgress(0);
  };
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayedBanners.length);
    setProgress(0);
  };
  const handleSelectBanner = (idx) => {
    setCurrentIndex(idx);
    setProgress(0);
  };
  const currentBanner = displayedBanners[currentIndex] || displayedBanners[0];
  const currentImageUrl = currentBanner.imageUrl || heroMealImg.src;
  const isLoadingAdminBannerImage = isFetchingBanners || banners.length > 0 && !loadedImageUrls.has(currentImageUrl);
  const bannerSubtitle = currentBanner.subtitle || currentBanner.description || currentBanner.tagline || "Juicy smash patties, ultra-crispy sides, and irresistible combo meals crafted to order.";
  const bannerBadgeValue = currentBanner.badgeText || currentBanner.badge || "HOT • FRESH • GOURMET";
  const bannerBadge = restaurantBannerTagLabel(bannerBadgeValue);
  const bannerPriceRaw = currentBanner.priceText || currentBanner.priceFrom || (currentBanner.buttonLink !== void 0 ? "" : `Starting at ${formatPrice(850)}`);
  const bannerPrice = String(bannerPriceRaw).replace(/\b(PKR|USD|EUR|GBP|AED|SAR|INR)\b\s*/gi, config.currency.symbol).replace(
    /^(From|Starting at)\s+([\d,]+(?:\.\d+)?)\s*$/i,
    (_, label, amount) => `${label} ${formatPrice(Number(String(amount).replace(/,/g, "")))}`
  );
  const bannerFloatingValue = currentBanner.floatingBadge1 || currentBanner.tagline || "Signature Smash Meal";
  const bannerFloating1 = restaurantBannerTagLabel(bannerFloatingValue);
  const bannerFloating2 = currentBanner.floatingBadge2 || currentBanner.deliveryTimeBadge || (currentBanner.buttonLink !== void 0 ? "" : "⚡ 20 min delivery");
  const bannerSecondaryCta = currentBanner.secondaryCtaText || "Explore Menu";
  const followBannerLink = (link, fallback) => {
    if (!link) {
      fallback();
      return;
    }
    let destination;
    try {
      destination = new URL(link, window.location.href);
    } catch (error) {
      console.error("Invalid hero banner link:", error);
      fallback();
      return;
    }
    if (destination.protocol !== "http:" && destination.protocol !== "https:") {
      fallback();
      return;
    }
    if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.hash) {
      document.getElementById(destination.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    window.location.assign(destination.toString());
  };
  return <section
    id="hero-section"
    className="relative w-full h-[calc(100svh-142px)] min-h-[520px] max-h-[820px] flex flex-col justify-between overflow-hidden bg-[#180E08] text-white select-none"
    aria-busy={isLoadingAdminBannerImage}
    onMouseEnter={() => setIsPaused(true)}
    onMouseLeave={() => setIsPaused(false)}
  >
      {
    /* 1. Full-bleed Background Images with Smooth Crossfade */
  }
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {displayedBanners.map((banner, index) => {
    const imgUrl = banner.imageUrl || banner.image || heroMealImg;
    const isActive = index === currentIndex;
    return <div
      key={banner.id || index}
      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${isActive ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none"}`}
    >
              <img
      src={imgUrl}
      alt={banner.title || "Gourmet Burger Meal"}
      referrerPolicy="no-referrer"
      onLoad={() => setLoadedImageUrls((loaded) => new Set(loaded).add(imgUrl))}
      onError={(event) => {
        if (imgUrl !== heroMealImg.src) {
          event.currentTarget.src = heroMealImg.src;
          setLoadedImageUrls((loaded) => new Set(loaded).add(imgUrl));
        }
      }}
      className={`w-full h-full object-cover object-center transform transition-transform duration-[7000ms] ease-out ${isActive ? "scale-105" : "scale-100"}`}
    />
            </div>;
  })}

        {
    /* 2. Warm Gourmet Lighting & Vignette Overlay (NOT cold black) */
  }
        {
    /* Left-to-right warm espresso gradient to protect text legibility while keeping the burger vibrant on the right */
  }
        <div className="absolute inset-0 bg-gradient-to-r from-[#170E08] via-[#170E08]/85 md:via-[#170E08]/65 to-[#170E08]/30 z-10" />
        {
    /* Subtle top & bottom vignette for seamless header attachment */
  }
        <div className="absolute inset-0 bg-gradient-to-t from-[#170E08] via-transparent to-[#170E08]/40 z-10" />
        
        {
    /* Ambient Warm Golden & Fiery Crimson Glows */
  }
        <div className="absolute top-1/4 left-10 w-80 sm:w-96 h-80 sm:h-96 bg-[#FF5A1F]/20 rounded-full blur-3xl pointer-events-none z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-88 h-72 sm:h-88 bg-[#F5B82E]/15 rounded-full blur-3xl pointer-events-none z-10" />
      </div>

      {isLoadingAdminBannerImage && <div
    role="status"
    aria-live="polite"
    className="absolute inset-0 z-40 flex items-center bg-[#180E08] px-5 sm:px-8 lg:px-12"
  >
          <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 items-center gap-8 md:grid-cols-2 animate-pulse">
            <div className="space-y-5">
              <div className="h-7 w-40 rounded-full bg-white/15" />
              <div className="space-y-3">
                <div className="h-10 w-4/5 rounded-lg bg-white/20 sm:h-14" />
                <div className="h-10 w-3/5 rounded-lg bg-white/15 sm:h-14" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full max-w-lg rounded bg-white/10" />
                <div className="h-4 w-4/5 max-w-md rounded bg-white/10" />
              </div>
              <div className="flex gap-3 pt-2">
                <div className="h-12 w-36 rounded-full bg-[#FF5A1F]/50" />
                <div className="h-12 w-36 rounded-full border border-white/20 bg-white/10" />
              </div>
              <span className="sr-only">
                {isFetchingBanners ? "Loading homepage..." : "Loading banner..."}
              </span>
            </div>
            <div className="hidden aspect-[4/3] w-full rounded-3xl bg-white/10 md:block" />
          </div>
        </div>}

      {
    /* 3. Main Hero Content Container (Fitted directly into the screen) */
  }
      <div className="relative z-20 max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 lg:py-6 flex-1 flex flex-col justify-between">
        
        {
    /* Top Badges Row */
  }
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="inline-flex items-center gap-2 bg-[#E51B23]/20 border border-[#E51B23]/50 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-black tracking-wider text-[#FFA275] uppercase backdrop-blur-md shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5A1F]" />
            <span>{bannerBadge}</span>
          </div>

          {bannerFloating2 && <div className="hidden sm:flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-[11px]">{bannerFloating2}</span>
            </div>}
        </div>

        {
    /* Center: Dynamic Typography & CTAs */
  }
        <div className="max-w-3xl my-auto py-2 sm:py-4">
          
          {
    /* Main Headline */
  }
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight mb-3 font-['Outfit'] drop-shadow-md">
            {currentBanner.title.replace(currentBanner.highlightWord || "", "").replace(currentBanner.accentWord || "", "")}{" "}
            {currentBanner.highlightWord && <span className="text-[#FF5A1F] underline decoration-[#F5B82E] decoration-wavy decoration-from-font">
                {currentBanner.highlightWord}
              </span>}{" "}
            {currentBanner.accentWord && <span className="text-[#F5B82E] inline-block">{currentBanner.accentWord}</span>}
          </h1>

          {
    /* Subtitle */
  }
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-[#F5EDE2]/90 font-medium leading-relaxed max-w-xl mb-4 line-clamp-2 sm:line-clamp-3">
            {bannerSubtitle}
          </p>

          {
    /* Value Pills */
  }
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
            <div className="inline-flex items-center gap-1.5 bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 backdrop-blur-md px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold text-[#FFA87A]">
              <Flame className="w-3.5 h-3.5 text-[#FF5A1F] fill-current" />
              <span>{bannerFloating1}</span>
            </div>
            {bannerPrice && <div className="inline-flex items-center gap-1 bg-[#F5B82E]/15 border border-[#F5B82E]/35 backdrop-blur-md px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold text-[#F5B82E]">
                <span>{bannerPrice}</span>
              </div>}
            <div className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              <span>100% Halal Angus</span>
            </div>
          </div>

          {
    /* Primary Action Buttons */
  }
          <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
            <button
    id="hero-order-now-btn"
    title={currentBanner.ctaText || "Order Now"}
    onClick={() => followBannerLink(currentBanner.buttonLink, onOrderNow)}
    className="bg-gradient-to-r from-[#E51B23] via-[#F02A18] to-[#FF5A1F] hover:from-[#C9131A] hover:to-[#E51B23] text-white font-black text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-full shadow-[0_8px_25px_rgba(229,27,35,0.45)] hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B82E]"
  >
              <span>{currentBanner.ctaText || "Order Now"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
    id="hero-explore-menu-btn"
    title={bannerSecondaryCta}
    onClick={() => followBannerLink(currentBanner.secondaryButtonLink, onExploreMenu)}
    className="bg-white/10 hover:bg-white/20 border border-white/25 hover:border-[#F5B82E]/60 text-white font-bold text-xs sm:text-sm px-5 sm:px-6 py-3 sm:py-3.5 rounded-full backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B82E]"
  >
              {bannerSecondaryCta}
            </button>
          </div>

          {
    /* Micro Trust Indicator */
  }
          <div className="flex items-center gap-2 mt-4 text-[11px] sm:text-xs text-white/80">
            <div className="flex items-center text-[#F5B82E]">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
            </div>
            <span className="font-extrabold text-white">4.9 / 5.0</span>
            <span className="text-white/40">•</span>
            <span className="text-white/70">Over 15,000+ Smashed Burgers Served</span>
          </div>
        </div>

        {
    /* Bottom Bar: Slide Pills & Interactive Carousel Controls */
  }
        {displayedBanners.length > 1 && <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {
    /* Quick Slide Selector Tabs */
  }
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {displayedBanners.map((b, idx) => {
    const isActive = idx === currentIndex;
    return <button
      key={b.id || idx}
      title={`Show banner ${idx + 1}: ${b.title}`}
      onClick={() => handleSelectBanner(idx)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-left transition-all duration-300 shrink-0 cursor-pointer border ${isActive ? "bg-[#E51B23]/25 border-[#FF5A1F] text-white shadow-sm" : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:bg-black/50"}`}
    >
                    <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${isActive ? "bg-[#FF5A1F] text-white" : "bg-white/10 text-white/60"}`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold whitespace-nowrap">
                      {b.floatingBadge1 || `Banner #${idx + 1}`}
                    </span>
                  </button>;
  })}
            </div>

            {
    /* Carousel Progress & Navigation Arrows */
  }
            <div className="flex items-center justify-end gap-3 shrink-0">
              {
    /* Countdown Progress Bar */
  }
              <div className="hidden md:flex items-center gap-2 text-[10px] text-white/60 font-mono">
                <span>0{currentIndex + 1}</span>
                <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
    className="h-full bg-gradient-to-r from-[#FF5A1F] to-[#F5B82E] transition-all duration-75 ease-linear"
    style={{ width: `${progress}%` }}
  />
                </div>
                <span>0{displayedBanners.length}</span>
              </div>

              {
    /* Prev / Next Arrows */
  }
              <div className="flex items-center gap-1.5">
                <button
    type="button"
    onClick={handlePrev}
    title="Previous banner"
    className="w-8 h-8 rounded-full bg-black/40 hover:bg-[#E51B23] border border-white/20 hover:border-[#E51B23] text-white flex items-center justify-center transition-all cursor-pointer"
    aria-label="Previous banner"
  >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
    type="button"
    onClick={handleNext}
    title="Next banner"
    className="w-8 h-8 rounded-full bg-black/40 hover:bg-[#E51B23] border border-white/20 hover:border-[#E51B23] text-white flex items-center justify-center transition-all cursor-pointer"
    aria-label="Next banner"
  >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>}
      </div>
    </section>;
};
export {
  Hero
};
