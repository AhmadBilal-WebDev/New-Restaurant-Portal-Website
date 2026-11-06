import { getPublicFrontendDomainUrl } from "./catalogApi";

const CUSTOMER_TOKEN_KEY = "ros_customer_token";
const CUSTOMER_USER_KEY = "ros_customer_user";

function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return null;
}

function textValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function mapCustomerUser(raw, extras = {}) {
  const row = asRecord(raw) || {};
  const nestedUser = asRecord(row.user) || asRecord(row.data) || row;
  const countryCode =
    textValue(nestedUser, ["countryCode", "dialCode"]) || extras.countryCode || "";
  const contactNumber =
    textValue(nestedUser, ["contactNumber", "phone", "mobile"]) ||
    extras.contactNumber ||
    "";
  const phone =
    countryCode && contactNumber
      ? `${countryCode} ${contactNumber}`
      : contactNumber || countryCode || extras.phone || "";

  const profilePitcher =
    textValue(nestedUser, ["profilePitcher", "profilePicture", "avatar", "image", "photo"]) ||
    textValue(row, ["profilePitcher", "profilePicture", "avatar", "url"]) ||
    extras.profilePitcher ||
    "";

  return {
    id: textValue(nestedUser, ["id", "_id", "customerId"]) || extras.id || "",
    accountType: textValue(nestedUser, ["accountType"]) || "customer",
    name: textValue(nestedUser, ["name", "fullName"]) || extras.name || "",
    email: textValue(nestedUser, ["email"]) || extras.email || "",
    countryCode,
    contactNumber,
    phone,
    profilePitcher,
    branchId: textValue(nestedUser, ["branchId"]) || extras.branchId || "",
    branchName: textValue(nestedUser, ["branchName"]) || extras.branchName || "",
    branchCode: textValue(nestedUser, ["branchCode"]) || "",
    merchantId: textValue(nestedUser, ["merchantId"]) || "",
    merchantName: textValue(nestedUser, ["merchantName"]) || "",
    frontendDomainUrl: textValue(nestedUser, ["frontendDomainUrl"]) || "",
    isVerified: nestedUser.isVerified === true || row.isVerified === true,
    lastLoginAt: textValue(nestedUser, ["lastLoginAt"]) || "",
    savedAddresses: Array.isArray(nestedUser.savedAddresses)
      ? nestedUser.savedAddresses
      : extras.savedAddresses || [],
    dob: textValue(nestedUser, ["dob", "dateOfBirth"]) || extras.dob || "",
    gender: textValue(nestedUser, ["gender"]) || extras.gender || ""
  };
}

function getErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
  return fallback;
}

function readCustomerToken() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function authUrl(action) {
  const domain = getPublicFrontendDomainUrl();
  const params = new URLSearchParams();
  if (domain) params.set("frontendDomainUrl", domain);
  const qs = params.toString();
  return `/api/restaurant/user/auth/${action}${qs ? `?${qs}` : ""}`;
}

