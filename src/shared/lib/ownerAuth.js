import { inferAccountKind, saveOwnerSession } from "./ownerSession";
import { extractCurrencyFromProfile } from "./currencySymbols";
import { extractStaffAccess } from "./staffAccess";
function getFrontendDomainUrl() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "";
}
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}
function readValue(source, paths) {
  const root = asRecord(source);
  if (!root) return void 0;
  for (const path of paths) {
    const parts = path.split(".");
    let current = root;
    for (const part of parts) {
      const record = asRecord(current);
      if (!record) {
        current = void 0;
        break;
      }
      current = record[part];
    }
    if (current !== void 0 && current !== null && current !== "") {
      return current;
    }
  }
  return void 0;
}
function extractMessage(data, fallback) {
  const value = readValue(data, [
    "message",
    "error",
    "msg",
    "detail",
    "data.message",
    "data.error"
  ]);
  return typeof value === "string" && value.trim() ? value : fallback;
}
function extractToken(data) {
  const value = readValue(data, [
    "token",
    "accessToken",
    "access_token",
    "jwt",
    "data.token",
    "data.accessToken",
    "data.access_token",
    "data.jwt",
    "result.token",
    "payload.token"
  ]);
  return typeof value === "string" && value.length > 8 ? value : null;
}
function extractOwner(data, email) {
  const value = readValue(data, [
    "staff",
    "owner",
    "user",
    "data.staff",
    "data.owner",
    "data.user",
    "result.staff",
    "result.owner",
    "payload.staff",
    "payload.owner"
  ]);
  const record = asRecord(value);
  const root = asRecord(data) || {};
  const nested = asRecord(root.data) || {};
  const roleFields = [
    "roleName",
    "role",
    "staffRole",
    "staffType",
    "userType",
    "accountType",
    "accountKind",
    "isStaff",
    "isRoleUser"
  ];
  const hints = {};
  for (const source of [root, nested, record || {}]) {
    for (const key of roleFields) {
      if (source[key] != null && source[key] !== "") hints[key] = source[key];
    }
  }
  if (!record) {
    return { email, ...hints };
  }
  return {
    email,
    ...hints,
    ...record
  };
}
function textIncludes(data, keywords) {
  try {
    const blob = JSON.stringify(data ?? {}).toLowerCase();
    return keywords.some(
      (keyword) => blob.includes(keyword.toLowerCase())
    );
  } catch {
    return false;
  }
}
function isFalseFlag(data, paths) {
  const value = readValue(data, paths);
  return value === false;
}
function isTrueFlag(data, paths) {
  const value = readValue(data, paths);
  return value === true;
}
async function requestOwnerAuth(action, payload) {
  const response = await fetch(
    `/api/tenant/owner/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        ...payload,
        frontendDomainUrl: getFrontendDomainUrl()
      })
    }
  );
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      message: text || "Unexpected response from server."
    };
  }
  return {
    status: response.status,
    data
  };
}
function resolveNextStep(action, data, token, httpOk, hadPassword) {
  if (token) return "done";
  const wantsOtp = isTrueFlag(data, [
    "requiresOtp",
    "requireOtp",
    "otpRequired",
    "data.requiresOtp",
    "data.requireOtp",
    "data.otpRequired",
    "emailVerificationRequired",
    "data.emailVerificationRequired"
  ]) || isFalseFlag(data, [
    "isEmailVerified",
    "emailVerified",
    "data.isEmailVerified",
    "data.emailVerified"
  ]) || textIncludes(data, [
    "otp",
    "verify-email",
    "verify email",
    "verification code",
    "email verification"
  ]);
  const wantsPassword = isTrueFlag(data, [
    "requiresPasswordSetup",
    "requirePasswordSetup",
    "passwordSetupRequired",
    "data.requiresPasswordSetup"
  ]) || isFalseFlag(data, [
    "isPasswordSet",
    "passwordSet",
    "data.isPasswordSet",
    "data.passwordSet"
  ]) || textIncludes(data, [
    "set password",
    "create password",
    "password setup",
    "set-password"
  ]);
  if (action === "login") {
    if (wantsOtp) return "otp";
    if (wantsPassword) return "set-password";
    if (httpOk) return "login";
    return "login";
  }
  if (action === "verify-email") {
    if (wantsPassword || httpOk) {
      return "set-password";
    }
    return "otp";
  }
  if (action === "forgot-password") {
    return "forgot-otp";
  }
  if (action === "verify-forgot-otp") {
    return "reset-password";
  }
  if (action === "reset-password") {
    return httpOk ? "done" : "reset-password";
  }
  if (httpOk) return "done";
  return "set-password";
}
async function loginOwner(email, password) {
  const { status, data } = await requestOwnerAuth(
    "login",
    {
      email,
      password
    }
  );
  const token = extractToken(data);
  const ok = status >= 200 && status < 300;
  const nextStep = resolveNextStep(
    "login",
    data,
    token,
    ok,
    Boolean(password.trim())
  );
  const fallback = ok && nextStep === "otp" ? "OTP sent to your email. Enter the code to continue." : ok ? "Logged in successfully." : "Login failed. Check your email and password.";
  return {
    ok: ok || nextStep === "otp" || nextStep === "set-password",
    nextStep,
    message: extractMessage(
      data,
      fallback
    ),
    token,
    owner: extractOwner(
      data,
      email
    ),
    staffAccess: extractStaffAccess(data),
    status
  };
}
async function verifyOwnerEmail(email, otp) {
  const { status, data } = await requestOwnerAuth(
    "verify-email",
    {
      email,
      otp
    }
  );
  const token = extractToken(data);
  const ok = status >= 200 && status < 300;
  const nextStep = resolveNextStep(
    "verify-email",
    data,
    token,
    ok,
    true
  );
  const fallback = ok ? "Email verified. Set your password to continue." : "Invalid or expired OTP.";
  return {
    ok: ok || Boolean(token) || nextStep === "set-password",
    nextStep,
    message: extractMessage(
      data,
      fallback
    ),
    token,
    owner: extractOwner(
      data,
      email
    ),
    staffAccess: extractStaffAccess(data),
    status
  };
}
async function setOwnerPassword(email, password, confirmPassword) {
  const { status, data } = await requestOwnerAuth(
    "set-password",
    {
      email,
      password,
      confirmPassword
    }
  );
  const token = extractToken(data);
  const ok = status >= 200 && status < 300;
  const fallback = ok ? "Password saved. Signing you in..." : "Could not set password. Try again.";
  return {
    ok,
    nextStep: token || ok ? "done" : "set-password",
    message: extractMessage(
      data,
      fallback
    ),
    token,
    owner: extractOwner(
      data,
      email
    ),
    staffAccess: extractStaffAccess(data),
    status
  };
}
async function forgotOwnerPassword(email) {
  const { status, data } = await requestOwnerAuth(
    "forgot-password",
    {
      email
    }
  );
  const ok = status >= 200 && status < 300;
  const nextStep = resolveNextStep(
    "forgot-password",
    data,
    null,
    ok,
    false
  );
  return {
    ok,
    nextStep: ok ? "forgot-otp" : "forgot-password",
    message: extractMessage(
      data,
      ok ? "OTP sent to your email. Enter the OTP to continue." : "Could not send password reset OTP. Please check your email."
    ),
    token: null,
    owner: extractOwner(
      data,
      email
    ),
    staffAccess: extractStaffAccess(data),
    status
  };
}
async function verifyForgotPasswordOtp(email, otp) {
  const { status, data } = await requestOwnerAuth(
    "verify-forgot-otp",
    {
      email,
      otp
    }
  );
  const token = extractToken(data);
  const ok = status >= 200 && status < 300;
  const nextStep = resolveNextStep(
    "verify-forgot-otp",
    data,
    token,
    ok,
    false
  );
  return {
    ok,
    nextStep: ok ? "reset-password" : "forgot-otp",
    message: extractMessage(
      data,
      ok ? "OTP verified. Create your new password." : "Invalid or expired OTP."
    ),
    token,
    owner: extractOwner(
      data,
      email
    ),
    staffAccess: extractStaffAccess(data),
    status
  };
}
async function resetOwnerPassword(email, password, confirmPassword) {
  const { status, data } = await requestOwnerAuth(
    "reset-password",
    {
      email,
      password,
      confirmPassword
    }
  );
  const token = extractToken(data);
  const ok = status >= 200 && status < 300;
  return {
    ok,
    nextStep: token || ok ? "done" : "reset-password",
    message: extractMessage(
      data,
      ok ? "Password reset successfully. You can now log in." : "Could not reset password. Please try again."
    ),
    token,
    owner: extractOwner(
      data,
      email
    ),
    staffAccess: extractStaffAccess(data),
    status
  };
}
function persistOwnerLogin(email, token, owner, staffAccess = null) {
  const kind = staffAccess ? "staff" : inferAccountKind(owner, token);
  const session = {
    token,
    email,
    owner: {
      ...owner || { email },
      accountKind: kind,
      ...staffAccess ? {
        roleName: staffAccess.roleName,
        firstName: staffAccess.firstName,
        lastName: staffAccess.lastName,
        accountType: "staff"
      } : {}
    },
    staffAccess: kind === "staff" ? staffAccess : null
  };
  saveOwnerSession(session);
  const currency = extractCurrencyFromProfile(owner);
  if (currency && typeof window !== "undefined") {
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
  return session;
}
function getOwnerApiErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not reach the owner API. Make sure the backend is running on port 5000.";
}
export {
  forgotOwnerPassword,
  getOwnerApiErrorMessage,
  loginOwner,
  persistOwnerLogin,
  resetOwnerPassword,
  setOwnerPassword,
  verifyForgotPasswordOtp,
  verifyOwnerEmail
};
