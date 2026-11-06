import { useEffect, useMemo, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  getPublicDealBranchName,
  getPublicRestaurantDeals,
  restaurantDealApiMessage,
  restaurantDealTagLabel
} from '@/shared/lib/restaurantDealsApi';
import { getPublicFrontendDomainUrl } from '@/shared/lib/catalogApi';
import {
  CalendarDays,
  Check,
  ArrowRight,
  Loader2,
  MapPin,
  Sparkles,
  Tag
} from "lucide-react";

function dealBranches(deal) {
  if (Array.isArray(deal.branchNames) && deal.branchNames.length) return deal.branchNames;
  if (typeof deal.branchName === "string" && deal.branchName.trim()) {
    return deal.branchName
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function dealDiscountPct(deal) {
  if (typeof deal.discountPercent === "number" && deal.discountPercent > 0) {
    return Math.round(deal.discountPercent);
  }
  if (deal.originalPrice > 0 && deal.dealPrice >= 0) {
    return Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100);
  }
  return 0;
}

function formatDealDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/** Public API already scopes deals for the branch — keep only active ones. */
function isPublicDealVisible(deal) {
  return deal && deal.isActive !== false && Boolean(deal.name);
}

const DealsSection = ({
  branchName,
  branch,
  enabled,
  onClaimDeal
}) => {
  const { formatPrice } = useRestaurant();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [apiMeta, setApiMeta] = useState({
    count: null,
    branchLabel: "",
    message: ""
  });

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

  useEffect(() => {
    let cancelled = false;
    if (!enabled || branchCandidates.length === 0) {
      setDeals([]);
      setLoading(false);
      setErrorMessage("");
      setApiMeta({ count: null, branchLabel: "", message: "" });
      return;
    }

    const domain = getPublicFrontendDomainUrl();
    setLoading(true);
    setErrorMessage("");

    void (async () => {
      let lastError = "";
      let lastBranchTried = branchCandidates[0];

      for (const candidate of branchCandidates) {
        if (cancelled) return;
        lastBranchTried = candidate;
        const result = await getPublicRestaurantDeals(domain, candidate);
        if (cancelled) return;

        const message = restaurantDealApiMessage(
          result.data,
          "Deals are temporarily unavailable."
        );
        const branchNotFound =
          !result.ok &&
          /branch name not found/i.test(message || "") ;

        if (!result.ok && branchNotFound) {
          lastError = message;
          continue;
        }

        const branchMeta = result.branch;
        const branchLabel =
          branchMeta && typeof branchMeta === "object"
            ? branchMeta.name || branchMeta.branchCode || candidate
            : candidate;

        if (!result.ok) {
          setDeals([]);
          setErrorMessage(message);
          setApiMeta({ count: 0, branchLabel, message });
          setLoading(false);
          console.error(
            "Public deals could not be loaded:",
            `/api/restaurant/deals/public?domain=${domain}&branchName=${candidate}`,
            result.status,
            message
          );
          return;
        }

        const mapped = (result.deals || [])
          .filter(isPublicDealVisible)
          .sort((first, second) => (first.displayOrder || 0) - (second.displayOrder || 0));

        setDeals(mapped);
        setApiMeta({
          count: typeof result.count === "number" ? result.count : mapped.length,
          branchLabel,
          message: result.message || "Deals fetched successfully"
        });
        setErrorMessage("");
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setDeals([]);
      setErrorMessage(
        lastError ||
          `No restaurant branch matched “${lastBranchTried}”. Try Karachi or Lahore.`
      );
      setApiMeta({
        count: 0,
        branchLabel: lastBranchTried,
        message: lastError
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [branchCandidates, enabled]);

  return (
    <section
      id="deals-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-20"
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#E51B23] bg-[#E51B23]/10 px-3.5 py-1.5 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>Exclusive Weekly Offers</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#191919] tracking-tight font-['Outfit']">
          Sizzling Combo Deals
        </h2>
        <p className="text-sm sm:text-base text-[#777777] font-medium mt-2">
          Save more with exclusive restaurant offers and combo deals.
        </p>
        {branchCandidates[0] || apiMeta.branchLabel ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#777777]">
            <MapPin className="h-3.5 w-3.5 text-[#E51B23]" />
            Showing for {apiMeta.branchLabel || branchCandidates[0]}
            {typeof apiMeta.count === "number" ? ` · ${apiMeta.count} deal${apiMeta.count === 1 ? "" : "s"}` : ""}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center items-center gap-2 py-12 text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading deals...</span>
        </div>
      ) : deals.length === 0 ? (
        <p className="text-center py-8 text-sm text-[#777777]">
          {errorMessage || "No active deals available right now."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {deals.map((deal) => {
            const pct = dealDiscountPct(deal);
            const branches = dealBranches(deal);
            const startLabel = formatDealDate(deal.startDate);
            const endLabel = formatDealDate(deal.endDate);
            return (
              <article
                key={deal.id}
                className="group relative bg-white rounded-3xl sm:rounded-[32px] overflow-hidden border border-[#EEE7DC] shadow-soft-card hover:shadow-soft-card-hover hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#F7F1E7]">
                  {deal.image ? (
                    <img
                      src={deal.image}
                      alt={deal.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  {(deal.discountLabel || pct > 0) && (
                    <div className="absolute top-3.5 left-3.5 bg-[#E51B23] text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                      {deal.discountLabel || `${pct}% OFF`}
                    </div>
                  )}
                  {deal.showAllBranches ? (
                    <div className="absolute top-3.5 right-3.5 bg-white/95 text-[#191919] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
                      All branches
                    </div>
                  ) : null}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(deal.tags || []).map((tag, index) => {
                        const tagKey =
                          typeof tag === "string"
                            ? tag
                            : tag?.key || tag?.label || `tag-${index}`;
                        const emoji = typeof tag === "object" && tag?.emoji ? `${tag.emoji} ` : "";
                        return (
                          <span
                            key={tagKey}
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#E51B23] bg-[#E51B23]/10 px-2 py-1 rounded-full"
                          >
                            <Tag className="w-3 h-3" />
                            {emoji}
                            {restaurantDealTagLabel(tag)}
                          </span>
                        );
                      })}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-[#191919] font-['Outfit'] leading-snug mb-2">
                      {deal.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#777777] leading-relaxed mb-3">
                      {deal.shortDescription}
                    </p>

                    {(branches.length > 0 || startLabel || endLabel) && (
                      <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-bold text-[#777777]">
                        {branches.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF6F0] border border-[#EEE7DC] px-2.5 py-1">
                            <MapPin className="h-3 w-3 text-[#E51B23]" />
                            {deal.showAllBranches
                              ? `All · ${branches.join(", ")}`
                              : branches.join(", ")}
                          </span>
                        )}
                        {(startLabel || endLabel) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF6F0] border border-[#EEE7DC] px-2.5 py-1">
                            <CalendarDays className="h-3 w-3 text-[#E51B23]" />
                            {startLabel || "—"}
                            {endLabel ? ` → ${endLabel}` : ""}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 mb-4 bg-[#FFF9EF] p-3.5 rounded-2xl border border-[#E9E2D8]/70">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#191919] mb-1">
                        What&apos;s Included:
                      </div>
                      {(deal.items || []).map((item, index) => (
                        <div
                          key={`${item.id || item.name}-${index}`}
                          className="flex items-start gap-2 text-xs text-[#3A3A3A] font-medium"
                        >
                          <div className="mt-0.5 w-4 h-4 rounded-full bg-[#2E9B5B]/15 text-[#2E9B5B] flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>
                            {item.quantity} × {item.name}
                            {[
                              ...(item.sizes || []).map(
                                (option) => `Size qty: ${option.quantity}`
                              ),
                              ...(item.addons || []).map(
                                (option) => `Add-on qty: ${option.quantity}`
                              ),
                              ...(item.extras || []).map(
                                (option) => `Extra qty: ${option.quantity}`
                              )
                            ]
                              .map((detail) => ` · ${detail}`)
                              .join("")}
                          </span>
                        </div>
                      ))}
                    </div>

                    {deal.termsAndConditions ? (
                      <p className="text-[11px] text-[#777777] mb-4 leading-relaxed">
                        {deal.termsAndConditions}
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-4 border-t border-[#EEE7DC] flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#191919] font-['Outfit']">
                          {formatPrice(deal.dealPrice)}
                        </span>
                        {deal.originalPrice > deal.dealPrice && (
                          <span className="text-xs text-[#777777] line-through font-bold">
                            {formatPrice(deal.originalPrice)}
                          </span>
                        )}
                      </div>
                      {deal.originalPrice > deal.dealPrice ? (
                        <p className="mt-0.5 text-[10px] font-bold text-[#2E9B5B]">
                          You save {formatPrice(deal.originalPrice - deal.dealPrice)}
                          {pct > 0 ? ` (${deal.discountLabel || `${pct}% OFF`})` : ""}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      id={`claim-deal-btn-${deal.id}`}
                      onClick={() => onClaimDeal(deal)}
                      className="bg-[#E51B23] hover:bg-[#B90F16] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-glow-red hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Claim Deal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export { DealsSection };
