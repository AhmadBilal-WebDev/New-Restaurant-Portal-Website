'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Camera,
  CheckCircle2,
  Gift,
  Heart,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Package,
  ShoppingBag,
  Trash2,
  User,
  Wallet
} from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  deleteCustomerAccount,
  getCustomerProfile,
  removeCustomerProfilePitcher,
  updateCustomerProfileApi,
  uploadCustomerProfilePitcher
} from '@/shared/lib/customerAuthApi';

const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "profile", label: "My Profile", icon: User },
  { id: "orders", label: "My Orders", icon: Package },
  { id: "addresses", label: "My Addresses", icon: MapPin },
  { id: "favourites", label: "My Favourites", icon: Heart },
  { id: "loyalty", label: "Loyalty", icon: Gift },
  { id: "wallet", label: "Wallet Balance", icon: Wallet }
];

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

function splitPhone(user) {
  const code = String(user?.countryCode || "").trim() || "+92";
  let number = String(user?.contactNumber || "").trim();
  if (!number && user?.phone) {
    const raw = String(user.phone).replace(/\s+/g, "");
    if (raw.startsWith(code.replace(/\s+/g, ""))) {
      number = raw.slice(code.replace(/\s+/g, "").length);
    } else {
      number = raw.replace(/^\+\d{1,3}/, "");
    }
  }
  return { countryCode: code, contactNumber: number.replace(/[^0-9]/g, "") };
}

