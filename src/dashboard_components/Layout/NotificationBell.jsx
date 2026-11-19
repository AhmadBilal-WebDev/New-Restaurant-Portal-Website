"use client";

import { useEffect, useRef, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useOwnerNotifications } from "@/contexts/OwnerNotificationsContext";
import { useAdminNavigate } from "@/dashboard_components/useAdminNavigate";
import { useAdminOrderBridge } from "@/dashboard_components/Layout/adminOrderBridge";
import { unlockOrderAlertSound } from "@/shared/lib/orderAlertSound";
import {
  Bell,
  CheckCheck,
  Loader2,
  Package,
  Radio
} from "lucide-react";

function formatMoney(formatPrice, amount, currency = "PKR") {
  if (typeof formatPrice === "function") return formatPrice(amount || 0);
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function NotificationBell({ onOpenChange }) {
  const { formatPrice, addToast } = useRestaurant();
  const navigateAdmin = useAdminNavigate();
  const { setSelectedOrder } = useAdminOrderBridge();
  const {
    notifications,
    unreadCount,
    hasUnread,
    loading,
    connected,
    refresh,
    markRead,
    markAllRead
  } = useOwnerNotifications();

  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpenToggle = async () => {
    void unlockOrderAlertSound();
    const next = !open;
    setOpen(next);
    if (next) refresh();
  };

  const handleMarkAll = async () => {
    if (markingAll || unreadCount <= 0) return;
    setMarkingAll(true);
    const result = await markAllRead();
    setMarkingAll(false);
    if (!result?.ok) {
      addToast("Could not update", result?.message || "Failed to mark all as read.", "error");
    }
  };

  const handleClickNotification = async (item) => {
    if (!item?.id) return;
    setBusyId(item.id);
    // Mark read so it disappears from unread feed / badges
    if (!item.isRead) {
      const result = await markRead(item.id);
      if (!result?.ok) {
        addToast("Could not update", result?.message || "Failed to mark as read.", "error");
      }
    }
    setBusyId("");
    setOpen(false);

    if (item.order) {
      setSelectedOrder(item.order);
    }
    navigateAdmin("orders");
  };

  const visibleNotifications = notifications.filter((n) => !n.isRead);
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount || 0);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={handleOpenToggle}
        className="w-10 h-10 rounded-xl bg-[#191B20] hover:bg-[#252830] border border-[#292D35] text-neutral-400 hover:text-white flex items-center justify-center relative transition-colors cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className={`w-4 h-4 ${hasUnread ? "text-[#FF5A1F]" : ""}`} />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5A1F] text-white text-[10px] font-black leading-[18px] text-center shadow ring-2 ring-[#101216]">
            {badgeLabel}
          </span>
        )}
        <span
          className={`absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
            connected ? "bg-emerald-400" : "bg-neutral-600"
          }`}
          title={connected ? "Live connected" : "Live reconnecting"}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[22rem] sm:w-[26rem] bg-[#191B20] border border-[#292D35] rounded-2xl shadow-2xl z-50 text-xs overflow-hidden animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between gap-2 px-3.5 py-3 border-b border-[#292D35] bg-[#14171C]">
            <div>
              <div className="font-bold text-white text-sm">Notifications</div>
              <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1.5">
                <Radio className={`w-3 h-3 ${connected ? "text-emerald-400" : "text-neutral-500"}`} />
                {connected ? "Live updates on" : "Connecting…"}
                {unreadCount > 0 ? ` · ${unreadCount} unread` : " · All caught up"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={markingAll || unreadCount <= 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#292D35] bg-[#101216] text-neutral-300 hover:text-white hover:border-[#404550] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Mark all as read"
            >
              {markingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5 text-[#FF5A1F]" />
              )}
              <span className="font-semibold">Read all</span>
            </button>
          </div>

          <div className="max-h-[22rem] overflow-y-auto no-scrollbar">
            {loading && visibleNotifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-neutral-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#FF5A1F]" />
                <div className="mt-2">Loading notifications…</div>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-neutral-500">
                <Bell className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                No unread notifications.
              </div>
            ) : (
              <ul className="divide-y divide-[#292D35]/70">
                {visibleNotifications.map((item) => {
                  const unread = !item.isRead;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleClickNotification(item)}
                        className={`w-full text-left px-3.5 py-3 hover:bg-[#252830]/70 transition-colors cursor-pointer ${
                          unread ? "bg-[#FF5A1F]/5" : "bg-transparent"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="relative shrink-0">
                            {item.customerImage ? (
                              <img
                                src={item.customerImage}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border border-[#292D35]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#101216] border border-[#292D35] flex items-center justify-center text-[#FF5A1F]">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            {unread && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF5A1F] ring-2 ring-[#191B20]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className={`font-bold truncate ${unread ? "text-white" : "text-neutral-300"}`}>
                                {item.title}
                              </div>
                              {busyId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" />
                              ) : (
                                <span className="text-[10px] text-neutral-500 shrink-0">{item.createdAt}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2 leading-snug">
                              {item.message}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500">
                              {item.orderNumber && (
                                <span className="px-1.5 py-0.5 rounded bg-[#101216] border border-[#292D35] font-mono text-neutral-300">
                                  {item.orderNumber}
                                </span>
                              )}
                              {item.branchName && (
                                <span className="px-1.5 py-0.5 rounded bg-[#101216] border border-[#292D35]">
                                  {item.branchName}
                                </span>
                              )}
                              {item.orderMode && (
                                <span className="px-1.5 py-0.5 rounded bg-[#101216] border border-[#292D35] capitalize">
                                  {item.orderMode}
                                </span>
                              )}
                              {item.grandTotal > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 text-[#FF5A1F] font-bold">
                                  {formatMoney(formatPrice, item.grandTotal, item.currency)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { NotificationBell };
