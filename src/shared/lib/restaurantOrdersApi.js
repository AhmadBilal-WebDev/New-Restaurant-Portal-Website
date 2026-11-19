import { getFrontendDomainUrl } from "./catalogApi";
import { expireOwnerSession, getOwnerSession } from "./ownerSession";

function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return null;
}

function textValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested =
        (typeof value.name === "string" && value.name.trim()) ||
        (typeof value.branchName === "string" && value.branchName.trim()) ||
        "";
      if (nested) return nested;
    }
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

function authHeaders() {
  const session = getOwnerSession();
  const token =
    session?.token ||
    (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null);
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function extractOrdersList(data) {
  const record = asRecord(data);
  if (!record) {
    return Array.isArray(data) ? data : [];
  }
  if (Array.isArray(record.orders)) return record.orders;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items) && !record.items[0]?.productId) return record.items;
  if (Array.isArray(record.results)) return record.results;
  return [];
}

/** Map API status → dashboard status keys. */
function normalizeStatus(raw) {
  const status = String(raw || "").trim().toLowerCase();
  if (!status) return "received";
  if (status === "pending" || status === "new" || status === "placed") return "received";
  if (status === "out_for_delivery" || status === "out-for-delivery") return "ready";
  if (status === "complete" || status === "completed") return "delivered";
  if (status === "canceled") return "cancelled";
  return status;
}

function formatPhone(countryCode, contactNumber) {
  const code = String(countryCode || "").trim();
  const num = String(contactNumber || "").trim();
  if (!num) return "—";
  if (!code) return num;
  if (num.startsWith("+") || num.startsWith(code)) return num;
  return `${code} ${num}`;
}

function mapAddons(addons) {
  if (!Array.isArray(addons)) return [];
  return addons.map((raw, idx) => {
    const addon = asRecord(raw) || {};
    const quantity = Math.max(1, numberValue(addon, ["quantity"], 1));
    const price = numberValue(addon, ["price", "unitPrice"], 0);
    const lineTotal = numberValue(addon, ["lineTotal"], price * quantity);
    return {
      addonId: textValue(addon, ["addonId", "id", "_id"]) || `addon-${idx}`,
      name: textValue(addon, ["name"]) || `Addon ${idx + 1}`,
      price,
      quantity,
      lineTotal
    };
  });
}

function mapVariant(raw) {
  const variant = asRecord(raw);
  if (!variant) return null;
  return {
    variantId: textValue(variant, ["variantId", "id", "_id"]),
    name: textValue(variant, ["name"]),
    size: textValue(variant, ["size"]),
    portion: textValue(variant, ["portion"]),
    price: numberValue(variant, ["price"], 0)
  };
}

function mapStatusHistory(list) {
  if (!Array.isArray(list)) return [];
  return list.map((raw, idx) => {
    const row = asRecord(raw) || {};
    const atRaw = textValue(row, ["at", "createdAt", "timestamp"]);
    let atLabel = atRaw;
    if (atRaw) {
      const d = new Date(atRaw);
      if (!Number.isNaN(d.getTime())) atLabel = d.toLocaleString();
    }
    return {
      id: textValue(row, ["_id", "id"]) || `hist-${idx}`,
      status: textValue(row, ["status"]) || "pending",
      note: textValue(row, ["note", "message"]),
      at: atLabel,
      atRaw
    };
  });
}

/**
 * Map backend owner-order into OrdersPage shape (full detail).
 */
