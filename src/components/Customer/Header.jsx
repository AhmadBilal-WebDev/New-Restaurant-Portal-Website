'use client';

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Phone,
  Clock,
  UtensilsCrossed,
  User,
  MapPin,
  ChevronDown
} from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const Header = ({
  cartCount,
  onOpenCart,
  onOpenSearch,
  onOpenOrders,
  activeSection,
  currentSelection,
  currentBranch,
  onOpenLocationModal,
  onOpenTimetable,
  onOpenUser
}) => {
  const { currentUser, config, formatPrice } = useRestaurant();
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartBadgePulse, setCartBadgePulse] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const userInitials = React.useMemo(() => {
    if (!currentUser?.name) return "U";
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }, [currentUser]);
  const freeDeliveryText = React.useMemo(() => {
    if (!isMounted) return "FREE DELIVERY";
    const threshold = config?.contact?.freeDeliveryThreshold ?? 20;
    return `FREE DELIVERY OVER ${formatPrice(threshold)}`;
  }, [config?.contact?.freeDeliveryThreshold, formatPrice, isMounted]);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  useEffect(() => {
    if (cartCount > 0) {
      setCartBadgePulse(true);
      const timer = setTimeout(() => {
        setCartBadgePulse(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);
  const navItems = [
    { label: "Home", id: "hero-section" },
    { label: "Menu", id: "menu-section" },
    { label: "Deals", id: "deals-section" },
    { label: "About", id: "brand-story-section" },
    { label: "Reviews", id: "reviews-section" }
  ];
  const handleNavClick = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  const handleUserClick = () => {
    if (onOpenUser) {
      onOpenUser();
    } else {
      onOpenOrders();
    }
  };
  return <header className="relative z-50 w-full">
    {
      /* =========================================================
          TOP ANNOUNCEMENT BAR
      ========================================================== */
    }
    <div className="w-full bg-[#191919] text-white">
      <div className="mx-auto flex min-h-[38px] w-full max-w-[1500px] items-center justify-center px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] font-medium sm:text-xs">

          {
            /* Desktop Timetable hours display */
          }
          <div className="hidden items-center gap-1.5 sm:flex">
            <Clock size={13} className="text-[#FDB913]" />
            <span>
              {(() => {
                if (!currentBranch) return "11:00 AM – 02:00 AM";
                if (typeof currentBranch.operatingHours === "string" && currentBranch.operatingHours.trim()) {
                  return currentBranch.operatingHours;
                }
                if (Array.isArray(currentBranch.operatingHours) && currentBranch.operatingHours.length > 0) {
                  const first = currentBranch.operatingHours[0];
                  if (typeof first === "string") return first;
                  if (first && first.open && first.close) return `${first.open} – ${first.close}`;
                }
                return "11:00 AM – 02:00 AM";
              })()}
            </span>
          </div>

          {
            /* REQUIREMENT 1: Mobile Screen ONLY:
               Location text/icon is replaced with Timetable / Opening Hours button */
          }
          <button
            type="button"
            onClick={onOpenTimetable}
            className="flex lg:hidden items-center gap-1.5 transition-opacity hover:opacity-80 text-[#FDB913] cursor-pointer"
            title="View Branch Opening Hours & Timetable"
          >
            <Clock size={13} className="text-[#FDB913]" />
            <span className="font-semibold underline decoration-[#FDB913]/40">Timetable</span>
          </button>

          <div className="hidden items-center gap-1.5 md:flex">
            <Phone size={13} className="text-[#FDB913]" />
            <span>
              {currentBranch?.phone || "(555) 248-3663"}
            </span>
          </div>

          <div className="font-bold text-[#FDB913]">
            {freeDeliveryText}
          </div>
        </div>
      </div>
    </div>

    {
      /* =========================================================
          MAIN HEADER
      ========================================================== */
    }
    <div
      className={`sticky top-0 w-full border-b border-[#E9E2D8] bg-[#FFF9EF] transition-all duration-300 ${isScrolled ? "shadow-md" : ""}`}
    >
      <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5 lg:px-8">

        {
          /* =====================================================
              MOBILE HEADER (lg:hidden)
              LEFT = LOGO
              RIGHT = CART + USER + CONTACT (PHONE)
          ====================================================== */
        }
        <div className="flex min-h-[66px] sm:min-h-[72px] items-center justify-between gap-2 lg:hidden">

          {
            /* MOBILE LOGO */
          }
          <button
            type="button"
            onClick={() => handleNavClick("hero-section")}
            className="flex min-w-0 items-center gap-2 text-left focus:outline-none cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E51B23] text-white shadow-xs">
              <UtensilsCrossed size={20} strokeWidth={2.4} />
            </div>

            <div className="min-w-0 leading-none">
              {
                /* NAME ALWAYS ONE LINE */
              }
              <div className="whitespace-nowrap text-[15px] sm:text-[16px] font-extrabold tracking-tight text-[#191919]">
                Bite &amp; Burger
              </div>

              {
                /* TAGLINE BELOW */
              }
              <div className="mt-1 whitespace-nowrap text-[7.5px] sm:text-[8px] font-semibold tracking-[0.16em] text-[#E51B23]">
                SMASH • CRISP • CRAVE
              </div>
            </div>
          </button>

          {
            /* MOBILE RIGHT ICONS: CART + USER + CONTACT */
          }
          <div className="flex items-center gap-0.5 sm:gap-1">
            {
              /* CART */
            }
            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#191919] transition hover:bg-[#F4EDE2] cursor-pointer"
            >
              <ShoppingBag size={20} />

              {cartCount > 0 && <span
                className={`absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#E51B23] px-1 text-[9px] font-bold text-white ${cartBadgePulse ? "animate-pulse" : ""}`}
              >
                {cartCount}
              </span>}
            </button>

            {
              /* USER / PROFILE (Requirement 2) */
            }
            <button
              type="button"
              onClick={handleUserClick}
              aria-label="Account"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#191919] transition hover:bg-[#F4EDE2] cursor-pointer"
              title={currentUser ? `Logged in as ${currentUser.name}` : "Login / Register"}
            >
              {currentUser ? (
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#E51B23] to-[#FF5A1F] text-xs font-black text-white shadow-xs ring-2 ring-white">
                  {currentUser.profilePitcher ? (
                    <img
                      src={currentUser.profilePitcher}
                      alt={currentUser.name || "Profile"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    userInitials
                  )}
                </div>
              ) : (
                <User size={20} />
              )}
              {currentUser && <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
            </button>

            {
              /* CONTACT / PHONE ICON NEXT TO USER */
            }
            <a
              href={`tel:${(currentBranch?.phone || "(555) 248-3663").replace(/[^0-9+]/g, "")}`}
              aria-label="Call / Contact Restaurant"
              title={`Call ${currentBranch?.phone || "(555) 248-3663"}`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#191919] hover:text-[#E51B23] transition hover:bg-[#F4EDE2]"
            >
              <Phone size={19} />
            </a>
          </div>
        </div>

        {
          /* =====================================================
              DESKTOP HEADER
              LEFT = LOGO + LOCATION
              CENTER = NAV
              RIGHT = SEARCH + BAG + USER
          ====================================================== */
        }
        <div className="hidden min-h-[82px] items-center lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-8">

          {
            /* LEFT SIDE */
          }
          <div className="flex items-center justify-self-start gap-7">

            {
              /* LOGO */
            }
            <div
              onClick={() => handleNavClick("hero-section")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E51B23] text-white">
                <UtensilsCrossed size={22} strokeWidth={2.4} />
              </div>

              <div className="leading-none">
                <div className="whitespace-nowrap text-[18px] font-extrabold tracking-tight text-[#191919]">
                  Bite &amp; Burger
                </div>

                <div className="mt-1 whitespace-nowrap text-[8px] font-semibold tracking-[0.18em] text-[#E51B23]">
                  SMASH • CRISP • CRAVE
                </div>
              </div>
            </div>

            {
              /* LOCATION (DESKTOP REMAINS UNCHANGED) */
            }
            <button
              type="button"
              onClick={onOpenLocationModal}
              className="flex items-center gap-2 rounded-full border border-[#E9E2D8] bg-white px-3 py-2 transition hover:border-[#E51B23] cursor-pointer"
            >
              <MapPin
                size={16}
                className="shrink-0 text-[#E51B23]"
              />

              <div className="text-left leading-none">
                <div className="text-[10px] uppercase font-bold text-[#8C7A6B]">
                  {currentSelection?.orderMode === "pickup" ? "Pickup Branch" : "Delivering to"}
                </div>

                <div className="max-w-[130px] truncate text-[12px] font-bold text-[#191919]">
                  {currentBranch?.shortName || "Renala Khurd"}
                </div>
              </div>

              <ChevronDown size={14} className="text-[#8C7A6B]" />
            </button>
          </div>

          {
            /* CENTER NAVIGATION */
          }
          <nav className="flex items-center justify-center gap-6">
            {navItems.map((item) => <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`text-[14px] font-bold transition cursor-pointer ${activeSection === item.id ? "text-[#E51B23]" : "text-[#191919] hover:text-[#E51B23]"}`}
            >
              {item.label}
            </button>)}
          </nav>

          {
            /* RIGHT SIDE ICONS */
          }
          <div className="flex items-center justify-self-end gap-2">
            {
              /* SEARCH */
            }
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#191919] transition hover:bg-[#F4EDE2] cursor-pointer"
            >
              <Search size={20} />
            </button>

            {
              /* CART */
            }
            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#191919] transition hover:bg-[#F4EDE2] cursor-pointer"
            >
              <ShoppingBag size={20} />

              {cartCount > 0 && <span
                className={`absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E51B23] px-1 text-[9px] font-bold text-white ${cartBadgePulse ? "animate-pulse" : ""}`}
              >
                {cartCount}
              </span>}
            </button>

            {
              /* USER / PROFILE (Requirement 2) */
            }
            <button
              type="button"
              onClick={handleUserClick}
              aria-label="Account"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#191919] transition hover:bg-[#F4EDE2] cursor-pointer"
              title={currentUser ? `Logged in as ${currentUser.name}` : "Login / Register"}
            >
              {currentUser ? (
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#E51B23] to-[#FF5A1F] text-xs font-black text-white shadow-xs ring-2 ring-white">
                  {currentUser.profilePitcher ? (
                    <img
                      src={currentUser.profilePitcher}
                      alt={currentUser.name || "Profile"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    userInitials
                  )}
                </div>
              ) : (
                <User size={20} />
              )}
              {currentUser && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>;
};
var stdin_default = Header;
export {
  Header,
  stdin_default as default
};
