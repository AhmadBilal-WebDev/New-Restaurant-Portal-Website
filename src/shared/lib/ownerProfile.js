import { getOwnerSession, inferAccountKind } from "./ownerSession";
function ownerAuthHeaders(json = false) {
  const session = getOwnerSession();
  const token = session?.token || (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null);
  return {
    Accept: "application/json",
    ...json ? { "Content-Type": "application/json" } : {},
    ...token ? { Authorization: `Bearer ${token}` } : {}
  };
}
function isStaffAccount() {
  const session = getOwnerSession();
  if (!session) return false;
  if (session.staffAccess) return true;
  return inferAccountKind(session.owner, session.token) === "staff";
}
function profilePhotoPaths() {
  if (isStaffAccount()) {
    return {
      upload: "/api/restaurant/staff/upload-profilepitcher",
      remove: "/api/restaurant/staff/remove-profilepitcher"
    };
  }
  return {
    upload: "/api/restaurant/owner/upload-profilepitcher",
    remove: "/api/restaurant/owner/remove-profilepitcher"
  };
}
async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
function currentFrontendDomainUrl() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return "";
}
async function getOwnerProfile(frontendDomainUrl = currentFrontendDomainUrl()) {
  try {
    const query = new URLSearchParams();
    if (frontendDomainUrl) query.set("frontendDomainUrl", frontendDomainUrl);
    const path = query.toString() ? `/api/restaurant/owner/profile?${query.toString()}` : "/api/restaurant/owner/profile";
    const response = await fetch(path, {
      method: "GET",
      headers: ownerAuthHeaders()
    });
    const data = await readJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Owner Profile API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
async function updateOwnerProfile(payload) {
  try {
    const response = await fetch("/api/restaurant/owner/update-profile", {
      method: "PUT",
      headers: ownerAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await readJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Update Profile API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
async function uploadOwnerProfilePhoto(file) {
  try {
    const body = new FormData();
    body.append("profilePitcher", file);
    const { upload } = profilePhotoPaths();
    const response = await fetch(upload, {
      method: "POST",
      headers: ownerAuthHeaders(),
      body
    });
    const data = await readJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Upload Profile Photo API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
async function removeOwnerProfilePhoto() {
  try {
    const { remove } = profilePhotoPaths();
    const response = await fetch(remove, {
      method: "POST",
      headers: ownerAuthHeaders(true),
      body: JSON.stringify({})
    });
    const data = await readJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Remove Profile Photo API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
async function logoutOwner() {
  try {
    const response = await fetch("/api/restaurant/owner/logout", {
      method: "POST",
      headers: ownerAuthHeaders(true),
      body: JSON.stringify({})
    });
    const data = await readJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Logout API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
const emptyIdentity = {
  ownerFirstName: "",
  ownerLastName: "",
  ownerEmail: "",
  restaurantName: "",
  profilePitcher: "",
  accountKind: ""
};
let identity = emptyIdentity;
const identityListeners = /* @__PURE__ */ new Set();
function publishOwnerIdentity(next) {
  identity = { ...identity, ...next };
  identityListeners.forEach((listener) => listener());
}
function subscribeOwnerIdentity(listener) {
  identityListeners.add(listener);
  return () => {
    identityListeners.delete(listener);
  };
}
function getOwnerIdentity() {
  return identity;
}
function resetOwnerIdentity() {
  identity = emptyIdentity;
  identityListeners.forEach((listener) => listener());
}
function readAccountKind() {
  if (identity.accountKind === "staff" || identity.accountKind === "owner") return identity.accountKind;
  const session = getOwnerSession();
  if (!session) return "owner";
  return inferAccountKind(session.owner, session.token);
}
async function updateOwnerPassword(payload) {
  try {
    const response = await fetch("/api/restaurant/owner/update-password", {
      method: "PUT",
      headers: ownerAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await readJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Update Password API Error:", error);
    return { ok: false, status: 500, data: null };
  }
}
export {
  getOwnerIdentity,
  getOwnerProfile,
  logoutOwner,
  publishOwnerIdentity,
  readAccountKind,
  removeOwnerProfilePhoto,
  resetOwnerIdentity,
  subscribeOwnerIdentity,
  updateOwnerPassword,
  updateOwnerProfile,
  uploadOwnerProfilePhoto
};