function mapOwnerOrder(row, index = 0) {
  const item = asRecord(row);
  if (!item) return null;

  const id = textValue(item, ["id", "_id", "orderId"]) || `order-${index}`;
  const orderNumber =
    textValue(item, ["orderNumber", "orderNo", "number"]) || `#${id.slice(-6)}`;

  const customer = asRecord(item.customer) || {};
  const branch = asRecord(item.branch) || {};
  const price = asRecord(item.priceSummary) || asRecord(item.pricing) || {};

  const countryCode =
    textValue(customer, ["countryCode"]) || textValue(item, ["countryCode"]);
  const contactNumber =
    textValue(customer, ["contactNumber", "phone"]) ||
    textValue(item, ["customerPhone", "contactNumber", "phone"]);
  const customerPhone = formatPhone(countryCode, contactNumber);

  const itemsRaw = Array.isArray(item.items) ? item.items : [];
  const items = itemsRaw.map((raw, idx) => {
    const line = asRecord(raw) || {};
    const quantity = Math.max(1, numberValue(line, ["quantity"], 1));
    const unitPrice = numberValue(line, ["unitPrice", "price", "basePrice"], 0);
    const basePrice = numberValue(line, ["basePrice", "unitPrice"], unitPrice);
    const discountPrice = numberValue(line, ["discountPrice"], NaN);
    const lineSubtotal = numberValue(line, ["lineSubtotal"], unitPrice * quantity);
    const lineTax = numberValue(line, ["lineTax", "tax"], 0);
    const lineTotal = numberValue(line, ["lineTotal", "totalPrice"], lineSubtotal + lineTax);
    const name = textValue(line, ["name", "productName"]) || `Item ${idx + 1}`;
    const image = textValue(line, ["image", "imageUrl"]);
    const variant = mapVariant(line.variant);
    const addons = mapAddons(line.addons);

    return {
      id: textValue(line, ["id", "_id"]) || `line-${idx}`,
      productId: textValue(line, ["productId"]) || "",
      categoryId: textValue(line, ["categoryId"]) || "",
      sku: textValue(line, ["sku"]),
      product: { id: textValue(line, ["productId", "id"]) || `product-${idx}`, name, image },
      name,
      image,
      quantity,
      price: unitPrice,
      unitPrice,
      basePrice,
      discountPrice: Number.isFinite(discountPrice) ? discountPrice : null,
      tax: lineTax,
      lineSubtotal,
      lineTax,
      lineTotal,
      totalPrice: lineTotal,
      notes: textValue(line, ["notes"]),
      variant,
      addons
    };
  });

  const itemCount =
    numberValue(item, ["itemsCount", "itemCount"], 0) ||
    items.reduce((sum, line) => sum + (line.quantity || 0), 0);

  const uniqueItemsCount =
    numberValue(item, ["uniqueItemsCount"], 0) || items.length;

  const currency =
    textValue(item, ["currency"]) ||
    textValue(price, ["currency"]) ||
    "PKR";

  const total =
    numberValue(item, ["grandTotal", "total", "checkoutGrandTotal"], 0) ||
    numberValue(price, ["grandTotal", "total", "payable"], 0);

  const subtotal =
    numberValue(item, ["subtotal", "itemsSubtotal"], 0) ||
    numberValue(price, ["itemsSubtotal", "subtotal"], 0);

  const deliveryFee =
    numberValue(item, ["deliveryFee"], 0) || numberValue(price, ["deliveryFee"], 0);

  const discount =
    numberValue(item, ["discount", "discountTotal"], 0) ||
    numberValue(price, ["discountTotal"], 0);

  const tax =
    numberValue(item, ["tax", "taxTotal"], 0) || numberValue(price, ["taxTotal"], 0);

  const paymentMethod = textValue(item, ["paymentMethod"]) || "cod";
  const paymentStatus = textValue(item, ["paymentStatus"]) || "pending";
  const apiStatus = textValue(item, ["status", "orderStatus"]) || "pending";
  const orderMode = textValue(item, ["orderMode"]) || "delivery";

  const createdAtRaw = textValue(item, ["createdAt", "placedAt", "updatedAt"]);
  let createdAt = createdAtRaw;
  if (createdAtRaw) {
    const d = new Date(createdAtRaw);
    if (!Number.isNaN(d.getTime())) createdAt = d.toLocaleString();
  } else {
    createdAt = "—";
  }

  const statusHistory = mapStatusHistory(item.statusHistory);

  return {
    orderId: id,
    orderNumber,
    merchantId: textValue(item, ["merchantId"]),
    bussinessId: textValue(item, ["bussinessId", "businessId"]),
    customerId:
      textValue(item, ["customerId"]) || textValue(customer, ["id", "_id"]) || "",
    customerName: textValue(customer, ["name"]) || textValue(item, ["customerName"]) || "Guest",
    customerEmail: textValue(customer, ["email"]) || textValue(item, ["customerEmail", "email"]) || "",
    customerGender: textValue(customer, ["gender"]) || "",
    customerCountryCode: countryCode,
    customerContactNumber: contactNumber,
    customerPhone,
    customerImage:
      textValue(customer, ["profilePitcher", "profilePicture", "avatar", "image", "photo"]) ||
      "",
    customerIsActive: customer.isActive !== false,
    customerIsVerified: customer.isVerified === true,
    customerAddress:
      textValue(item, ["deliveryAddress", "customerAddress", "address"]) || "—",
    selectedArea: textValue(item, ["selectedArea"]) || "",
    latitude: textValue(item, ["latitude"]) || "",
    longitude: textValue(item, ["longitude"]) || "",
    branchId:
      textValue(item, ["branchId"]) ||
      textValue(branch, ["id", "_id"]) ||
      textValue(item, ["branchName"]) ||
      "",
    branchName:
      textValue(item, ["branchName"]) ||
      textValue(branch, ["name", "branchName"]) ||
      "—",
    orderMode,
    channel: orderMode === "pickup" ? "Pickup" : "Delivery",
    items,
    itemCount,
    uniqueItemsCount,
    currency,
    subtotal,
    discount,
    tax,
    deliveryFee,
    total,
    priceSummary: {
      currency,
      subtotal,
      taxTotal: tax,
      deliveryFee,
      discountTotal: discount,
      grandTotal: total
    },
    paymentMethod,
    paymentStatus,
    status: normalizeStatus(apiStatus),
    apiStatus,
    statusHistory,
    cancelledAt: textValue(item, ["cancelledAt"]) || null,
    cancelReason: textValue(item, ["cancelReason"]) || "",
    createdAt,
    createdAtRaw,
    updatedAt: textValue(item, ["updatedAt"]),
    notes: textValue(item, ["notes"]) || "",
    assignedRiderId:
      textValue(item, ["assignedRiderId", "riderId"]) ||
      textValue(asRecord(item.rider), ["id", "_id"]) ||
      "",
    assignedRiderName:
      textValue(item, ["assignedRiderName", "riderName"]) ||
      textValue(asRecord(item.rider), ["name"]) ||
      "",
    assignedRiderPhone:
      textValue(item, ["assignedRiderPhone", "riderPhone"]) ||
      textValue(asRecord(item.rider), ["phone", "contactNumber"]) ||
      "",
    raw: item
  };
}

