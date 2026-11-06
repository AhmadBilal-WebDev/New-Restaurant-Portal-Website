import React, { useEffect, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  getOwnerProfile,
  publishOwnerIdentity,
  readAccountKind,
  removeOwnerProfilePhoto,
  updateOwnerPassword,
  updateOwnerProfile,
  uploadOwnerProfilePhoto
} from '@/shared/lib/ownerProfile';
import { extractCurrencyFromProfile } from '@/shared/lib/currencySymbols';
import { getSettingsTab, subscribeSettingsTab } from '@/shared/lib/settingsNav';
import {
  Settings,
  Save,
  Palette,
  Store,
  DollarSign,
  Phone,
  User,
  Lock,
  Camera,
  Shield,
  Moon,
  Sun,
  Check
} from "lucide-react";
const INPUT_CLASS = "w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF5A1F]";
const CARD_CLASS = "bg-[#191B20] border border-[#292D35] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4";
const InputField = ({
  label,
  required,
  className,
  ...props
}) => <div>
    {label && <label className="block text-neutral-300 font-bold mb-1 text-xs">
        {label} {required && "*"}
      </label>}
    <input className={className || INPUT_CLASS} {...props} />
  </div>;
function findValue(source, keys) {
  if (!source || typeof source !== "object") return void 0;
  const record = source;
  for (const key of keys) {
    const value = record[key];
    if (value !== void 0 && value !== null && value !== "") return value;
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const found = findValue(value, keys);
      if (found !== void 0 && found !== null && found !== "") return found;
    }
  }
  return void 0;
}
function pickText(profile, keys) {
  const value = findValue(profile, keys);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}
function pickDate(profile, keys) {
  const value = findValue(profile, keys);
  if (typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !value.trim()) return "";
  const iso = value.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const local = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (local) return `${local[3]}-${local[2]}-${local[1]}`;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}
const SectionHeader = ({ icon: Icon, title }) => <div className="flex items-center gap-2 pb-3 border-b border-[#292D35]">
    <Icon className="w-5 h-5 text-[#FF5A1F]" />
    <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
  </div>;
