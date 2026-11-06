import { getOwnerSession } from "./ownerSession";
import { readAccountKind } from "./ownerProfile";
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function extractStaffAccess(data) {
  const root = asRecord(data);
  if (!root) return null;
  const accountType = text(root.accountType || root.accountKind).toLowerCase();
  const staff = asRecord(root.staff) || asRecord(root.user) || asRecord(root.data);
  const looksStaff = accountType === "staff" || accountType === "employee" || Boolean(staff && (staff.staffType || staff.roleName || staff.allowedSidebar || staff.branchIds));
  if (!looksStaff) return null;
  const source = staff || root;
  const branchIds = stringList(source.branchIds || source.branches);
  const branchNames = stringList(source.branchNames || source.branchName);
  const accessAllBranches = source.accessAllBranches === true || source.access_all_branches === true || branchIds.length === 0 && branchNames.length === 0;
  const sidebarRaw = Array.isArray(root.sidebar) && root.sidebar.length > 0 && root.sidebar || Array.isArray(source.sidebar) && source.sidebar.length > 0 && source.sidebar || Array.isArray(source.allowedSidebar) && source.allowedSidebar || null;
  return {
    accessAllBranches,
    branchIds,
    branchNames,
    roleName: text(source.roleName || source.role || source.staffType),
    firstName: text(source.firstName || source.ownerFirstName),
    lastName: text(source.lastName || source.ownerLastName),
    email: text(source.email),
    sidebar: sidebarRaw
  };
}
function getStaffAccess() {
  const session = getOwnerSession();
  if (!session?.staffAccess) return null;
  return session.staffAccess;
}
function isStaffSession() {
  return readAccountKind() === "staff" || Boolean(getStaffAccess());
}
function filterBranchesForStaff(branches, access) {
  if (!access) return branches;
  const ids = new Set(access.branchIds);
  const names = new Set(access.branchNames.map((n) => n.toLowerCase()));
  if (ids.size === 0 && names.size === 0) {
    return access.accessAllBranches ? branches : [];
  }
  return branches.filter((branch) => {
    if (ids.has(branch.id)) return true;
    const name = (branch.name || "").toLowerCase();
    const shortName = (branch.shortName || "").toLowerCase();
    return name && names.has(name) || shortName && names.has(shortName);
  });
}
function staffLiveBranches(branches, access) {
  return filterBranchesForStaff(branches, access).filter((b) => b.isActive !== false);
}
export {
  extractStaffAccess,
  filterBranchesForStaff,
  getStaffAccess,
  isStaffSession,
  staffLiveBranches
};
