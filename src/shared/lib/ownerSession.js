const SESSION_KEY = "ros_owner_session";
const LOGIN_FLAG_KEY = "ros_admin_logged_in";
function getOwnerSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveOwnerSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem(LOGIN_FLAG_KEY, "true");
}
function clearOwnerSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem("owner_token");
  window.localStorage.setItem(LOGIN_FLAG_KEY, "false");
}
const OWNER_SESSION_EXPIRED_EVENT = "ros-owner-session-expired";
function getOwnerSessionExpiresAt(token) {
  const jwt = decodeJwt(token);
  const exp = jwt?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  return exp * 1e3;
}
function isOwnerSessionExpired(token) {
  const expiresAt = getOwnerSessionExpiresAt(token);
  return expiresAt !== null && expiresAt <= Date.now();
}
function expireOwnerSession() {
  clearOwnerSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OWNER_SESSION_EXPIRED_EVENT));
  }
}
const OWNER_ROLES = /* @__PURE__ */ new Set([
  "owner",
  "super_admin",
  "super admin",
  "superadmin",
  "restaurant owner",
  "restaurant_owner"
]);
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return null;
}
function text(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
function decodeJwt(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let padded = part.replace(/-/g, "+").replace(/_/g, "/");
    padded += "=".repeat((4 - padded.length % 4) % 4);
    const json = decodeURIComponent(
      atob(padded).split("").map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
    );
    return asRecord(JSON.parse(json));
  } catch {
    return null;
  }
}
function readKind(row) {
  if (!row) return null;
  if (row.accountKind === "staff" || row.isStaff === true || row.isRoleUser === true) return "staff";
  if (row.accountKind === "owner") return "owner";
  const type = text(row.userType || row.accountType);
  if (type === "staff" || type === "role" || type === "employee") return "staff";
  if (type === "owner") return "owner";
  const role = text(row.roleName || row.staffRole || row.role);
  if (!role) return null;
  return OWNER_ROLES.has(role) ? "owner" : "staff";
}
function inferAccountKind(owner, token) {
  const jwt = token ? decodeJwt(token) : null;
  const records = [asRecord(owner), jwt, asRecord(jwt?.user), asRecord(jwt?.owner), asRecord(jwt?.data)].filter(
    (row) => Boolean(row)
  );
  for (const row of records) {
    if (readKind(row) === "staff") return "staff";
  }
  return "owner";
}
export {
  OWNER_SESSION_EXPIRED_EVENT,
  clearOwnerSession,
  expireOwnerSession,
  getOwnerSession,
  getOwnerSessionExpiresAt,
  inferAccountKind,
  isOwnerSessionExpired,
  saveOwnerSession
};