function customerAuthHeaders(json = true) {
  const token = readCustomerToken();
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function postAuth(action, payload, { withAuth = false } = {}) {
  const response = await fetch(authUrl(action), {
    method: "POST",
    headers: withAuth
      ? customerAuthHeaders(true)
      : {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
    body: JSON.stringify(payload || {}),
    cache: "no-store"
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, data };
}

async function requestCustomerOtp(payload) {
  const { response, data } = await postAuth("request-otp", payload);
  const ok = response.ok && (data?.success === true || data?.nextStep === "otp");
  return {
    ok,
    status: response.status,
    flow: data?.flow || "signup",
    nextStep: data?.nextStep || "",
    message: getErrorMessage(data, ok ? "OTP sent." : "Could not send OTP."),
    otpExpiresAt: data?.otpExpiresAt || null,
    user: data?.user ? mapCustomerUser(data.user, payload) : null,
    raw: data
  };
}

async function signinCustomer({ email }) {
  const payload = { email: String(email || "").trim().toLowerCase() };
  const { response, data } = await postAuth("signin", payload);
  const ok = response.ok && (data?.success === true || data?.nextStep === "otp");
  return {
    ok,
    status: response.status,
    flow: data?.flow || "signin",
    nextStep: data?.nextStep || "",
    message: getErrorMessage(data, ok ? "OTP sent." : "Could not sign in."),
    otpExpiresAt: data?.otpExpiresAt || null,
    user: data?.user ? mapCustomerUser(data.user, payload) : null,
    raw: data
  };
}

async function verifyCustomerOtp({ email, otp }) {
  const { response, data } = await postAuth("verify-otp", {
    email: String(email || "").trim().toLowerCase(),
    otp: String(otp || "").trim()
  });
  const ok = response.ok && (data?.success === true || Boolean(data?.token));
  const user = data?.user ? mapCustomerUser(data.user, { email }) : null;
  const token = typeof data?.token === "string" ? data.token : "";
  return {
    ok,
    status: response.status,
    nextStep: data?.nextStep || "",
    message: getErrorMessage(data, ok ? "Login successful" : "Invalid or expired OTP."),
    token,
    accountType: data?.accountType || user?.accountType || "customer",
    user,
    branch: asRecord(data?.branch),
    raw: data
  };
}

async function resendCustomerOtp({ email }) {
  const { response, data } = await postAuth("resend-otp", {
    email: String(email || "").trim().toLowerCase()
  });
  const ok = response.ok && data?.success !== false;
  return {
    ok,
    status: response.status,
    message: getErrorMessage(data, ok ? "OTP resent." : "Could not resend OTP."),
    otpExpiresAt: data?.otpExpiresAt || null,
    raw: data
  };
}

async function getCustomerProfile() {
  const response = await fetch(authUrl("profile"), {
    method: "GET",
    headers: customerAuthHeaders(false),
    cache: "no-store"
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  const ok = response.ok && data?.success !== false && Boolean(data?.user);
  return {
    ok,
    status: response.status,
    message: getErrorMessage(data, ok ? "Profile fetched successfully" : "Could not fetch profile."),
    user: data?.user ? mapCustomerUser(data.user) : null,
    branch: asRecord(data?.branch),
    raw: data
  };
}

async function updateCustomerProfileApi(payload) {
  const body = {
    name: String(payload?.name || "").trim(),
    gender: String(payload?.gender || "").trim().toLowerCase(),
    countryCode: String(payload?.countryCode || "").trim(),
    contactNumber: String(payload?.contactNumber || "").trim()
  };

  async function send(method) {
    const response = await fetch(authUrl("profile"), {
      method,
      headers: customerAuthHeaders(true),
      body: JSON.stringify(body),
      cache: "no-store"
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { response, data };
  }

  let { response, data } = await send("PUT");
  if (response.status === 404 || response.status === 405) {
    ({ response, data } = await send("POST"));
  }

  const ok = response.ok && data?.success !== false;
  const user = data?.user
    ? mapCustomerUser(data.user, body)
    : ok
      ? mapCustomerUser({ ...body, ...(asRecord(data) || {}) }, body)
      : null;

  return {
    ok,
    status: response.status,
    message: getErrorMessage(data, ok ? "Profile updated." : "Could not update profile."),
    user,
    branch: asRecord(data?.branch),
    raw: data
  };
}

async function uploadCustomerProfilePitcher(file) {
  if (!file) {
    return { ok: false, status: 400, message: "Please choose an image file.", user: null, url: "" };
  }

  const formData = new FormData();
  formData.append("profilePitcher", file);

  const response = await fetch(authUrl("upload-profilepitcher"), {
    method: "POST",
    headers: customerAuthHeaders(false),
    body: formData,
    cache: "no-store"
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const ok = response.ok && data?.success !== false;
  const url =
    textValue(asRecord(data) || {}, [
      "profilePitcher",
      "url",
      "image",
      "imageUrl",
      "secure_url",
      "path"
    ]) ||
    textValue(asRecord(data?.user) || {}, ["profilePitcher", "profilePicture", "avatar"]) ||
    textValue(asRecord(data?.data) || {}, ["profilePitcher", "url", "image"]);

  const user = data?.user ? mapCustomerUser(data.user, { profilePitcher: url }) : null;

  return {
    ok,
    status: response.status,
    message: getErrorMessage(data, ok ? "Profile photo updated." : "Could not upload photo."),
    url,
    user,
    raw: data
  };
}

async function logoutCustomerApi() {
  const { response, data } = await postAuth("logout", {}, { withAuth: true });
  const ok = response.ok && data?.success !== false;
  return {
    ok,
    status: response.status,
    message: getErrorMessage(data, ok ? "Logged out." : "Could not logout."),
    raw: data
  };
}

async function removeCustomerProfilePitcher() {
  const response = await fetch(authUrl("remove-profilepitcher"), {
    method: "DELETE",
    headers: customerAuthHeaders(true),
    body: JSON.stringify({}),
    cache: "no-store"
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  const ok = response.ok && data?.success !== false;
  const user = data?.user ? mapCustomerUser(data.user, { profilePitcher: "" }) : null;
  return {
    ok,
    status: response.status,
    message: getErrorMessage(data, ok ? "Profile photo removed." : "Could not remove photo."),
    user,
    raw: data
  };
}

async function deleteCustomerAccount() {
  const response = await fetch(authUrl("profile"), {
    method: "DELETE",
    headers: customerAuthHeaders(true),
    body: JSON.stringify({}),
    cache: "no-store"
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  const ok = response.ok && data?.success !== false;
  return {
    ok,
    status: response.status,
    message: getErrorMessage(data, ok ? "Account deleted." : "Could not delete account."),
    raw: data
  };
}

function writeCustomerSession({ token, user }) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    if (user) localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

function clearCustomerSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_USER_KEY);
  } catch {
    /* ignore */
  }
}

export {
  CUSTOMER_TOKEN_KEY,
  CUSTOMER_USER_KEY,
  clearCustomerSessionStorage,
  deleteCustomerAccount,
  getCustomerProfile,
  logoutCustomerApi,
  mapCustomerUser,
  readCustomerToken,
  removeCustomerProfilePitcher,
  requestCustomerOtp,
  resendCustomerOtp,
  signinCustomer,
  updateCustomerProfileApi,
  uploadCustomerProfilePitcher,
  verifyCustomerOtp,
  writeCustomerSession
};
