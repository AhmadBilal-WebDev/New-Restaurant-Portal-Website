import { useEffect, useMemo, useState } from "react";
import { City, Country, State } from "country-state-city";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { getSidebarButtons } from '@/shared/lib/ownerApi';
import {
  activateStaffRole,
  blockStaffRole,
  createStaffRole,
  deleteStaffRole,
  extractRoleId,
  formatStaffCnic,
  formatStaffDateTime,
  getStaffRoles,
  roleCreatedAt,
  staffBranchLabel,
  updateStaffRole
} from '@/shared/lib/staffApi';
import { getOwnerBranches } from '@/shared/lib/branchesApi';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Ban,
  CheckCircle2,
  ShieldCheck,
  X,
  RefreshCw,
  UserPlus,
  CalendarDays,
  CalendarRange,
  Loader2,
  ArrowLeft,
  Clock3,
  TrendingUp,
  User,
  Mail,
  Phone,
  MapPin,
  Globe2,
  Briefcase,
  Info,
  LayoutGrid,
  List,
  Building2
} from "lucide-react";
import { useAdminNavigate } from "../useAdminNavigate";
import {
  getPakistanCitiesForDistrict,
  getPakistanDistricts,
  isPakistanCountry
} from '@/shared/lib/pakistanDistricts';
const INPUT_CLASS = "admin-field admin-field-solid cursor-text";
const SELECT_CLASS = "admin-field admin-field-solid admin-select";
const FORM_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0";
const FORM_SECTION = "rounded-2xl border border-[#e5e7eb] bg-[#fafbfc] p-4 sm:p-5 lg:p-6 space-y-5 min-w-0";
const GENDER_BTN_BASE = "w-full min-h-[46px] rounded-xl border px-2 sm:px-3 py-2.5 text-sm font-bold transition-all cursor-pointer";
const GENDER_BTN_ACTIVE = `${GENDER_BTN_BASE} border-[#FF5A1F] bg-[#FF5A1F] !text-white shadow-sm shadow-[#FF5A1F]/25`;
const GENDER_BTN_IDLE = `${GENDER_BTN_BASE} border-[#d1d5db] bg-white text-neutral-600 hover:border-[#FF5A1F]/60`;
function FieldLabel({
  children,
  required,
  icon: Icon
}) {
  return <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
    {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" /> : null}
    <span>{children}</span>
    {required ? <span className="text-[#FF5A1F]">*</span> : null}
  </span>;
}
function FormSectionHeader({
  icon: Icon,
  title,
  description
}) {
  return <div className="flex items-start gap-3 pb-1">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF5A1F]/12 text-[#FF5A1F]">
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0 pt-0.5">
      <h3 className="text-sm sm:text-[15px] font-black uppercase tracking-wide text-[#1a1d26] font-['Outfit',sans-serif]">
        {title}
      </h3>
      <p className="mt-0.5 text-[12px] text-[#6b7280] leading-snug">{description}</p>
    </div>
  </div>;
}
function SkeletonPulse({ className = "" }) {
  return <div className={`admin-skeleton ${className}`} />;
}
function readChildButtons(raw) {
  if (!raw || typeof raw !== "object") return [];
  const row = raw;
  if (Array.isArray(row.buttons)) return row.buttons;
  if (Array.isArray(row.button)) return row.button;
  if (Array.isArray(row.children)) return row.children;
  if (Array.isArray(row.items)) return row.items;
  return [];
}
function mapPermissionButton(raw) {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw;
  const key = String(entry.key || entry.id || "").trim();
  if (!key || key === "logout") return null;
  const buttons = readChildButtons(entry).map(mapPermissionButton).filter((button) => Boolean(button));
  return {
    key,
    label: String(entry.label || entry.name || key).trim() || key,
    buttons
  };
}
function readSidebarPermissions(data) {
  const record = data && typeof data === "object" ? data : {};
  const list = Array.isArray(data) ? data : Array.isArray(record.sidebar) ? record.sidebar : Array.isArray(record.data) ? record.data : Array.isArray(record.permissions) ? record.permissions : [];
  return list.map((item) => mapPermissionButton(item)).filter((item) => Boolean(item)).map((item) => ({ key: item.key, label: item.label, buttons: item.buttons }));
}
function collectNestedButtonKeys(buttons) {
  const keys = [];
  const walk = (list) => {
    for (const button of list) {
      keys.push(button.key);
      if (button.buttons.length) walk(button.buttons);
    }
  };
  walk(buttons);
  return keys;
}
function buildPermissionButtonsPayload(buttons, selectedByParent, parentKey) {
  const selected = selectedByParent[parentKey] || [];
  const source = selected.length > 0 ? buttons.filter((button) => selected.includes(button.key)) : buttons;
  return source.map((button) => ({
    key: button.key,
    label: button.label,
    buttons: button.buttons.length ? buildPermissionButtonsPayload(button.buttons, selectedByParent, button.key) : []
  }));
}
const ROLE_OPTIONS = [
  "Owner",
  "Manager",
  "Kitchen Staff",
  "Cashier",
  "Delivery Boy",
  "Waiter",
  "Chef",
  "Supervisor",
  "Accountant",
  "Receptionist"
];
const emptyRoleForm = {
  roleName: "",
  firstName: "",
  lastName: "",
  fatherName: "",
  email: "",
  showAllBranches: true,
  branchName: "",
  reason: "",
  cnic: "",
  address: "",
  country: "Pakistan",
  countryIso: "PK",
  province: "",
  provinceIso: "",
  district: "",
  city: "",
  countryCode: "+92",
  contactNumber: "",
  gender: "male",
  dateOfBirth: "",
  permissionKeys: [],
  selectedButtons: {}
};
function getFrontendDomain() {
  return typeof window !== "undefined" ? window.location.origin : "";
}
const StaffPage = ({ mode = "all" }) => {
  const {
    staff,
    branches,
    addStaff,
    updateStaff,
    deleteStaff,
    addToast
  } = useRestaurant();
  const navigateAdmin = useAdminNavigate();
  const { matchesBranch, primaryBranchId, liveBranches } = useBranchScope();
  const scopedStaff = staff.filter(
    (member) => member.branchId === "all" || matchesBranch(member.branchId)
  );
  const isAddPage = mode === "add";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "manager",
    email: "",
    phone: "",
    branchId: primaryBranchId || liveBranches[0]?.id || "",
    status: "active"
  });
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [savingRole, setSavingRole] = useState(false);
  const [customRole, setCustomRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [apiRoles, setApiRoles] = useState([]);
  const [roleActionId, setRoleActionId] = useState("");
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesRefreshing, setRolesRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [chartRange, setChartRange] = useState("weekly");
  const [viewMode, setViewMode] = useState("cards");
  const loadRoles = async (opts) => {
    if (opts?.silent) setRolesRefreshing(true);
    else setRolesLoading(true);
    const domain = getFrontendDomain();
    const result = await getStaffRoles(domain);
    if (result.ok) setApiRoles(result.roles);
    setRolesLoading(false);
    setRolesRefreshing(false);
  };
  useEffect(() => {
    void loadRoles();
  }, []);
  const [sidebarPermissions, setSidebarPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [ownerBranches, setOwnerBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const countries = useMemo(
    () => [...Country.getAllCountries()].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const provinces = useMemo(
    () => roleForm.countryIso ? [...State.getStatesOfCountry(roleForm.countryIso)].sort((a, b) => a.name.localeCompare(b.name)) : [],
    [roleForm.countryIso]
  );
  const provinceCities = useMemo(
    () => roleForm.countryIso && roleForm.provinceIso ? [...City.getCitiesOfState(roleForm.countryIso, roleForm.provinceIso)].sort(
      (a, b) => a.name.localeCompare(b.name)
    ) : [],
    [roleForm.countryIso, roleForm.provinceIso]
  );
  const isPkLocation = isPakistanCountry(roleForm.countryIso);
  const districtOptions = useMemo(() => {
    if (!roleForm.provinceIso) return [];
    if (isPkLocation) {
      return getPakistanDistricts(roleForm.provinceIso).map((name) => ({ name }));
    }
    return provinceCities;
  }, [isPkLocation, provinceCities, roleForm.provinceIso]);
  const cityOptions = useMemo(() => {
    if (!roleForm.district) return [];
    if (isPkLocation) {
      return getPakistanCitiesForDistrict(roleForm.provinceIso, roleForm.district, provinceCities);
    }
    return provinceCities;
  }, [isPkLocation, provinceCities, roleForm.district, roleForm.provinceIso]);
  const branchOptions = useMemo(() => {
    const fromApi = ownerBranches.filter((b) => b.isActive !== false);
    if (fromApi.length > 0) return fromApi;
    return liveBranches;
  }, [ownerBranches, liveBranches]);
  const roleStats = useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - (now.getDay() + 6) % 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    let active = 0;
    let blocked = 0;
    let pending = 0;
    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let thisYear = 0;
    const byWeekday = Array.from({ length: 7 }, () => 0);
    const byLast7Days = Array.from({ length: 7 }, () => 0);
    const byLast8Weeks = Array.from({ length: 8 }, () => 0);
    const byLast12Months = Array.from({ length: 12 }, () => 0);
    const yearBuckets = /* @__PURE__ */ new Map();
    for (const role of apiRoles) {
      if (role.status === "active") active += 1;
      else if (role.status === "pending") pending += 1;
      else blocked += 1;
      const created = roleCreatedAt(role);
      if (!created) continue;
      if (created >= startOfToday) today += 1;
      if (created >= startOfMonth) thisMonth += 1;
      if (created >= startOfYear) thisYear += 1;
      if (created >= startOfWeek) {
        thisWeek += 1;
        byWeekday[(created.getDay() + 6) % 7] += 1;
      }
      const dayDiff = Math.floor((startOfToday.getTime() - new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()) / 864e5);
      if (dayDiff >= 0 && dayDiff < 7) byLast7Days[6 - dayDiff] += 1;
      const weekStart = new Date(startOfWeek);
      for (let i = 0; i < 8; i += 1) {
        const ws = new Date(weekStart);
        ws.setDate(weekStart.getDate() - i * 7);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 7);
        if (created >= ws && created < we) {
          byLast8Weeks[7 - i] += 1;
          break;
        }
      }
      const monthDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) byLast12Months[11 - monthDiff] += 1;
      const y = created.getFullYear();
      yearBuckets.set(y, (yearBuckets.get(y) || 0) + 1);
    }
    const years = Array.from(yearBuckets.keys()).sort((a, b) => a - b);
    const startYear = Math.min(years[0] ?? now.getFullYear(), now.getFullYear() - 3);
    const yearSpan = [];
    for (let year = startYear; year <= now.getFullYear(); year += 1) yearSpan.push(year);
    const byYear = yearSpan.map((year) => yearBuckets.get(year) || 0);
    const total = apiRoles.length;
    const activePct = total > 0 ? Math.round(active / total * 100) : 0;
    const blockedPct = total > 0 ? Math.round(blocked / total * 100) : 0;
    return {
      total,
      active,
      blocked,
      pending,
      today,
      thisWeek,
      thisMonth,
      thisYear,
      activePct,
      blockedPct,
      byWeekday,
      byLast7Days,
      byLast8Weeks,
      byLast12Months,
      byYear,
      yearLabels: yearSpan.map(String),
      maxWeekday: Math.max(...byWeekday, 1)
    };
  }, [apiRoles]);
  const chartSeries = useMemo(() => {
    const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = /* @__PURE__ */ new Date();
    if (chartRange === "daily") {
      const labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        return `${d.getDate()}/${monthShort[d.getMonth()]}`;
      });
      return { labels, values: roleStats.byLast7Days, title: "Last 7 days" };
    }
    if (chartRange === "weekly") {
      return {
        labels: Array.from({ length: 8 }, (_, i) => `W${i + 1}`),
        values: roleStats.byLast8Weeks,
        title: "Last 8 weeks"
      };
    }
    if (chartRange === "monthly") {
      const labels = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return monthShort[d.getMonth()];
      });
      return { labels, values: roleStats.byLast12Months, title: "Last 12 months" };
    }
    return { labels: roleStats.yearLabels, values: roleStats.byYear, title: "By year" };
  }, [chartRange, roleStats]);
  const chartMax = Math.max(...chartSeries.values, 1);
  const filteredRoles = useMemo(() => {
    if (statusFilter === "all") return apiRoles;
    if (statusFilter === "active") return apiRoles.filter((role) => role.status === "active");
    if (statusFilter === "pending") return apiRoles.filter((role) => role.status === "pending");
    return apiRoles.filter((role) => role.status === "inactive");
  }, [apiRoles, statusFilter]);
  const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const donutStyle = {
    background: `conic-gradient(#00D084 0% ${roleStats.activePct}%, #EF4444 ${roleStats.activePct}% ${roleStats.activePct + roleStats.blockedPct}%, #F59E0B ${roleStats.activePct + roleStats.blockedPct}% 100%)`
  };
  const addPageBusy = rolesLoading || permissionsLoading || branchesLoading;
  useEffect(() => {
    const shouldLoad = isAddPage || isModalOpen && !editingStaff;
    if (!shouldLoad) return;
    let cancelled = false;
    setPermissionsLoading(true);
    setBranchesLoading(true);
    const domain = getFrontendDomain();
    Promise.all([getSidebarButtons(), getOwnerBranches(domain)]).then(([perms, branchResult]) => {
      if (cancelled) return;
      setSidebarPermissions(perms.ok ? readSidebarPermissions(perms.data) : []);
      setOwnerBranches(branchResult.ok ? branchResult.branches : []);
      setPermissionsLoading(false);
      setBranchesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAddPage, isModalOpen, editingStaff]);
  useEffect(() => {
    if (!isAddPage) return;
    setRoleForm({ ...emptyRoleForm });
    setCustomRole(false);
    setEditingRoleId(null);
    setEditingStaff(null);
  }, [isAddPage]);
  const handleOpenAdd = () => {
    navigateAdmin("add_staff");
  };
  const handleOpenEdit = (member) => {
    setFormData({
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone,
      branchId: member.branchId,
      status: member.status
    });
    setEditingStaff(member);
    setIsModalOpen(true);
  };
  const toggleKey = (list, key) => list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (savingRole) return;
    const required = [
      ["Role name", roleForm.roleName],
      ["First name", roleForm.firstName],
      ["Last name", roleForm.lastName],
      ["Father name", roleForm.fatherName],
      ["Email", roleForm.email],
      ["CNIC", roleForm.cnic],
      ["Address", roleForm.address],
      ["Country", roleForm.country],
      ["Province", roleForm.province],
      ["District", roleForm.district],
      ["City", roleForm.city],
      ["Country code", roleForm.countryCode],
      ["Contact number", roleForm.contactNumber],
      ["Gender", roleForm.gender],
      ["Date of birth", roleForm.dateOfBirth]
    ];
    const missing = required.find(([, value]) => !value.trim());
    if (missing) {
      addToast("Missing Field", `${missing[0]} is required.`, "warning");
      return;
    }
    if (!roleForm.showAllBranches && !roleForm.branchName.trim()) {
      addToast("Branch Required", "Select a branch, or choose All Branches.", "warning");
      return;
    }
    if (!roleForm.reason.trim()) {
      addToast("Reason Required", "Enter a reason for creating this staff role.", "warning");
      return;
    }
    const cnicDigits = roleForm.cnic.replace(/\D/g, "");
    if (cnicDigits.length !== 13) {
      addToast("Invalid CNIC", "Enter 13 digits only, for example 1234567890123.", "warning");
      return;
    }
    if (roleForm.permissionKeys.length === 0) {
      addToast("Permissions Required", "Select at least one sidebar permission.", "warning");
      return;
    }
    setSavingRole(true);
    const permissions = roleForm.permissionKeys.map((key) => {
      const item = sidebarPermissions.find((row) => row.key === key);
      return {
        key,
        label: item?.label || key,
        buttons: buildPermissionButtonsPayload(
          item?.buttons || [],
          roleForm.selectedButtons,
          key
        )
      };
    });
    const domain = getFrontendDomain();
    const payload = {
      showAllBranches: roleForm.showAllBranches,
      branchName: roleForm.showAllBranches ? "" : roleForm.branchName.trim(),
      reason: roleForm.reason.trim(),
      roleName: roleForm.roleName.trim(),
      firstName: roleForm.firstName.trim(),
      lastName: roleForm.lastName.trim(),
      fatherName: roleForm.fatherName.trim(),
      email: roleForm.email.trim(),
      cnic: formatStaffCnic(cnicDigits),
      address: roleForm.address.trim(),
      country: roleForm.country.trim(),
      province: roleForm.province.trim(),
      district: roleForm.district.trim(),
      city: roleForm.city.trim(),
      countryCode: roleForm.countryCode.trim(),
      contactNumber: roleForm.contactNumber.trim(),
      gender: roleForm.gender,
      dateOfBirth: roleForm.dateOfBirth,
      permissions
    };
    const result = editingRoleId ? await updateStaffRole(editingRoleId, payload, domain) : await createStaffRole(payload, domain);
    setSavingRole(false);
    if (!result.ok) {
      const raw = result.data && typeof result.data === "object" && "message" in result.data ? String(result.data.message || "") : "";
      addToast(editingRoleId ? "Role Not Updated" : "Role Not Created", raw.includes("<") ? "Backend rejected the role." : raw || "Could not save role.", "error");
      return;
    }
    if (editingRoleId) {
      addToast("Role Updated", `${payload.roleName} was updated.`, "success");
      setIsModalOpen(false);
      setEditingRoleId(null);
      await loadRoles();
      return;
    }
    const createdId = extractRoleId(result.data);
    if (createdId) {
      setApiRoles((prev) => [{ ...payload, id: createdId, status: "active" }, ...prev]);
    }
    await loadRoles();
    if (isAddPage) {
      addToast("Staff Added", `${payload.firstName} ${payload.lastName} was created.`, "success");
      navigateAdmin("all_staff");
      return;
    }
    const matchedBranch = roleForm.showAllBranches ? null : branchOptions.find((b) => b.name === roleForm.branchName);
    addStaff({
      name: `${roleForm.firstName} ${roleForm.lastName}`.trim(),
      role: "manager",
      email: roleForm.email,
      phone: `${roleForm.countryCode} ${roleForm.contactNumber}`.trim(),
      branchId: matchedBranch?.id || (roleForm.showAllBranches ? "all" : primaryBranchId || liveBranches[0]?.id || ""),
      status: "active",
      lastActive: "Just now"
    });
    addToast("Role Created", `${roleForm.roleName} was created.`, "success");
    setIsModalOpen(false);
  };
  const openApiRole = (role) => {
    const country = countries.find((item) => item.name === role.country);
    const province = country ? State.getStatesOfCountry(country.isoCode).find((item) => item.name === role.province) : void 0;
    setRoleForm({
      ...emptyRoleForm,
      roleName: role.roleName,
      firstName: role.firstName,
      lastName: role.lastName,
      fatherName: role.fatherName,
      email: role.email,
      showAllBranches: role.showAllBranches,
      branchName: role.showAllBranches ? "" : role.branchNames?.[0] || role.branchName.split(",")[0]?.trim() || "",
      reason: role.createdReason || role.reason || "",
      cnic: role.cnic.replace(/\D/g, "").slice(0, 13),
      address: role.address,
      country: role.country,
      countryIso: country?.isoCode || "",
      province: role.province,
      provinceIso: province?.isoCode || "",
      district: role.district,
      city: role.city,
      countryCode: role.countryCode,
      contactNumber: role.contactNumber,
      gender: role.gender || "male",
      dateOfBirth: role.dateOfBirth,
      permissionKeys: role.permissions.map((item) => item.key),
      selectedButtons: (() => {
        const selected = {};
        const walk = (parentKey, buttons) => {
          if (!buttons.length) return;
          selected[parentKey] = buttons.map((button) => button.key);
          for (const button of buttons) {
            if (button.buttons?.length) walk(button.key, button.buttons);
          }
        };
        for (const permission of role.permissions) {
          walk(permission.key, permission.buttons || []);
        }
        return selected;
      })()
    });
    setCustomRole(!ROLE_OPTIONS.includes(role.roleName));
    setEditingRoleId(role.id);
    setEditingStaff(null);
    setIsModalOpen(true);
  };
  const runRoleAction = async (id, action) => {
    const frontendDomainUrl = getFrontendDomain();
    setRoleActionId(id);
    const result = action === "block" ? await blockStaffRole(id, frontendDomainUrl) : action === "activate" ? await activateStaffRole(id, frontendDomainUrl) : await deleteStaffRole(id, frontendDomainUrl);
    setRoleActionId("");
    if (!result.ok) {
      const raw = result.data && typeof result.data === "object" && "message" in result.data ? String(result.data.message || "") : "";
      addToast("Role Action Failed", raw.includes("<") ? "Backend rejected the request." : raw || "Could not update role.", "error");
      return;
    }
    if (action === "delete") {
      addToast("Role Deleted", "Role was deleted.", "success");
    } else {
      addToast(action === "block" ? "Role Blocked" : "Role Activated", "Role status updated.", "success");
    }
    await loadRoles();
  };
  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editingStaff) {
      updateStaff(editingStaff.id, formData);
      addToast("Staff Member Updated", `${formData.name} profile updated.`, "success");
    } else {
      addStaff({
        name: formData.name,
        role: formData.role,
        email: formData.email,
        phone: formData.phone,
        branchId: formData.branchId,
        status: formData.status,
        lastActive: "Just now"
      });
      addToast("Staff Member Added", `${formData.name} added to team roster.`, "success");
    }
    setIsModalOpen(false);
  };
  const createRoleForm = <form onSubmit={handleCreateRole} className="space-y-4 sm:space-y-5 text-sm">
    <section className={FORM_SECTION}>
      <FormSectionHeader
        icon={User}
        title="Personal details"
        description="Staff identity and primary contact information."
      />
      <div className={FORM_GRID}>
        <label className="block">
          <FieldLabel required>First Name</FieldLabel>
          <input required title="First name" value={roleForm.firstName} onChange={(e) => setRoleForm({ ...roleForm, firstName: e.target.value })} placeholder="Ali" className={INPUT_CLASS} />
        </label>
        <label className="block">
          <FieldLabel required>Last Name</FieldLabel>
          <input required title="Last name" value={roleForm.lastName} onChange={(e) => setRoleForm({ ...roleForm, lastName: e.target.value })} placeholder="Khan" className={INPUT_CLASS} />
        </label>
        <label className="block">
          <FieldLabel required>Father Name</FieldLabel>
          <input required title="Father name" value={roleForm.fatherName} onChange={(e) => setRoleForm({ ...roleForm, fatherName: e.target.value })} placeholder="Ahmed Khan" className={INPUT_CLASS} />
        </label>
        <label className="block">
          <FieldLabel required>CNIC</FieldLabel>
          <input
            required
            title="13 digit CNIC"
            inputMode="numeric"
            maxLength={15}
            value={roleForm.cnic}
            onChange={(e) => setRoleForm({ ...roleForm, cnic: e.target.value.replace(/\D/g, "").slice(0, 13) })}
            placeholder="1234567890123"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <FieldLabel required icon={CalendarDays}>Date of Birth</FieldLabel>
          <input
            required
            title="Date of birth"
            type="date"
            value={roleForm.dateOfBirth}
            onChange={(e) => setRoleForm({ ...roleForm, dateOfBirth: e.target.value })}
            placeholder="YYYY-MM-DD"
            className={`${INPUT_CLASS} cursor-pointer`}
          />
        </label>
        <div className="block min-w-0">
          <FieldLabel required>Gender</FieldLabel>
          <div className="grid grid-cols-2 gap-2 min-w-0" role="group" aria-label="Select gender">
            <button
              type="button"
              title="Male"
              onClick={() => setRoleForm({ ...roleForm, gender: "male" })}
              className={roleForm.gender === "male" ? GENDER_BTN_ACTIVE : GENDER_BTN_IDLE}
            >
              Male
            </button>
            <button
              type="button"
              title="Female"
              onClick={() => setRoleForm({ ...roleForm, gender: "female" })}
              className={roleForm.gender === "female" ? GENDER_BTN_ACTIVE : GENDER_BTN_IDLE}
            >
              Female
            </button>
          </div>
        </div>
        <label className="block sm:col-span-2 lg:col-span-2 min-w-0">
          <FieldLabel required icon={Mail}>Email</FieldLabel>
          <input required type="email" title="Email" value={roleForm.email} onChange={(e) => setRoleForm({ ...roleForm, email: e.target.value })} placeholder="ali@email.com" className={INPUT_CLASS} />
        </label>
        <label className="block sm:col-span-2 lg:col-span-1 min-w-0">
          <FieldLabel required icon={Phone}>Country Code</FieldLabel>
          <input
            required
            title="Country code"
            value={roleForm.countryCode}
            onChange={(e) => setRoleForm({ ...roleForm, countryCode: e.target.value })}
            placeholder="+92"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3 min-w-0">
          <FieldLabel required icon={Phone}>Contact Number</FieldLabel>
          <input
            required
            title="Contact number"
            value={roleForm.contactNumber}
            onChange={(e) => setRoleForm({ ...roleForm, contactNumber: e.target.value.replace(/\D/g, "") })}
            placeholder="3001234567"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3 min-w-0">
          <FieldLabel required icon={MapPin}>Address</FieldLabel>
          <input required title="Address" value={roleForm.address} onChange={(e) => setRoleForm({ ...roleForm, address: e.target.value })} placeholder="Street, area, landmark" className={INPUT_CLASS} />
        </label>
      </div>
      <div className="flex items-start gap-2 border-t border-dashed border-[#d1d5db] pt-4 text-[12px] text-[#6b7280]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" />
        <p>Login credentials and role updates are sent to this email and phone number.</p>
      </div>
    </section>

    <section className={FORM_SECTION}>
      <FormSectionHeader
        icon={Briefcase}
        title="Role & access"
        description="Assign role type, branch scope, and hiring reason."
      />
      <div className={FORM_GRID}>
        <label className="block">
          <FieldLabel required>Role Name</FieldLabel>
          <select
            required
            title="Select a role"
            value={customRole ? "custom" : roleForm.roleName}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "custom") {
                setCustomRole(true);
                setRoleForm({ ...roleForm, roleName: "" });
                return;
              }
              setCustomRole(false);
              setRoleForm({ ...roleForm, roleName: value });
            }}
            className={SELECT_CLASS}
          >
            <option value="">Select role</option>
            {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
            <option value="custom">Other / type your own</option>
          </select>
          {customRole && <input
            required
            title="Type a custom role name"
            value={roleForm.roleName}
            onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })}
            placeholder="Kitchen Manager"
            className={`${INPUT_CLASS} mt-2`}
          />}
        </label>
        <label className="block sm:col-span-2 lg:col-span-2">
          <FieldLabel required>Branch Access</FieldLabel>
          <select
            required
            title="Select branch access"
            value={roleForm.showAllBranches ? "__all__" : roleForm.branchName}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "__all__") {
                setRoleForm({ ...roleForm, showAllBranches: true, branchName: "" });
                return;
              }
              setRoleForm({ ...roleForm, showAllBranches: false, branchName: value });
            }}
            className={SELECT_CLASS}
            disabled={branchesLoading}
          >
            <option value="__all__">All Branches</option>
            {branchOptions.map((branch) => <option key={branch.id} value={branch.name}>
              {branch.name}
            </option>)}
          </select>
          {branchesLoading && <span className="mt-1.5 block text-[11px] font-medium text-[#6b7280]">Loading branches…</span>}
          {!branchesLoading && branchOptions.length === 0 && <span className="mt-1.5 block text-[11px] font-medium text-amber-600">
            No branches found from owner branches API.
          </span>}
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <FieldLabel required>Reason</FieldLabel>
          <textarea
            required
            title="Reason for this staff role"
            rows={2}
            value={roleForm.reason}
            onChange={(e) => setRoleForm({ ...roleForm, reason: e.target.value })}
            placeholder="Need evening shift cashier for Lahore branch"
            className={`${INPUT_CLASS} resize-y min-h-[72px]`}
          />
        </label>
      </div>
    </section>

    <section className={FORM_SECTION}>
      <FormSectionHeader
        icon={Globe2}
        title="Location"
        description="Country, province, district and city for this staff member."
      />
      <div className={FORM_GRID}>
        <label className="block sm:col-span-2 lg:col-span-3">
          <FieldLabel required icon={Globe2}>Country</FieldLabel>
          <select
            required
            title="Select country"
            value={roleForm.countryIso}
            onChange={(e) => {
              const country = countries.find((item) => item.isoCode === e.target.value);
              setRoleForm({
                ...roleForm,
                countryIso: e.target.value,
                country: country?.name || "",
                countryCode: country?.phonecode ? `+${country.phonecode}` : roleForm.countryCode,
                province: "",
                provinceIso: "",
                district: "",
                city: ""
              });
            }}
            className={SELECT_CLASS}
          >
            <option value="">Select country</option>
            {countries.map((country) => <option key={country.isoCode} value={country.isoCode}>
              {country.name}
            </option>)}
          </select>
        </label>
        <label className="block">
          <FieldLabel required>Province / State</FieldLabel>
          <select
            required
            title="Select province"
            value={roleForm.provinceIso}
            disabled={!roleForm.countryIso}
            onChange={(e) => {
              const province = provinces.find((item) => item.isoCode === e.target.value);
              setRoleForm({
                ...roleForm,
                provinceIso: e.target.value,
                province: province?.name || "",
                district: "",
                city: ""
              });
            }}
            className={SELECT_CLASS}
          >
            <option value="">{roleForm.countryIso ? "Select province" : "Select country first"}</option>
            {provinces.map((province) => <option key={province.isoCode} value={province.isoCode}>{province.name}</option>)}
          </select>
        </label>
        <label className="block">
          <FieldLabel required>District</FieldLabel>
          <select
            required
            title="Select district"
            value={roleForm.district}
            disabled={!roleForm.provinceIso}
            onChange={(e) => {
              setRoleForm({
                ...roleForm,
                district: e.target.value,
                city: ""
              });
            }}
            className={SELECT_CLASS}
          >
            <option value="">{roleForm.provinceIso ? "Select district" : "Select province first"}</option>
            {districtOptions.map((district) => <option key={district.name} value={district.name}>
              {district.name}
            </option>)}
          </select>
        </label>
        <label className="block">
          <FieldLabel required>City</FieldLabel>
          <select
            required
            title="Select city"
            value={roleForm.city}
            disabled={!roleForm.district}
            onChange={(e) => setRoleForm({ ...roleForm, city: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="">{roleForm.district ? "Select city" : "Select district first"}</option>
            {cityOptions.map((city) => <option key={city.name} value={city.name}>
              {city.name}
            </option>)}
          </select>
          {roleForm.district && cityOptions.length === 0 && <span className="mt-1.5 block text-[11px] text-amber-600">No cities found for this district.</span>}
        </label>
      </div>
    </section>

    <section className={FORM_SECTION}>
      <FormSectionHeader
        icon={ShieldCheck}
        title="Permissions"
        description="Choose sidebar sections and nested actions this role can access."
      />
      {permissionsLoading ? <p className="text-[#6b7280]">Loading sidebar permissions...</p> : sidebarPermissions.length === 0 ? <p className="text-[#6b7280]">No sidebar permissions returned.</p> : <div className="space-y-3 rounded-xl border border-[#e5e7eb] bg-white p-3 sm:p-4">
        {sidebarPermissions.map((item) => {
          const sectionChecked = roleForm.permissionKeys.includes(item.key);
          const toggleSection = () => {
            const nextKeys = toggleKey(roleForm.permissionKeys, item.key);
            const nextSelected = { ...roleForm.selectedButtons };
            if (!nextKeys.includes(item.key)) {
              delete nextSelected[item.key];
              for (const nestedKey of collectNestedButtonKeys(item.buttons)) {
                delete nextSelected[nestedKey];
              }
            } else if (!nextSelected[item.key]?.length && item.buttons.length) {
              nextSelected[item.key] = item.buttons.map((button) => button.key);
              for (const button of item.buttons) {
                if (button.buttons.length) {
                  nextSelected[button.key] = button.buttons.map((child) => child.key);
                }
              }
            }
            setRoleForm({
              ...roleForm,
              permissionKeys: nextKeys,
              selectedButtons: nextSelected
            });
          };
          const toggleButton = (parentKey, button) => {
            const current = roleForm.selectedButtons[parentKey] || [];
            const nextList = toggleKey(current, button.key);
            const nextSelected = {
              ...roleForm.selectedButtons,
              [parentKey]: nextList
            };
            if (!nextList.includes(button.key)) {
              delete nextSelected[button.key];
              for (const nestedKey of collectNestedButtonKeys(button.buttons)) {
                delete nextSelected[nestedKey];
              }
            } else if (button.buttons.length && !nextSelected[button.key]?.length) {
              nextSelected[button.key] = button.buttons.map((child) => child.key);
            }
            setRoleForm({ ...roleForm, selectedButtons: nextSelected });
          };
          const renderButtons = (parentKey, buttons, depth) => <div
            className={`mt-2 border-l border-[#e5e7eb] pl-2 ${depth === 0 ? "ml-5 grid grid-cols-1 sm:grid-cols-2 gap-1" : "ml-4 space-y-1"}`}
          >
            {buttons.map((button) => {
              const checked = (roleForm.selectedButtons[parentKey] || []).includes(button.key);
              return <div key={button.key} className={depth === 0 ? "" : "col-span-full"}>
                <label
                  title={`Select ${button.label}`}
                  className={`flex items-center gap-2 cursor-pointer ${depth === 0 ? "text-[#4b5563]" : "text-[#6b7280] text-[11px]"}`}
                >
                  <input
                    type="checkbox"
                    title={`Select ${button.label}`}
                    className="cursor-pointer accent-[#FF5A1F]"
                    checked={checked}
                    onChange={() => toggleButton(parentKey, button)}
                  />
                  <span>{button.label}</span>
                </label>
                {checked && button.buttons.length > 0 ? renderButtons(button.key, button.buttons, depth + 1) : null}
              </div>;
            })}
          </div>;
          return <div key={item.key} className="rounded-lg px-1 py-0.5">
            <label
              title={`Select ${item.label}`}
              className="flex items-center gap-2 text-[#1a1d26] font-semibold cursor-pointer"
            >
              <input
                type="checkbox"
                title={`Select ${item.label}`}
                className="cursor-pointer accent-[#FF5A1F]"
                checked={sectionChecked}
                onChange={toggleSection}
              />
              <span>{item.label}</span>
            </label>
            {sectionChecked && item.buttons.length > 0 ? renderButtons(item.key, item.buttons, 0) : null}
          </div>;
        })}
      </div>}
    </section>

    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-1">
      <button
        type="button"
        onClick={() => isAddPage ? navigateAdmin("all_staff") : setIsModalOpen(false)}
        title="Cancel"
        className="px-4 py-2.5 rounded-xl border border-[#d1d5db] bg-white text-[#4b5563] hover:border-[#FF5A1F]/50 hover:text-[#FF5A1F] text-sm font-bold transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button type="submit" disabled={savingRole} title={editingRoleId ? "Update role" : "Create role"} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] disabled:opacity-70 !text-white text-sm font-extrabold cursor-pointer">
        {savingRole && <Loader2 className="w-4 h-4 animate-spin" />}
        {savingRole ? "Saving..." : editingRoleId ? "Update Role" : "Create Role"}
      </button>
    </div>
  </form>;
  if (isAddPage) {
    const statusCards = [
      {
        label: "Total",
        value: roleStats.total,
        hint: "All roles",
        icon: ShieldCheck,
        tone: "from-[#FF5A1F]/25 to-[#FF5A1F]/5 text-[#FF5A1F] border-[#FF5A1F]/25"
      },
      {
        label: "Active",
        value: roleStats.active,
        hint: `${roleStats.activePct}% live`,
        icon: CheckCircle2,
        tone: "from-emerald-500/25 to-emerald-500/5 text-emerald-400 border-emerald-500/25"
      },
      {
        label: "Inactive",
        value: roleStats.blocked,
        hint: "Blocked roles",
        icon: Ban,
        tone: "from-red-500/25 to-red-500/5 text-red-400 border-red-500/25"
      },
      {
        label: "Pending",
        value: roleStats.pending,
        hint: "Awaiting verify",
        icon: Clock3,
        tone: "from-amber-500/25 to-amber-500/5 text-amber-400 border-amber-500/25"
      }
    ];
    const periodCards = [
      { label: "Today", value: roleStats.today, icon: Clock3, accent: "text-cyan-400 bg-cyan-500/10" },
      { label: "This Week", value: roleStats.thisWeek, icon: CalendarDays, accent: "text-sky-400 bg-sky-500/10" },
      { label: "This Month", value: roleStats.thisMonth, icon: CalendarRange, accent: "text-violet-400 bg-violet-500/10" },
      { label: "This Year", value: roleStats.thisYear, icon: TrendingUp, accent: "text-rose-400 bg-rose-500/10" }
    ];
    if (addPageBusy) {
      return <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1200px] mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="relative overflow-hidden rounded-3xl border border-[#2A303A] bg-[#191B20] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3 w-full max-w-lg">
              <SkeletonPulse className="h-3 w-20" />
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-11 w-11 rounded-2xl" />
                <SkeletonPulse className="h-8 w-48 sm:w-64" />
              </div>
              <SkeletonPulse className="h-4 w-full max-w-md" />
            </div>
            <SkeletonPulse className="h-10 w-28 rounded-xl self-start sm:self-auto" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((n) => <div key={n} className="rounded-2xl border border-[#292D35] bg-[#191B20] p-4 space-y-3">
            <SkeletonPulse className="h-3 w-16" />
            <SkeletonPulse className="h-8 w-12" />
            <SkeletonPulse className="h-3 w-24" />
          </div>)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => <SkeletonPulse key={n} className="h-24 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <SkeletonPulse className="h-64 rounded-2xl" />
          <SkeletonPulse className="xl:col-span-2 h-64 rounded-2xl" />
        </div>
        <SkeletonPulse className="h-96 w-full rounded-2xl" />
      </div>;
    }
    return <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-[1200px] mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="relative overflow-hidden rounded-3xl border border-[#2A303A] bg-gradient-to-br from-[#1A1F28] via-[#151920] to-[#10141A] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#FF5A1F]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              title="Back to all staff"
              onClick={() => navigateAdmin("all_staff")}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Staff
            </button>
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 font-['Outfit',sans-serif]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF5A1F] !text-white shadow-lg shadow-[#FF5A1F]/30">
                <UserPlus className="w-5 h-5" />
              </span>
              Add Staff Role
            </h2>
            <p className="mt-2 text-[13px] text-neutral-400 max-w-xl">
              Review roster health, then create a new role with branch access and permissions.
            </p>
          </div>
          <button
            type="button"
            title="Refresh stats"
            disabled={rolesRefreshing}
            onClick={() => void loadRoles({ silent: true })}
            className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-200 hover:text-white hover:bg-white/10 text-sm font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${rolesRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return <div
            key={card.label}
            className={`rounded-2xl border bg-gradient-to-br p-4 sm:p-5 transition-transform hover:-translate-y-0.5 ${card.tone}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide font-bold text-neutral-300/90">
                  {card.label}
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white tabular-nums">
                  {card.value}
                </div>
                <div className="mt-1 text-[11px] text-neutral-400">{card.hint}</div>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/20">
                <Icon className="w-4 h-4" />
              </span>
            </div>
          </div>;
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {periodCards.map((card) => {
          const Icon = card.icon;
          return <div
            key={card.label}
            className="rounded-2xl border border-[#292D35] bg-[#191B20] p-4 sm:p-5 hover:border-[#3A4250] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[11px] uppercase tracking-wide font-bold text-neutral-500">
                  {card.label}
                </div>
                <div className="text-xl sm:text-2xl font-black text-white tabular-nums">{card.value}</div>
                <div className="text-[11px] text-neutral-500">roles created</div>
              </div>
            </div>
          </div>;
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#292D35] bg-[#191B20] p-5">
          <div className="text-sm font-bold text-white mb-4">Status mix</div>
          {roleStats.total === 0 ? <p className="text-xs text-neutral-500 py-12 text-center">No roles yet — create the first one below.</p> : <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-5">
            <div className="relative h-40 w-40 shrink-0 rounded-full shadow-[0_0_40px_rgba(255,90,31,0.12)]" style={donutStyle}>
              <div className="absolute inset-4 rounded-full bg-[#191B20] flex flex-col items-center justify-center border border-[#292D35]">
                <span className="text-2xl font-black text-white tabular-nums">{roleStats.activePct}%</span>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Active</span>
              </div>
            </div>
            <div className="space-y-2.5 w-full text-xs">
              {[
                { label: "Active", value: roleStats.active, color: "bg-emerald-400" },
                { label: "Blocked", value: roleStats.blocked, color: "bg-red-400" },
                { label: "Pending", value: roleStats.pending, color: "bg-amber-400" }
              ].map((row) => <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-[#101216] border border-[#292D35] px-3 py-2">
                <span className="flex items-center gap-2 text-neutral-300">
                  <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                  {row.label}
                </span>
                <span className="font-bold text-white tabular-nums">{row.value}</span>
              </div>)}
            </div>
          </div>}
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-[#292D35] bg-[#191B20] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="text-sm font-bold text-white">Role creation trend</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">{chartSeries.title}</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["monthly", "Monthly"],
                ["yearly", "Yearly"]
              ].map(([key, label]) => <button
                key={key}
                type="button"
                onClick={() => setChartRange(key)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${chartRange === key ? "bg-[#FF5A1F] border-[#FF5A1F] !text-white shadow-md shadow-[#FF5A1F]/25" : "bg-[#101216] border-[#292D35] text-neutral-400 hover:text-white hover:border-[#3A4250]"}`}
              >
                {label}
              </button>)}
            </div>
          </div>
          <div className="flex items-end gap-1.5 sm:gap-2.5 h-48">
            {chartSeries.values.map((count, index) => <div key={`${chartSeries.labels[index]}-${index}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <span className="text-[10px] font-bold text-neutral-400 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                {count}
              </span>
              <div className="w-full rounded-t-xl bg-[#0E1116] border border-[#292D35] overflow-hidden flex items-end h-[150px]">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#C2410C] via-[#FF5A1F] to-[#FDBA74] transition-all duration-500 group-hover:brightness-110"
                  style={{ height: `${Math.max(count > 0 ? 10 : 0, count / chartMax * 100)}%` }}
                />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-neutral-500 truncate max-w-full">
                {chartSeries.labels[index]}
              </span>
            </div>)}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#e5e7eb] bg-[#f3f4f6] shadow-[0_16px_40px_rgba(0,0,0,0.12)] min-w-0">
        <div className="p-4 sm:p-6 lg:p-7 space-y-5 sm:space-y-6 min-w-0">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-[#1a1d26] tracking-tight font-['Outfit',sans-serif]">
              Create new role
            </h3>
            <p className="text-[13px] text-[#6b7280] max-w-2xl leading-relaxed">
              Fill in the details below. Domain is applied automatically from this site URL.
            </p>
          </div>
          {createRoleForm}
        </div>
      </div>
    </div>;
  }
  if (rolesLoading) {
    return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3 w-full max-w-lg">
          <div className="flex items-center gap-2.5">
            <SkeletonPulse className="h-10 w-10 rounded-xl" />
            <SkeletonPulse className="h-7 w-40" />
          </div>
          <SkeletonPulse className="h-4 w-full max-w-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonPulse className="h-10 w-24 rounded-xl" />
          <SkeletonPulse className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((n) => <div key={n} className="rounded-2xl border border-[#292D35] bg-[#191B20] p-4 space-y-3">
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-8 w-12" />
          <SkeletonPulse className="h-3 w-28" />
        </div>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 rounded-2xl border border-[#292D35] bg-[#191B20] p-5 space-y-4">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="mx-auto h-36 w-36 rounded-full" />
          <SkeletonPulse className="h-3 w-full" />
        </div>
        <div className="xl:col-span-2 rounded-2xl border border-[#292D35] bg-[#191B20] p-5 space-y-4">
          <SkeletonPulse className="h-4 w-40" />
          <div className="flex items-end gap-2 h-40">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <SkeletonPulse key={n} className="flex-1 h-[40%]" />)}
          </div>
        </div>
      </div>
      <div className="bg-[#191B20] border border-[#292D35] rounded-[20px] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-8 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="rounded-2xl border border-[#292D35] bg-[#14161B] p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <SkeletonPulse className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <SkeletonPulse className="h-3 w-28" />
                <SkeletonPulse className="h-3 w-40" />
              </div>
            </div>
            <SkeletonPulse className="h-3 w-full" />
            <SkeletonPulse className="h-3 w-5/6" />
            <SkeletonPulse className="h-3 w-2/3" />
            <SkeletonPulse className="h-8 w-full rounded-xl" />
          </div>)}
        </div>
      </div>
    </div>;
  }
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 font-['Outfit',sans-serif]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F]">
            <Users className="w-5 h-5" />
          </span>
          All Staff
        </h2>
        <p className="mt-1.5 text-[13px] text-neutral-400 max-w-xl">
          Track roles, branch access, and team growth across your restaurant.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          title="Refresh roles"
          disabled={rolesRefreshing}
          onClick={() => void loadRoles({ silent: true })}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#191B20] border border-[#292D35] text-neutral-300 hover:text-white hover:border-[#3A404A] text-sm font-bold transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${rolesRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <button
          type="button"
          title="Add staff"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] !text-white text-sm font-bold transition-all shadow-md shadow-[#FF5A1F]/20 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {[
        {
          label: "Total Roles",
          value: roleStats.total,
          hint: "All created roles",
          icon: ShieldCheck,
          tone: "text-[#FF5A1F] bg-[#FF5A1F]/10",
          filter: "all"
        },
        {
          label: "Active",
          value: roleStats.active,
          hint: `${roleStats.activePct}% of roster`,
          icon: CheckCircle2,
          tone: "text-emerald-400 bg-emerald-500/10",
          filter: "active"
        },
        {
          label: "Blocked",
          value: roleStats.blocked,
          hint: "Inactive accounts",
          icon: Ban,
          tone: "text-red-400 bg-red-500/10",
          filter: "inactive"
        },
        {
          label: "This Week",
          value: roleStats.thisWeek,
          hint: "New since Monday",
          icon: CalendarDays,
          tone: "text-sky-400 bg-sky-500/10",
          filter: null
        },
        {
          label: "This Month",
          value: roleStats.thisMonth,
          hint: "Created this month",
          icon: CalendarRange,
          tone: "text-violet-400 bg-violet-500/10",
          filter: null
        }
      ].map((card) => {
        const Icon = card.icon;
        const isSelected = card.filter !== null && statusFilter === card.filter;
        return <button
          key={card.label}
          type="button"
          disabled={card.filter === null}
          onClick={() => {
            if (card.filter === null) return;
            setStatusFilter((prev) => prev === card.filter ? "all" : card.filter);
          }}
          className={`text-left rounded-2xl border p-4 sm:p-5 transition-all ${card.filter === null ? "cursor-default" : "cursor-pointer hover:border-[#3A404A]"} ${isSelected ? "border-[#FF5A1F]/50 bg-[color-mix(in_srgb,#FF5A1F_12%,transparent)]" : "border-[#292D35] bg-[#191B20]"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide font-bold text-neutral-400">
                {card.label}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-[var(--admin-text,#ffffff)] tabular-nums">
                {card.value}
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">{card.hint}</div>
            </div>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
              <Icon className="w-4 h-4" />
            </span>
          </div>
        </button>;
      })}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-[#292D35] bg-[#191B20] p-5">
        <div className="text-sm font-bold text-white mb-4">Status mix</div>
        {roleStats.total === 0 ? <p className="text-xs text-neutral-500 py-10 text-center">No roles to chart yet.</p> : <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative h-36 w-36 shrink-0 rounded-full" style={donutStyle}>
            <div className="absolute inset-3 rounded-full bg-[#191B20] flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white tabular-nums">{roleStats.activePct}%</span>
              <span className="text-[10px] uppercase font-bold text-neutral-500">Active</span>
            </div>
          </div>
          <div className="space-y-2.5 w-full text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Active
              </span>
              <span className="font-bold text-white tabular-nums">{roleStats.active}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Blocked
              </span>
              <span className="font-bold text-white tabular-nums">{roleStats.blocked}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Pending
              </span>
              <span className="font-bold text-white tabular-nums">{roleStats.pending}</span>
            </div>
          </div>
        </div>}
      </div>

      <div className="xl:col-span-2 rounded-2xl border border-[#292D35] bg-[#191B20] p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-bold text-white">New roles this week</div>
          <span className="text-[11px] text-neutral-500 font-bold">{roleStats.thisWeek} total</span>
        </div>
        <div className="flex items-end gap-2 sm:gap-3 h-40">
          {roleStats.byWeekday.map((count, index) => <div key={weekDayLabels[index]} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <span className="text-[10px] font-bold text-neutral-400 tabular-nums">{count}</span>
            <div className="w-full rounded-t-lg bg-[#101216] border border-[#292D35] overflow-hidden flex items-end h-[120px]">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-[#E04810] to-[#FF5A1F] transition-all"
                style={{ height: `${Math.max(count > 0 ? 8 : 0, count / roleStats.maxWeekday * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-neutral-500">{weekDayLabels[index]}</span>
          </div>)}
        </div>
      </div>
    </div>

    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Roles</h3>
          <div className="flex flex-wrap items-center gap-2">
            {["all", "active", "inactive", "pending"].map((key) => <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-colors cursor-pointer ${statusFilter === key ? "bg-[#FF5A1F]/15 border-[#FF5A1F]/40 text-[#FF5A1F]" : "bg-[#101216] border-[#292D35] text-neutral-400 hover:text-white"}`}
            >
              {key}
            </button>)}
            <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md bg-[#101216] border border-[#292D35] text-neutral-300">
              {filteredRoles.length} shown
            </span>
            <div className="inline-flex rounded-xl border border-[#292D35] bg-[#101216] p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Card view"
                className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === "cards" ? "bg-[#FF5A1F] !text-white" : "text-neutral-400 hover:text-white"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("rows")}
                title="Row view"
                className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === "rows" ? "bg-[#FF5A1F] !text-white" : "text-neutral-400 hover:text-white"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredRoles.length === 0 ? <p className="py-8 text-center text-xs text-neutral-500">
        {apiRoles.length === 0 ? "No roles found for this domain." : "No roles match this filter."}
      </p> : viewMode === "cards" ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filteredRoles.map((role) => {
          const fullName = `${role.firstName} ${role.lastName}`.trim() || role.roleName || "Role";
          const initials = fullName.split(" ").map((part) => part[0]).join("").substring(0, 2).toUpperCase();
          const location = [role.city, role.district, role.province, role.country].filter(Boolean).join(", ");
          const branchLabel = staffBranchLabel(role);
          const createdWhen = formatStaffDateTime(role.createdAt);
          const createdBy = [role.createdByName, role.createdByRole || role.createdByType].filter(Boolean).join(" · ") || "—";
          const reason = role.createdReason || role.reason || "—";
          const phone = [role.countryCode, role.contactNumber].filter(Boolean).join(" ") || "—";
          const photo = role.profilePitcher?.trim() || "";
          return <div
            key={role.id}
            className="rounded-2xl border border-[#292D35] bg-[#14161B] p-4 flex flex-col gap-3 hover:border-[#FF5A1F]/35 transition-all min-w-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] font-black text-xs flex items-center justify-center border border-[#FF5A1F]/30 shrink-0 overflow-hidden">
                  {photo ? <img src={photo} alt={fullName} className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">{fullName}</div>
                  <div className="text-[11px] text-neutral-400 truncate">{role.email || "No email"}</div>
                </div>
              </div>
              <span
                className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${role.status === "active" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : role.status === "pending" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${role.status === "active" ? "bg-emerald-400" : role.status === "pending" ? "bg-amber-300" : "bg-neutral-400"}`} />
                {role.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] uppercase font-extrabold px-2 py-1 rounded-md bg-[#101216] border border-[#292D35] text-neutral-300">
                {role.roleName || "Role"}
              </span>
              {role.staffType || role.accountType ? <span className="text-[10px] uppercase font-extrabold px-2 py-1 rounded-md bg-[#101216] border border-[#292D35] text-neutral-400">
                {role.staffType || role.accountType}
              </span> : null}
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-start gap-2 text-neutral-300">
                <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#FF5A1F]" />
                <span className="min-w-0 break-words">
                  <span className="text-neutral-500 font-bold uppercase tracking-wide mr-1">Branch</span>
                  {branchLabel}
                </span>
              </div>
              <div className="flex items-start gap-2 text-neutral-300">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
                <span className="min-w-0 break-words">{location || "—"}</span>
              </div>
              <div className="flex items-start gap-2 text-neutral-300">
                <Phone className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
                <span className="font-mono">{phone}</span>
              </div>
              <div className="flex items-start gap-2 text-neutral-300">
                <User className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
                <span className="min-w-0 break-words">
                  <span className="text-neutral-500 font-bold uppercase tracking-wide mr-1">Created by</span>
                  {createdBy}
                </span>
              </div>
              <div className="flex items-start gap-2 text-neutral-300">
                <Clock3 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
                <span className="min-w-0 break-words">
                  <span className="text-neutral-500 font-bold uppercase tracking-wide mr-1">When</span>
                  {createdWhen}
                </span>
              </div>
              <div className="flex items-start gap-2 text-neutral-300">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
                <span className="min-w-0 break-words">
                  <span className="text-neutral-500 font-bold uppercase tracking-wide mr-1">Reason</span>
                  {reason}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#292D35]">
              <button
                type="button"
                title="Update role"
                onClick={() => openApiRole(role)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#101216] border border-[#292D35] text-neutral-200 hover:text-white hover:border-[#FF5A1F]/40 text-[11px] font-bold transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              {role.status === "active" ? <button
                type="button"
                title="Block role"
                disabled={roleActionId === role.id}
                onClick={() => runRoleAction(role.id, "block")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/15 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60"
              >
                <Ban className="w-3.5 h-3.5" />
                Block
              </button> : role.status === "inactive" ? <button
                type="button"
                title="Activate role"
                disabled={roleActionId === role.id}
                onClick={() => runRoleAction(role.id, "activate")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Activate
              </button> : null}
              <button
                type="button"
                title="Delete role"
                disabled={roleActionId === role.id}
                onClick={() => setRoleToDelete({ id: role.id, name: role.roleName || fullName })}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/15 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>;
        })}
      </div> : <div className="space-y-2.5">
        {filteredRoles.map((role) => {
          const fullName = `${role.firstName} ${role.lastName}`.trim() || role.roleName || "Role";
          const initials = fullName.split(" ").map((part) => part[0]).join("").substring(0, 2).toUpperCase();
          const location = [role.city || role.district, role.province].filter(Boolean).join(", ");
          const branchLabel = staffBranchLabel(role);
          const photo = role.profilePitcher?.trim() || "";
          return <div
            key={role.id}
            className="rounded-2xl border border-[#292D35] bg-[#14161B] p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center gap-3 hover:border-[#FF5A1F]/35 transition-all min-w-0"
          >
            <div className="flex items-center gap-2.5 min-w-0 lg:w-[220px] shrink-0">
              <div className="w-11 h-11 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] font-black text-xs flex items-center justify-center border border-[#FF5A1F]/30 shrink-0 overflow-hidden">
                {photo ? <img src={photo} alt={fullName} className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-sm truncate">{fullName}</div>
                <div className="text-[11px] text-neutral-400 truncate">{role.email || "No email"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 flex-1 min-w-0 text-[11px]">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wide">Role</div>
                <div className="mt-0.5 text-neutral-200 font-semibold truncate">{role.roleName || "—"}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wide">Branch</div>
                <div className="mt-0.5 text-neutral-200 font-semibold line-clamp-2 break-words">{branchLabel}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wide">Location</div>
                <div className="mt-0.5 text-neutral-200 font-semibold truncate">{location || "—"}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wide">Created by</div>
                <div className="mt-0.5 text-neutral-200 font-semibold truncate">{role.createdByName || "—"}</div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {[role.createdByRole, role.createdByType].filter(Boolean).join(" · ") || formatStaffDateTime(role.createdAt)}
                </div>
              </div>
              <div className="min-w-0 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wide">Reason</div>
                <div className="mt-0.5 text-neutral-300 line-clamp-2 break-words">
                  {role.createdReason || role.reason || "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2 shrink-0 lg:pl-1">
              <span
                className={`self-start text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${role.status === "active" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : role.status === "pending" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${role.status === "active" ? "bg-emerald-400" : role.status === "pending" ? "bg-amber-300" : "bg-neutral-400"}`} />
                {role.status}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  title="Update role"
                  onClick={() => openApiRole(role)}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#101216] border border-[#292D35] text-neutral-200 hover:text-white text-[10px] font-bold cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
                {role.status === "active" ? <button
                  type="button"
                  title="Block role"
                  disabled={roleActionId === role.id}
                  onClick={() => runRoleAction(role.id, "block")}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-bold cursor-pointer disabled:opacity-60"
                >
                  <Ban className="w-3 h-3" />
                  Block
                </button> : role.status === "inactive" ? <button
                  type="button"
                  title="Activate role"
                  disabled={roleActionId === role.id}
                  onClick={() => runRoleAction(role.id, "activate")}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-bold cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Activate
                </button> : null}
                <button
                  type="button"
                  title="Delete role"
                  disabled={roleActionId === role.id}
                  onClick={() => setRoleToDelete({ id: role.id, name: role.roleName || fullName })}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[10px] font-bold cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>;
        })}
      </div>}
    </div>



    {roleToDelete && <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-[#191B20] border border-[#292D35] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#292D35]">
          <h3 className="text-base font-black text-white">Delete Role</h3>
          <button
            type="button"
            title="Close"
            onClick={() => setRoleToDelete(null)}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#252830] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-neutral-300">
          Delete <span className="font-bold text-white">{roleToDelete.name}</span>? This role will be removed.
        </p>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            title="Cancel"
            onClick={() => setRoleToDelete(null)}
            className="px-4 py-2 rounded-xl bg-[#252830] text-neutral-300 hover:text-white font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            title="Delete role"
            disabled={roleActionId === roleToDelete.id}
            onClick={() => {
              const id = roleToDelete.id;
              setRoleToDelete(null);
              runRoleAction(id, "delete");
            }}
            className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-70 text-white font-extrabold cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>}

    {
      /* Add / Edit Staff Modal */
    }
    {isModalOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#191B20] border border-[#292D35] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-[#292D35]">
          <h3 className="text-base font-black text-white">
            {editingRoleId ? "Update Role" : editingStaff ? "Edit Staff Member" : "Create Role"}
          </h3>
          <button
            type="button"
            title="Close"
            onClick={() => setIsModalOpen(false)}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#252830] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!editingStaff ? createRoleForm : <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-neutral-300 font-bold mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ali Raza"
              className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-bold mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="kitchen">Kitchen Chef</option>
                <option value="rider">Rider / Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-300 font-bold mb-1">
                Assigned Branch *
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
              >
                {branches.map((b) => <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 font-bold mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ali@burgerblast.pk"
              className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-bold mb-1">
              Mobile Number
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+92 300 1234567"
              className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#292D35]">
            <button
              type="button"
              title="Cancel"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#252830] text-neutral-300 hover:text-white font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              title={editingStaff ? "Save staff member" : "Add staff member"}
              className="px-5 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] text-white font-extrabold shadow-md shadow-[#FF5A1F]/20 transition-all cursor-pointer"
            >
              {editingStaff ? "Save" : "Add Staff"}
            </button>
          </div>
        </form>}
      </div>
    </div>}
  </div>;
};
export {
  StaffPage
};
