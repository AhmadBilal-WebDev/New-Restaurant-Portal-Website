import { getOwnerSession } from "./ownerSession";
function authHeaders(json = false) {
  const session = getOwnerSession();
  const token = session?.token || (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null);
  return {
    Accept: "application/json",
    ...json ? { "Content-Type": "application/json" } : {},
    ...token ? { Authorization: `Bearer ${token}` } : {}
  };
}
function currentFrontendDomain() {
  if (typeof window !== "undefined" && window.location.origin) return window.location.origin;
  return "";
}
async function staffRequest(path, method, body) {
  try {
    const response = await fetch(path, {
      method,
      headers: authHeaders(Boolean(body)),
      ...body ? { body: JSON.stringify(body) } : {}
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Staff Role API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
function extractRoleId(data) {
  const record = data && typeof data === "object" ? data : {};
  const nested = [record.role, record.data, record.staff, record].find(
    (item) => item && typeof item === "object"
  );
  const id = nested?.id || nested?._id || record.id || record._id;
  return typeof id === "string" ? id : "";
}
function staffBranchLabel(role) {
  if (role.showAllBranches) return "All Branches";
  const names = (role.branchNames || []).map((n) => n.trim()).filter(Boolean);
  if (names.length === 1) return names[0];
  if (names.length > 1) return names.join(", ");
  return role.branchName?.trim() || "—";
}
function formatStaffDateTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString(void 0, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function roleCreatedAt(role) {
  if (role.createdAt) {
    const parsed = new Date(role.createdAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (/^[a-f\d]{24}$/i.test(role.id)) {
    const seconds = parseInt(role.id.slice(0, 8), 16);
    if (Number.isFinite(seconds)) return new Date(seconds * 1e3);
  }
  return null;
}
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return null;
}
function readFlag(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value === true || value === "true" || value === 1 || value === "1") return true;
    if (value === false || value === "false" || value === 0 || value === "0") return false;
  }
  return null;
}
function textValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}
function readId(row) {
  for (const key of ["id", "_id", "roleId", "staffId"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    const nested = asRecord(value);
    const oid = nested?.$oid || nested?.oid;
    if (typeof oid === "string" && oid.trim()) return oid.trim();
  }
  return "";
}
function mergeRow(value) {
  const row = asRecord(value);
  if (!row) return null;
  const merged = { ...row };
  if (!readId(merged)) {
    for (const field of Object.values(row)) {
      const nested = asRecord(field);
      const nestedId = nested ? readId(nested) : "";
      if (nestedId) {
        merged.id = nestedId;
        break;
      }
    }
  }
  for (const field of Object.values(row)) {
    const nested = asRecord(field);
    if (!nested || nested.$oid || nested.oid) continue;
    for (const [key, nestedValue] of Object.entries(nested)) {
      if (key === "id" || key === "_id" || key === "roleId") continue;
      if (merged[key] == null || merged[key] === "") merged[key] = nestedValue;
    }
  }
  return merged;
}
function mapPermissionButtons(value) {
  if (!Array.isArray(value)) return [];
  const mapped = [];
  for (const button of value) {
    const entry = asRecord(button);
    if (!entry) continue;
    const key = textValue(entry, ["key", "id"]);
    if (!key) continue;
    mapped.push({
      key,
      label: textValue(entry, ["label", "name"]) || key,
      buttons: mapPermissionButtons(entry.buttons)
    });
  }
  return mapped;
}
function mapPermissionTree(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const permission = asRecord(item);
    if (!permission) return null;
    const key = textValue(permission, ["key", "id"]);
    if (!key) return null;
    const buttons = mapPermissionButtons(permission.buttons);
    const permissionItem = {
      key,
      label: textValue(permission, ["label", "name"]) || key,
      ...buttons.length ? { buttons } : {}
    };
    return permissionItem;
  }).filter((item) => item !== null);
}
function readStringArray(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (!Array.isArray(value)) continue;
    return value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);
  }
  return [];
}
function mapRole(value) {
  const row = mergeRow(value);
  if (!row) return null;
  const id = readId(row);
  if (!id) return null;
  const statusText = textValue(row, ["status", "roleStatus", "verificationStatus", "accountStatus"]).toLowerCase();
  const verified = readFlag(row, [
    "isEmailVerified",
    "emailVerified",
    "isVerified",
    "verified",
    "isUserVerified",
    "otpVerified",
    "isOtpVerified"
  ]);
  const unverified = verified === false || statusText === "pending" || statusText === "unverified" || statusText === "not_verified" || statusText === "not verified" || row.emailVerifiedAt === null || row.verifiedAt === null;
  const inactive = row.isBlocked === true || row.blocked === true || row.isActive === false || statusText === "inactive" || statusText === "blocked" || statusText === "block";
  const status = unverified ? "pending" : inactive ? "inactive" : "active";
  let permissions = mapPermissionTree(row.permissions);
  if (!permissions.length) {
    permissions = mapPermissionTree(row.allowedSidebar ?? row.sidebar ?? row.sidebarButtons);
  }
  const dob = textValue(row, ["dateOfBirth", "dob"]);
  const showAll = readFlag(row, ["showAllBranches", "accessAllBranches", "allBranches"]) === true;
  const branchNames = readStringArray(row, ["branchNames", "branches"]);
  const branchIds = readStringArray(row, ["branchIds"]);
  const branchName = textValue(row, ["branchName", "branch", "assignedBranch"]) || (branchNames.length === 1 ? branchNames[0] : "") || (branchNames.length > 1 ? branchNames.join(", ") : "");
  const createdReason = textValue(row, ["createdReason", "reason", "note", "remarks"]);
  return {
    id,
    status,
    showAllBranches: showAll,
    branchName,
    branchNames,
    branchIds,
    reason: createdReason,
    createdReason,
    roleName: textValue(row, ["roleName", "name", "role"]),
    firstName: textValue(row, ["firstName"]),
    lastName: textValue(row, ["lastName"]),
    fatherName: textValue(row, ["fatherName"]),
    email: textValue(row, ["email"]),
    frontendDomainUrl: textValue(row, ["frontendDomainUrl"]),
    cnic: textValue(row, ["cnic", "ownerCnic"]),
    address: textValue(row, ["address"]),
    country: textValue(row, ["country"]),
    province: textValue(row, ["province"]),
    district: textValue(row, ["district"]),
    city: textValue(row, ["city"]),
    countryCode: textValue(row, ["countryCode"]),
    contactNumber: textValue(row, ["contactNumber", "phone"]),
    gender: textValue(row, ["gender"]) || "male",
    dateOfBirth: dob.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "",
    permissions,
    createdAt: textValue(row, ["createdAt", "created_at", "createdOn"]),
    updatedAt: textValue(row, ["updatedAt", "updated_at", "updatedOn"]),
    createdByName: textValue(row, ["createdByName", "createdByUserName"]),
    createdByRole: textValue(row, ["createdByRole"]),
    createdByType: textValue(row, ["createdByType", "createdByAccountType"]),
    staffType: textValue(row, ["staffType"]),
    accountType: textValue(row, ["accountType"]),
    canManage: readFlag(row, ["canManage"]) !== false,
    isEmailVerified: verified === true,
    isPasswordSet: readFlag(row, ["isPasswordSet", "passwordSet"]) === true,
    profilePitcher: textValue(row, [
      "profilePitcher",
      "profilePicture",
      "profilePhoto",
      "avatar",
      "photo",
      "image"
    ])
  };
}
function looksLikeRole(value) {
  const row = asRecord(value);
  if (!row) return false;
  return Boolean(
    row.roleName || row.firstName || row.email || row.contactNumber || row.cnic || row._id || row.id || row.roleId
  );
}
function collectLists(value, depth = 0) {
  if (depth > 6 || value == null) return [];
  if (Array.isArray(value)) {
    const nested = value.flatMap((item) => collectLists(item, depth + 1));
    return value.some((item) => item && typeof item === "object") ? [value, ...nested] : nested;
  }
  const record = asRecord(value);
  if (!record) return [];
  const lists = [];
  const roleLike = Object.values(record).filter(looksLikeRole);
  if (roleLike.length) lists.push(roleLike);
  return [...lists, ...Object.values(record).flatMap((item) => collectLists(item, depth + 1))];
}
function roleScore(role) {
  return (role.email ? 4 : 0) + (role.firstName ? 3 : 0) + (role.contactNumber ? 3 : 0) + (role.cnic ? 2 : 0) + (role.roleName ? 2 : 0);
}
function sourceRoleCount(list) {
  return list.filter((item) => {
    const row = asRecord(item);
    return Boolean(row && (row.roleName || row.firstName || row.email || row.cnic || row.contactNumber));
  }).length;
}
function mapStaffRoles(data) {
  let best = [];
  let bestSource = -1;
  let bestScore = 0;
  for (const list of collectLists(data)) {
    const mapped = list.map(mapRole).filter((role) => Boolean(role)).filter((role) => roleScore(role) > 0);
    const source = sourceRoleCount(list);
    const score = mapped.reduce((sum, role) => sum + roleScore(role), 0);
    if (source > bestSource || source === bestSource && score > bestScore) {
      best = mapped;
      bestSource = source;
      bestScore = score;
    }
  }
  return best;
}
function formatStaffCnic(value) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length !== 13) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}
async function getStaffRoles(frontendDomainUrl) {
  const query = new URLSearchParams({ frontendDomainUrl });
  try {
    const response = await fetch(`/api/restaurant/staff/roles?${query.toString()}`, {
      method: "GET",
      headers: authHeaders()
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data, roles: mapStaffRoles(data) };
  } catch (error) {
    console.error("Get Staff Roles API Error:", error);
    return { ok: false, status: 500, data: null, roles: [] };
  }
}
async function createStaffRole(payload, frontendDomainUrl = currentFrontendDomain()) {
  const query = new URLSearchParams({ frontendDomainUrl });
  return staffRequest(`/api/restaurant/staff/create-role?${query.toString()}`, "POST", payload);
}
async function updateStaffRole(id, payload, frontendDomainUrl = currentFrontendDomain()) {
  const query = new URLSearchParams({ frontendDomainUrl });
  return staffRequest(
    `/api/restaurant/staff/update-role/${encodeURIComponent(id)}?${query.toString()}`,
    "PUT",
    payload
  );
}
function domainBody(frontendDomainUrl) {
  return { frontendDomainUrl };
}
async function blockStaffRole(id, frontendDomainUrl) {
  return staffRequest(`/api/restaurant/staff/block-role/${id}`, "PUT", domainBody(frontendDomainUrl));
}
async function activateStaffRole(id, frontendDomainUrl) {
  return staffRequest(`/api/restaurant/staff/activate-role/${id}`, "PUT", domainBody(frontendDomainUrl));
}
async function deleteStaffRole(id, frontendDomainUrl) {
  return staffRequest(`/api/restaurant/staff/delete-role/${id}`, "DELETE", domainBody(frontendDomainUrl));
}
export {
  activateStaffRole,
  blockStaffRole,
  createStaffRole,
  deleteStaffRole,
  extractRoleId,
  formatStaffCnic,
  formatStaffDateTime,
  getStaffRoles,
  mapStaffRoles,
  roleCreatedAt,
  staffBranchLabel,
  updateStaffRole
};