function ProfilePanel({ onAccountDeleted }) {
  const {
    customerUser,
    updateCustomerProfile,
    completeCustomerAuth,
    clearCustomerSession,
    addToast
  } = useRestaurant();
  const fileRef = useRef(null);
  const phoneParts = splitPhone(customerUser);

  const [name, setName] = useState(customerUser?.name || "");
  const [email, setEmail] = useState(customerUser?.email || "");
  const [countryCode, setCountryCode] = useState(phoneParts.countryCode);
  const [contactNumber, setContactNumber] = useState(phoneParts.contactNumber);
  const [gender, setGender] = useState(customerUser?.gender || "male");
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const applyUserToForm = (user) => {
    if (!user) return;
    const parts = splitPhone(user);
    setName(user.name || "");
    setEmail(user.email || "");
    setCountryCode(parts.countryCode);
    setContactNumber(parts.contactNumber);
    setGender(user.gender || "male");
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingProfile(true);
      try {
        const result = await getCustomerProfile();
        if (cancelled) return;
        if (result.ok && result.user) {
          completeCustomerAuth({ user: result.user, branch: result.branch });
          applyUserToForm(result.user);
        } else {
          applyUserToForm(customerUser);
        }
      } catch {
        if (!cancelled) applyUserToForm(customerUser);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const avatarSrc = previewUrl || customerUser?.profilePitcher || "";
  const initials = getInitials(customerUser?.name || name);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage({ type: "", text: "" }), 3200);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showMessage("error", "Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Image must be under 5MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const result = await uploadCustomerProfilePitcher(file);
      if (!result.ok) {
        showMessage("error", result.message || "Upload failed.");
        return;
      }
      updateCustomerProfile({
        ...(result.user || {}),
        profilePitcher: result.url || result.user?.profilePitcher || customerUser?.profilePitcher
      });
      showMessage("success", result.message || "Profile photo updated.");
      addToast("Photo Updated", "Your profile picture was uploaded.", "success");
    } catch {
      showMessage("error", "Network error while uploading photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!customerUser?.profilePitcher && !previewUrl) return;
    setRemovingPhoto(true);
    try {
      const result = await removeCustomerProfilePitcher();
      if (!result.ok) {
        showMessage("error", result.message || "Could not remove photo.");
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      updateCustomerProfile({
        ...(result.user || {}),
        profilePitcher: ""
      });
      showMessage("success", result.message || "Profile photo removed.");
      addToast("Photo Removed", "Your profile picture was deleted.", "info");
    } catch {
      showMessage("error", "Network error while removing photo.");
    } finally {
      setRemovingPhoto(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const result = await deleteCustomerAccount();
      if (!result.ok) {
        showMessage("error", result.message || "Could not delete account.");
        setConfirmDelete(false);
        return;
      }
      addToast("Account Deleted", result.message || "Your account has been permanently removed.", "info");
      clearCustomerSession();
      onAccountDeleted?.();
    } catch {
      showMessage("error", "Network error while deleting account.");
      setConfirmDelete(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showMessage("error", "Please enter your full name.");
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim().length < 7) {
      showMessage("error", "Please enter a valid mobile number.");
      return;
    }
    if (!gender) {
      showMessage("error", "Please select your gender.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        gender,
        countryCode: countryCode.trim() || "+92",
        contactNumber: contactNumber.trim()
      };
      const result = await updateCustomerProfileApi(payload);
      if (!result.ok) {
        showMessage("error", result.message || "Could not update profile.");
        return;
      }
      updateCustomerProfile({
        ...(result.user || {}),
        ...payload,
        phone: `${payload.countryCode} ${payload.contactNumber}`
      });
      if (result.user) applyUserToForm({ ...result.user, ...payload });
      showMessage("success", result.message || "Profile updated successfully.");
      addToast("Profile Updated", "Your details were saved.", "success");
    } catch {
      showMessage("error", "Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3.5 text-sm font-medium text-[#191919] outline-none transition focus:border-[#E51B23] focus:bg-white focus:ring-2 focus:ring-[#E51B23]/15";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="font-['Outfit'] text-2xl font-black tracking-tight text-[#191919] sm:text-[28px]">
          Profile
        </h1>
        <p className="mt-1 text-sm text-[#777]">
          Keep your account details up to date. Photo is optional.
        </p>
      </div>

      {loadingProfile ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-8 text-sm font-semibold text-[#777]">
          <Loader2 className="h-4 w-4 animate-spin text-[#E51B23]" />
          Loading profile…
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 sm:p-5">
            <div className="relative shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-[#E51B23] shadow-md sm:h-24 sm:w-24">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={name || "Profile"}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute -right-1 -bottom-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#191919] text-white shadow-md transition hover:bg-[#E51B23] disabled:opacity-60"
                aria-label="Upload profile photo"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-[#191919]">{name || "Your name"}</p>
              <p className="mt-0.5 truncate text-xs text-[#888]">{email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={uploading || removingPhoto}
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer text-xs font-bold text-[#E51B23] hover:underline disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : avatarSrc ? "Change photo" : "Upload photo"}
                </button>
                {avatarSrc ? (
                  <button
                    type="button"
                    disabled={uploading || removingPhoto}
                    onClick={() => void handleRemovePhoto()}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#888] hover:text-red-600 disabled:opacity-60"
                  >
                    {removingPhoto ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {message.text ? (
            <div
              className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs font-semibold ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message.type === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[#191919]">Full Name</label>
              <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[#191919]">Email</label>
              <input className={`${fieldClass} cursor-not-allowed opacity-80`} value={email} readOnly />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[#191919]">Mobile Number</label>
              <div className="flex overflow-hidden rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] focus-within:border-[#E51B23] focus-within:ring-2 focus-within:ring-[#E51B23]/15">
                <input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/[^\d+]/g, "").slice(0, 5))}
                  className="w-[88px] border-r border-[#E8E8E8] bg-[#EEEEEE] px-3 py-3.5 text-center text-sm font-bold text-[#191919] outline-none"
                  aria-label="Country code"
                />
                <input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="3001234567"
                  className="w-full bg-transparent px-4 py-3.5 text-sm font-medium text-[#191919] outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-semibold text-[#191919]">Gender</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "male", label: "Male" },
                  { id: "female", label: "Female" }
                ].map((option) => {
                  const active = gender === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setGender(option.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-bold transition ${
                        active
                          ? "border-[#E51B23] bg-[#E51B23] text-white"
                          : "border-[#D8D8D8] bg-white text-[#191919] hover:border-[#E51B23]/40"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          active ? "border-white" : "border-[#C4C4C4]"
                        }`}
                      >
                        {active ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || uploading || removingPhoto || deletingAccount}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E51B23] px-8 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_28px_-14px_rgba(229,27,35,0.7)] transition hover:bg-[#C4161D] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 sm:p-5">
            <h3 className="text-sm font-black text-red-700">Delete account</h3>
            <p className="mt-1 text-xs leading-relaxed text-red-600/90">
              Permanently remove your account and profile data. This cannot be undone.
            </p>
            {!confirmDelete ? (
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setConfirmDelete(true)}
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-xs font-extrabold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete my account
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-xs font-semibold text-red-700">
                  Are you sure? Your account will be deleted permanently.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={deletingAccount}
                    onClick={() => void handleDeleteAccount()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {deletingAccount ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {deletingAccount ? "Deleting…" : "Yes, delete forever"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingAccount}
                    onClick={() => setConfirmDelete(false)}
                    className="cursor-pointer rounded-xl border border-[#E0E0E0] bg-white px-4 py-2.5 text-xs font-bold text-[#555] hover:bg-[#F7F7F7] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function OrdersPanel({ onReorder, onExploreMenu }) {
  const { customerUser, orders, riders, formatPrice } = useRestaurant();
  const [selectedId, setSelectedId] = useState(null);

  const userOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (!customerUser) return false;
        const matchEmail =
          customerUser.email &&
          o.customerEmail &&
          o.customerEmail.toLowerCase() === customerUser.email.toLowerCase();
        const matchPhone =
          customerUser.phone &&
          o.customerPhone &&
          o.customerPhone.replace(/[^0-9]/g, "") ===
            customerUser.phone.replace(/[^0-9]/g, "");
        const matchName =
          customerUser.name &&
          o.customerName &&
          o.customerName.toLowerCase() === customerUser.name.toLowerCase();
        return matchEmail || matchPhone || matchName;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, customerUser]);

  const active = userOrders.find((o) => o.orderId === selectedId) || userOrders[0] || null;
  const rider = active?.assignedRiderId
    ? riders.find((r) => r.id === active.assignedRiderId)
    : riders[0];

  return (
    <div>
      <h1 className="font-['Outfit'] text-2xl font-black tracking-tight text-[#191919] sm:text-[28px]">
        My Orders
      </h1>
      <p className="mt-1 text-sm text-[#777]">Track deliveries and reorder your favourites</p>

      {userOrders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-6 py-14 text-center">
          <ShoppingBag className="mb-3 h-10 w-10 text-[#E51B23]" />
          <h3 className="font-['Outfit'] text-lg font-black text-[#191919]">No orders yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#777]">
            Place your first order and it will show up here with live tracking.
          </p>
          <button
            type="button"
            onClick={onExploreMenu}
            className="mt-5 cursor-pointer rounded-xl bg-[#E51B23] px-6 py-3 text-sm font-extrabold text-white"
          >
            Explore Menu
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            {userOrders.map((order) => {
              const selected = (active?.orderId || active?.id) === (order.orderId || order.id);
              return (
                <button
                  key={order.orderId || order.id}
                  type="button"
                  onClick={() => setSelectedId(order.orderId)}
                  className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[#E51B23]/40 bg-[#FFF5F5]"
                      : "border-[#EAEAEA] bg-white hover:border-[#E51B23]/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-[#191919]">
                        {order.orderNumber || order.orderId}
                      </p>
                      <p className="mt-0.5 text-xs text-[#888]">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#E51B23]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E51B23]">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#191919]">
                    {formatPrice?.(order.total || order.grandTotal || 0)}
                  </p>
                </button>
              );
            })}
          </div>

          {active ? (
            <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 lg:col-span-7">
              <div className="flex items-center gap-2 text-sm font-bold text-[#191919]">
                <Bike className="h-4 w-4 text-[#E51B23]" />
                Live status: <span className="capitalize text-[#E51B23]">{active.status}</span>
              </div>
              {rider ? (
                <p className="mt-2 text-xs text-[#777]">
                  Rider: {rider.name} {rider.phone ? `· ${rider.phone}` : ""}
                </p>
              ) : null}
              <div className="mt-4 space-y-2 border-t border-[#F0F0F0] pt-4">
                {(active.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="font-medium text-[#333]">
                      {item.quantity || 1}× {item.name}
                    </span>
                    <span className="font-bold text-[#191919]">
                      {formatPrice?.(item.price * (item.quantity || 1) || 0)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onReorder?.(active.items || [])}
                className="mt-5 cursor-pointer rounded-xl border border-[#E51B23] px-4 py-2.5 text-xs font-extrabold text-[#E51B23] transition hover:bg-[#E51B23] hover:text-white"
              >
                Reorder
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FavouritesPanel({ onSelectProduct, onQuickAdd, onExploreMenu }) {
  const { wishlist, products, toggleWishlist, clearWishlist, formatPrice } = useRestaurant();
  const items = products.filter((p) => wishlist.includes(p.id));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-['Outfit'] text-2xl font-black tracking-tight text-[#191919] sm:text-[28px]">
            My Favourites
          </h1>
          <p className="mt-1 text-sm text-[#777]">{items.length} saved items</p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearWishlist}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#888] transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-6 py-14 text-center">
          <Heart className="mb-3 h-10 w-10 text-[#E51B23]" />
          <h3 className="font-['Outfit'] text-lg font-black text-[#191919]">No favourites yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#777]">
            Tap the heart on any meal to save it here.
          </p>
          <button
            type="button"
            onClick={onExploreMenu}
            className="mt-5 cursor-pointer rounded-xl bg-[#E51B23] px-6 py-3 text-sm font-extrabold text-white"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white transition hover:border-[#E51B23]/30 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => onSelectProduct?.(product)}
                className="block w-full cursor-pointer text-left"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#F3F3F3]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-['Outfit'] text-base font-black text-[#191919] line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-[#E51B23]">
                    {formatPrice?.(product.price)}
                  </p>
                </div>
              </button>
              <div className="flex gap-2 border-t border-[#F0F0F0] px-4 py-3">
                <button
                  type="button"
                  onClick={() => onQuickAdd?.(product)}
                  className="flex-1 cursor-pointer rounded-lg bg-[#E51B23] py-2 text-xs font-extrabold text-white"
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className="cursor-pointer rounded-lg border border-[#EAEAEA] px-3 text-[#E51B23]"
                  aria-label="Remove favourite"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceholderPanel({ title, subtitle, icon: Icon }) {
  return (
    <div>
      <h1 className="font-['Outfit'] text-2xl font-black tracking-tight text-[#191919] sm:text-[28px]">
        {title}
      </h1>
      <p className="mt-1 text-sm text-[#777]">{subtitle}</p>
      <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-6 py-16 text-center">
        <Icon className="mb-3 h-10 w-10 text-[#E51B23]" />
        <h3 className="font-['Outfit'] text-lg font-black text-[#191919]">Coming soon</h3>
        <p className="mt-1 max-w-sm text-sm text-[#777]">
          This section will connect to live APIs next. For now your profile, orders and favourites
          are ready.
        </p>
      </div>
    </div>
  );
}

function CustomerAccountPage({
  isOpen,
  onClose,
  initialSection = "profile",
  onGoHome,
  onSelectProduct,
  onQuickAdd,
  onReorder,
  onExploreMenu
}) {
  const { customerUser, logoutCustomerUser, wishlist, orders } = useRestaurant();
  const [section, setSection] = useState(initialSection);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSection(initialSection || "profile");
      setMobileNavOpen(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialSection]);

  const userOrdersCount = useMemo(() => {
    if (!customerUser) return 0;
    return orders.filter((o) => {
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
  }, [orders, customerUser]);

  if (!isOpen || !customerUser) return null;

  const initials = getInitials(customerUser.name);
  const phone = displayPhone(customerUser);

  const handleNav = (id) => {
    if (id === "home") {
      onClose();
      onGoHome?.();
      return;
    }
    setSection(id);
    setMobileNavOpen(false);
  };

  const handleLogout = async () => {
    await logoutCustomerUser();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#F3F3F3] animate-in fade-in duration-200">
      <div className="mx-auto flex h-full max-w-[1400px] flex-col lg:flex-row lg:gap-5 lg:p-5">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-[#E8E8E8] bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-2 text-xs font-bold text-[#191919]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="cursor-pointer rounded-full bg-[#FFF1F1] px-3 py-2 text-xs font-bold text-[#E51B23]"
          >
            {mobileNavOpen ? "Close menu" : "Account menu"}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`${
            mobileNavOpen ? "flex" : "hidden"
          } w-full flex-col border-b border-[#E8E8E8] bg-white lg:flex lg:w-[300px] lg:shrink-0 lg:rounded-2xl lg:border lg:border-[#EAEAEA] lg:shadow-sm`}
        >
          <div className="hidden items-center justify-between px-4 pt-4 lg:flex">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-2 text-xs font-bold text-[#191919] transition hover:bg-[#EEEEEE]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to site
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-[#F0F0F0] px-5 py-5">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#E51B23] text-base font-black tracking-wide text-white">
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
              <p className="truncate font-['Outfit'] text-base font-black text-[#191919]">
                {customerUser.name}
              </p>
              <p className="truncate text-xs font-medium text-[#888]">{phone || customerUser.email}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-2 py-3">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              const badge =
                item.id === "orders"
                  ? userOrdersCount
                  : item.id === "favourites"
                    ? wishlist.length
                    : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-[#FFF1F1] text-[#E51B23]"
                      : "text-[#333] hover:bg-[#F7F7F7]"
                  }`}
                >
                  {active ? (
                    <span className="absolute top-2 bottom-2 right-0 w-[3px] rounded-l-full bg-[#E51B23]" />
                  ) : null}
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-[#E51B23]" : "text-[#666]"}`} />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 ? (
                    <span className="rounded-full bg-[#E51B23]/10 px-2 py-0.5 text-[10px] font-black text-[#E51B23]">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[#F0F0F0] p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-[#E51B23] transition hover:bg-[#FFF1F1]"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:rounded-2xl lg:border lg:border-[#EAEAEA] lg:p-8 lg:shadow-sm">
          {section === "profile" ? (
            <ProfilePanel
              onAccountDeleted={() => {
                onClose();
              }}
            />
          ) : null}
          {section === "orders" ? (
            <OrdersPanel
              onReorder={onReorder}
              onExploreMenu={() => {
                onClose();
                onExploreMenu?.();
              }}
            />
          ) : null}
          {section === "favourites" ? (
            <FavouritesPanel
              onSelectProduct={(product) => {
                onClose();
                onSelectProduct?.(product);
              }}
              onQuickAdd={onQuickAdd}
              onExploreMenu={() => {
                onClose();
                onExploreMenu?.();
              }}
            />
          ) : null}
          {section === "addresses" ? (
            <PlaceholderPanel
              title="My Addresses"
              subtitle="Saved delivery locations"
              icon={MapPin}
            />
          ) : null}
          {section === "loyalty" ? (
            <PlaceholderPanel
              title="Loyalty"
              subtitle="Points and rewards from your orders"
              icon={Gift}
            />
          ) : null}
          {section === "wallet" ? (
            <PlaceholderPanel
              title="Wallet Balance"
              subtitle="Store credit and refunds"
              icon={Wallet}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export { CustomerAccountPage };
