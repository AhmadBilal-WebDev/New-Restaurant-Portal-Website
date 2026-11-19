"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { getFrontendDomainUrl } from "@/shared/lib/catalogApi";
import { connectOwnerRealtime } from "@/shared/lib/ownerRealtime";
import {
  getRestaurantNotifications,
  markAllRestaurantNotificationsRead,
  markRestaurantNotificationRead,
  OWNER_NOTIFICATION_EVENT
} from "@/shared/lib/restaurantNotificationsApi";
import { getOwnerSession } from "@/shared/lib/ownerSession";
import {
  ensureUnlockListeners,
  playOrderAlertSound,
  unlockOrderAlertSound
} from "@/shared/lib/orderAlertSound";

const OwnerNotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  hasUnread: false,
  pendingOrderCount: 0,
  loading: false,
  connected: false,
  connectionReason: "",
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  clearOrderNotifications: async () => {}
});

function dedupeKey(notification) {
  if (!notification) return "";
  if (notification.orderId) return `order:${notification.orderId}`;
  if (notification.orderNumber) return `ordno:${notification.orderNumber}`;
  return notification.id ? `id:${notification.id}` : "";
}

function isOrderNotification(n) {
  return Boolean(n && (n.type === "new_order" || n.orderId || n.orderNumber));
}

