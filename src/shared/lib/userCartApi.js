import { getPublicFrontendDomainUrl } from "./catalogApi";
import { readCustomerToken } from "./customerAuthApi";

function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return null;
}

function textValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(row, keys, fallback = 0) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return fallback;
}

function apiMessage(data, fallback) {
  const record = asRecord(data);
  if (!record) return fallback;
  return textValue(record, ["message", "error", "msg"]) || fallback;
}

function extractCart(data) {
  const record = asRecord(data);
  if (!record) return null;
  if (asRecord(record.cart)) return asRecord(record.cart);
  if (asRecord(record.data)) {
    const nested = asRecord(record.data);
    if (asRecord(nested.cart)) return asRecord(nested.cart);
    if (Array.isArray(nested.items)) return nested;
  }
  if (Array.isArray(record.items)) return record;
  return null;
}

function withQuery(path, frontendDomainUrl) {
  const query = new URLSearchParams();
  if (frontendDomainUrl) query.set("frontendDomainUrl", frontendDomainUrl);
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

async function cartFetch({
  path,
  method = "GET",
  body,
  frontendDomainUrl = getPublicFrontendDomainUrl(),
  includeDomainInQuery = true,
  requireAuth = true
} = {}) {
  const token = readCustomerToken();
  if (requireAuth && !token) {
    return {
      ok: false,
      status: 401,
      data: null,
      message: "Login required. Auth token missing.",
      cart: null,
      items: [],
      order: null
    };
  }

  const url = includeDomainInQuery ? withQuery(path, frontendDomainUrl) : path;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store"
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const record = asRecord(data) || {};
    const cart = extractCart(data);
    const ok = response.ok && record.success !== false;

    return {
      ok,
      status: response.status,
      data,
      message: apiMessage(
        data,
        response.ok ? "OK" : "Request failed."
      ),
      cart,
      items: mapServerCartToLocalItems(cart),
      order: asRecord(record.order) || asRecord(record.data?.order) || null
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      data: null,
      message: error instanceof Error ? error.message : "Network error",
      cart: null,
      items: [],
      order: null
    };
  }
}

/**
 * Resolve variant id from a product + selected size/name.
 */
function resolveVariantId(product, selectedBun) {
  const selected = asRecord(product?.selectedVariant);
  if (selected) {
    const id = textValue(selected, ["id", "variantId", "_id"]);
    if (id) return id;
  }
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (selectedBun) {
    const match = variants.find((row) => {
      const name = textValue(row, ["name", "size", "title"]);
      return name && name.toLowerCase() === String(selectedBun).toLowerCase();
    });
    if (match) {
      const id = textValue(match, ["id", "variantId", "_id"]);
      if (id) return id;
    }
  }
  if (variants[0]) {
    return textValue(variants[0], ["id", "variantId", "_id"]);
  }
  return "";
}

/**
 * Resolve a positive unit price from guest cart line (variant + addons aware).
 */
function resolveCartLineUnitPrice(item) {
  const product = asRecord(item?.product) || {};
  const selectedVariant =
    asRecord(product.selectedVariant) ||
    asRecord(item?.selectedVariant) ||
    null;

  const selectedBun =
    typeof item?.selectedBun === "string"
      ? item.selectedBun
      : typeof item?.selectedVariant === "string"
        ? item.selectedVariant
        : selectedVariant
          ? textValue(selectedVariant, ["name", "size", "title"])
          : "";

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const matchedVariant =
    selectedVariant ||
    (selectedBun
      ? variants.find((row) => {
          const name = textValue(row, ["name", "size", "title"]);
          return name && name.toLowerCase() === selectedBun.toLowerCase();
        })
      : null) ||
    variants[0] ||
    null;

  const storedUnit = numberValue(item, ["unitPrice"], 0);
  if (storedUnit > 0) return storedUnit;

  const storedTotal = numberValue(item, ["totalPrice"], 0);
  const qty = Math.max(1, numberValue(item, ["quantity"], 1));
  if (storedTotal > 0) return storedTotal / qty;

  const variantPrice = numberValue(matchedVariant, ["price", "sellingPrice"], 0);
  const productPrice = numberValue(product, ["price", "sellingPrice"], 0);
  const basePrice = variantPrice > 0 ? variantPrice : productPrice;

  const addons = Array.isArray(item?.selectedAddons) ? item.selectedAddons : [];
  const addonsPrice = addons.reduce((sum, addon) => {
    const row = asRecord(addon) || {};
    const price = numberValue(row, ["price", "unitPrice"], 0);
    const addonQty = Math.max(1, numberValue(row, ["quantity", "qty"], 1));
    return sum + price * addonQty;
  }, 0);

  return Math.max(0, basePrice + addonsPrice);
}