async function getRestaurantOrders({
  frontendDomainUrl = getFrontendDomainUrl(),
  branchName = ""
} = {}) {
  const query = new URLSearchParams();
  if (frontendDomainUrl) query.set("frontendDomainUrl", frontendDomainUrl);
  if (branchName) query.set("branchName", branchName);

  try {
    const response = await fetch(
      `/api/restaurant/orders${query.toString() ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store"
      }
    );

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 401) {
      expireOwnerSession();
    }

    const record = asRecord(data) || {};
    const ok = response.ok && record.success !== false;
    const list = extractOrdersList(data).map(mapOwnerOrder).filter(Boolean);

    return {
      ok,
      status: response.status,
      data,
      message: apiMessage(
        data,
        response.ok ? "Orders loaded." : "Failed to load orders."
      ),
      orders: list,
      count: numberValue(record, ["count"], list.length)
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      data: null,
      message: error instanceof Error ? error.message : "Network error",
      orders: [],
      count: 0
    };
  }
}

async function getRestaurantOrdersForBranches({
  frontendDomainUrl = getFrontendDomainUrl(),
  branchNames = []
} = {}) {
  const names = [...new Set((branchNames || []).map((n) => String(n || "").trim()).filter(Boolean))];
  if (!names.length) {
    return getRestaurantOrders({ frontendDomainUrl, branchName: "" });
  }

  const results = await Promise.all(
    names.map((branchName) => getRestaurantOrders({ frontendDomainUrl, branchName }))
  );

  const merged = [];
  const seen = new Set();
  let ok = false;
  let message = "Orders loaded.";

  for (const result of results) {
    if (result.ok) ok = true;
    else if (!ok) message = result.message;
    for (const order of result.orders || []) {
      const key = order.orderId || order.orderNumber;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(order);
    }
  }

  merged.sort((a, b) => {
    const ta = a.createdAtRaw ? new Date(a.createdAtRaw).getTime() : 0;
    const tb = b.createdAtRaw ? new Date(b.createdAtRaw).getTime() : 0;
    return tb - ta;
  });

  return {
    ok,
    status: ok ? 200 : results[0]?.status || 503,
    data: null,
    message: ok ? "Orders loaded." : message,
    orders: merged,
    count: merged.length
  };
}

export {
  getRestaurantOrders,
  getRestaurantOrdersForBranches,
  mapOwnerOrder,
  normalizeStatus
};