const SettingsPage = () => {
  const { config, updateConfig, addToast, adminTheme, setAdminTheme } = useRestaurant();
  const [activeTab, setActiveTab] = useState(getSettingsTab());
  const emptyProfile = {
    name: "",
    description: "",
    ownerFirstName: "",
    ownerLastName: "",
    ownerEmail: "",
    ownerCnic: "",
    profilePitcher: "",
    frontendDomainUrl: "",
    gender: "",
    dateOfBirth: "",
    countryCode: "",
    contactNumber: "",
    secondaryContactNumber: "",
    headAddress: "",
    country: "",
    province: "",
    city: "",
    district: "",
    postalCode: "",
    businessType: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  };
  const [userProfile, setUserProfile] = useState(emptyProfile);
  const [formData, setFormData] = useState({
    name: config.name,
    shortName: config.shortName,
    tagline: config.tagline,
    description: config.description || "",
    primaryColor: config.theme.primaryColor,
    currencySymbol: config.currency.symbol,
    currencyCode: config.currency.code,
    phone: config.contact.phone,
    email: config.contact.email,
    hotline: config.contact.hotline,
    address: config.contact.address || "",
    openingHours: config.contact.openingHours || "",
    taxRate: (config.contact.taxRate * 100).toFixed(0),
    deliveryFee: String(config.contact.deliveryFee || 150),
    freeDeliveryThreshold: String(config.contact.freeDeliveryThreshold)
  });
  useEffect(() => {
    const unsubscribe = subscribeSettingsTab((tab) => setActiveTab(tab));
    return () => {
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      currencySymbol: config.currency.symbol,
      currencyCode: config.currency.code
    }));
  }, [config.currency.symbol, config.currency.code]);
  const photoInputRef = React.useRef(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const result = await getOwnerProfile();
      if (cancelled || !result.ok || !result.data || typeof result.data !== "object") return;
      const raw = result.data;
      const nested = raw.profile ?? raw.data ?? raw.owner;
      const profile = nested && typeof nested === "object" ? nested : raw;
      setUserProfile((prev) => ({
        ...prev,
        name: pickText(profile, ["name"]),
        description: pickText(profile, ["description", "bio", "about", "ownerDescription"]),
        ownerFirstName: pickText(profile, ["ownerFirstName"]),
        ownerLastName: pickText(profile, ["ownerLastName"]),
        ownerEmail: pickText(profile, ["ownerEmail"]),
        ownerCnic: pickText(profile, ["ownerCnic"]),
        profilePitcher: pickText(profile, ["profilePitcher"]),
        frontendDomainUrl: pickText(profile, ["frontendDomainUrl"]),
        gender: pickText(profile, ["gender"]),
        dateOfBirth: pickDate(profile, ["dateOfBirth", "dob", "date_of_birth", "birthDate"]),
        countryCode: pickText(profile, ["countryCode"]),
        contactNumber: pickText(profile, ["contactNumber"]),
        secondaryContactNumber: pickText(profile, ["secondaryContactNumber"]),
        headAddress: pickText(profile, ["headAddress"]),
        country: pickText(profile, ["country"]),
        province: pickText(profile, ["province"]),
        city: pickText(profile, ["city"]),
        district: pickText(profile, ["district"]),
        postalCode: pickText(profile, ["postalCode"]),
        businessType: pickText(profile, ["businessType"])
      }));
      const currency = extractCurrencyFromProfile(result.data);
      if (currency) {
        setFormData((prev) => ({
          ...prev,
          currencySymbol: currency.symbol,
          currencyCode: currency.code
        }));
        try {
          localStorage.setItem(
            "ros_superadmin_currency",
            JSON.stringify({
              code: currency.code,
              symbol: currency.symbol,
              position: currency.position
            })
          );
        } catch {
        }
      }
      publishOwnerIdentity({
        ownerFirstName: pickText(profile, ["ownerFirstName"]),
        ownerLastName: pickText(profile, ["ownerLastName"]),
        ownerEmail: pickText(profile, ["ownerEmail", "email"]),
        restaurantName: pickText(profile, ["name"]),
        profilePitcher: pickText(profile, ["profilePitcher"])
      });
    }
    loadProfile().finally(() => {
      if (!cancelled) setProfileLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const colorPresets = [
    { name: "Fire Orange", color: "#FF5A1F" },
    { name: "Crimson Red", color: "#DC2626" },
    { name: "Amber Gold", color: "#D97706" },
    { name: "Emerald Fresh", color: "#059669" },
    { name: "Royal Violet", color: "#7C3AED" }
  ];
  const handleSave = async (e) => {
    e.preventDefault();
    setSavingStore(true);
    updateConfig({
      name: formData.name,
      shortName: formData.shortName,
      tagline: formData.tagline,
      description: formData.description,
      theme: { ...config.theme, primaryColor: formData.primaryColor },
      // Currency code/symbol stay Super Admin–sourced; don't overwrite from local presets.
      currency: {
        ...config.currency
      },
      contact: {
        ...config.contact,
        phone: formData.phone,
        email: formData.email,
        hotline: formData.hotline,
        address: formData.address,
        openingHours: formData.openingHours,
        taxRate: parseFloat(formData.taxRate) / 100,
        deliveryFee: parseFloat(formData.deliveryFee) || 0,
        freeDeliveryThreshold: parseFloat(formData.freeDeliveryThreshold) || 0
      }
    });
    addToast("Settings Saved", "Store configuration updated.", "success");
    setSavingStore(false);
  };
  const handleProfileUpdate = async () => {
    setSavingProfile(true);
    const result = await updateOwnerProfile({
      ownerFirstName: userProfile.ownerFirstName,
      ownerLastName: userProfile.ownerLastName,
      contactNumber: userProfile.contactNumber,
      description: userProfile.description,
      gender: userProfile.gender
    });
    if (result.ok) {
      publishOwnerIdentity({
        ownerFirstName: userProfile.ownerFirstName,
        ownerLastName: userProfile.ownerLastName,
        ownerEmail: userProfile.ownerEmail,
        restaurantName: userProfile.name,
        profilePitcher: userProfile.profilePitcher
      });
      setProfileEditing(false);
      addToast("Profile Updated", "First name, last name, contact, description, and gender saved.", "success");
      setSavingProfile(false);
      return;
    }
    const rawMessage = result.data && typeof result.data === "object" && "message" in result.data ? String(result.data.message || "") : "";
    const message = rawMessage.includes("<") ? "Backend rejected the profile update." : rawMessage;
    addToast("Profile Save Failed", message || "Owner profile could not be saved.", "error");
    setSavingProfile(false);
  };
  const handlePasswordUpdate = async () => {
    if (savingPassword) return;
    if (!userProfile.currentPassword || !userProfile.newPassword || !userProfile.confirmPassword) {
      addToast("Password Required", "Enter current, new, and confirm password.", "warning");
      return;
    }
    if (userProfile.newPassword !== userProfile.confirmPassword) {
      addToast("Password Mismatch", "New password and confirm password must match.", "warning");
      return;
    }
    setSavingPassword(true);
    const result = await updateOwnerPassword({
      currentPassword: userProfile.currentPassword,
      newPassword: userProfile.newPassword,
      confirmPassword: userProfile.confirmPassword
    });
    if (result.ok) {
      setUserProfile((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      addToast("Password Updated", "Your password was changed.", "success");
      setSavingPassword(false);
      return;
    }
    const rawMessage = result.data && typeof result.data === "object" && "message" in result.data ? String(result.data.message || "") : "";
    addToast(
      "Password Update Failed",
      rawMessage.includes("<") ? "Backend rejected the password update." : rawMessage || "Could not update password.",
      "error"
    );
    setSavingPassword(false);
  };
  const apiMessage = (data, fallback) => {
    const raw = data && typeof data === "object" && "message" in data ? String(data.message || "") : "";
    if (!raw || raw.includes("<")) return fallback;
    return raw;
  };
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const result = await uploadOwnerProfilePhoto(file);
    if (!result.ok) {
      addToast("Upload Failed", apiMessage(result.data, "Profile photo could not be uploaded."), "error");
      return;
    }
    const raw = result.data && typeof result.data === "object" ? result.data : {};
    const nested = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
    const nextPhoto = pickText(nested, ["profilePitcher", "url", "image"]) || URL.createObjectURL(file);
    setUserProfile((prev) => ({ ...prev, profilePitcher: nextPhoto }));
    const kind = readAccountKind();
    publishOwnerIdentity({
      profilePitcher: nextPhoto,
      ...kind === "staff" || kind === "owner" ? { accountKind: kind } : {}
    });
    addToast("Photo Updated", "Profile photo uploaded.", "success");
  };
  const handlePhotoRemove = async () => {
    const result = await removeOwnerProfilePhoto();
    if (!result.ok) {
      addToast("Remove Failed", apiMessage(result.data, "Profile photo could not be removed."), "error");
      return;
    }
    setUserProfile((prev) => ({ ...prev, profilePitcher: "" }));
    const kind = readAccountKind();
    publishOwnerIdentity({
      profilePitcher: "",
      ...kind === "staff" || kind === "owner" ? { accountKind: kind } : {}
    });
    addToast("Photo Removed", "Profile photo removed.", "success");
  };
  const tabs = [
    { id: "userProfile", label: "Profile", icon: User, desc: "Name, contact and photo" },
    { id: "profile", label: "Store", icon: Store, desc: "Name and brand" },
    { id: "theme", label: "Theme", icon: Palette, desc: "Mode & brand colors" },
    { id: "currency", label: "Currency", icon: DollarSign, desc: "Taxes and fees" },
    { id: "contact", label: "Support", icon: Phone, desc: "Phone and email" }
  ];
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#292D35]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#FF5A1F]" />
            Account & Storefront Settings
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your personal profile, branding identity, color themes, and operational rules.
          </p>
        </div>

      </div>

      {
    /* Main Layout */
  }
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {
    /* Sidebar */
  }
        <div className="lg:col-span-3 bg-[#191B20] border border-[#292D35] rounded-2xl p-3 space-y-1 h-fit">
          <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-neutral-400 uppercase border-b border-[#292D35]/60 mb-2">
            Settings Menu
          </div>
          {tabs.map(({ id, label, icon: Icon, desc }) => {
    const isActive = activeTab === id;
    return <button
      key={id}
      type="button"
      onClick={() => setActiveTab(id)}
      title={label}
      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left cursor-pointer hover:scale-[1.01] ${isActive ? "bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/20 font-bold" : "bg-[#101216] text-neutral-400 hover:text-white hover:bg-[#252830] border border-[#292D35]"}`}
    >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? "text-white" : "text-[#FF5A1F]"}`} />
                <div>
                  <div className="text-xs font-bold leading-tight">{label}</div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? "text-white/80" : "text-neutral-500"}`}>
                    {desc}
                  </div>
                </div>
              </button>;
  })}
        </div>

        {
    /* Dynamic Content Panel */
  }
        <div className="lg:col-span-9 space-y-6">
          {
    /* User Profile Tab */
  }
          {activeTab === "userProfile" && profileLoading && <div className="min-h-[480px] flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
              <p className="text-xs text-neutral-400">Loading profile...</p>
            </div>}

          {activeTab === "userProfile" && !profileLoading && <div className="space-y-6">
              <div className={CARD_CLASS}>
                <SectionHeader icon={User} title="Personal Admin Profile" />

                <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-[#292D35]">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-[#FF5A1F] text-white font-black text-2xl flex items-center justify-center border-2 border-[#FF5A1F] shadow-lg shadow-[#FF5A1F]/20 uppercase overflow-hidden">
                      {userProfile.profilePitcher ? <img src={userProfile.profilePitcher} alt="Profile photo" className="w-full h-full object-cover" /> : (userProfile.ownerFirstName || "O").charAt(0)}
                    </div>
                    <input
    ref={photoInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      handlePhotoUpload(file);
    }}
  />
                    <button
    type="button"
    onClick={() => photoInputRef.current?.click()}
    title="Upload profile photo"
    className="absolute -bottom-1 -right-1 p-1.5 bg-[#252830] hover:bg-[#FF5A1F] hover:scale-105 text-white rounded-lg border border-[#292D35] shadow-md transition-all cursor-pointer"
  >
                      <Camera className="w-3.5 h-3.5 text-[#FF5A1F] hover:text-white" />
                    </button>
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <h4 className="text-base font-bold text-white">{userProfile.name || "Restaurant"}</h4>
                    <p className="text-xs text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#FF5A1F]" />
                      <span className="text-[#FF5A1F] font-semibold">
                        {[userProfile.ownerFirstName, userProfile.ownerLastName].filter(Boolean).join(" ") || "Owner"}
                      </span>
                    </p>
                    <p className="text-[11px] text-neutral-500">{userProfile.ownerEmail || "No email yet"}</p>
                    {userProfile.profilePitcher && <button
    type="button"
    onClick={handlePhotoRemove}
    title="Remove profile photo"
    className="text-[11px] font-bold text-red-300 hover:text-white hover:bg-red-500/20 px-2 py-1 rounded-lg transition-all cursor-pointer"
  >
                        Remove photo
                      </button>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <InputField
    label="First Name"
    required
    disabled={!profileEditing}
    value={userProfile.ownerFirstName}
    onChange={(e) => setUserProfile({ ...userProfile, ownerFirstName: e.target.value })}
    className={!profileEditing ? `${INPUT_CLASS} text-neutral-400 cursor-not-allowed` : void 0}
  />
                  <InputField
    label="Last Name"
    required
    disabled={!profileEditing}
    value={userProfile.ownerLastName}
    onChange={(e) => setUserProfile({ ...userProfile, ownerLastName: e.target.value })}
    className={!profileEditing ? `${INPUT_CLASS} text-neutral-400 cursor-not-allowed` : void 0}
  />
                  <InputField
    label="Contact Number"
    required
    disabled={!profileEditing}
    value={userProfile.contactNumber}
    onChange={(e) => setUserProfile({ ...userProfile, contactNumber: e.target.value })}
    className={!profileEditing ? `${INPUT_CLASS} text-neutral-400 cursor-not-allowed` : void 0}
  />
                  <div>
                    <label className="block text-neutral-300 font-bold mb-1 text-xs">Gender</label>
                    <select
    disabled={!profileEditing}
    value={userProfile.gender}
    onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
    className={`${INPUT_CLASS} ${profileEditing ? "cursor-pointer" : "text-neutral-400 cursor-not-allowed"}`}
  >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-neutral-300 font-bold mb-1">Description</label>
                    <textarea
    rows={3}
    disabled={!profileEditing}
    value={userProfile.description}
    onChange={(e) => setUserProfile({ ...userProfile, description: e.target.value })}
    className={`${INPUT_CLASS} ${profileEditing ? "" : "text-neutral-400 cursor-not-allowed"}`}
  />
                  </div>
                  <InputField label="Email" value={userProfile.ownerEmail} disabled className={`${INPUT_CLASS} text-neutral-400 cursor-not-allowed`} />
                  <InputField label="CNIC Number" value={userProfile.ownerCnic} disabled className={`${INPUT_CLASS} text-neutral-400 cursor-not-allowed`} />
                  <div className="col-span-1 sm:col-span-2">
                    <InputField label="Head Address" value={userProfile.headAddress} disabled className={`${INPUT_CLASS} text-neutral-400 cursor-not-allowed`} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
    type="button"
    disabled={savingProfile}
    onClick={() => {
      if (savingProfile) return;
      if (!profileEditing) {
        setProfileEditing(true);
        return;
      }
      void handleProfileUpdate();
    }}
    title={profileEditing ? "Save profile changes" : "Unlock profile fields"}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] hover:scale-[1.02] disabled:opacity-70 text-white text-xs font-bold shadow-lg shadow-[#FF5A1F]/25 transition-all cursor-pointer"
  >
                    {savingProfile ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingProfile ? "Saving..." : profileEditing ? "Save Profile" : "Update Profile"}
                  </button>
                </div>
              </div>

              <div className={CARD_CLASS}>
                <SectionHeader icon={Lock} title="Security & Password" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <InputField
    label="Current Password"
    type="password"
    placeholder="••••••••"
    value={userProfile.currentPassword}
    onChange={(e) => setUserProfile({ ...userProfile, currentPassword: e.target.value })}
  />
                  <InputField
    label="New Password"
    type="password"
    placeholder="••••••••"
    value={userProfile.newPassword}
    onChange={(e) => setUserProfile({ ...userProfile, newPassword: e.target.value })}
  />
                  <InputField
    label="Confirm New Password"
    type="password"
    placeholder="••••••••"
    value={userProfile.confirmPassword}
    onChange={(e) => setUserProfile({ ...userProfile, confirmPassword: e.target.value })}
  />
                </div>
                <div className="flex justify-end">
                  <button
    type="button"
    disabled={savingPassword}
    onClick={handlePasswordUpdate}
    title="Update password"
    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#252830] hover:bg-[#FF5A1F] hover:scale-[1.02] disabled:opacity-70 text-white text-xs font-bold border border-[#292D35] transition-all cursor-pointer"
  >
                    {savingPassword && <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    {savingPassword ? "Saving..." : "Update Password"}
                  </button>
                </div>
              </div>
            </div>}

          {
    /* Store Profile Tab */
  }
          {activeTab === "profile" && <div className={CARD_CLASS}>
              <SectionHeader icon={Store} title="Restaurant Brand & White-Labeling Profile" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <InputField
    label="Restaurant Title / Name"
    required
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  />
                <div>
                  <InputField
    label="Logo Monogram / Short Code"
    required
    maxLength={4}
    value={formData.shortName}
    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
  />
                  <span className="text-[10px] text-neutral-500">
                    Shown inside the top-left square badge (e.g. ROS or BB)
                  </span>
                </div>
                <InputField
    label="Tagline / Slogan"
    value={formData.tagline}
    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
  />
                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                  <label className="block text-neutral-300 font-bold mb-1">Brand Bio / Description</label>
                  <textarea
    rows={3}
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    className={INPUT_CLASS}
  />
                </div>
              </div>
            </div>}

          {
    /* Color Theme Tab */
  }
          {activeTab === "theme" && <div className="space-y-4">
              <div className={CARD_CLASS}>
                <SectionHeader icon={Palette} title="Appearance Mode" />
                <p className="text-[12px] text-neutral-400 -mt-1">
                  Dark = black background / white text. Light = white background / black text. Saved for this restaurant domain via API.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
    type="button"
    onClick={async () => {
      const result = await setAdminTheme("dark");
      if (result?.ok === false) {
        addToast("Theme not saved", result.message || "Could not update theme.", "error");
        return;
      }
      addToast("Theme Updated", "Dark mode enabled (black background, white text).", "success");
    }}
    className={`relative text-left rounded-2xl border p-4 transition-all cursor-pointer ${adminTheme === "dark" ? "border-[#FF5A1F] bg-[#FF5A1F]/10 shadow-md" : "border-[#292D35] bg-[#101216] hover:border-[#3A404A]"}`}
  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0D0F12] border border-[#292D35] flex items-center justify-center text-neutral-300">
                          <Moon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Dark</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Default kitchen night mode
                          </p>
                        </div>
                      </div>
                      {adminTheme === "dark" ? <span className="w-6 h-6 rounded-full bg-[#FF5A1F] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span> : null}
                    </div>
                    <div className="mt-4 h-16 rounded-xl overflow-hidden border border-[#292D35] bg-[#0D0F12] p-2 flex gap-1.5">
                      <div className="w-6 rounded-md bg-[#14161B] border border-[#292D35]" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-1/2 rounded bg-[#252830]" />
                        <div className="h-8 rounded-md bg-[#14161B] border border-[#292D35]" />
                      </div>
                    </div>
                  </button>

                  <button
    type="button"
    onClick={async () => {
      const result = await setAdminTheme("light");
      if (result?.ok === false) {
        addToast("Theme not saved", result.message || "Could not update theme.", "error");
        return;
      }
      addToast("Theme Updated", "Light mode enabled (white background, black text).", "success");
    }}
    className={`relative text-left rounded-2xl border p-4 transition-all cursor-pointer ${adminTheme === "light" ? "border-[#FF5A1F] bg-[#FF5A1F]/10 shadow-md" : "border-[#292D35] bg-[#101216] hover:border-[#3A404A]"}`}
  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] border border-[#E2E5EB] flex items-center justify-center text-amber-500">
                          <Sun className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Light</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Clean white workspace
                          </p>
                        </div>
                      </div>
                      {adminTheme === "light" ? <span className="w-6 h-6 rounded-full bg-[#FF5A1F] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span> : null}
                    </div>
                    <div className="mt-4 h-16 rounded-xl overflow-hidden border border-[#E2E5EB] bg-[#F3F4F6] p-2 flex gap-1.5">
                      <div className="w-6 rounded-md bg-white border border-[#E2E5EB]" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-1/2 rounded bg-[#E2E5EB]" />
                        <div className="h-8 rounded-md bg-white border border-[#E2E5EB]" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className={CARD_CLASS}>
                <SectionHeader icon={Palette} title="Color Palette & Theme Customization" />
                <div className="space-y-3">
                  <label className="block text-neutral-300 font-bold text-xs">Primary Brand Color Accent</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {colorPresets.map((preset) => <button
    key={preset.color}
    type="button"
    onClick={() => setFormData({ ...formData, primaryColor: preset.color })}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${formData.primaryColor.toLowerCase() === preset.color.toLowerCase() ? "border-white bg-[#252830] text-white shadow-md" : "border-[#292D35] bg-[#101216] text-neutral-400 hover:text-white"}`}
  >
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.color }} />
                        <span>{preset.name}</span>
                      </button>)}
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-neutral-400">Custom Hex:</span>
                    <input
    type="text"
    value={formData.primaryColor}
    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
    className="w-32 bg-[#101216] border border-[#292D35] rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
  />
                    <span
    className="w-7 h-7 rounded-lg border border-[#292D35]"
    style={{ backgroundColor: formData.primaryColor }}
  />
                  </div>
                </div>
              </div>
            </div>}

          {
    /* Currency Tab */
  }
          {activeTab === "currency" && <div className={CARD_CLASS}>
              <SectionHeader icon={DollarSign} title="Currency & Financial Rules" />
              <p className="text-[11px] text-neutral-500 -mt-2">
                Currency symbol is managed by Super Admin when the restaurant is created or updated.
                It applies across the whole website via price formatting.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Currency Symbol & Code</label>
                  <div className="flex gap-1.5">
                    <InputField
    value={`${formData.currencySymbol.trim()} (${formData.currencyCode})`}
    readOnly
    className={`${INPUT_CLASS} opacity-80 cursor-not-allowed`}
    placeholder="e.g. $, PKR, €"
  />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1.5">
                    Example: {formData.currencySymbol}1,250
                  </p>
                </div>
                <InputField
    label="Tax Rate (%)"
    type="number"
    value={formData.taxRate}
    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
  />
                <InputField
    label="Standard Delivery Fee"
    type="number"
    value={formData.deliveryFee}
    onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
  />
                <InputField
    label="Free Delivery Threshold"
    type="number"
    value={formData.freeDeliveryThreshold}
    onChange={(e) => setFormData({ ...formData, freeDeliveryThreshold: e.target.value })}
  />
              </div>
            </div>}

          {
    /* Contact Tab */
  }
          {activeTab === "contact" && <div className={CARD_CLASS}>
              <SectionHeader icon={Phone} title="Customer Support & Contact" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <InputField
    label="Order Hotline"
    value={formData.hotline}
    onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
  />
                <InputField
    label="WhatsApp Phone"
    value={formData.phone}
    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
  />
                <InputField
    label="Support Email"
    type="email"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
  />
              </div>
            </div>}

          {activeTab !== "userProfile" && <div className="flex items-center justify-end gap-3 pt-2">
              <button
    type="submit"
    disabled={savingStore}
    title="Save store settings"
    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] disabled:opacity-70 text-white font-extrabold text-xs transition-all shadow-lg shadow-[#FF5A1F]/25 cursor-pointer"
  >
                {savingStore ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{savingStore ? "Saving..." : "Save"}</span>
              </button>
            </div>}
        </div>
      </form>
    </div>;
};
export {
  SettingsPage
};
