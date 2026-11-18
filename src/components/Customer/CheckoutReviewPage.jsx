'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Loader2,
  MapPin,
  ShoppingBag,
  UserRound
} from "lucide-react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { CustomerAuthModal } from "@/components/Customer/CustomerAuthModal";
import { getPublicFrontendDomainUrl } from "@/shared/lib/catalogApi";
import {
  clearCheckoutSession,
  readCheckoutSession,
  writeCheckoutSession
} from "@/shared/lib/checkoutSession";
import { buildCheckoutPayload, checkoutUserCart, clearUserCart } from "@/shared/lib/userCartApi";
import { readLocationSession } from "@/shared/lib/publicBranchesApi";
import {
  clearGuestCart,
  clearGuestOrderStorage,
  readCheckoutDraft,
  writeGuestCart
} from "@/shared/lib/guestCartStorage";
import { reverseGeocodeLatLng } from "@/shared/lib/reverseGeocode";
import {
  buildPlaceOrderPayload,
  placeUserOrder
} from "@/shared/lib/userOrdersApi";

function money(formatPrice, value) {
  if (typeof formatPrice === "function") return formatPrice(Number(value) || 0);
  return `Rs ${Number(value) || 0}`;
}

function CheckoutReviewPage() {
  const router = useRouter();
  const { customerUser, formatPrice, addToast, config } = useRestaurant();
  const [session, setSession] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState("login");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    const saved = readCheckoutSession();
    setSession(saved);
    setHydrated(true);
  }, []);

  const response = session?.response || null;
  const requestPayload = session?.requestPayload || null;

  const customer = response?.customer || null;
  const branch = response?.branch || response?.checkout?.branch || null;
  const fulfillment = response?.fulfillment || response?.checkout?.fulfillment || null;
  const priceSummary =
    response?.priceSummary || response?.checkout?.priceSummary || null;
  const items = useMemo(() => {
    if (Array.isArray(response?.checkoutItems) && response.checkoutItems.length) {
      return response.checkoutItems;
    }
    if (Array.isArray(response?.items) && response.items.length) return response.items;
    if (Array.isArray(response?.checkout?.items)) return response.checkout.items;
    if (Array.isArray(session?.fallbackItems)) return session.fallbackItems;
    return [];
  }, [response, session?.fallbackItems]);

  const locationCoords = useMemo(() => {
    const lat =
      fulfillment?.customerLocation?.latitude || requestPayload?.latitude || "";
    const lng =
      fulfillment?.customerLocation?.longitude || requestPayload?.longitude || "";
    return {
      lat: String(lat || "").trim(),
      lng: String(lng || "").trim()
    };
  }, [fulfillment, requestPayload]);

  useEffect(() => {
    let cancelled = false;
    async function resolveAddress() {
      if (!locationCoords.lat || !locationCoords.lng) {
        setResolvedAddress("");
        return;
      }
      setIsResolvingAddress(true);
      const geo = await reverseGeocodeLatLng(locationCoords.lat, locationCoords.lng);
      if (cancelled) return;
      if (geo.ok && geo.result) {
        setResolvedAddress(geo.result.name || geo.result.shortName || "");
      } else {
        setResolvedAddress("");
      }
      setIsResolvingAddress(false);
    }
    void resolveAddress();
    return () => {
      cancelled = true;
    };
  }, [locationCoords.lat, locationCoords.lng]);

  const locationLabel = useMemo(() => {
    const fallbackArea = fulfillment?.selectedArea || requestPayload?.selectedArea || "";
    const address =
      fulfillment?.deliveryAddress || requestPayload?.deliveryAddress || "";
    const branchName = branch?.name || requestPayload?.branchName || "";
    // Prefer reverse-geocoded address; avoid showing branch city as "your location".
    const area =
      resolvedAddress ||
      (fallbackArea && fallbackArea !== branchName ? fallbackArea : "") ||
      address ||
      "";
    return {
      area,
      address: address && address !== area ? address : "",
      coords:
        locationCoords.lat && locationCoords.lng
          ? `${locationCoords.lat}, ${locationCoords.lng}`
          : ""
    };
  }, [
    fulfillment,
    requestPayload,
    resolvedAddress,
    branch?.name,
    locationCoords.lat,
    locationCoords.lng
  ]);

  const refreshCheckoutAfterAuth = useCallback(async () => {
    const basePayload =
      requestPayload ||
      buildCheckoutPayload({
        frontendDomainUrl: getPublicFrontendDomainUrl(),
        ...(readLocationSession() || {})
      });

    const draft = readCheckoutDraft() || {};
    const location = readLocationSession() || {};
    const payload = buildCheckoutPayload({
      ...basePayload,
      frontendDomainUrl: getPublicFrontendDomainUrl(),
      branchId: basePayload.branchId || location.branchId || "",
      branchName: basePayload.branchName || location.branchName || "",
      orderMode: basePayload.orderMode || location.orderMode || "delivery",
      selectedArea:
        basePayload.selectedArea || location.selectedArea || location.branchName || "",
      latitude: basePayload.latitude || location.latitude || "",
      longitude: basePayload.longitude || location.longitude || "",
      deliveryAddress:
        basePayload.deliveryAddress ||
        draft.address ||
        location.selectedArea ||
        "",
      deliveryFee: Number(basePayload.deliveryFee) || 0,
      notes: basePayload.notes || draft.deliveryNotes || "",
      paymentMethod: basePayload.paymentMethod || draft.paymentMethod || "cod",
      customerName: customerUser?.name || draft.fullName || basePayload.customerName || "",
      customerContact:
        customerUser?.phone ||
        customerUser?.contactNumber ||
        draft.phone ||
        basePayload.customerContact ||
        ""
    });

    setIsRefreshing(true);
    try {
      const result = await checkoutUserCart(payload);
      if (!result.ok && result.success !== true) {
        addToast(
          "Checkout refresh failed",
          result.message || "Could not refresh checkout after login.",
          "error"
        );
        return;
      }
      const next = {
        ...(session || {}),
        requestPayload: payload,
        response: result.data,
        updatedAt: new Date().toISOString(),
        readyForPlaceOrder: true
      };
      const enriched = {
        ...next,
        response: {
          ...(result.data || {}),
          checkoutItems: result.checkoutItems,
          success: result.success,
          checkoutAllowed: result.checkoutAllowed,
          nextStep: result.nextStep,
          nextApi: result.nextApi
        }
      };
      writeCheckoutSession(enriched);
      setSession(enriched);
      addToast(
        "Ready to place order",
        "Your account details are loaded. You can place the order next.",
        "success"
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [addToast, customerUser, requestPayload, session]);

  const handleAuthSuccess = async () => {
    setIsAuthOpen(false);
    await refreshCheckoutAfterAuth();
  };

  const finishPlacedOrder = async (result) => {
    const order = result.order || result.data?.order || result.data || null;
    setPlacedOrder(order);
    clearCheckoutSession();
    clearGuestOrderStorage();
    writeGuestCart([]);
    clearGuestCart();
    try {
      await clearUserCart(getPublicFrontendDomainUrl());
    } catch {
      // Non-blocking — order already placed.
    }
    addToast(
      "Order placed",
      result.message ||
        `Order ${order?.orderNumber || order?.orderId || order?.id || ""} confirmed.`,
      "success"
    );
  };

  const handlePlaceOrderClick = async () => {
    if (!customerUser) {
      setAuthIntent("login");
      setIsAuthOpen(true);
      addToast("Login required", "Sign in to place your order.", "info");
      return;
    }
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    try {
      const checkoutBody = buildPlaceOrderPayload({
        checkoutResponse: response,
        requestPayload,
        items,
        useCheckout: true,
        frontendDomainUrl: getPublicFrontendDomainUrl()
      });

      let result = await placeUserOrder(checkoutBody, getPublicFrontendDomainUrl());

      // If prepared-checkout path fails, retry with full items payload.
      if (!result.ok && checkoutBody.useCheckout === true) {
        const fullBody = buildPlaceOrderPayload({
          checkoutResponse: response,
          requestPayload,
          items,
          useCheckout: false,
          frontendDomainUrl: getPublicFrontendDomainUrl()
        });
        result = await placeUserOrder(fullBody, getPublicFrontendDomainUrl());
      }

      if (!result.ok) {
        addToast("Order failed", result.message || "Could not place order.", "error");
        return;
      }
      await finishPlacedOrder(result);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF9EF] text-sm font-semibold text-neutral-600">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#E51B23]" />
        Loading checkout...
      </div>
    );
  }

  if (placedOrder) {
    const orderNo =
      placedOrder.orderNumber || placedOrder.orderId || placedOrder.id || "—";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFF9EF] px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="font-['Outfit'] text-2xl font-black text-[#191919]">Order placed!</h1>
        <p className="max-w-md text-sm text-[#777]">
          Your order <strong className="text-[#191919]">#{orderNo}</strong> is confirmed. You can
          track it from My Orders.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-[#E51B23] px-6 py-3 text-sm font-extrabold text-white"
          >
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  if (!session || !response) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFF9EF] px-4 text-center">
        <h1 className="font-['Outfit'] text-2xl font-black text-[#191919]">No checkout found</h1>
        <p className="max-w-md text-sm text-[#777]">
          Start from your cart and tap Proceed to Checkout to prepare this review.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full bg-[#E51B23] px-6 py-3 text-sm font-extrabold text-white"
        >
          Back to menu
        </button>
      </div>
    );
  }

  const orderMode = fulfillment?.orderMode || requestPayload?.orderMode || "delivery";
  const paymentMethod =
    fulfillment?.paymentMethod || requestPayload?.paymentMethod || "cod";
  const customerName =
    customer?.name || requestPayload?.customerName || customerUser?.name || "Guest";
  const customerPhone =
    customer?.contactNumber ||
    requestPayload?.customerContact ||
    customerUser?.phone ||
    "—";
  const customerEmail = customer?.email || customerUser?.email || "—";

  return (
    <div className="min-h-screen bg-[#FFF9EF] text-[#191919]">
      <header className="sticky top-0 z-20 border-b border-[#EEE7DC] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-full border border-[#E9E2D8] bg-white px-3 py-2 text-xs font-bold text-[#555]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#E51B23]">
              {response?.merchant?.name || config?.name || "Restaurant"}
            </p>
            <h1 className="font-['Outfit'] text-lg font-black sm:text-xl">Checkout review</h1>
          </div>
          <div className="w-[72px]" />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-[#EEE7DC] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#E51B23]" />
              <h2 className="text-sm font-black uppercase tracking-wider">Customer</h2>
            </div>
            {customerUser || customer?.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold text-[#777]">Name</p>
                  <p className="text-sm font-bold">{customerName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#777]">Phone</p>
                  <p className="text-sm font-bold">
                    {customer?.countryCode ? `${customer.countryCode} ` : ""}
                    {customerPhone}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold text-[#777]">Email</p>
                  <p className="text-sm font-bold">{customerEmail}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
                You are checking out as a guest. Sign in when you place the order to attach your
                account details.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#EEE7DC] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#E51B23]" />
              <h2 className="text-sm font-black uppercase tracking-wider">Location & fulfillment</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#FAF6F0] px-3 py-2.5">
                <p className="text-[11px] font-semibold text-[#777]">Order mode</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold capitalize">
                  {orderMode === "pickup" ? (
                    <ShoppingBag className="h-3.5 w-3.5" />
                  ) : (
                    <Bike className="h-3.5 w-3.5" />
                  )}
                  {orderMode}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FAF6F0] px-3 py-2.5">
                <p className="text-[11px] font-semibold text-[#777]">Payment</p>
                <p className="mt-1 text-sm font-bold uppercase">{paymentMethod}</p>
              </div>
              <div className="rounded-2xl bg-[#FAF6F0] px-3 py-2.5 sm:col-span-2">
                <p className="text-[11px] font-semibold text-[#777]">Branch</p>
                <p className="mt-1 text-sm font-bold">
                  {branch?.name || requestPayload?.branchName || "—"}
                </p>
                <p className="mt-0.5 text-xs text-[#777]">{branch?.address || ""}</p>
              </div>
              <div className="rounded-2xl bg-[#FAF6F0] px-3 py-2.5 sm:col-span-2">
                <p className="text-[11px] font-semibold text-[#777]">Your location</p>
                <p className="mt-1 text-sm font-bold leading-snug">
                  {isResolvingAddress
                    ? "Resolving address from map pin..."
                    : locationLabel.area || locationLabel.address || "—"}
                </p>
                {locationLabel.address && locationLabel.area !== locationLabel.address ? (
                  <p className="mt-0.5 text-xs text-[#777]">{locationLabel.address}</p>
                ) : null}
                {locationLabel.coords ? (
                  <p className="mt-1 font-mono text-[11px] text-[#777]">{locationLabel.coords}</p>
                ) : null}
                {fulfillment?.serviceCoverage?.message ? (
                  <p className="mt-2 text-[11px] font-bold text-emerald-700">
                    Coverage: {fulfillment.serviceCoverage.message}
                  </p>
                ) : null}
              </div>
              {fulfillment?.notes || requestPayload?.notes ? (
                <div className="rounded-2xl bg-[#FAF6F0] px-3 py-2.5 sm:col-span-2">
                  <p className="text-[11px] font-semibold text-[#777]">Notes</p>
                  <p className="mt-1 text-sm font-medium">
                    {fulfillment?.notes || requestPayload?.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[#EEE7DC] bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider">Order items</h2>
            <div className="space-y-3">
              {items.length ? (
                items.map((item, index) => (
                  <div
                    key={`${item.productId || item.name}-${index}`}
                    className="flex gap-3 rounded-2xl border border-[#F0EBE3] bg-[#FFFCF7] p-3"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || "Item"}
                        className="h-16 w-16 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F7F1E7] text-[#E51B23]">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.name}</p>
                      <p className="text-[11px] text-[#777]">
                        Qty {item.quantity || 1}
                        {item.variant?.name ? ` · ${item.variant.name}` : ""}
                      </p>
                      {(item.addons || []).length ? (
                        <p className="mt-0.5 text-[11px] text-[#E51B23]">
                          + {(item.addons || []).map((a) => a.name).filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm font-black text-[#191919]">
                      {money(formatPrice, item.lineTotal ?? item.totalPrice ?? item.unitPrice)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#777]">No items in checkout response yet.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-[#EEE7DC] bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider">Price summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#555]">
                <span>Items ({priceSummary?.itemsCount || items.length || 0})</span>
                <span className="font-bold text-[#191919]">
                  {money(formatPrice, priceSummary?.itemsSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#555]">
                <span>Tax</span>
                <span className="font-bold text-[#191919]">
                  {money(formatPrice, priceSummary?.taxTotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#555]">
                <span>Delivery fee</span>
                <span className="font-bold text-[#191919]">
                  {Number(priceSummary?.deliveryFee) === 0
                    ? "FREE"
                    : money(formatPrice, priceSummary?.deliveryFee)}
                </span>
              </div>
              {Number(priceSummary?.discountTotal) > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-bold">
                    -{money(formatPrice, priceSummary?.discountTotal)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-[#EEE7DC] pt-3 font-['Outfit'] text-base font-black">
                <span>Grand total</span>
                <span className="text-[#E51B23]">
                  {money(
                    formatPrice,
                    priceSummary?.grandTotal ?? priceSummary?.breakdown?.payable
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handlePlaceOrderClick()}
              disabled={isRefreshing || isPlacingOrder}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#E51B23] px-5 py-3.5 text-sm font-extrabold text-white shadow-glow-red disabled:opacity-60"
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing order...
                </>
              ) : isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating checkout...
                </>
              ) : customerUser ? (
                "Place order"
              ) : (
                "Login & place order"
              )}
            </button>

            {response?.checkoutAllowed || response?.checkout?.isReady ? (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Checkout prepared
                {response?.nextStep ? ` · next: ${response.nextStep}` : ""}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              clearCheckoutSession();
              router.push("/");
            }}
            className="w-full rounded-full border border-[#E9E2D8] bg-white px-4 py-2.5 text-xs font-bold text-[#555]"
          >
            Cancel & return to menu
          </button>
        </aside>
      </main>

      <CustomerAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authIntent}
        onAuthSuccess={handleAuthSuccess}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export { CheckoutReviewPage };
