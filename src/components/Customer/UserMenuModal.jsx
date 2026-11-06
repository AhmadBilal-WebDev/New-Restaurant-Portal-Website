'use client';

import {
  ChevronRight,
  Gift,
  Heart,
  Home,
  LogOut,
  MapPin,
  Package,
  User,
  Wallet,
  X
} from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function displayPhone(user) {
  if (!user) return "";
  if (user.phone) return user.phone;
  return [user.countryCode, user.contactNumber].filter(Boolean).join(" ");
}

const UserMenuModal = ({
  isOpen,
  onClose,
  onNavigateHome,
  onOpenProfile,
  onOpenOrders,
  onOpenWishlist,
  onOpenAddresses,
  onOpenLoyalty,
  onOpenWallet
}) => {
  const { customerUser, logoutCustomerUser, wishlist, orders } = useRestaurant();
  if (!isOpen || !customerUser) return null;

  const initials = getInitials(customerUser.name);
  const phone = displayPhone(customerUser);
  const userOrdersCount = orders.filter((o) => {
    const matchEmail =
      customerUser.email &&
      o.customerEmail &&
      o.customerEmail.toLowerCase() === customerUser.email.toLowerCase();
    const matchName =
      customerUser.name &&
      o.customerName &&
      o.customerName.toLowerCase() === customerUser.name.toLowerCase();
    return matchEmail || matchName;
  }).length;

  const handleLogout = async () => {
    await logoutCustomerUser();
    onClose();
  };

  const items = [
    {
      id: "home",
      label: "Home",
      hint: "Back to menu & deals",
      icon: Home,
      onClick: () => {
        onClose();
        onNavigateHome?.();
      }
    },
    {
      id: "profile",
      label: "My Profile",
      hint: "Name, email & mobile",
      icon: User,
      onClick: () => {
        onClose();
        onOpenProfile?.();
      }
    },
    {
      id: "orders",
      label: "My Orders",
      hint: "Track & reorder",
      icon: Package,
      badge: userOrdersCount,
      onClick: () => {
        onClose();
        onOpenOrders?.();
      }
    },
    {
      id: "addresses",
      label: "My Addresses",
      hint: "Saved delivery spots",
      icon: MapPin,
      onClick: () => {
        onClose();
        onOpenAddresses?.();
      }
    },
    {
      id: "favourites",
      label: "My Favourites",
      hint: "Wishlisted meals",
      icon: Heart,
      badge: wishlist.length,
      accent: true,
      onClick: () => {
        onClose();
        onOpenWishlist?.();
      }
    },
    {
      id: "loyalty",
      label: "Loyalty",
      hint: "Points & rewards",
      icon: Gift,
      onClick: () => {
        onClose();
        onOpenLoyalty?.();
      }
    },
    {
      id: "wallet",
      label: "Wallet Balance",
      hint: "Credits & refunds",
      icon: Wallet,
      onClick: () => {
        onClose();
        onOpenWallet?.();
      }
    }
  ];

  return (
    <div
      id="user-menu-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/35 px-3 pt-16 backdrop-blur-[2px] animate-in fade-in duration-150 sm:p-4 sm:pt-20"
      onClick={onClose}
    >
      <div
        id="user-account-menu-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative mt-1 w-full max-w-[340px] overflow-hidden rounded-[24px] border border-[#EDEDED] bg-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] animate-in slide-in-from-top-2 duration-200 sm:mt-10 sm:mr-3"
      >
        <div className="relative overflow-hidden border-b border-[#F0F0F0] bg-gradient-to-br from-[#FFF7F7] via-white to-[#FFF9EF] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute top-3.5 right-3.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#EAEAEA] bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#E51B23] text-lg font-black tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(229,27,35,0.8)]">
              {customerUser.profilePitcher ? (
                <img
                  src={customerUser.profilePitcher}
                  alt={customerUser.name || "Profile"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">{initials}</div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-['Outfit'] text-[17px] font-black text-[#191919]">
                {customerUser.name}
              </h3>
              <p className="mt-0.5 truncate text-xs font-medium text-[#888]">
                {phone || customerUser.email}
              </p>
              {phone && customerUser.email ? (
                <p className="mt-0.5 truncate text-[11px] text-[#AAAAAA]">{customerUser.email}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="max-h-[min(70vh,520px)] space-y-0.5 overflow-y-auto p-2.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="group flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 text-left text-[#191919] transition hover:bg-[#FFF5F5]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F7F7] text-[#444] transition group-hover:bg-[#E51B23] group-hover:text-white">
                    <Icon
                      className={`h-4 w-4 ${item.accent ? "text-[#E51B23] group-hover:text-white" : ""}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{item.label}</span>
                      {item.badge > 0 ? (
                        <span className="rounded-full bg-[#E51B23]/10 px-1.5 py-0.5 text-[10px] font-black text-[#E51B23]">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <span className="block text-[11px] text-[#999]">{item.hint}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-[#E51B23]" />
              </button>
            );
          })}

          <div className="mt-1 border-t border-[#F0F0F0] pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[#E51B23] transition hover:bg-red-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#E51B23] transition group-hover:bg-red-100">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { UserMenuModal };
