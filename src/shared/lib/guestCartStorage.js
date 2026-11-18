const CART_KEY = "bite_guest_cart";
const CHECKOUT_DRAFT_KEY = "bite_checkout_draft";
const PENDING_CHECKOUT_KEY = "bite_pending_checkout";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode failures.
  }
}

function removeKey(key) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function readGuestCart() {
  const value = readJson(CART_KEY, []);
  return Array.isArray(value) ? value : [];
}

function writeGuestCart(items) {
  writeJson(CART_KEY, Array.isArray(items) ? items : []);
}

function clearGuestCart() {
  removeKey(CART_KEY);
}

function readCheckoutDraft() {
  const value = readJson(CHECKOUT_DRAFT_KEY, null);
  return value && typeof value === "object" ? value : null;
}

function writeCheckoutDraft(draft) {
  writeJson(CHECKOUT_DRAFT_KEY, draft && typeof draft === "object" ? draft : {});
}

function clearCheckoutDraft() {
  removeKey(CHECKOUT_DRAFT_KEY);
}

function setPendingCheckout(pending = true) {
  if (!canUseStorage()) return;
  try {
    if (pending) window.localStorage.setItem(PENDING_CHECKOUT_KEY, "1");
    else window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    // Ignore.
  }
}

function hasPendingCheckout() {
  if (!canUseStorage()) return false;
  try {
    return window.localStorage.getItem(PENDING_CHECKOUT_KEY) === "1";
  } catch {
    return false;
  }
}

function clearPendingCheckout() {
  setPendingCheckout(false);
}

function clearGuestOrderStorage() {
  clearGuestCart();
  clearCheckoutDraft();
  clearPendingCheckout();
}

/**
 * Builds a stable payload from cart + checkout draft for the upcoming place-order API.
 * Keep this shape when the backend endpoint is wired.
 */
function buildGuestOrderPayload({
  cartItems = [],
  checkoutDraft = null,
  branch = null,
  branchSelection = null,
  customerUser = null
} = {}) {
  const draft = checkoutDraft || {};
  const items = (Array.isArray(cartItems) ? cartItems : []).map((item) => ({
    cartItemId: item.cartItemId,
    productId: item.product?.id || item.productId || "",
    name: item.product?.name || item.name || "",
    image: item.product?.image || item.image || "",
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || Number(item.product?.price) || 0,
    totalPrice: Number(item.totalPrice) || 0,
    selectedVariant: item.selectedBun || item.selectedVariant || null,
    selectedAddons: item.selectedAddons || [],
    specialInstructions: item.specialInstructions || ""
  }));

  const subtotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);

  return {
    items,
    subtotal,
    deliveryMethod: draft.deliveryMethod || branchSelection?.orderMode || "delivery",
    paymentMethod: draft.paymentMethod || "cash",
    tipPercentage: Number(draft.tipPercentage) || 0,
    customer: {
      name: customerUser?.name || draft.fullName || "",
      email: customerUser?.email || draft.email || "",
      phone: customerUser?.phone || draft.phone || ""
    },
    delivery: {
      address: draft.address || "",
      apartment: draft.apartment || "",
      city: draft.city || "",
      zipCode: draft.zipCode || "",
      notes: draft.deliveryNotes || "",
      selectedArea: branchSelection?.selectedArea || ""
    },
    branch: {
      id: branch?.id || branchSelection?.branchId || "",
      name: branch?.name || branchSelection?.branchName || "",
      latitude: branchSelection?.latitude || "",
      longitude: branchSelection?.longitude || ""
    },
    savedAt: new Date().toISOString()
  };
}

export {
  CART_KEY,
  CHECKOUT_DRAFT_KEY,
  PENDING_CHECKOUT_KEY,
  buildGuestOrderPayload,
  clearCheckoutDraft,
  clearGuestCart,
  clearGuestOrderStorage,
  clearPendingCheckout,
  hasPendingCheckout,
  readCheckoutDraft,
  readGuestCart,
  setPendingCheckout,
  writeCheckoutDraft,
  writeGuestCart
};