function resolveCartLineVariantId(item) {
  const product = asRecord(item?.product) || {};
  const fromItem = textValue(item, ["variantId"]);
  if (fromItem) return fromItem;

  const selectedBun =
    typeof item?.selectedBun === "string"
      ? item.selectedBun
      : typeof item?.selectedVariant === "string"
        ? item.selectedVariant
        : asRecord(item?.selectedVariant)
          ? textValue(item.selectedVariant, ["name", "size", "title"])
          : "";

  return (
    resolveVariantId(product, selectedBun) ||
    textValue(asRecord(product.selectedVariant), ["id", "variantId", "_id"])
  );
}

/**
 * Build sync payload from localStorage / in-memory guest cart.
 * Shape matches backend merge contract (unitPrice/totalPrice must be > 0 when possible).
 */
function buildCartSyncPayload({ cartItems = [], branchId = "", branchName = "" } = {}) {
  const items = (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => {
      const product = asRecord(item?.product) || {};
      const productId = textValue(product, ["id", "productId"]) || textValue(item, ["productId"]);
      if (!productId) return null;

      const selectedAddons = (Array.isArray(item.selectedAddons) ? item.selectedAddons : [])
        .map((addon) => {
          const row = asRecord(addon) || {};
          const id = textValue(row, ["id", "addonId", "_id"]);
          const name = textValue(row, ["name", "title"]);
          if (!id && !name) return null;
          return {
            id: id || name,
            name: name || id,
            quantity: Math.max(1, numberValue(row, ["quantity", "qty"], 1))
          };
        })
        .filter(Boolean);

      const quantity = Math.max(1, numberValue(item, ["quantity"], 1));
      const unitPrice = resolveCartLineUnitPrice(item);
      const totalFromItem = numberValue(item, ["totalPrice"], 0);
      const totalPrice = totalFromItem > 0 ? totalFromItem : unitPrice * quantity;
      const selectedBun =
        typeof item.selectedBun === "string"
          ? item.selectedBun
          : typeof item.selectedVariant === "string"
            ? item.selectedVariant
            : asRecord(item.selectedVariant)
              ? textValue(item.selectedVariant, ["name", "size", "title"])
              : asRecord(product.selectedVariant)
                ? textValue(product.selectedVariant, ["name", "size", "title"])
                : "";
      const variantId = resolveCartLineVariantId(item);

      const row = {
        cartItemId:
          textValue(item, ["cartItemId"]) ||
          `${productId}-${selectedBun || "default"}-${selectedAddons.map((a) => a.id).join("-") || "noaddons"}`,
        product: {
          id: productId,
          name: textValue(product, ["name", "title"]) || textValue(item, ["name"]),
          slug: textValue(product, ["slug"]),
          sku: textValue(product, ["sku"])
        },
        quantity,
        selectedBun,
        selectedAddons,
        specialInstructions: textValue(item, ["specialInstructions", "notes"]) || "",
        unitPrice,
        totalPrice
      };

      // Help backend price lookup when local unitPrice was missing/0.
      if (variantId) row.variantId = variantId;

      return row;
    })
    .filter(Boolean);

  return {
    branchId: String(branchId || "").trim(),
    branchName: String(branchName || "").trim(),
    items
  };
}

/**
 * Build POST /cart/items payload for authenticated add-to-cart.
 */
function buildAddCartItemPayload({
  product,
  quantity = 1,
  selectedBun,
  selectedAddons = [],
  specialInstructions = "",
  branchId = "",
  branchName = ""
} = {}) {
  const productId =
    textValue(product, ["id", "productId", "_id"]) ||
    textValue(asRecord(product?.product), ["id", "productId"]);
  const variantId =
    textValue(product, ["variantId"]) ||
    resolveVariantId(product, selectedBun);

  const addons = (Array.isArray(selectedAddons) ? selectedAddons : [])
    .map((addon) => {
      const row = asRecord(addon) || {};
      const addonId = textValue(row, ["addonId", "id", "_id"]);
      if (!addonId) return null;
      return {
        addonId,
        quantity: Math.max(1, numberValue(row, ["quantity", "qty"], 1))
      };
    })
    .filter(Boolean);

  const payload = {
    branchId: String(branchId || "").trim(),
    branchName: String(branchName || "").trim(),
    productId,
    quantity: Math.max(1, Number(quantity) || 1),
    notes: String(specialInstructions || "").trim()
  };

  if (variantId) payload.variantId = variantId;
  if (addons.length) payload.addons = addons;

  return payload;
}

/**
 * Map synced server cart into the storefront CartDrawer shape.
 */
