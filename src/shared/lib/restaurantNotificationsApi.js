import { getFrontendDomainUrl } from "./catalogApi";
import { expireOwnerSession, getOwnerSession } from "./ownerSession";
import { mapOwnerOrder } from "./restaurantOrdersApi";

const OWNER_NOTIFICATION_EVENT = "ros-owner-notification";
const OWNER_ORDERS_REFRESH_EVENT = "ros-owner-orders-refresh";
const OWNER_NOTIFICATIONS_UPDATED_EVENT = "ros-owner-notifications-updated";

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

function optionalNumber(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
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

function extractList(data) {
  const record = asRecord(data);
  if (!record) return Array.isArray(data) ? data : [];
  if (Array.isArray(record.notifications)) return record.notifications;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.results)) return record.results;
  return [];
}

function mapNotification(row, index = 0) {
  const item = asRecord(row);
  if (!item) return null;

  const data = asRecord(item.data) || {};
  const nestedOrder = asRecord(data.order) || asRecord(item.order) || null;
  const nestedCustomer =
    asRecord(data.customer) ||
    asRecord(nestedOrder?.customer) ||
    asRecord(item.customer) ||
    null;

  const id = textValue(item, ["id", "_id"]) || `notification-${index}`;
  const createdAtRaw = textValue(item, ["createdAt", "updatedAt"]);
  let createdAt = createdAtRaw;
  if (createdAtRaw) {
    const d = new Date(createdAtRaw);
    if (!Number.isNaN(d.getTime())) createdAt = d.toLocaleString();
  } else {
    createdAt = "Just now";
  }

  const mappedOrder = nestedOrder ? mapOwnerOrder(nestedOrder) : null;

  return {
    id,
    type: textValue(item, ["type"]) || "new_order",
    title: textValue(item, ["title"]) || "Notification",
    message: textValue(item, ["message"]) || "",
    orderId:
      textValue(item, ["orderId"]) ||
      textValue(nestedOrder || {}, ["id", "_id", "orderId"]) ||
      mappedOrder?.orderId ||
      "",
    orderNumber:
      textValue(item, ["orderNumber"]) ||
      textValue(nestedOrder || {}, ["orderNumber"]) ||
      mappedOrder?.orderNumber ||
      "",
    branchId: textValue(item, ["branchId"]) || textValue(nestedOrder || {}, ["branchId"]) || "",
    branchName:
      textValue(item, ["branchName"]) ||
      textValue(nestedOrder || {}, ["branchName"]) ||
      "",
    isRead: item.isRead === true,
    readAt: textValue(item, ["readAt"]) || null,
    createdAt,
    createdAtRaw,
    updatedAt: textValue(item, ["updatedAt"]),
    customerName:
      textValue(nestedCustomer || {}, ["name"]) ||
      mappedOrder?.customerName ||
      "",
    customerImage:
      textValue(nestedCustomer || {}, [
        "profilePitcher",
        "profilePicture",
        "avatar",
        "image"
      ]) ||
      mappedOrder?.customerImage ||
      "",
    grandTotal:
      optionalNumber(data, ["grandTotal"]) ??
      optionalNumber(nestedOrder || {}, ["grandTotal"]) ??
      mappedOrder?.total ??
      0,
    currency: textValue(data, ["currency"]) || textValue(nestedOrder || {}, ["currency"]) || "PKR",
    orderMode:
      textValue(data, ["orderMode"]) ||
      textValue(nestedOrder || {}, ["orderMode"]) ||
      mappedOrder?.orderMode ||
      "",
    paymentMethod:
      textValue(data, ["paymentMethod"]) ||
      textValue(nestedOrder || {}, ["paymentMethod"]) ||
      mappedOrder?.paymentMethod ||
      "",
    itemsCount:
      numberValue(data, ["itemsCount"], 0) ||
      numberValue(nestedOrder || {}, ["itemsCount", "itemCount"], 0) ||
      mappedOrder?.itemCount ||
      0,
    order: mappedOrder,
    data,
    raw: item
  };
}

function bellFromPayload(data, fallbackUnread = 0) {
  const record = asRecord(data) || {};
  const bell = asRecord(record.bell) || {};
  const unreadCount = numberValue(
    { ...bell, ...record },
    ["unreadCount"],
    fallbackUnread
  );
  const hasUnread =
    typeof bell.hasUnread === "boolean"
      ? bell.hasUnread
      : typeof record.hasUnread === "boolean"
        ? record.hasUnread
        : unreadCount > 0;
  return { unreadCount, hasUnread };
}

function emitOwnerNotification(payload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OWNER_NOTIFICATION_EVENT, { detail: payload }));
}

function emitOrdersRefresh(reason = "notification") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OWNER_ORDERS_REFRESH_EVENT, { detail: { reason, at: Date.now() } })
  );
}

function emitNotificationsUpdated(payload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OWNER_NOTIFICATIONS_UPDATED_EVENT, { detail: payload })
  );
}

