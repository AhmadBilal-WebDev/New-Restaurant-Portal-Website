import { useState, useEffect } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { getOwnerIdentity, getOwnerProfile, publishOwnerIdentity, readAccountKind, subscribeOwnerIdentity } from '@/shared/lib/ownerProfile';
import { getOwnerSession, inferAccountKind } from '@/shared/lib/ownerSession';
import { getStaffRoles } from '@/shared/lib/staffApi';
import { openSettingsTab, SETTINGS_MENU } from '@/shared/lib/settingsNav';
import { useAdminNavigate } from "../useAdminNavigate";
import {
  filterBranchesForStaff,
  getStaffAccess,
  isStaffSession,
  staffLiveBranches
} from '@/shared/lib/staffAccess';
import {
  Menu,
  ChevronDown,
  Moon,
  Sun,
  Bell,
  ShieldCheck,
  LogOut
} from "lucide-react";
const AdminHeader = ({ onToggleSidebar, onLogout }) => {
  const {
    activeAdminTab,
    branches,
    activeBranchFilter,
    setActiveBranchFilter,
    orders,
    adminTheme,
    toggleAdminTheme,
    isThemeSaving,
    addToast,
  } = useRestaurant();
  const navigateAdmin = useAdminNavigate();
  const [timeString, setTimeString] = useState(() => {
    const now = /* @__PURE__ */ new Date();
    return now.toTimeString().split(" ")[0];
  });
  const isDarkMode = adminTheme === "dark";

  const handleThemeToggle = async () => {
    if (isThemeSaving) return;
    const next = isDarkMode ? "light" : "dark";
    const result = await toggleAdminTheme();
    if (result?.ok === false) {
      addToast(
        "Theme not saved",
        result.message || "Could not update theme on the server.",
        "error",
      );
      return;
    }
    addToast(
      "Theme Updated",
      next === "dark"
        ? "Dark mode enabled (black background)."
        : "Light mode enabled (white background).",
      "success",
    );
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [identity, setIdentity] = useState(getOwnerIdentity);
  const [accountKind, setAccountKind] = useState(readAccountKind);
  const [createdRoles, setCreatedRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const isStaffUser = accountKind === "staff" || isStaffSession();
  const staffAccess = isStaffUser ? getStaffAccess() : null;
  const visibleBranches = filterBranchesForStaff(branches, staffAccess);
  const liveVisibleBranches = staffLiveBranches(branches, staffAccess);
  const canSwitchBranches = liveVisibleBranches.length > 1;
  const singleStaffBranch = isStaffUser && liveVisibleBranches.length === 1 ? liveVisibleBranches[0] : null;
  const activeRole = createdRoles.find((role) => role.id === selectedRoleId) || createdRoles[0];
  const activeRoleLabel = isStaffUser && staffAccess?.roleName ? staffAccess.roleName : activeRole?.roleName || "Roles";
  useEffect(() => {
    const unsubscribe = subscribeOwnerIdentity(() => {
      setIdentity(getOwnerIdentity());
      setAccountKind(readAccountKind());
    });
    const session = getOwnerSession();
    const staffScope = getStaffAccess();
    if (inferAccountKind(session?.owner, session?.token) === "staff" || staffScope) {
      publishOwnerIdentity({
        accountKind: "staff",
        ...staffScope?.firstName ? { ownerFirstName: staffScope.firstName } : {},
        ...staffScope?.lastName ? { ownerLastName: staffScope.lastName } : {},
        ...staffScope?.email ? { ownerEmail: staffScope.email } : {}
      });
    }
    getOwnerProfile().then((result) => {
      if (!result.ok || !result.data || typeof result.data !== "object") return;
      const raw = result.data;
      const nested = raw.profile ?? raw.data;
      const profile = nested && typeof nested === "object" ? nested : raw;
      const text = (value) => typeof value === "string" ? value : "";
      const profileKind = inferAccountKind(profile, null);
      const sessionKind = inferAccountKind(getOwnerSession()?.owner, getOwnerSession()?.token);
      const staff = Boolean(getStaffAccess()) || profileKind === "staff" || sessionKind === "staff";
      publishOwnerIdentity({
        ownerFirstName: text(profile.ownerFirstName) || text(profile.firstName) || staffScope?.firstName || "",
        ownerLastName: text(profile.ownerLastName) || text(profile.lastName) || staffScope?.lastName || "",
        ownerEmail: text(profile.ownerEmail) || text(profile.email) || staffScope?.email || "",
        restaurantName: text(profile.name) || text(profile.restaurantName),
        profilePitcher: text(profile.profilePitcher),
        ...staff ? { accountKind: "staff" } : {}
      });
    });
    if (!isStaffSession()) {
      const domain = typeof window !== "undefined" ? window.location.origin : "";
      getStaffRoles(domain).then((result) => {
        if (!result.ok) return;
        const email = (getOwnerSession()?.email || "").trim().toLowerCase();
        const matched = Boolean(email) && result.roles.some((role) => role.email.trim().toLowerCase() === email);
        if (matched || readAccountKind() === "staff") {
          publishOwnerIdentity({ accountKind: "staff" });
          return;
        }
        setCreatedRoles(result.roles);
      });
    }
    return unsubscribe;
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = /* @__PURE__ */ new Date();
      setTimeString(now.toTimeString().split(" ")[0]);
    }, 1e3);
    return () => clearInterval(timer);
  }, []);
  const getTabTitle = (tab) => {
    switch (tab) {
      case "dashboard":
        return "Dashboard";
      case "counter":
        return "POS / Counter";
      case "orders":
        return "Orders Management";
      case "kitchen":
        return "Kitchen Display";
      case "pos":
        return "POS Integration";
      case "tables":
        return "Tables & Reservations";
      case "ops_delivery":
        return "Delivery Operations";
      case "products":
        return "Products & Menu";
      case "categories":
        return "Categories";
      case "variants":
        return "Variants & Add-ons";
      case "availability":
        return "Availability";
      case "inventory":
        return "Inventory";
      case "branches":
        return "Branches";
      case "areas":
      case "areas-towns":
        return "Areas & Towns";
      case "deals":
        return "Deals & Combos";
      case "riders":
        return "Delivery Riders";
      case "delivery_zones":
        return "Delivery Zones";
      case "reviews":
        return "Customer Reviews";
      case "subscribers":
        return "Email Subscribers";
      case "hero_banners":
      case "hero-banners":
        return "Hero Banners";
      case "coupons":
        return "Coupons & Discounts";
      case "customers":
        return "Customers";
      case "timetables":
        return "Branch Hours";
      case "staff":
        return "Staff & Roles";
      case "all_staff":
      case "all-staff":
        return "All Staff";
      case "add_staff":
      case "create-staff":
        return "Add Staff";
      case "analytics":
        return "Analytics";
      case "reports":
        return "Reports";
      case "payments":
        return "Payments";
      case "expenses":
        return "Expenses";
      case "settings":
        return "Settings";
      default:
        return tab ? tab.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Dashboard";
    }
  };
  const hasBranches = visibleBranches.length > 0;
  const liveBranchCount = liveVisibleBranches.length;
  const activeBranchName = !hasBranches ? "Branch not yet" : singleStaffBranch ? singleStaffBranch.shortName || singleStaffBranch.name : activeBranchFilter === "all" ? `All Branches (${liveBranchCount})` : (() => {
    const selected = visibleBranches.find((b) => b.id === activeBranchFilter);
    if (!selected) return `All Branches (${liveBranchCount})`;
    return selected.shortName || selected.name;
  })();
  const pendingOrdersCount = orders.filter((o) => {
    if (o.status !== "received" && o.status !== "preparing") return false;
    if (activeBranchFilter === "all") {
      return liveVisibleBranches.some((b) => b.id === o.branchId);
    }
    return o.branchId === activeBranchFilter;
  }).length;
  const renderBranchRows = (compact) => visibleBranches.map((b) => {
    const deactive = b.isActive === false;
    const selected = activeBranchFilter === b.id;
    return <button
      key={b.id}
      type="button"
      disabled={deactive}
      title={deactive ? "This branch is deactivated" : `Switch to ${b.name}`}
      onClick={() => {
        if (deactive) return;
        setActiveBranchFilter(b.id);
        setShowBranchDropdown(false);
      }}
      className={`w-full text-left ${compact ? "px-3 py-2" : "px-3.5 py-2"} flex items-center justify-between transition-colors ${deactive ? "text-neutral-500 opacity-60 cursor-not-allowed" : selected ? "text-[#FF5A1F] font-bold bg-[#FF5A1F]/10 hover:bg-[#252830] cursor-pointer" : "text-neutral-300 hover:bg-[#252830] cursor-pointer"}`}
    >
      <span className="truncate">{b.name}</span>
      <span
        className={`text-[10px] ml-1 shrink-0 ${deactive ? "text-amber-400 font-bold" : "text-emerald-400"}`}
      >
        {deactive ? "Deactive" : "Live"}
      </span>
    </button>;
  });
  const renderBranchControl = (opts) => {
    if (singleStaffBranch || !canSwitchBranches) {
      return <div
        className={`flex items-center gap-1.5 bg-[#191B20] border border-[#292D35] text-neutral-200 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl ${opts.className}`}
        title={activeBranchName}
      >
        <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${hasBranches ? "bg-[#00D084]" : "bg-neutral-500"}`} />
        <span className="max-w-[90px] sm:max-w-[160px] truncate">{activeBranchName}</span>
      </div>;
    }
    return <div
      className={`relative ${opts.className}`}
      onMouseEnter={() => {
        setShowBranchDropdown(true);
        setShowRoleDropdown(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
      }}
      onMouseLeave={() => setShowBranchDropdown(false)}
    >
      <button
        type="button"
        onClick={() => setShowBranchDropdown((open) => !open)}
        title="Select branch"
        className={`flex items-center gap-1.5 sm:gap-2 bg-[#191B20] hover:bg-[#252830] border border-[#292D35] text-neutral-200 font-semibold rounded-lg sm:rounded-xl transition-colors cursor-pointer ${opts.compact ? "text-[11px] px-2 py-1.5" : "text-xs px-3 py-2"}`}
      >
        <span className={`rounded-full ${hasBranches ? "bg-[#00D084]" : "bg-neutral-500"} ${opts.compact ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
        <span className={`truncate ${opts.compact ? "max-w-[90px]" : "max-w-[72px] sm:max-w-[160px]"}`}>
          {activeBranchName}
        </span>
        <ChevronDown className={`text-neutral-400 ${opts.compact ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
      </button>
      {showBranchDropdown && <div
        className={`absolute top-full mt-2 before:absolute before:-top-2 before:left-0 before:h-2 before:w-full before:content-[''] bg-[#191B20] border border-[#292D35] rounded-xl shadow-2xl py-1.5 z-50 text-xs ${opts.compact ? "left-0 w-52" : "right-0 w-56 animate-in fade-in zoom-in-95"}`}
      >
        {!opts.compact && <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
          Select Active Branch
        </div>}
        {!hasBranches ? <div className={`text-neutral-500 ${opts.compact ? "px-3 py-2" : "px-3.5 py-2"}`}>
          Branch not yet
        </div> : <>
          <button
            type="button"
            onClick={() => {
              setActiveBranchFilter("all");
              setShowBranchDropdown(false);
            }}
            className={`w-full text-left hover:bg-[#252830] cursor-pointer flex items-center justify-between transition-colors ${opts.compact ? "px-3 py-2" : "px-3.5 py-2"} ${activeBranchFilter === "all" ? "text-[#FF5A1F] font-bold bg-[#FF5A1F]/10" : "text-neutral-300"}`}
          >
            <span>All Branches</span>
            <span className="text-[10px] text-neutral-500 font-bold">{liveBranchCount}</span>
          </button>
          {renderBranchRows(opts.compact)}
        </>}
      </div>}
    </div>;
  };
  return <header className="h-16 sm:h-[74px] bg-[#101216] border-b border-[#292D35] px-3 sm:px-4 lg:px-7 flex items-center justify-between gap-2 sticky top-0 z-30 select-none">
    {
      /* Left: Hamburger (mobile) + Page Title */
    }
    <div className="flex items-center gap-3">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#191B20] transition-colors cursor-pointer"
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white tracking-tight truncate max-w-[28vw] sm:max-w-none">
        {getTabTitle(activeAdminTab)}
      </h1>

      {renderBranchControl({ compact: true, className: "md:hidden" })}
    </div>

    {
      /* Right Controls */
    }
    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
      {isStaffUser ? <div
        className="hidden md:flex items-center gap-1.5 bg-[#191B20] border border-[#292D35] text-neutral-200 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl"
        title={activeRoleLabel}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline font-bold">Role:</span>
        <span className="text-white max-w-[120px] truncate">{activeRoleLabel}</span>
      </div> : <div
        className="relative hidden md:block"
        onMouseEnter={() => {
          setShowRoleDropdown(true);
          setShowBranchDropdown(false);
          setShowProfileMenu(false);
          setShowNotifications(false);
        }}
        onMouseLeave={() => setShowRoleDropdown(false)}
      >
        <button
          onClick={() => {
            setShowRoleDropdown(!showRoleDropdown);
            setShowBranchDropdown(false);
          }}
          className="flex items-center gap-1.5 bg-[#191B20] hover:bg-[#252830] border border-[#292D35] text-neutral-200 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl transition-colors cursor-pointer"
          title="View roles"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline font-bold">Role:</span>
          <span className="text-white max-w-[100px] truncate">{activeRoleLabel}</span>
          <ChevronDown className="w-3 h-3 text-neutral-400" />
        </button>

        {showRoleDropdown && <div className="absolute right-0 top-full mt-2 before:absolute before:-top-2 before:left-0 before:h-2 before:w-full before:content-[''] w-64 bg-[#191B20] border border-[#292D35] rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            Roles
          </div>
          {createdRoles.length === 0 ? <div className="px-3.5 py-2 text-neutral-500">No roles yet</div> : createdRoles.map((role) => {
            const person = `${role.firstName} ${role.lastName}`.trim();
            const label = role.roleName || "Role";
            const selected = role.id === activeRole?.id;
            return <button
              key={role.id}
              type="button"
              title={label}
              onClick={() => {
                setSelectedRoleId(role.id);
                setShowRoleDropdown(false);
              }}
              className={`w-full text-left px-3.5 py-2 hover:bg-[#252830] transition-colors cursor-pointer ${selected ? "bg-[#FF5A1F]/15 text-[#FF5A1F] font-bold" : "text-neutral-300"}`}
            >
              <div className="font-bold">{label}</div>
              {person && <div className="text-[10px] text-neutral-500">{person}</div>}
            </button>;
          })}
        </div>}
      </div>}

      {renderBranchControl({ compact: false, className: "hidden md:block" })}

      {
        /* Live Monospace Digital Clock */
      }
      <div className="hidden lg:flex items-center px-3 py-1.5 bg-[#191B20] border border-[#292D35] rounded-xl text-neutral-300 font-mono text-xs tracking-wider shadow-inner">
        <span className="text-[#00D084] mr-1.5">●</span>
        {timeString}
      </div>

      {
        /* Theme Toggle Button */
      }
      <button
        type="button"
        onClick={handleThemeToggle}
        disabled={isThemeSaving}
        className="flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--admin-elevated,#191B20)] hover:bg-[var(--admin-hover,#252830)] border border-[var(--admin-border,#292D35)] text-[var(--admin-subtle,#a3a3a3)] hover:text-[var(--admin-text,#fff)] items-center justify-center transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Theme mode"
        aria-busy={isThemeSaving}
      >
        {isDarkMode ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4 text-amber-400" />
        )}
      </button>

      {
        /* Notifications Bell */
      }
      <div
        className="relative"
        onMouseEnter={() => {
          setShowNotifications(true);
          setShowRoleDropdown(false);
          setShowBranchDropdown(false);
          setShowProfileMenu(false);
        }}
        onMouseLeave={() => setShowNotifications(false)}
      >
        <button
          onClick={() => setShowNotifications((open) => !open)}
          className="w-10 h-10 rounded-xl bg-[#191B20] hover:bg-[#252830] border border-[#292D35] text-neutral-400 hover:text-white flex items-center justify-center relative transition-colors cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {pendingOrdersCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF5A1F] ring-2 ring-[#191B20] animate-pulse" />}
        </button>

        {showNotifications && <div className="absolute right-0 top-full mt-2 before:absolute before:-top-2 before:left-0 before:h-2 before:w-full before:content-[''] w-80 bg-[#191B20] border border-[#292D35] rounded-xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-[#292D35] mb-2">
            <span className="font-bold text-white">Notifications</span>
            <span className="text-[10px] bg-[#FF5A1F]/20 text-[#FF5A1F] px-1.5 py-0.5 rounded-full font-semibold">
              {pendingOrdersCount} Active
            </span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
            {orders.slice(0, 4).map((ord) => <div key={ord.orderId} className="p-2 rounded-lg bg-[#101216] border border-[#292D35]/60">
              <div className="flex items-center justify-between font-bold text-neutral-200">
                <span>Order {ord.orderNumber}</span>
                <span className="text-[10px] text-emerald-400 uppercase">{ord.status}</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {ord.customerName} • {ord.branchName}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">{ord.createdAt}</div>
            </div>)}
          </div>
        </div>}
      </div>

      <div
        className="relative"
        onMouseEnter={() => {
          setShowProfileMenu(true);
          setShowRoleDropdown(false);
          setShowBranchDropdown(false);
          setShowNotifications(false);
        }}
        onMouseLeave={() => setShowProfileMenu(false)}
      >
        <button
          type="button"
          onClick={() => {
            setShowProfileMenu((open) => !open);
            setShowNotifications(false);
            setShowBranchDropdown(false);
            setShowRoleDropdown(false);
          }}
          title="Open profile menu"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FF5A1F]/15 border border-[#FF5A1F]/40 text-[#FF5A1F] font-extrabold text-xs shadow-xs overflow-hidden hover:scale-105 hover:border-[#FF5A1F] transition-all cursor-pointer"
        >
          {identity.profilePitcher ? <img src={identity.profilePitcher} alt="Profile photo" className="w-full h-full object-cover" /> : (identity.ownerFirstName || "O").charAt(0).toUpperCase()}
        </button>
        {showProfileMenu && <div className="absolute right-0 top-full mt-2 before:absolute before:-top-2 before:left-0 before:h-2 before:w-full before:content-[''] w-56 bg-[#191B20] border border-[#292D35] rounded-2xl shadow-2xl py-2 z-50 text-xs">
          <div className="px-3.5 py-2 border-b border-[#292D35]">
            <div className="font-bold text-white truncate">
              {[identity.ownerFirstName, identity.ownerLastName].filter(Boolean).join(" ") || "Owner"}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{identity.ownerEmail || "No email"}</div>
          </div>
          <div className="px-3.5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Settings</div>
          {SETTINGS_MENU.map((item) => <button
            key={item.id}
            type="button"
            title={item.title}
            onClick={() => {
              openSettingsTab(item.id);
              navigateAdmin("settings");
              setShowProfileMenu(false);
            }}
            className="w-full text-left px-3.5 py-2 text-neutral-300 hover:text-white hover:bg-[#252830] transition-colors cursor-pointer"
          >
            {item.label}
          </button>)}
          {onLogout && <button
            type="button"
            title="Log out"
            onClick={() => {
              setShowProfileMenu(false);
              onLogout();
            }}
            className="w-full text-left px-3.5 py-2 mt-1 border-t border-[#292D35] text-red-300 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>}
        </div>}
      </div>
    </div>
  </header>;
};
export {
  AdminHeader
};