function mapServerCartToLocalItems(cart) {
  const record = asRecord(cart);
  if (!record) return [];
  const list = Array.isArray(record.items) ? record.items : [];

  return list
    .map((raw, index) => {
      const item = asRecord(raw);
      if (!item) return null;
      const productId = textValue(item, ["productId", "id"]);
      if (!productId) return null;

      const variant = asRecord(item.variant) || {};
      const variantId =
        textValue(item, ["variantId"]) ||
        textValue(variant, ["variantId", "id", "_id"]);
      const variantName = textValue(variant, ["name", "size"]) || textValue(item, ["variantName"]);
      const addons = (Array.isArray(item.addons) ? item.addons : [])
        .map((addon, addonIndex) => {
          const row = asRecord(addon);
          if (!row) return null;
          const id = textValue(row, ["addonId", "id", "_id"]) || `addon-${addonIndex}`;
          const name = textValue(row, ["name", "title"]);
          if (!name) return null;
          return {
            id,
            name,
            price: numberValue(row, ["price", "unitPrice"], 0),
            quantity: Math.max(1, numberValue(row, ["quantity"], 1))
          };
        })
        .filter(Boolean);

      const quantity = Math.max(1, numberValue(item, ["quantity"], 1));
      const unitPrice = numberValue(item, ["unitPrice", "basePrice", "price"], 0);
      const totalPrice = numberValue(item, ["lineTotal", "totalPrice"], unitPrice * quantity);
      const lineId = textValue(item, ["id", "_id"]) || `${productId}-${index}`;

      return {
        cartItemId: lineId,
        product: {
          id: productId,
          name: textValue(item, ["name", "productName"]),
          image: textValue(item, ["image", "imageUrl", "photo"]),
          price: unitPrice,
          sku: textValue(item, ["sku"]),
          category: textValue(item, ["categoryId", "category"]),
          slug: textValue(item, ["slug"])
        },
        quantity,
        selectedBun: variantName || undefined,
        selectedCheese: undefined,
        selectedAddons: addons,
        specialInstructions: textValue(item, ["notes", "specialInstructions"]),
        unitPrice,
        totalPrice,
        variantId: variantId || undefined,
        serverLineId: lineId,
        serverCartSynced: true
      };
    })
    .filter(Boolean);
}

function mapPaymentMethod(method) {
  const value = String(method || "cash").trim().toLowerCase();
  if (value === "cash" || value === "cod" || value === "cash_on_delivery") return "cod";
  if (value === "card" || value === "card_on_delivery") return "card";
  return value || "cod";
}

/**
 * Build checkout payload for POST /api/restaurant/user/checkout
 */
function buildCheckoutPayload({
  frontendDomainUrl = getPublicFrontendDomainUrl(),
  branchId = "",
  branchName = "",
  latitude = "",
  longitude = "",
  orderMode = "delivery",
  selectedArea = "",
  deliveryAddress = "",
  paymentMethod = "cod",
  deliveryFee = 0,
  notes = "",
  customerName = "",
  customerContact = ""
} = {}) {
  return {
    branchId: String(branchId || "").trim(),
    branchName: String(branchName || "").trim(),
    orderMode: String(orderMode || "delivery").trim() || "delivery",
    paymentMethod: mapPaymentMethod(paymentMethod),
    selectedArea: String(selectedArea || "").trim(),
    latitude: String(latitude ?? "").trim(),
    longitude: String(longitude ?? "").trim(),
    deliveryAddress: String(deliveryAddress || "").trim(),
    deliveryFee: Number(deliveryFee) || 0,
    notes: String(notes || "").trim(),
    customerName: String(customerName || "").trim(),
    customerContact: String(customerContact || "").trim(),
    frontendDomainUrl: String(frontendDomainUrl || "").trim()
  };
}

async function syncUserCart(payload, frontendDomainUrl = getPublicFrontendDomainUrl()) {
  const result = await cartFetch({
    path: "/api/restaurant/user/cart/sync",
    method: "POST",
    body: payload || {},
    frontendDomainUrl
  });

  const record = asRecord(result.data) || {};
  return {
    ...result,
    mergedFromLocal: record.mergedFromLocal === true,
    clearLocalStorage: record.clearLocalStorage === true,
    addedOrMergedCount:
      typeof record.addedOrMergedCount === "number" ? record.addedOrMergedCount : 0,
    message: result.message || (result.ok ? "Cart synced." : "Cart sync failed.")
  };
}

async function getUserCart(frontendDomainUrl = getPublicFrontendDomainUrl()) {
  return cartFetch({
    path: "/api/restaurant/user/cart",
    method: "GET",
    frontendDomainUrl
  });
}

async function addUserCartItem(payload, frontendDomainUrl = getPublicFrontendDomainUrl()) {
  const result = await cartFetch({
    path: "/api/restaurant/user/cart/items",
    method: "POST",
    body: payload || {},
    frontendDomainUrl
  });
  if (result.ok && result.items.length) return result;
  if (result.ok) {
    const refreshed = await getUserCart(frontendDomainUrl);
    if (refreshed.ok) return { ...result, cart: refreshed.cart, items: refreshed.items };
  }
  return result;
}