async function getRestaurantNotifications({
  frontendDomainUrl = getFrontendDomainUrl()
} = {}) {
  const query = new URLSearchParams();
  if (frontendDomainUrl) query.set("frontendDomainUrl", frontendDomainUrl);

  try {
    const response = await fetch(
      `/api/restaurant/notifications${query.toString() ? `?${query}` : ""}`,
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

    if (response.status === 401) expireOwnerSession();

    const record = asRecord(data) || {};
    const notifications = extractList(data).map(mapNotification).filter(Boolean);
    const unreadFromList = notifications.filter((n) => !n.isRead).length;
    const bell = bellFromPayload(data, unreadFromList);

    return {
      ok: response.ok && record.success !== false,
      status: response.status,
      data,
      message: apiMessage(data, response.ok ? "Notifications loaded." : "Failed to load notifications."),
      notifications,
      unreadCount: bell.unreadCount,
      hasUnread: bell.hasUnread,
      bell
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      data: null,
      message: error instanceof Error ? error.message : "Network error",
      notifications: [],
      unreadCount: 0,
      hasUnread: false,
      bell: { unreadCount: 0, hasUnread: false }
    };
  }
}

async function markRestaurantNotificationRead(
  notificationId,
  { frontendDomainUrl = getFrontendDomainUrl() } = {}
) {
  const id = String(notificationId || "").trim();
  if (!id) {
    return {
      ok: false,
      status: 400,
      message: "Notification id is required.",
      unreadCount: 0,
      hasUnread: false,
      notification: null
    };
  }

  const query = new URLSearchParams();
  if (frontendDomainUrl) query.set("frontendDomainUrl", frontendDomainUrl);

  try {
    const response = await fetch(
      `/api/restaurant/notifications/${encodeURIComponent(id)}/read${
        query.toString() ? `?${query}` : ""
      }`,
      {
        method: "PUT",
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

    if (response.status === 401) expireOwnerSession();

    const record = asRecord(data) || {};
    const bell = bellFromPayload(data, numberValue(record, ["unreadCount"], 0));
    const notification = mapNotification(record.notification);

    return {
      ok: response.ok && record.success !== false,
      status: response.status,
      data,
      message: apiMessage(
        data,
        response.ok ? "Notification marked as read." : "Failed to mark notification."
      ),
      unreadCount: bell.unreadCount,
      hasUnread: bell.hasUnread,
      bell,
      notification
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      message: error instanceof Error ? error.message : "Network error",
      unreadCount: 0,
      hasUnread: false,
      notification: null
    };
  }
}

async function markAllRestaurantNotificationsRead({
  frontendDomainUrl = getFrontendDomainUrl()
} = {}) {
  const query = new URLSearchParams();
  if (frontendDomainUrl) query.set("frontendDomainUrl", frontendDomainUrl);

  try {
    const response = await fetch(
      `/api/restaurant/notifications/read-all${query.toString() ? `?${query}` : ""}`,
      {
        method: "PUT",
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

    if (response.status === 401) expireOwnerSession();

    const record = asRecord(data) || {};
    const bell = bellFromPayload(data, 0);

    return {
      ok: response.ok && record.success !== false,
      status: response.status,
      data,
      message: apiMessage(
        data,
        response.ok ? "All notifications marked as read." : "Failed to mark all as read."
      ),
      unreadCount: bell.unreadCount,
      hasUnread: bell.hasUnread,
      bell
    };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      message: error instanceof Error ? error.message : "Network error",
      unreadCount: 0,
      hasUnread: false
    };
  }
}

/**
 * Normalize a socket payload into a mapped notification when possible.
 */
function normalizeSocketNotification(payload) {
  const record = asRecord(payload) || {};
  const nested =
    asRecord(record.notification) ||
    asRecord(record.data?.notification) ||
    asRecord(record.data) ||
    record;

  // Direct notification object
  if (textValue(nested, ["id", "_id"]) || textValue(nested, ["title", "message", "type"])) {
    return mapNotification(nested);
  }

  // Order-only payload → synthesize notification (stable id to avoid duplicates)
  const order = asRecord(nested.order) || (nested.orderNumber || nested.grandTotal ? nested : null);
  if (order) {
    const mappedOrder = mapOwnerOrder(order);
    if (!mappedOrder) return null;
    const stableId =
      textValue(nested, ["id", "_id"]) ||
      `live-order-${mappedOrder.orderId || mappedOrder.orderNumber}`;
    return {
      id: stableId,
      type: "new_order",
      title: "New order received",
      message: `${mappedOrder.customerName} placed order ${mappedOrder.orderNumber} (${mappedOrder.orderMode}) — ${mappedOrder.currency || "PKR"} ${mappedOrder.total}`,
      orderId: mappedOrder.orderId,
      orderNumber: mappedOrder.orderNumber,
      branchId: mappedOrder.branchId,
      branchName: mappedOrder.branchName,
      isRead: false,
      readAt: null,
      createdAt: "Just now",
      createdAtRaw: new Date().toISOString(),
      customerName: mappedOrder.customerName,
      customerImage: mappedOrder.customerImage,
      grandTotal: mappedOrder.total,
      currency: mappedOrder.currency || "PKR",
      orderMode: mappedOrder.orderMode,
      paymentMethod: mappedOrder.paymentMethod,
      itemsCount: mappedOrder.itemCount,
      order: mappedOrder,
      data: { order },
      raw: record
    };
  }

  return null;
}

export {
  OWNER_NOTIFICATION_EVENT,
  OWNER_ORDERS_REFRESH_EVENT,
  OWNER_NOTIFICATIONS_UPDATED_EVENT,
  emitOwnerNotification,
  emitOrdersRefresh,
  emitNotificationsUpdated,
  getRestaurantNotifications,
  markRestaurantNotificationRead,
  markAllRestaurantNotificationsRead,
  mapNotification,
  normalizeSocketNotification
};