function OwnerNotificationsProvider({ children }) {
  const { isAdminLoggedIn, addToast } = useRestaurant();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionReason, setConnectionReason] = useState("");

  const seenIdsRef = useRef(new Set());
  const seenOrderKeysRef = useRef(new Set());
  const disconnectRef = useRef(null);
  const soundLockRef = useRef(0);
  const syncTimerRef = useRef(null);
  const seededRef = useRef(false);
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  useEffect(() => {
    ensureUnlockListeners();
    // One-time prime: first tap on dashboard unlocks autoplay for later alerts.
    let done = false;
    const prime = () => {
      if (done) return;
      void unlockOrderAlertSound().then((ok) => {
        if (!ok) return;
        done = true;
        window.removeEventListener("pointerdown", prime, true);
        window.removeEventListener("touchstart", prime, true);
      });
    };
    window.addEventListener("pointerdown", prime, true);
    window.addEventListener("touchstart", prime, true);
    return () => {
      window.removeEventListener("pointerdown", prime, true);
      window.removeEventListener("touchstart", prime, true);
    };
  }, []);

  const ringAlert = useCallback(() => {
    const now = Date.now();
    if (now - soundLockRef.current <= 2200) return;
    soundLockRef.current = now;
    void playOrderAlertSound();
  }, []);

  const applyBell = useCallback((bell, list) => {
    const fromList = Array.isArray(list) ? list.filter((n) => !n.isRead).length : 0;
    const nextUnread =
      typeof bell?.unreadCount === "number" ? bell.unreadCount : fromList;
    setUnreadCount(Math.max(0, nextUnread));
    setHasUnread(
      typeof bell?.hasUnread === "boolean" ? bell.hasUnread : nextUnread > 0
    );
  }, []);

  const recomputeUnread = useCallback((list) => {
    const count = list.filter((n) => !n.isRead).length;
    setUnreadCount(count);
    setHasUnread(count > 0);
  }, []);

  const upsertNotification = useCallback((notification, { toast = false } = {}) => {
    if (!notification?.id) return false;
    const key = dedupeKey(notification);
    const alreadySeen =
      seenIdsRef.current.has(notification.id) ||
      (key ? seenOrderKeysRef.current.has(key) : false);

    let addedFresh = false;
    setNotifications((prev) => {
      const existsById = prev.some((n) => n.id === notification.id);
      const existsByOrder = key ? prev.some((n) => dedupeKey(n) === key) : false;

      if (existsById) {
        return prev.map((n) => (n.id === notification.id ? { ...n, ...notification } : n));
      }
      if (existsByOrder) {
        return prev.map((n) =>
          dedupeKey(n) === key ? { ...n, ...notification, id: n.id } : n
        );
      }
      addedFresh = true;
      return [notification, ...prev].slice(0, 80);
    });

    seenIdsRef.current.add(notification.id);
    if (key) seenOrderKeysRef.current.add(key);

    if (addedFresh && !notification.isRead) {
      setUnreadCount((count) => count + 1);
      setHasUnread(true);
    }

    if (toast && !alreadySeen && !notification.isRead) {
      ringAlert();
      addToastRef.current?.(
        notification.title || "New order",
        notification.message || "A new order just arrived.",
        "success"
      );
    }
    return !alreadySeen;
  }, [ringAlert]);

  const refresh = useCallback(async () => {
    if (!isAdminLoggedIn || !getOwnerSession()?.token) return;
    setLoading(true);
    const result = await getRestaurantNotifications({
      frontendDomainUrl: getFrontendDomainUrl()
    });
    if (result.ok) {
      const list = result.notifications || [];
      const merged = [];
      const keys = new Set();
      for (const n of list) {
        const key = dedupeKey(n) || `id:${n.id}`;
        if (keys.has(key)) continue;
        keys.add(key);
        merged.push(n);
        if (n?.id) seenIdsRef.current.add(n.id);
        if (key) seenOrderKeysRef.current.add(key);
      }
      setNotifications(merged);
      applyBell(result.bell, merged);
      seededRef.current = true;
    }
    setLoading(false);
    return result;
  }, [applyBell, isAdminLoggedIn]);

  const markRead = useCallback(async (notificationId) => {
    const id = String(notificationId || "").trim();
    if (!id) return { ok: false };

    setNotifications((prev) => {
      const next = prev.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      );
      recomputeUnread(next);
      return next;
    });

    const result = await markRestaurantNotificationRead(id, {
      frontendDomainUrl: getFrontendDomainUrl()
    });

    if (result.ok) {
      applyBell(result.bell);
      if (result.notification) {
        setNotifications((prev) => {
          const next = prev.map((n) =>
            n.id === id ? { ...n, ...result.notification, isRead: true } : n
          );
          recomputeUnread(next);
          return next;
        });
      }
    } else {
      await refresh();
    }
    return result;
  }, [applyBell, recomputeUnread, refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);
    setHasUnread(false);

    const result = await markAllRestaurantNotificationsRead({
      frontendDomainUrl: getFrontendDomainUrl()
    });
    if (result.ok) {
      applyBell(result.bell || { unreadCount: 0, hasUnread: false });
    } else {
      await refresh();
    }
    return result;
  }, [applyBell, refresh]);

  /** Clear order-related unread notifications (used when opening Orders page). */
  const clearOrderNotifications = useCallback(async () => {
    const unreadOrders = notifications.filter((n) => !n.isRead && isOrderNotification(n));
    if (!unreadOrders.length && unreadCount <= 0) {
      setUnreadCount(0);
      setHasUnread(false);
      return { ok: true };
    }

    // Optimistic clear for order notifs
    setNotifications((prev) => {
      const next = prev.map((n) =>
        isOrderNotification(n)
          ? { ...n, isRead: true, readAt: n.readAt || new Date().toISOString() }
          : n
      );
      recomputeUnread(next);
      return next;
    });

    // Prefer read-all when everything pending is order-related
    const onlyOrders =
      notifications.filter((n) => !n.isRead).every((n) => isOrderNotification(n));
    if (onlyOrders || unreadOrders.length >= unreadCount) {
      return markAllRead();
    }

    await Promise.allSettled(
      unreadOrders.map((n) =>
        markRestaurantNotificationRead(n.id, {
          frontendDomainUrl: getFrontendDomainUrl()
        })
      )
    );
    return refresh();
  }, [markAllRead, notifications, recomputeUnread, refresh, unreadCount]);

  useEffect(() => {
    if (!isAdminLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setHasUnread(false);
      setConnected(false);
      seededRef.current = false;
      seenIdsRef.current = new Set();
      seenOrderKeysRef.current = new Set();
      return;
    }
    refresh();
  }, [isAdminLoggedIn, refresh]);

  // Stable socket connection — callbacks via refs (avoids reconnect churn / UI jerk)
  const upsertRef = useRef(upsertNotification);
  const applyBellRef = useRef(applyBell);
  upsertRef.current = upsertNotification;
  applyBellRef.current = applyBell;

  useEffect(() => {
    if (!isAdminLoggedIn) {
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
      return;
    }

    let cancelled = false;

    (async () => {
      const disconnect = await connectOwnerRealtime({
        frontendDomainUrl: getFrontendDomainUrl(),
        onConnectionChange: ({ connected: isConnected, reason }) => {
          if (cancelled) return;
          setConnected(Boolean(isConnected));
          setConnectionReason(reason || "");
        },
        onNotification: (notification) => {
          if (cancelled || !notification) return;
          const key = dedupeKey(notification);
          const already =
            seenIdsRef.current.has(notification.id) ||
            (key ? seenOrderKeysRef.current.has(key) : false);
          upsertRef.current(notification, {
            toast: !already && !notification.isRead
          });
          if (!already) {
            if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
            syncTimerRef.current = window.setTimeout(() => {
              getRestaurantNotifications({
                frontendDomainUrl: getFrontendDomainUrl()
              }).then((result) => {
                if (!result.ok) return;
                applyBellRef.current(result.bell, result.notifications);
              });
            }, 2500);
          }
        }
      });
      if (cancelled) {
        disconnect?.();
        return;
      }
      disconnectRef.current = disconnect;
    })();

    return () => {
      cancelled = true;
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
    };
  }, [isAdminLoggedIn]);

  useEffect(() => {
    const onExternal = (event) => {
      const notification = event?.detail?.notification;
      if (!notification) return;
      upsertRef.current(notification, { toast: true });
    };
    window.addEventListener(OWNER_NOTIFICATION_EVENT, onExternal);
    return () => window.removeEventListener(OWNER_NOTIFICATION_EVENT, onExternal);
  }, []);

  // Poll fallback: catch new notifications + ring sound even if socket hiccups (esp. mobile).
  useEffect(() => {
    if (!isAdminLoggedIn) return undefined;

    let cancelled = false;
    const poll = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      if (!seededRef.current) return;

      const result = await getRestaurantNotifications({
        frontendDomainUrl: getFrontendDomainUrl()
      });
      if (cancelled || !result?.ok) return;

      const list = result.notifications || [];
      applyBellRef.current(result.bell, list);

      for (const n of list) {
        if (!n?.id || n.isRead) continue;
        const key = dedupeKey(n);
        const already =
          seenIdsRef.current.has(n.id) ||
          (key ? seenOrderKeysRef.current.has(key) : false);
        if (already) continue;
        upsertRef.current(n, { toast: true });
      }
    };

    const intervalMs =
      typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
        ? 4000
        : 8000;
    const id = window.setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAdminLoggedIn]);

  const pendingOrderCount = useMemo(
    () => notifications.filter((n) => !n.isRead && isOrderNotification(n)).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      hasUnread,
      pendingOrderCount,
      loading,
      connected,
      connectionReason,
      refresh,
      markRead,
      markAllRead,
      clearOrderNotifications
    }),
    [
      notifications,
      unreadCount,
      hasUnread,
      pendingOrderCount,
      loading,
      connected,
      connectionReason,
      refresh,
      markRead,
      markAllRead,
      clearOrderNotifications
    ]
  );

  return (
    <OwnerNotificationsContext.Provider value={value}>
      {children}
    </OwnerNotificationsContext.Provider>
  );
}

function useOwnerNotifications() {
  return useContext(OwnerNotificationsContext);
}

export { OwnerNotificationsProvider, useOwnerNotifications };
