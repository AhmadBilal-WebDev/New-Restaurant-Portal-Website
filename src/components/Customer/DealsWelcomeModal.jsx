"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import {
  getPublicDealBranchName,
  getPublicRestaurantDeals,
  restaurantDealApiMessage
} from "@/shared/lib/restaurantDealsApi";
import { getPublicFrontendDomainUrl } from "@/shared/lib/catalogApi";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  X
} from "lucide-react";

function dealDiscountPct(deal) {
  if (typeof deal.discountPercent === "number" && deal.discountPercent > 0) {
    return Math.round(deal.discountPercent);
  }
  if (deal.originalPrice > 0 && deal.dealPrice >= 0) {
    return Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100);
  }
  return 0;
}

function isPublicDealVisible(deal) {
  return deal && deal.isActive !== false && Boolean(deal.name);
}

const DealsWelcomeModal = ({
  isOpen,
  onClose,
  branch,
  branchName,
  onClaimDeal,
  onBrowseAll
}) => {
  const { formatPrice } = useRestaurant();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef(null);

  const branchCandidates = useMemo(() => {
    const values = [
      typeof branchName === "string" ? branchName : "",
      getPublicDealBranchName(branch),
      branch?.name,
      branch?.city,
      branch?.shortName,
      branch?.area
    ];
    const unique = [];
    for (const value of values) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) continue;
      if (!unique.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
        unique.push(trimmed);
      }
    }
    return unique;
  }, [branchName, branch]);

  const scrollToIndex = (index) => {
    const scroller = scrollerRef.current;
    if (!scroller || !deals.length) return;
    const next = Math.max(0, Math.min(index, deals.length - 1));
    setActiveIndex(next);
    const width = scroller.clientWidth || 1;
    scroller.scrollTo({ left: next * width, behavior: "smooth" });
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || branchCandidates.length === 0) {
      setDeals([]);
      setLoading(false);
      setErrorMessage("");
      setActiveIndex(0);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMessage("");
    setActiveIndex(0);

    void (async () => {
      const domain = getPublicFrontendDomainUrl();
      let lastError = "";

      for (const candidate of branchCandidates) {
        if (cancelled) return;
        const result = await getPublicRestaurantDeals(domain, candidate);
        if (cancelled) return;

        const message = restaurantDealApiMessage(
          result.data,
          "Deals are temporarily unavailable."
        );
        const branchNotFound = !result.ok && /branch name not found/i.test(message || "");

        if (!result.ok && branchNotFound) {
          lastError = message;
          continue;
        }

        if (!result.ok) {
          setDeals([]);
          setErrorMessage(message);
          setLoading(false);
          return;
        }

        const mapped = (result.deals || [])
          .filter(isPublicDealVisible)
          .sort((first, second) => (first.displayOrder || 0) - (second.displayOrder || 0));

        setDeals(mapped);
        setErrorMessage("");
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setDeals([]);
      setErrorMessage(lastError || "No deals found for this branch.");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, branchCandidates]);

  useEffect(() => {
    if (!isOpen) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: 0, behavior: "auto" });
  }, [isOpen, deals]);

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || !deals.length) return;
    const width = scroller.clientWidth || 1;
    const index = Math.round(scroller.scrollLeft / width);
    if (index !== activeIndex && index >= 0 && index < deals.length) {
      setActiveIndex(index);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        aria-label="Close deals modal"
        className="fixed inset-0 bg-black/75"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Deals"
        className="relative z-10 w-[min(92vw,85vh,440px)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-1.5 -top-1.5 z-30 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-[#1B4FBF] text-white shadow-lg transition-transform hover:scale-105 sm:h-9 sm:w-9"
          aria-label="Close"
          title="Close"
        >
          <X className="h-4 w-4 stroke-[3]" />
        </button>

        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#111] shadow-2xl sm:rounded-[20px]">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/70">
              <Loader2 className="h-7 w-7 animate-spin text-[#E51B23]" />
              <p className="text-sm font-semibold">Loading deals…</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#1a1a1a] px-6 text-center">
              <Sparkles className="h-8 w-8 text-[#E51B23]" />
              <p className="font-['Outfit'] text-lg font-black text-white">No deals right now</p>
              <p className="text-xs text-white/60">
                {errorMessage || "Explore the menu for this branch instead."}
              </p>
              <button
                type="button"
                onClick={() => {
                  onBrowseAll?.();
                  onClose();
                }}
                className="mt-2 cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#191919]"
              >
                Browse menu
              </button>
            </div>
          ) : (
            <>
              <div
                ref={scrollerRef}
                onScroll={handleScroll}
                className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {deals.map((deal) => {
                  const pct = dealDiscountPct(deal);
                  return (
                    <article
                      key={deal.id}
                      className="relative h-full w-full min-w-full shrink-0 snap-center snap-always"
                    >
                      {deal.image ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClaimDeal?.(deal);
                            onClose();
                          }}
                          className="absolute inset-0 block h-full w-full cursor-pointer"
                          aria-label={`Claim ${deal.name}`}
                        >
                          <img
                            src={deal.image}
                            alt={deal.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#E51B23] via-[#C94312] to-[#FFB347]" />
                      )}

                      {/* Soft bottom strip only — keeps poster clean like promo creatives */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pt-16">
                        <div className="pointer-events-auto flex items-end justify-between gap-3 p-3.5 sm:p-4">
                          <div className="min-w-0">
                            {!deal.image ? (
                              <h3 className="line-clamp-2 font-['Outfit'] text-lg font-black text-white">
                                {deal.name}
                              </h3>
                            ) : null}
                            <div className="flex items-baseline gap-2">
                              <span className="font-['Outfit'] text-lg font-black text-white sm:text-xl">
                                {formatPrice(deal.dealPrice)}
                              </span>
                              {deal.originalPrice > deal.dealPrice ? (
                                <span className="text-[11px] font-bold text-white/55 line-through">
                                  {formatPrice(deal.originalPrice)}
                                </span>
                              ) : null}
                              {(deal.discountLabel || pct > 0) && (
                                <span className="rounded bg-[#E51B23] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                                  {deal.discountLabel || `${pct}% OFF`}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClaimDeal?.(deal);
                              onClose();
                            }}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-[#E51B23] px-3.5 py-2 text-[11px] font-extrabold text-white shadow-md transition-transform hover:scale-105 sm:px-4 sm:text-xs"
                          >
                            Claim
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {deals.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollToIndex(activeIndex - 1)}
                    disabled={activeIndex <= 0}
                    className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#191919] shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-0"
                    aria-label="Previous deal"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToIndex(activeIndex + 1)}
                    disabled={activeIndex >= deals.length - 1}
                    className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#191919] shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-0"
                    aria-label="Next deal"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <div className="absolute left-0 right-0 top-3 z-20 flex justify-center gap-1.5">
                    {deals.map((deal, index) => (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => scrollToIndex(index)}
                        aria-label={`Deal ${index + 1}`}
                        className={`h-1.5 cursor-pointer rounded-full transition-all ${
                          index === activeIndex
                            ? "w-5 bg-white"
                            : "w-1.5 bg-white/50 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export { DealsWelcomeModal };