function isMethodNotAllowed(result, method) {
  if (!result || result.ok) return false;
  if (result.status === 405) return true;
  const message = String(result.message || "");
  // Express often returns 404 HTML: "Cannot PATCH /path"
  return (
    result.status === 404 &&
    /cannot\s+(patch|put|post)/i.test(message) &&
    new RegExp(`cannot\\s+${method}`, "i").test(message)
  );
}

/**
 * Adjust logged-in cart line quantity via action API:
 * body: { action: "increase" | "decrease" }
 * Backend does not support PATCH — use PUT (fallback POST).
 */
async function adjustUserCartItemQuantity(
  itemId,
  action,
  frontendDomainUrl = getPublicFrontendDomainUrl()
) {
  const id = String(itemId || "").trim();
  const normalizedAction = String(action || "").trim().toLowerCase();
  if (!id) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "Cart item id is required.",
      cart: null,
      items: [],
      order: null
    };
  }
  if (normalizedAction !== "increase" && normalizedAction !== "decrease") {
    return {
      ok: false,
      status: 400,
      data: null,
      message: 'Action must be "increase" or "decrease".',
      cart: null,
      items: [],
      order: null
    };
  }

  const body = { action: normalizedAction };
  const path = `/api/restaurant/user/cart/items/${encodeURIComponent(id)}`;

  let result = await cartFetch({
    path,
    method: "PUT",
    body,
    frontendDomainUrl
  });

  if (isMethodNotAllowed(result, "PUT")) {
    result = await cartFetch({
      path,
      method: "POST",
      body,
      frontendDomainUrl
    });
  }

  if (result.ok && result.items.length) return result;
  if (result.ok) {
    const refreshed = await getUserCart(frontendDomainUrl);
    if (refreshed.ok) return { ...result, cart: refreshed.cart, items: refreshed.items };
  }
  return result;
}

async function updateUserCartItemQuantity(itemId, action, frontendDomainUrl) {
  return adjustUserCartItemQuantity(itemId, action, frontendDomainUrl);
}

async function removeUserCartItem(itemId, frontendDomainUrl = getPublicFrontendDomainUrl()) {
  const id = String(itemId || "").trim();
  if (!id) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "Cart item id is required.",
      cart: null,
      items: [],
      order: null
    };
  }

  const result = await cartFetch({
    path: `/api/restaurant/user/cart/items/${encodeURIComponent(id)}`,
    method: "DELETE",
    frontendDomainUrl
  });
  if (result.ok && (result.items.length || result.cart)) return result;
  if (result.ok) {
    const refreshed = await getUserCart(frontendDomainUrl);
    if (refreshed.ok) return { ...result, cart: refreshed.cart, items: refreshed.items };
  }
  return result;
}

async function clearUserCart(frontendDomainUrl = getPublicFrontendDomainUrl()) {
  const result = await cartFetch({
    path: "/api/restaurant/user/cart",
    method: "DELETE",
    frontendDomainUrl,
    requireAuth: true
  });
  // Clear-all success always empties local cart UI.
  if (result.ok) {
    return { ...result, cart: result.cart || { items: [] }, items: [] };
  }
  return result;
}

async function checkoutUserCart(payload) {
  const body = buildCheckoutPayload(payload || {});
  // Auth optional: guest checkout returns empty customer; login fills details.
  const result = await cartFetch({
    path: "/api/restaurant/user/checkout",
    method: "POST",
    body,
    frontendDomainUrl: body.frontendDomainUrl,
    includeDomainInQuery: true,
    requireAuth: false
  });

  const record = asRecord(result.data) || {};
  return {
    ...result,
    success: record.success === true || result.ok,
    checkoutAllowed: record.checkoutAllowed === true,
    nextStep: textValue(record, ["nextStep"]) || "",
    nextApi: textValue(record, ["nextApi"]) || "",
    merchant: asRecord(record.merchant),
    customer: asRecord(record.customer),
    branch: asRecord(record.branch),
    fulfillment: asRecord(record.fulfillment),
    priceSummary: asRecord(record.priceSummary),
    checkout: asRecord(record.checkout),
    placeOrderPayload: asRecord(record.placeOrderPayload),
    checkoutItems: Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.checkout?.items)
        ? record.checkout.items
        : []
  };
}

export {
  addUserCartItem,
  adjustUserCartItemQuantity,
  buildAddCartItemPayload,
  buildCartSyncPayload,
  buildCheckoutPayload,
  checkoutUserCart,
  clearUserCart,
  getUserCart,
  mapServerCartToLocalItems,
  removeUserCartItem,
  resolveCartLineUnitPrice,
  resolveVariantId,
  syncUserCart,
  updateUserCartItemQuantity
};
