const API_BASE_URL = process.env.API_BASE_URL;
const ALLOWED_OWNER_ACTIONS = /* @__PURE__ */ new Set([
  "login",
  "verify-email",
  "set-password",
  "forgot-password",
  "verify-forgot-otp",
  "reset-password"
]);
async function proxyTenantOwnerAction(action, body) {
  if (!ALLOWED_OWNER_ACTIONS.has(action)) {
    return {
      status: 400,
      data: {
        message: `Unsupported owner action: ${action}`
      }
    };
  }
  const url = `${API_BASE_URL}/api/tenant/owner/${action}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store"
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        message: text || "Backend returned a non-JSON response."
      };
    }
    return {
      status: response.status,
      data
    };
  } catch {
    return {
      status: 503,
      data: {
        message: `Owner API is not reachable at ${API_BASE_URL}. Start the backend and try again.`
      }
    };
  }
}
export {
  proxyTenantOwnerAction
};
