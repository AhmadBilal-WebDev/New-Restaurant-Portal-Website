import { io } from "socket.io-client";
import { getFrontendDomainUrl } from "./catalogApi";
import { getOwnerSession } from "./ownerSession";
import {
  emitOrdersRefresh,
  normalizeSocketNotification
} from "./restaurantNotificationsApi";

const SOCKET_EVENTS = [
  "notification",
  "notifications",
  "new_order",
  "new-order",
  "order:new",
  "order.created",
  "restaurant:notification",
  "owner:notification",
  "notifications:new",
  "restaurant:new_order",
  "owner:new_order"
];

async function fetchSocketConfig() {
  try {
    const response = await fetch("/api/restaurant/realtime/config", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const data = await response.json().catch(() => null);
    const socketUrl =
      (typeof data?.socketUrl === "string" && data.socketUrl.trim()) ||
      (typeof process.env.NEXT_PUBLIC_SOCKET_URL === "string"
        ? process.env.NEXT_PUBLIC_SOCKET_URL.trim()
        : "");
    return {
      socketUrl: socketUrl.replace(/\/$/, ""),
      path: typeof data?.path === "string" && data.path.trim() ? data.path.trim() : "/socket.io"
    };
  } catch {
    const fallback =
      typeof process.env.NEXT_PUBLIC_SOCKET_URL === "string"
        ? process.env.NEXT_PUBLIC_SOCKET_URL.trim().replace(/\/$/, "")
        : "";
    return { socketUrl: fallback, path: "/socket.io" };
  }
}

function getAuthToken() {
  const session = getOwnerSession();
  return (
    session?.token ||
    (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null) ||
    ""
  );
}

function getMerchantHints(session) {
  const owner = session?.owner || {};
  return {
    merchantId: owner.merchantId || owner.id || owner._id || "",
    businessId: owner.bussinessId || owner.businessId || "",
    restaurantId: owner.restaurantId || owner.merchantId || owner.id || ""
  };
}

/**
 * Connect owner dashboard to backend Socket.IO for live order notifications.
 * Returns a disconnect cleanup function.
 */
async function connectOwnerRealtime({
  onNotification,
  onConnectionChange,
  frontendDomainUrl = getFrontendDomainUrl()
} = {}) {
  const token = getAuthToken();
  if (!token) {
    onConnectionChange?.({ connected: false, reason: "no-token" });
    return () => {};
  }

  const { socketUrl, path } = await fetchSocketConfig();
  if (!socketUrl) {
    onConnectionChange?.({ connected: false, reason: "no-socket-url" });
    return () => {};
  }

  const session = getOwnerSession();
  const hints = getMerchantHints(session);

  const socket = io(socketUrl, {
    path,
    transports: ["websocket", "polling"],
    auth: {
      token,
      Authorization: `Bearer ${token}`,
      frontendDomainUrl,
      ...hints
    },
    query: {
      frontendDomainUrl,
      token,
      ...Object.fromEntries(
        Object.entries(hints).filter(([, value]) => Boolean(value))
      )
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1200,
    reconnectionDelayMax: 8000,
    timeout: 12000
  });

  const recentKeys = new Map();

  const handleIncoming = (payload) => {
    const notification = normalizeSocketNotification(payload);
    if (!notification) return;

    const key =
      notification.id ||
      (notification.orderId ? `order:${notification.orderId}` : "") ||
      (notification.orderNumber ? `ordno:${notification.orderNumber}` : "");
    if (key) {
      const lastAt = recentKeys.get(key) || 0;
      if (Date.now() - lastAt < 8000) return;
      recentKeys.set(key, Date.now());
      // Keep map small
      if (recentKeys.size > 80) {
        const oldest = [...recentKeys.entries()].sort((a, b) => a[1] - b[1]).slice(0, 30);
        oldest.forEach(([k]) => recentKeys.delete(k));
      }
    }

    onNotification?.(notification, payload);
    if (notification.type === "new_order" || notification.orderId) {
      emitOrdersRefresh("socket-new-order");
    }
  };

  SOCKET_EVENTS.forEach((eventName) => {
    socket.on(eventName, handleIncoming);
  });

  socket.on("connect", () => {
    onConnectionChange?.({ connected: true, id: socket.id });
    // Common room-join patterns used by restaurant backends
    const joinPayload = {
      frontendDomainUrl,
      token,
      ...hints
    };
    [
      "join",
      "join_restaurant",
      "join:restaurant",
      "restaurant:join",
      "owner:join",
      "subscribe",
      "notifications:subscribe"
    ].forEach((eventName) => {
      try {
        socket.emit(eventName, joinPayload);
      } catch {
        // ignore emit errors
      }
    });
  });

  socket.on("disconnect", (reason) => {
    onConnectionChange?.({ connected: false, reason });
  });

  socket.on("connect_error", (error) => {
    onConnectionChange?.({
      connected: false,
      reason: error?.message || "connect_error"
    });
  });

  return () => {
    SOCKET_EVENTS.forEach((eventName) => {
      socket.off(eventName, handleIncoming);
    });
    socket.removeAllListeners();
    socket.disconnect();
  };
}

export { connectOwnerRealtime, SOCKET_EVENTS };
