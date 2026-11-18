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

function withQuery(path, frontendDomainUrl) {
  const query = new URLSearchParams();
  if (frontendDomainUrl) query.set("frontendDomainUrl", frontendDomainUrl);
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

async function ordersFetch({
  path,
  method = "GET",
  body,
  frontendDomainUrl = getPublicFrontendDomainUrl(),
  requireAuth = true
} = {}) {
  const token = readCustomerToken();
  if (requireAuth && !token) {
    return {
      ok: false,
      status: 401,
      data: null,
      message: "Login required. Auth token missing.",
      orders: [],
      order: null
    };
  }

  try {
    const response = await fetch(withQuery(path, frontendDomainUrl), {
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
    const ok = response.ok && record.success !== false;
    return {
      ok,
      status: response.status,
      data,
      message: apiMessage(data, response.ok ? "OK" : "Request failed."),
      orders: extractOrders(data),
      order: extractOrder(data)
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      data: null,
      message: error instanceof Error ? error.message : "Network error",
      orders: [],
      order: null
    };
  }
}

function extractOrders(data) {
  const record = asRecord(data);
  if (!record) return [];
  if (Array.isArray(record.orders)) return record.orders.map(mapOrder).filter(Boolean);
  if (Array.isArray(record.data)) return record.data.map(mapOrder).filter(Boolean);
  if (Array.isArray(record.items) && record.items[0]?.orderId) {
    return record.items.map(mapOrder).filter(Boolean);
  }
  if (Array.isArray(data)) return data.map(mapOrder).filter(Boolean);
  const single = extractOrder(data);
  return single ? [single] : [];
}

function extractOrder(data) {
  const record = asRecord(data);
  if (!record) return null;
  if (asRecord(record.order)) return mapOrder(record.order);
  if (asRecord(record.data)) {
    const nested = asRecord(record.data);
    if (asRecord(nested.order)) return mapOrder(nested.order);
    if (textValue(nested, ["id", "_id", "orderId"])) return mapOrder(nested);
  }
  if (textValue(record, ["id", "_id", "orderId", "orderNumber"])) return mapOrder(record);
  return null;
}

function mapOrder(row) {
  const item = asRecord(row);
  if (!item) return null;
  const id = textValue(item, ["id", "_id", "orderId"]);
  const orderNumber = textValue(item, ["orderNumber", "orderId", "id", "_id"]) || id;
  if (!id && !orderNumber) return null;

  const items = (Array.isArray(item.items) ? item.items : []).map((raw, index) => {
    const line = asRecord(raw) || {};
    const name = textValue(line, ["name", "productName"]) || `Item ${index + 1}`;
    const quantity = Math.max(1, numberValue(line, ["quantity"], 1));
    const price = numberValue(line, ["unitPrice", "price", "lineTotal"], 0);
    return {
      name,
      quantity,
      price,
      productId: textValue(line, ["productId", "id"]),
      variant: asRecord(line.variant),
      addons: Array.isArray(line.addons) ? line.addons : [],
      lineTotal: numberValue(line, ["lineTotal", "totalPrice"], price * quantity)
    };
  });

  return {
    id: id || orderNumber,
    orderId: id || orderNumber,
    orderNumber,
    status: textValue(item, ["status", "orderStatus"]) || "received",
    createdAt:
      textValue(item, ["createdAt", "placedAt", "updatedAt"]) || new Date().toISOString(),
    total: numberValue(item, ["grandTotal", "total", "checkoutGrandTotal"], 0),
    grandTotal: numberValue(item, ["grandTotal", "total"], 0),
    subtotal: numberValue(item, ["subtotal", "itemsSubtotal"], 0),
    deliveryFee: numberValue(item, ["deliveryFee"], 0),
    tax: numberValue(item, ["taxTotal", "tax"], 0),
    currency: textValue(item, ["currency"]) || "PKR",
    orderMode: textValue(item, ["orderMode", "fulfillmentType"]) || "delivery",
    paymentMethod: textValue(item, ["paymentMethod"]) || "cod",
    deliveryAddress: textValue(item, ["deliveryAddress", "address"]),
    selectedArea: textValue(item, ["selectedArea"]),
    customerName: textValue(item, ["customerName", "name"]),
    customerPhone: textValue(item, ["customerPhone", "contactNumber", "phone"]),
    customerEmail: textValue(item, ["customerEmail", "email"]),
    branchId: textValue(item, ["branchId"]),
    branchName: textValue(item, ["branchName"]),
    notes: textValue(item, ["notes"]),
    items,
    raw: item
  };
}

function buildPlaceOrderItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((raw) => {
      const item = asRecord(raw) || {};
      const productId =
        textValue(item, ["productId", "id"]) ||
        textValue(asRecord(item.product), ["id", "productId"]);
      if (!productId) return null;

      const variantId =
        textValue(item, ["variantId"]) ||
        textValue(asRecord(item.variant), ["variantId", "id", "_id"]);

      const addons = (Array.isArray(item.addons) ? item.addons : item.selectedAddons || [])
        .map((addon) => {
          const row = asRecord(addon) || {};
          const addonId = textValue(row, ["addonId", "id", "_id"]);
          if (!addonId) return null;
          return {
            addonId,
            quantity: Math.max(1, numberValue(row, ["quantity"], 1))
          };
        })
        .filter(Boolean);

      const payload = {
        productId,
        quantity: Math.max(1, numberValue(item, ["quantity"], 1)),
        notes: textValue(item, ["notes", "specialInstructions"]) || ""
      };
      if (variantId) payload.variantId = variantId;
      if (addons.length) payload.addons = addons;
      return payload;
    })
    .filter(Boolean);
}

/**
 * Build place-order body.
 * Prefer useCheckout:true when checkout was prepared; else full items payload.
 */
function buildPlaceOrderPayload({
  checkoutResponse = null,
  requestPayload = null,
  items = [],
  useCheckout = true,
  frontendDomainUrl = getPublicFrontendDomainUrl()
} = {}) {
  const checkout = asRecord(checkoutResponse) || {};
  const prepared =
    checkout.checkoutAllowed === true ||
    checkout.checkout?.isReady === true ||
    checkout.cart?.checkout?.isReady === true;

  if (useCheckout && prepared) {
    const fromApi = asRecord(checkout.placeOrderPayload) || asRecord(checkout.testPlaceOrderBody);
    return {
      useCheckout: true,
      frontendDomainUrl: String(
        fromApi?.frontendDomainUrl || frontendDomainUrl || ""
      ).trim()
    };
  }

  const req = asRecord(requestPayload) || {};
  const sourceItems =
    items.length
      ? items
      : Array.isArray(checkout.items)
        ? checkout.items
        : Array.isArray(checkout.checkout?.items)
          ? checkout.checkout.items
          : Array.isArray(checkout.cart?.items)
            ? checkout.cart.items
            : [];

  return {
    branchId: textValue(req, ["branchId"]) || textValue(checkout.branch, ["id"]),
    branchName: textValue(req, ["branchName"]) || textValue(checkout.branch, ["name"]),
    latitude: textValue(req, ["latitude"]) || textValue(checkout.fulfillment?.customerLocation, ["latitude"]),
    longitude:
      textValue(req, ["longitude"]) ||
      textValue(checkout.fulfillment?.customerLocation, ["longitude"]),
    orderMode:
      textValue(req, ["orderMode"]) ||
      textValue(checkout.fulfillment, ["orderMode"]) ||
      "delivery",
    selectedArea:
      textValue(req, ["selectedArea"]) || textValue(checkout.fulfillment, ["selectedArea"]),
    deliveryAddress:
      textValue(req, ["deliveryAddress"]) ||
      textValue(checkout.fulfillment, ["deliveryAddress"]),
    paymentMethod:
      textValue(req, ["paymentMethod"]) ||
      textValue(checkout.fulfillment, ["paymentMethod"]) ||
      "cod",
    deliveryFee: numberValue(req, ["deliveryFee"], numberValue(checkout.priceSummary, ["deliveryFee"], 0)),
    notes: textValue(req, ["notes"]) || textValue(checkout.fulfillment, ["notes"]),
    items: buildPlaceOrderItems(sourceItems),
    frontendDomainUrl: String(frontendDomainUrl || "").trim()
  };
}

async function placeUserOrder(payload, frontendDomainUrl = getPublicFrontendDomainUrl()) {
  const body = payload || {};
  return ordersFetch({
    path: "/api/restaurant/user/orders",
    method: "POST",
    body,
    frontendDomainUrl: body.frontendDomainUrl || frontendDomainUrl,
    requireAuth: true
  });
}

async function getUserOrders(frontendDomainUrl = getPublicFrontendDomainUrl()) {
  return ordersFetch({
    path: "/api/restaurant/user/orders",
    method: "GET",
    frontendDomainUrl,
    requireAuth: true
  });
}

async function getUserOrderById(orderId, frontendDomainUrl = getPublicFrontendDomainUrl()) {
  const id = String(orderId || "").trim();
  if (!id) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "Order id is required.",
      orders: [],
      order: null
    };
  }
  return ordersFetch({
    path: `/api/restaurant/user/orders/${encodeURIComponent(id)}`,
    method: "GET",
    frontendDomainUrl,
    requireAuth: true
  });
}

export {
  buildPlaceOrderItems,
  buildPlaceOrderPayload,
  getUserOrderById,
  getUserOrders,
  mapOrder,
  placeUserOrder
};
